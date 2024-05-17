import express from 'express';
import csv from 'csv-parser'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import mysql from 'mysql2/promise'
import { db } from "../config/dbConfig.js"
import { v4 as uuidv4 } from 'uuid';
import { calculateCost, cleanPhoneNumber } from '../utils/utilities.js';
import { writeCSV } from '../utils/helpers.js';
import { fileURLToPath } from 'url';

const router = express.Router();
const baseFileName = uuidv4();

// Get the directory path of the current module file
const __dirname = fileURLToPath(new URL('.', import.meta.url));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueFileName = `${baseFileName}_${file.originalname}`;
        cb(null, uniqueFileName);
    }
});

// Initialize multer upload
const upload = multer({ storage: storage });

router.post('/scrub', upload.single('file'), async (req, res) => {
    const { user, column, options, selectedItems } = req.query;
    const file = req.file;

    const fileName = file ? `${baseFileName}_${file.originalname}` : '';
    const matchingAndNonMatching = file ? `${baseFileName}_${file.originalname}` : '';
    // Check if file was uploaded
    if (!req.file) {
        return res.status(400).json({ status: 400, message: 'No file uploaded' });
    }

    // Start time for the task
    const startTime = Date.now();

    try {
        // Read CSV file to capture column names and data
        const csvData = [];
        let columnNameFound = false;
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('headers', (headers) => {
                // Check if the specified column exists in the CSV headers
                columnNameFound = headers.includes(column);
            })
            .on('data', (data) => {
                if (columnNameFound) {
                    csvData.push(data); // Store CSV data in a temporary variable
                } else {
                    console.error(`Column '${column}' not found in the CSV headers.`);
                }
            })
            .on('end', async () => {
                try {
                    const connection = await mysql.createConnection(db);

                    // Select all records from 'PostedLeads' table based on the column
                    const postedLeads = await connection.query(`SELECT * FROM PostedLeads`);

                    // Clean phone number
                    const cleanedCSVData = csvData.map(row => ({ ...row, [column]: cleanPhoneNumber(row[column]) }));

                    // check if user has enough coins
                    const userCoins = await connection.query(`SELECT coins FROM coins WHERE user_id = ?`, [user]);
                    const userCoinAmount = userCoins[0][0].coins;

                    if (csvData.length > userCoinAmount) {
                        return res.status(422).json({ status: 400, message: 'Insufficient coins' });
                    }

                    // Split records based on matching and non-matching rows
                    const matchingRecords = [];
                    const nonMatchingRecords = [];
                    
                    cleanedCSVData.forEach(row => {
                        const phoneNumber = row[column]; // Get the phone number from the specific column
                        let status = '';
                        const matches = postedLeads.filter(recordArray => {
                            // Iterate over each object inside the recordArray
                            for (const record of recordArray) {
                                const postedContact = record.contact; // Get the contact from each object in the recordArray
                                const csvPhoneNumber = cleanPhoneNumber(phoneNumber); // Clean the phone number from the CSV data
                                
                                // Check if both the contact and phone number are defined and equal after cleaning
                                if (postedContact !== null && csvPhoneNumber !== null && postedContact === csvPhoneNumber) {
                                    
                                    
                                    if (options.includes('TCPA') && record.TCPA) { status += 'TCPA, '; }
                                    if (options.includes('DNC Complainers') && record.DNCComplainers) { status += 'DNC Complainers, '; }
                                    if (options.includes('Federal DNC') && record.FederalDNC) { status += 'Federal DNC, '; }

                                    // Remove the last comma and space from the status string
                                    if (status.length > 0) {
                                        status = status.slice(0, -2);
                                    }

                                    console.log("Status:", status);
                                    
                                    return true; // If a match is found, return true
                                }
                            }
                            return false; // If no match is found in any object of the recordArray, return false
                        });

                        // Push to matching or non-matching records based on database columns
                        if (matches.length > 0) {
                            matchingRecords.push({ ...row, status }); // Push the whole row to matching records
                        } else {
                            nonMatchingRecords.push(row); // Push the whole row to non-matching records
                        }
                    });

                    // Subtract coins from user
                    const newCoins =  userCoinAmount - matchingRecords.length;
                    await connection.query(`UPDATE coins SET coins = ? WHERE user_id = ?`, [newCoins, user]);

                    // File paths for matching and non-matching CSV files
                    let matchingFilePath = '';
                    let matchingFileName = '';
                    const nonMatchingFilePath = path.join(__dirname, '../uploads', `${baseFileName}_non_matching_numbers_${file.originalname}`);

                    // Write matching records to CSV file only if there are matching records
                    if (matchingRecords.length > 0) {
                        matchingFilePath = path.join(__dirname, '../uploads', `${baseFileName}_matching_numbers_${file.originalname}`);
                        await writeCSV(matchingFilePath, matchingRecords);
                        matchingFileName = `${baseFileName}_matching_numbers_${file.originalname}`;
                    }

                    // Write non-matching records to CSV file
                    await writeCSV(nonMatchingFilePath, nonMatchingRecords);
                    const nonMatchingFileName = `${baseFileName}_non_matching_numbers_${file.originalname}`;

                    

                    // Save scrub data to 'scrub_records' table
                    const scrubbedAgainstStates = (selectedItems ?? []).length === 1
                        ? selectedItems[0]
                        : (selectedItems ?? []).length > 1
                        ? selectedItems.join(', ')
                        : '';
                    const scrubbedAgainstOptions = (options ?? []).length === 1 
                        ? options[0] : (options ?? []).length > 1 ? options.join(', ') : '';
                    const totalNumbers = csvData.length;
                    const cleanNumbers = nonMatchingRecords.length;
                    const badNumbers = matchingRecords.length;
                    const cost = matchingRecords.length;
                    const userId = user;
                    const date = new Date().toDateString();
                    
                    // End time for the task
                    const endTime = Date.now();
                    const totalTimeMillis = endTime - startTime; // Calculate total time in milliseconds

                    // Convert total time to minutes and seconds
                    const totalSeconds = Math.floor(totalTimeMillis / 1000);
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;

                    // Format the time string
                    let executionTime = '';
                    if (minutes > 0) {
                        executionTime += `${minutes.toString().padStart(2, '0')} min `;
                    }
                    executionTime += `${seconds.toString().padStart(2, '0')} sec`;

                    
                    await connection.query(
                        `INSERT INTO scrub_records 
                            (user_id, date, uploaded_file, scrubbed_against_states, scrubbed_against_options, 
                                total_numbers, clean_numbers, bad_numbers, cost, matching_file, non_matching_file, 
                                    execution_time) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [userId, date, fileName, scrubbedAgainstStates, scrubbedAgainstOptions,
                            totalNumbers, cleanNumbers, badNumbers, cost, matchingFileName, nonMatchingFileName,
                                executionTime]
                    );

                    // Respond with success message and scrub data
                    res.status(200).json({
                        message: 'Scrub data processed successfully',
                        scrubbedData: {
                            date,
                            execution_time: executionTime,
                            uploaded_file: fileName,
                            scrubbed_against_states: scrubbedAgainstStates,
                            scrubbed_against_options: scrubbedAgainstOptions,
                            total_numbers: totalNumbers,
                            clean_numbers: cleanNumbers,
                            bad_numbers: badNumbers,
                            matchingFilePath: matchingFileName,
                            nonMatchingFilePath: nonMatchingFileName,
                            cost: cost
                        }
                    });

                    // Close the connection
                    await connection.end();
                } catch (error) {
                    console.error('Error processing scrub data:', error);
                    res.status(500).json({ status: 500, message: 'Error processing scrub data' });
                }
            });
    } catch (error) {
        console.error('Error during scrub:', error);
        res.status(500).json({ status: 500, message: 'Internal server error' });
    }
});

export default router;
