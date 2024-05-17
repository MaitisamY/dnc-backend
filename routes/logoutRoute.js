import express from 'express'

const router = express.Router()

router.post('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('Error during logout:', error);
            res.status(500).json({ status: 500, message: 'Internal server error' });
        } else {
            res.status(200).json({ status: 200, message: 'Logout successful' });
        }
    });
});

export default router

