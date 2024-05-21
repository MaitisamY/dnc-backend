import express from 'express'
import passport from 'passport';
import bcrypt from 'bcrypt';
import { Strategy as LocalStrategy } from 'passport-local';
import { body, validationResult } from 'express-validator';
import { Admins } from '../models/Admins.js';
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

// Passport local strategy setup
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
      const user = await Admins.findOne({ where: { email } });
      
      if (!user) {
        return done(null, false, { message: 'Invalid email address' });
      }
  
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return done(null, false, { message: 'Invalid password' });
      }
  
      return done(null, user);
    } catch (error) {
      return done(error);
    }
}));
  
// Serialize user
passport.serializeUser((user, done) => {
    done(null, user.id); // Serialize user's id
});
  
// Deserialize user
passport.deserializeUser(async (id, done) => {
    try {
        const user = await Admins.findByPk(id); // Find user by id
        done(null, user);
    } catch (error) {
        done(error);
    }
});
  
// Validation middleware
const validateLogin = [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').notEmpty().withMessage('Password is required')
];

// Login route with validation
router.post('/admin/login', validateLogin, (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
  
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return res.status(500).json({ status: 500, error: err.message });
        }
        if (!user) {
            return res.status(401).json({ status: 401, error: info.message });
        }
        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Generate session token
            const sessionToken = uuidv4();

            // Set session token
            req.session.token = sessionToken;

            // Extract user data
            const { id, name, email } = user;

            console.log(req.session);

            // Respond with success message, token and data
            return res.status(200).json({ 
                status: 200, 
                token: sessionToken,
                data: { id: id, name: name, email: email },
                message: 'Login successful',
            });

        });
    })(req, res, next);
});

export default router;
