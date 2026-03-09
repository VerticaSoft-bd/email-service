import { Router } from 'express';
import crypto from 'crypto';
import ApiKey from '../models/ApiKey.js';
import User from '../models/User.js';
import EmailLog from '../models/EmailLog.js';
import { sendEmail } from '../services/ses.js';
import EmailAccount from '../models/EmailAccount.js';
import mongoose from 'mongoose';

const router = Router();

// Middleware to authenticate API requests via Bearer Token
router.use(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer sk_')) {
        return res.status(401).json({ error: 'Missing or invalid API key. Expected Format: Bearer sk_...' });
    }

    const plainKey = authHeader.split(' ')[1];
    const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');

    try {
        const apiKey = await ApiKey.findOne({ keyHash });
        if (!apiKey) {
            return res.status(401).json({ error: 'Invalid API key.' });
        }

        const user = await User.findById(apiKey.userId);
        if (!user) return res.status(401).json({ error: 'User associated with this key no longer exists.' });

        req.user = user;
        req.apiKey = apiKey;

        // Update lastUsedAt
        apiKey.lastUsedAt = new Date();
        await apiKey.save();

        // Increment usage
        user.usage.apiRequests = (user.usage.apiRequests || 0) + 1;
        await user.save();

        next();
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
});

router.post('/send', async (req, res) => {
    try {
        const { from, to, subject, body } = req.body;

        if (!to || !subject || !body) {
            return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
        }

        const senderAddress = from ? from.toLowerCase() : user.senderEmail;
        if (!senderAddress || !senderAddress.includes('@')) {
            return res.status(400).json({ error: 'Invalid or missing from address.' });
        }

        const [prefix, domainName] = senderAddress.split('@');

        // Check if account exists for this user
        const account = await EmailAccount.findOne({ userId: req.user._id, prefix, domain: domainName });
        if (!account) {
            return res.status(403).json({ error: `You have not created the email identity '${senderAddress}'. Please create it in the dashboard.` });
        }

        const userWithSender = { ...req.user.toObject(), senderEmail: senderAddress };

        let status = 'Sent';
        let messageId = null;
        // Temporarily prepare the log ID for the pixel tracking
        const logId = new mongoose.Types.ObjectId();

        // Include a 1x1 transparent tracking pixel in the body (Requires absolute URL, assuming current domain context)
        // Usually, in a SaaS, the HOST_URL would be defined in .env
        const hostUrl = process.env.HOST_URL || `${req.protocol}://${req.get('host')}`;
        const trackingPixel = `<img src="${hostUrl}/track/${logId}" width="1" height="1" style="display:none;" />`;

        let finalBody = body;
        if (account.signature) {
            finalBody += `<br><br>${account.signature}`;
        }

        // Ensure body format allows HTML tracking pixel
        const htmlBody = finalBody + trackingPixel;

        try {
            const result = await sendEmail({ user: userWithSender, to, subject, body: htmlBody });
            messageId = result.messageId;

            // Increment email usage
            req.user.usage.emailsSent = (req.user.usage.emailsSent || 0) + 1;
            await req.user.save();
        } catch (sesError) {
            status = 'Failed';
            errorMessage = sesError.message;
        }

        // Log the email
        const log = new EmailLog({
            _id: logId,
            userId: req.user._id,
            sender: senderAddress,
            recipient: to,
            subject,
            status,
            messageId
        });
        await log.save();

        if (status === 'Sent') {
            res.json({ success: true, messageId, logId: log._id });
        } else {
            res.status(500).json({ success: false, error: errorMessage, logId: log._id });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper route to get logs for API users
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const logs = await EmailLog.find({ userId: req.user._id })
            .select('-userId')
            .sort({ timestamp: -1 })
            .limit(limit);

        res.json({ logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
