import express from 'express'
import bcrypt from 'bcrypt'
import { body, validationResult } from 'express-validator'
import { Users } from '../models/Users.js'

const router = express.Router()

// Validation middleware
const validateSignup = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('password').notEmpty().withMessage('Password is required')
];

// Sign up route with validation
router.post('/signup', validateSignup, async (req, res) => {
    const { name, email, phone, password } = req.body;
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array() });
    }

    try {

        // Check if all fields are filled
        if (!name || !email || !phone || !password) {
            throw { status: 400, message: 'All fields are required' };
        }

        // Check if phone number is valid
        if(name.length < 5 || phone.length < 11 || phone.length > 15 || password.length < 5) {
            throw { status: 400, message: 'Follow the requirements for each field' };
        }

        // Check if email is valid
        if (!phone.match(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g)) {
            throw { status: 400, message: 'Phone number is not valid' };
        }

        // Check if user already exists
        const existingUser = await Users.findOne({ where: { email } });

        // Throw error if user already exists
        if (existingUser) {
            throw { status: 400, message: 'User already exists', data: null };
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const result = await Users.create({ name, email, phone, password: hashedPassword });

        // Respond with success message
        res.status(200).json({ status: 200, message: 'User created successfully', data: result });

    } catch (error) {
        console.error('Error during signup:', error);
        const status = error.status || 500;
        const message = error.message || 'Internal server error';
        res.status(status).json({ status, message });
    }
});

export default router