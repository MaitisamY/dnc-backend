import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import session from 'express-session'
import path from 'path'
import passport from 'passport';
import { fileURLToPath } from 'url'

import sequelize from './config/sequelize.js';
import flash from 'connect-flash';
import getScrubRoute from './routes/getScrubRoute.js'
import loginRoute from './routes/loginRoute.js'
import signupRoute from './routes/signUpRoute.js'
import logoutRoute from './routes/logoutRoute.js'
import getCoinsRoute from './routes/getCoinsRoute.js'
import addScrubItemRoute from './routes/addScrubItemRoute.js'
import adminLoginRoute from './routes/adminLoginRoute.js'
import getPackages from './routes/getPackages.js'
import addPackage from './routes/addPackage.js'

// Get the directory path of the current module file
const __dirname = fileURLToPath(new URL('.', import.meta.url));

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

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// Add connect-flash middleware for flash messages
app.use(flash());

// Import and sync Sequelize models
import './models/Users.js';
import './models/ScrubRecords.js';
import './models/Admins.js';
import './models/Packages.js';

// Sync models with the database
sequelize.sync();

// Login route
app.use('/', loginRoute);
app.use('/', signupRoute);
app.use('/', logoutRoute);
app.use('/', getScrubRoute);
app.use('/', getCoinsRoute);
app.use('/', addScrubItemRoute);
app.use('/', adminLoginRoute);
app.use('/', getPackages);
app.use('/', addPackage);

/* Custom Routes */

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'main.html'));
});

app.get('/uploads', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'unauthorized.html'));
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});