import { Router } from 'express';
import User from '../models/User.js';
import {
    verifyDomain,
    getDnsRecords,
    checkVerificationStatus,
} from '../services/ses.js';

const router = Router();

// GET /dashboard/domains
router.get('/', async (req, res) => {
    try {
        const user = req.user;
        const dnsRecords = getDnsRecords(user);
        res.render('dashboard/domains', { dnsRecords, statusMessage: null, error: null });
    } catch (err) {
        res.status(500).render('dashboard/domains', { dnsRecords: [], statusMessage: null, error: err.message });
    }
});

// POST /dashboard/domains/verify
router.post('/verify', async (req, res) => {
    try {
        const user = req.user;
        const { domain } = req.body;

        if (domain) {
            user.domain = domain;
            await user.save();
        }

        if (!user.domain) {
            return res.render('dashboard/domains', { dnsRecords: [], statusMessage: null, error: 'Please enter a domain.' });
        }

        const { verificationToken, dkimTokens } = await verifyDomain(user);

        // Save tokens to DB
        user.verificationToken = verificationToken;
        user.dkimTokens = dkimTokens;
        await user.save();

        const dnsRecords = getDnsRecords(user);

        res.render('dashboard/domains', {
            dnsRecords,
            statusMessage: '✅ Domain verification initiated! Add the DNS records below to your domain registrar.',
            error: null,
        });
    } catch (err) {
        const dnsRecords = getDnsRecords(req.user);
        res.render('dashboard/domains', {
            dnsRecords,
            statusMessage: null,
            error: `AWS SES Error: ${err.message}`,
        });
    }
});

// GET /dashboard/domains/status
router.get('/status', async (req, res) => {
    try {
        const user = req.user;
        const { status, verified } = await checkVerificationStatus(user);

        if (verified && !user.domainVerified) {
            user.domainVerified = true;
            await user.save();
        }

        const dnsRecords = getDnsRecords(user);

        res.render('dashboard/domains', {
            dnsRecords,
            statusMessage: verified
                ? '🎉 Domain is verified! You can now create email accounts.'
                : `⏳ Domain verification status: ${status}. Please wait for DNS propagation.`,
            error: null,
        });
    } catch (err) {
        const dnsRecords = getDnsRecords(req.user);
        res.render('dashboard/domains', {
            dnsRecords,
            statusMessage: null,
            error: `Could not check status: ${err.message}`,
        });
    }
});

export default router;
