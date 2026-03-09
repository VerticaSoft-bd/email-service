import { Router } from 'express';
import crypto from 'crypto';
import ApiKey from '../models/ApiKey.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const apikeys = await ApiKey.find({ userId: req.user._id }).sort({ createdAt: -1 });
        const plainKey = req.session.newApiKey || null;
        req.session.newApiKey = null; // Clear key from session after reading
        res.render('dashboard/apikeys', { apikeys, plainKey, error: null, success: null });
    } catch (err) {
        res.render('dashboard/apikeys', { apikeys: [], plainKey: null, error: err.message, success: null });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name } = req.body;

        // Generate a random plain key
        const randomBytes = crypto.randomBytes(24).toString('hex');
        const plainKey = 'sk_' + randomBytes;
        const prefix = plainKey.substring(0, 10);

        // Hash the key for storage
        const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');

        const apiKey = new ApiKey({
            userId: req.user._id,
            name,
            keyHash,
            prefix
        });

        await apiKey.save();

        req.session.newApiKey = plainKey;
        res.redirect('/dashboard/apikeys');
    } catch (err) {
        const apikeys = await ApiKey.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.render('dashboard/apikeys', { apikeys, plainKey: null, error: err.message, success: null });
    }
});

router.post('/:id/delete', async (req, res) => {
    try {
        await ApiKey.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.redirect('/dashboard/apikeys');
    } catch (err) {
        res.redirect('/dashboard/apikeys');
    }
});

export default router;
