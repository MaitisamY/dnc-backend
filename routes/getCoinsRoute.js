import express from 'express'
import { getCoins } from '../controller/getCoins.js'

const router = express.Router()

router.get('/coins', async (req, res) => {
    const { user } = req.query;
    const result = await getCoins(user);

    res.json({ status: 200, coins: result });
});

export default router