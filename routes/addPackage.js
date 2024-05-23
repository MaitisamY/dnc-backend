import express from 'express'
import { Packages } from '../models/Packages.js'
import { formatDateTime } from '../utils/utilities.js'

const router = express.Router()

router.post('/admin/add/package', async (req, res) => {

    const { name, price, duration, benefits, detail } = req.body;
    const createdAt = formatDateTime();

    console.log('Validating package...');

    try {

        const check = await Packages.findOne({ where: { name } });
        if (check) {
            return res.status(400).json({ status: 400, message: 'Package already exists' });
        }

        console.log('Creating package...');

        const result = await Packages.create({ 
            name: name, 
            price: price, 
            duration: duration, 
            benefits: benefits, 
            detail: detail, 
            created_at: createdAt, 
            status: 1 
        });

        console.log('Package created:');

        if (!result) {
            return res.status(400).json({ status: 400, message: 'Package creation failed' });
        }

        res.json({ status: 200, data: result });

    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ status: 500, message: 'Error creating package' });
    }
});

export default router