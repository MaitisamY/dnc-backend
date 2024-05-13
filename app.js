import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import session from "express-session"
import dotenv from "dotenv"
import { v4 as uuidv4 } from 'uuid'
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { getUser } from './controller/getUser.js'
import { addUser } from './controller/addUser.js'
import { getScrubData } from "./controller/getScrubData.js"
import validator from "validator"
import mysql from 'mysql2/promise'
import { db } from "./config/dbConfig.js"
import { fileURLToPath } from 'url';
// Get the directory path of the current module file
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const mainFile = uuidv4();
 
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, 
    httpOnly: true
}));

// Define storage for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueFileName = `${file.originalname}_${mainFile}.csv`; // Ensure unique filenames
        cb(null, uniqueFileName);
    }
});

// Initialize multer upload
const upload = multer({ storage: storage });

// Check if the server is running!
app.get('/', (req, res) => {
    res.json({ hello: 'Welcome to DNC Litigator Check - Backend!' });
});

// const userLoggedIn = (req, res, next) => {
//     if (!req.session.userId) {
//         res.status(401).json({ status: 401, message: 'Unauthorized' });
//     } else {
//         next();
//     }
// }

app.get('/scrub/items', async (req, res) => {
    const result = await getScrubData();

    res.json({ status: 200, data: result });
});

app.get('/download/uploaded-file/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, 'uploads', fileName);
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('File does not exist:', err);
            return res.status(404).send('File not found');
        }
        
        // Stream file to client
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    });
});


app.get('/download/matching-file/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, 'uploads', fileName);
    sendFile(fileName, filePath, res);
});

app.get('/download/non-matching-file/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, 'uploads', fileName);
    sendFile(fileName, filePath, res);
});

function sendFile(fileName, filePath, res) {
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('File does not exist:', err);
            return res.status(404).send('File not found');
        }

        // Stream file to client
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    });
}

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            throw { status: 400, message: 'All fields are required' };
        }

        if(email.length < 3 || password.length < 3) {
            throw { status: 400, message: 'Both fields must be of at least 3 characters' };
        }

        const result = await getUser(email, password);

        if (result) {
            // If user found, set session data if needed
            req.session.username = result[0].name; 
            req.session.token = uuidv4();
            res.status(200).json({ 
                status: 200, 
                message: 'Login successful',
                session: { token: req.session.token, name: req.session.username }, 
                data: result,
            });
        } else {
            // If user not found, return 404
            res.status(404).json({ 
                status: 404, 
                message: 'User not found', 
                data: null 
            });
        }
    } catch (error) {
        console.error('Error during login:', error);
        const status = error.status || 500;
        const message = error.message || 'Internal server error';
        res.status(status).json({ status, message });
    }
});

// Signup route
app.post('/signup', async (req, res) => {
    const { name, email, phone, password } = req.body;

    try {
        if (!name || !email || !phone || !password) {
            throw { status: 400, message: 'All fields are required' };
        }

        if(name.length < 5 || phone.length < 11 || phone.length > 15 || password.length < 5) {
            throw { status: 400, message: 'Follow the requirements each field' };
        }

        if (!validator.isEmail(email)) {
            throw { status: 400, message: 'Email is not valid' };
        }

        if (!phone.match(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g)) {
            throw { status: 400, message: 'Phone number is not valid' };
        }

        const result = await addUser(name, email, phone, password);

        if (result) {
            res.status(200).json({ status: 200, message: 'User created successfully', data: result });
        } else {
            res.status(400).json({ status: 400, message: 'User already exists', data: null });
        }

    } catch (error) {
        console.error('Error during signup:', error);
        const status = error.status || 500;
        const message = error.message || 'Internal server error';
        res.status(status).json({ status, message });
    }
});

