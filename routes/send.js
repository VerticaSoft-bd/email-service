import { Router } from 'express';
import EmailAccount from '../models/EmailAccount.js';
import EmailLog from '../models/EmailLog.js';
import { sendEmail } from '../services/ses.js';

const router = Router();

// Render send email page
router.get('/', async (req, res) => {
    try {
        const accounts = await EmailAccount.find({ userId: req.user._id });
        res.render('dashboard/send', {
            accounts,
            error: null,
            success: null
        });
    } catch (err) {
        res.render('dashboard/send', { accounts: [], error: err.message, success: null });
    }
});

// Process sending email from UI
router.post('/', async (req, res) => {
    try {
        const accounts = await EmailAccount.find({ userId: req.user._id });
        const { fromAccount, to, subject, body } = req.body;

        if (!fromAccount || !to || !subject || !body) {
            return res.render('dashboard/send', { accounts, error: 'All fields are required.', success: null });
        }

        if (!req.user.domainVerified) {
            return res.render('dashboard/send', { accounts, error: 'Your domain is not verified yet.', success: null });
        }

        // Validate that the user owns this account
        const account = accounts.find(a => a._id.toString() === fromAccount);
        if (!account) {
            return res.render('dashboard/send', { accounts, error: 'Invalid sender account selected.', success: null });
        }

        const senderAddress = `${account.prefix}@${account.domain}`;
        const userWithSender = { ...req.user.toObject(), senderEmail: senderAddress };

        let status = 'Sent';
        let messageId = null;
        let errorMessage = null;

        try {
            const result = await sendEmail({ user: userWithSender, to, subject, body });
            messageId = result.messageId;

            req.user.usage.emailsSent = (req.user.usage.emailsSent || 0) + 1;
            await req.user.save();
        } catch (sesError) {
            status = 'Failed';
            errorMessage = sesError.message;
        }

        // Log it
        const log = new EmailLog({
            userId: req.user._id,
            sender: senderAddress,
            recipient: to,
            subject,
            status,
            messageId
        });
        await log.save();

        if (status === 'Sent') {
            res.render('dashboard/send', { accounts, error: null, success: 'Email sent successfully!' });
        } else {
            res.render('dashboard/send', { accounts, error: `Failed to send email: ${errorMessage}`, success: null });
        }

    } catch (err) {
        const accounts = await EmailAccount.find({ userId: req.user._id });
        res.render('dashboard/send', { accounts, error: err.message, success: null });
    }
});

export default router;
