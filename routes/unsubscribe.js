import express from 'express';
import Unsubscribe from '../models/Unsubscribe.js';

const router = express.Router();

// GET /unsubscribe/:userId/:emailBase64
router.get('/:userId/:emailBase64', async (req, res) => {
    try {
        const { userId, emailBase64 } = req.params;
        const email = Buffer.from(emailBase64, 'base64').toString('utf8');

        // Check if already unsubscribed
        const exists = await Unsubscribe.findOne({ userId, email });
        let message = 'You have already been unsubscribed.';
        
        if (!exists) {
            await Unsubscribe.create({
                userId,
                email,
                reason: 'One-click unsubscribe'
            });
            message = 'You have been successfully unsubscribed.';
        }

        res.render('unsubscribe', { email, message });
    } catch (err) {
        console.error('Unsubscribe error:', err);
        res.status(500).send('Error processing unsubscribe request.');
    }
});

// POST used by some email clients for One-Click Unsubscribe (RFC 8058)
router.post('/:userId/:emailBase64', async (req, res) => {
    try {
        const { userId, emailBase64 } = req.params;
        const email = Buffer.from(emailBase64, 'base64').toString('utf8');

        const exists = await Unsubscribe.findOne({ userId, email });
        if (!exists) {
            await Unsubscribe.create({
                userId,
                email,
                reason: 'RFC8058 One-click'
            });
        }
        res.status(200).send('OK');
    } catch (err) {
        res.status(500).send('Error');
    }
});

export default router;
