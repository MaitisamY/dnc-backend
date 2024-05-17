import express from 'express'

const router = express.Router()

router.get('/', (req, res) => {
    res.json({ hello: 'Welcome to DNC Litigator Check - Backend!' });
});

export default router