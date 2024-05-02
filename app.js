import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';
import { getUser } from './controller/getUser.js';
import { addUser } from './controller/addUser.js';
import validator from "validator";
 
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, 
    httpOnly: true
}));

app.get('/', (req, res) => {
    res.json({ hello: 'Welcome to DNC Litigator Check - Backend!' });
});

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
            res.status(200).json({ status: 200, message: 'Login successful',
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
