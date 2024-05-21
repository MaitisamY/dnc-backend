import express from 'express'
import { getScrubData, getScrubDataForAdmin } from '../controller/getScrubData.js'

const router = express.Router()

router.get('/scrub/items', async (req, res) => {
    const { user } = req.query;
    const result = await getScrubData(user);

    res.json({ status: 200, data: result });
});

router.get('/admin/get/scrub/items', async (req, res) => {
    const result = await getScrubDataForAdmin();
    res.json({ status: 200, data: result });
})

export default router