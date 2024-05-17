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
 
dotenv.config();

const mainFile = uuidv4();
const app = express();
const port = process.env.PORT || 3000;
const connection = await mysql.createConnection(db);


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

async function checkTCPACondition(phoneNumber) {
    try {
        // Query the database to check if the phone number matches TCPA condition
        const [rows, fields] = await connection.query('SELECT COUNT(*) AS count FROM PostedLeads WHERE TCPA = ? AND Contact = ?', [1, phoneNumber]);
        return rows[0].count > 0; // Return true if phone number matches TCPA condition, false otherwise
    } catch (error) {
        console.error('Error checking TCPA condition:', error);
        return false; // Return false in case of an error
    }
}

async function checkDNCComplainersCondition(phoneNumber) {
    try {
        // Query the database to check if the phone number matches DNC Complainers condition
        const [rows, fields] = await connection.query('SELECT COUNT(*) AS count FROM PostedLeads WHERE DNCComplainers = ? AND Contact = ?', [1, phoneNumber]);
        return rows[0].count > 0; // Return true if phone number matches DNC Complainers condition, false otherwise
    } catch (error) {
        console.error('Error checking DNC Complainers condition:', error);
        return false; // Return false in case of an error
    }
}

async function checkFederalDNCCondition(phoneNumber) {
    try {
        // Query the database to check if the phone number matches Federal DNC condition
        const [rows, fields] = await connection.query('SELECT COUNT(*) AS count FROM PostedLeads WHERE FederalDNC = ? AND Contact = ?', [1, phoneNumber]);
        return rows[0].count > 0; // Return true if phone number matches Federal DNC condition, false otherwise
    } catch (error) {
        console.error('Error checking Federal DNC condition:', error);
        return false; // Return false in case of an error
    }
}

// Check if the server is running!
app.get('/', (req, res) => {
    res.json({ hello: 'Welcome to DNC Litigator Check - Backend!' });
});

app.get('/scrub/items', async (req, res) => {
    const result = await getScrubData();
    res.json({ status: 200, data: result });
});

app.get('/download/uploaded-file/:fileName', async (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, 'uploads', fileName);

    try {
        // Check if file exists
        await fs.promises.access(filePath, fs.constants.F_OK);
        
        // Stream file to client
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading uploaded file:', error);
        res.status(404).send('File not found');
    }
});

app.get('/download/matching-file/:fileName', async (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, 'uploads', fileName);

    try {
        await sendFile(fileName, filePath, res);
    } catch (error) {
        console.error('Error downloading matching file:', error);
        res.status(404).send('File not found');
    }
});

app.get('/download/non-matching-file/:fileName', async (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, 'uploads', fileName);

    try {
        await sendFile(fileName, filePath, res);
    } catch (error) {
        console.error('Error downloading non-matching file:', error);
        res.status(404).send('File not found');
    }
});