// Scrub route
app.post('/scrub', upload.single('file'), async (req, res) => {
    const { column, options, selectedItems } = req.query;
    const file = req.file;

    const fileName = file ? file.originalname + '_' + mainFile + '.csv' : '';
    const matchingAndNonMatching = file ? file.originalname : '';
    // Check if file was uploaded
    if (!req.file) {
        return res.status(400).json({ status: 400, message: 'No file uploaded' });
    }

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

                    // Split records based on matching and non-matching rows
                    const matchingRecords = [];
                    const nonMatchingRecords = [];
                    const cleanedCSVData = csvData.map(row => ({ ...row, [column]: cleanPhoneNumber(row[column]) }));
                    cleanedCSVData.forEach(row => {
                        const phoneNumber = row[column]; // Get the phone number from the specific column
                        
                        const matches = postedLeads.filter(recordArray => {
                            // Iterate over each object inside the recordArray
                            for (const record of recordArray) {
                                const postedContact = record.contact; // Get the contact from each object in the recordArray
                                const csvPhoneNumber = cleanPhoneNumber(phoneNumber); // Clean the phone number from the CSV data
                               
                                // Check if both the contact and phone number are defined and equal after cleaning
                                if (postedContact !== null && csvPhoneNumber !== null && postedContact === csvPhoneNumber) {
                                    return true; // If a match is found, return true
                                }
                            }
                            return false; // If no match is found in any object of the recordArray, return false
                        });
                        
                        if (matches.length > 0) {
                            matchingRecords.push(row); // Push the whole row to matching records
                        } else {
                            nonMatchingRecords.push(row); // Push the whole row to non-matching records
                        }
                    });

                    // Generate unique IDs for matching and non-matching files
                    const matchingFileId = uuidv4();
                    const nonMatchingFileId = uuidv4();

                    // File paths for matching and non-matching CSV files
                    const matchingFilePath = path.join(__dirname, 'uploads', `${matchingAndNonMatching}_matching_numbers_${matchingFileId}.csv`);
                    const nonMatchingFilePath = path.join(__dirname, 'uploads', `${matchingAndNonMatching}_non_matching_numbers_${nonMatchingFileId}.csv`);

                    // Write matching and non-matching records to CSV files
                    await Promise.all([
                        writeCSV(matchingFilePath, matchingRecords),
                        writeCSV(nonMatchingFilePath, nonMatchingRecords)
                    ]);

                    // Extract just the file names without the path
                    const matchingFileName = `${matchingAndNonMatching}_matching_numbers_${matchingFileId}.csv`;
                    const nonMatchingFileName = `${matchingAndNonMatching}_non_matching_numbers_${nonMatchingFileId}.csv`;

                    // Save scrub data to 'scrub_records' table
                    const scrubbedAgainstStates = (selectedItems ?? []).length === 1
                        ? selectedItems[0]
                        : (selectedItems ?? []).length > 1
                        ? selectedItems.join(', ')
                        : '';
                    const scrubbedAgainstOptions = (options ?? []).length === 1 
                        ? options[0] : (options ?? []).length > 1 ? options.join(', ') : '';
                    const totalNumbers = csvData.length;
                    const cleanNumbers = matchingRecords.length;
                    const badNumbers = nonMatchingRecords.length;
                    const cost = calculateCost(csvData.length);
                    const userId = 1;
                    const date = new Date().toDateString();
                    await connection.query(
                        `INSERT INTO scrub_records 
                            (user_id, date, uploaded_file, scrubbed_against_states, scrubbed_against_options, 
                                total_numbers, clean_numbers, bad_numbers, cost, matching_file, non_matching_file) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [userId, date, fileName, scrubbedAgainstStates, scrubbedAgainstOptions,
                            totalNumbers, cleanNumbers, badNumbers, cost, matchingFileName, nonMatchingFileName]
                    );

                    // Respond with success message and scrub data
                    res.status(200).json({
                        message: 'Scrub data processed successfully',
                        scrubbedData: {
                            date,
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

async function writeCSV(filePath, data) {
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        
        writer.on('error', reject);

        writer.on('open', () => {
            if (data.length === 0) {
                writer.end();
                resolve();
                return;
            }
            
            // Write headers
            const headers = Object.keys(data[0]).join(','); // Assuming all rows have the same structure
            writer.write(`${headers}\n`);
            
            // Write data for matching and non-matching records
            data.forEach(row => {
                const values = Object.values(row).join(',');
                writer.write(`${values}\n`);
            });
            
            writer.end();
        });

        writer.on('finish', resolve);
    });
}


// Function to calculate cost
function calculateCost(uploadedNumbers) {
    // Cost calculation logic here
    const coins = 270000;
    return coins - uploadedNumbers;
}

function cleanPhoneNumber(phoneNumber) {
    // Check if phoneNumber is defined
    if (phoneNumber === undefined || phoneNumber === null) {
        return null;
    }
    // Remove all non-numeric characters from the phone number
    return phoneNumber.toString().replace(/\D/g, '');
}

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('Error during logout:', error);
            res.status(500).json({ status: 500, message: 'Internal server error' });
        } else {
            res.status(200).json({ status: 200, message: 'Logout successful' });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
