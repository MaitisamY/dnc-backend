import express from 'express'
import { getScrubData } from '../controller/getScrubData.js'

const router = express.Router()

router.get('/scrub/items', async (req, res) => {
    const { user } = req.query;
    const result = await getScrubData(user);

    res.json({ status: 200, data: result });
});

export default router