async function sendFile(fileName, filePath, res) {
    // Check if file exists
    await fs.promises.access(filePath, fs.constants.F_OK);

    // Stream file to client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
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

                    // Initialize arrays for matching and non-matching records for each condition
                    const matchingTCPARecords = [];
                    const nonMatchingTCPARecords = [];
                    const matchingDNCComplainersRecords = [];
                    const nonMatchingDNCComplainersRecords = [];
                    const matchingFederalDNCRecords = [];
                    const nonMatchingFederalDNCRecords = [];

                    // Iterate through each row of CSV data
                    for (const row of csvData) {
                        // Clean phone number
                        const phoneNumber = cleanPhoneNumber(row[column]);

                        // Query database for each condition and push records accordingly
                        if (options.includes('TCPA')) {
                            const isTCPA = await checkTCPACondition(phoneNumber);
                            console.log(isTCPA);
                            if (isTCPA) {
                                matchingTCPARecords.push(row);
                            } else {
                                nonMatchingTCPARecords.push(row);
                            }
                        }
                        if (options.includes('DNC Complainers')) {
                            const isDNCComplainers = await checkDNCComplainersCondition(phoneNumber);
                            console.log(isDNCComplainers);
                            if (isDNCComplainers) {
                                matchingDNCComplainersRecords.push(row);
                            } else {
                                nonMatchingDNCComplainersRecords.push(row);
                            }
                        }
                        if (options.includes('Federal DNC')) {
                            const isFederalDNC = await checkFederalDNCCondition(phoneNumber);
                            console.log(isFederalDNC);
                            if (isFederalDNC) {
                                matchingFederalDNCRecords.push(row);
                            } else {
                                nonMatchingFederalDNCRecords.push(row);
                            }
                        }
                    }

                    console.log('Done Scrubbing...');
                    console.log('Total Matching Records:', matchingTCPARecords.length + matchingDNCComplainersRecords.length + matchingFederalDNCRecords.length);

                    // Generate unique IDs for each set of matching and non-matching files
                    const matchingTCPAFileId = uuidv4();
                    const nonMatchingTCPAFileId = uuidv4();
                    const matchingDNCComplainersFileId = uuidv4();
                    const nonMatchingDNCComplainersFileId = uuidv4();
                    const matchingFederalDNCFileId = uuidv4();
                    const nonMatchingFederalDNCFileId = uuidv4();

                    // Define file paths for each set of matching and non-matching CSV files
                    const matchingTCPAFilePath = path.join(__dirname, 'uploads', `${matchingAndNonMatching}_matching_TCPA_numbers_${matchingTCPAFileId}.csv`);
                    const nonMatchingTCPAFilePath = path.join(__dirname, 'uploads', `${matchingAndNonMatching}_non_matching_TCPA_numbers_${nonMatchingTCPAFileId}.csv`);
                    const matchingDNCComplainersFilePath = path.join(__dirname, 'uploads', `${matchingAndNonMatching}_matching_DNC_Complainers_numbers_${matchingDNCComplainersFileId}.csv`);
                    const nonMatchingDNCComplainersFilePath = path.join(__dirname, 'uploads', `${matchingAndNonMatching}_non_matching_DNC_Complainers_numbers_${nonMatchingDNCComplainersFileId}.csv`);
                    const matchingFederalDNCFilePath = path.join(__dirname, 'uploads', `${matchingAndNonMatching}_matching_Federal_DNC_numbers_${matchingFederalDNCFileId}.csv`);
                    const nonMatchingFederalDNCFilePath = path.join(__dirname, 'uploads', `${matchingAndNonMatching}_non_matching_Federal_DNC_numbers_${nonMatchingFederalDNCFileId}.csv`);

                    // Write matching and non-matching records to CSV files
                    await Promise.all([
                        writeCSV(matchingTCPAFilePath, matchingTCPARecords),
                        writeCSV(nonMatchingTCPAFilePath, nonMatchingTCPARecords),
                        writeCSV(matchingDNCComplainersFilePath, matchingDNCComplainersRecords),
                        writeCSV(nonMatchingDNCComplainersFilePath, nonMatchingDNCComplainersRecords),
                        writeCSV(matchingFederalDNCFilePath, matchingFederalDNCRecords),
                        writeCSV(nonMatchingFederalDNCFilePath, nonMatchingFederalDNCRecords)
                    ]);

                    // Extract just the file names without the path
                    const matchingTCPAFileName = `${matchingAndNonMatching}_matching_TCPA_numbers_${matchingTCPAFileId}.csv`;
                    const nonMatchingTCPAFileName = `${matchingAndNonMatching}_non_matching_TCPA_numbers_${nonMatchingTCPAFileId}.csv`;
                    const matchingDNCComplainersFileName = `${matchingAndNonMatching}_matching_DNC_Complainers_numbers_${matchingDNCComplainersFileId}.csv`;
                    const nonMatchingDNCComplainersFileName = `${matchingAndNonMatching}_non_matching_DNC_Complainers_numbers_${nonMatchingDNCComplainersFileId}.csv`;
                    const matchingFederalDNCFileName = `${matchingAndNonMatching}_matching_Federal_DNC_numbers_${matchingFederalDNCFileId}.csv`;
                    const nonMatchingFederalDNCFileName = `${matchingAndNonMatching}_non_matching_Federal_DNC_numbers_${nonMatchingFederalDNCFileId}.csv`;

                    // Save scrub data to 'scrub_records' table
                    const scrubbedAgainstStates = (selectedItems ?? []).length === 1
                        ? selectedItems[0]
                        : (selectedItems ?? []).length > 1
                        ? selectedItems.join(', ')
                        : '';
                    const scrubbedAgainstOptions = (options ?? []).length === 1 
                        ? options[0] : (options ?? []).length > 1 ? options.join(', ') : '';
                    const totalNumbers = csvData.length;
                    const cleanNumbers = matchingDNCComplainersFileId.length + matchingFederalDNCFileId.length + matchingTCPAFileId.length;
                    const badNumbers = nonMatchingDNCComplainersFileId.length + nonMatchingFederalDNCFileId.length + nonMatchingTCPAFileId.length;
                    const cost = calculateCost(csvData.length);
                    const userId = 1;
                    const date = new Date().toDateString();
                    await connection.query(
                        `INSERT INTO scrub_records 
                            (user_id, date, uploaded_file, scrubbed_against_states, scrubbed_against_options, 
                                total_numbers, clean_numbers, bad_numbers, cost, matching_file, non_matching_file) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [userId, date, fileName, scrubbedAgainstStates, scrubbedAgainstOptions,
                            totalNumbers, cleanNumbers, badNumbers, cost, matchingTCPAFileName, nonMatchingTCPAFileName]
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
                            matchingFilePath_TCPA: matchingTCPAFileName,
                            nonMatchingFilePath_TCPA: nonMatchingTCPAFileName,
                            matchingFilePath_DNC_Complainers: matchingDNCComplainersFileName,
                            nonMatchingFilePath_DNC_Complainers: nonMatchingDNCComplainersFileName,
                            matchingFilePath_Federal_DNC: matchingFederalDNCFileName,
                            nonMatchingFilePath_Federal_DNC: nonMatchingFederalDNCFileName,
                            cost: cost
                        }
                    });

                    
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
