import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';
import { getUser } from './controller/getUser.js'
 
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
    res.json({ hello: 'Welcome to the MCQ System!' });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ status: 400, message: 'All fields are required' });
    }

    if(email.length < 3 || password.length < 3) {
        return res.json({ status: 400, message: 'Both fields must be of at least 3 characters' });
    }
    
    const result = await getUser(email, password);

    // Check the status returned by getUser and respond accordingly
    if (result.status === 200) {
        // req.session.username = email; 
        // req.session.token = uuidv4();
        res.json({ 
            status: 200, 
            message: result.message, 
            // session: { token: req.session.token, username: req.session.username }, 
            // data: result.data 
        });
    } else {
        res.json({ 
            status: result.status, 
            message: result.message, 
            // data: null 
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})