import express from 'express'
import { Packages } from '../models/Packages.js'

const router = express.Router()

router.get('/admin/get/packages', async (req, res) => {
    const result = await Packages.findAll();
    res.json({ status: 200, data: result });
});

export default router