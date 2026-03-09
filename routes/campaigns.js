import express from 'express';
import Campaign from '../models/Campaign.js';
import Recipient from '../models/Recipient.js';
import EmailAccount from '../models/EmailAccount.js';

const router = express.Router();

// List campaigns
router.get('/', async (req, res) => {
    try {
        const campaigns = await Campaign.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.render('dashboard/campaigns/list', { campaigns });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// View create form
router.get('/create', async (req, res) => {
    try {
        const accounts = await EmailAccount.find({ userId: req.user._id });
        res.render('dashboard/campaigns/create', { accounts });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Create campaign
router.post('/', async (req, res) => {
    try {
        const { name, senderAccount, subject, bodyHtml } = req.body;

        const account = await EmailAccount.findOne({ _id: senderAccount, userId: req.user._id });
        if (!account) return res.status(403).send('Invalid sender account');

        const campaign = new Campaign({
            userId: req.user._id,
            name,
            senderAccount,
            subject,
            bodyHtml
        });

        await campaign.save();
        res.redirect(`/dashboard/campaigns/${campaign._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// View campaign details
router.get('/:id', async (req, res) => {
    try {
        const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user._id })
            .populate('senderAccount');

        if (!campaign) return res.status(404).send('Not Found');

        // Optional: Get sample of recipients
        const recipients = await Recipient.find({ campaignId: campaign._id }).limit(10);

        res.render('dashboard/campaigns/view', { campaign, recipients });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Upload recipients (JSON from frontend)
router.post('/:id/upload', async (req, res) => {
    try {
        const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user._id });
        if (!campaign || campaign.status !== 'Draft') {
            return res.status(400).json({ error: 'Cannot upload to this campaign' });
        }

        const { recipients } = req.body;
        if (!Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ error: 'No valid recipients provided' });
        }

        // Bulk insert
        const ops = recipients.map(row => {
            const email = String(row.email || row.Email || "").toLowerCase().trim();
            const variables = { ...row };
            delete variables.email;
            delete variables.Email;

            return {
                insertOne: {
                    document: {
                        campaignId: campaign._id,
                        email,
                        variables,
                        status: 'Pending'
                    }
                }
            };
        }).filter(op => op.insertOne.document.email); // Must have email

        if (ops.length > 0) {
            try {
                await Recipient.bulkWrite(ops, { ordered: false });
            } catch (bulkErr) {
                // Ignore duplicate key errors, some might have succeeded
            }
        }

        const total = await Recipient.countDocuments({ campaignId: campaign._id });
        campaign.totalRecipients = total;
        campaign.status = 'Ready';
        await campaign.save();

        res.json({ success: true, totalRecipients: total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Start Campaign
router.post('/:id/start', async (req, res) => {
    try {
        const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user._id });
        if (!campaign || campaign.status !== 'Ready') return res.status(400).send('Invalid state to start');

        campaign.status = 'Sending';
        campaign.startedAt = new Date();
        await campaign.save();

        res.redirect(`/dashboard/campaigns/${campaign._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

export default router;
