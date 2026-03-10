import { Router } from 'express';
import Domain from '../models/Domain.js';
import {
    verifyDomain,
    getDnsRecords,
    checkVerificationStatus,
} from '../services/ses.js';
import { checkDomainLimit } from '../middleware/checkLimits.js';

const router = Router();

// GET /dashboard/domains
router.get('/', async (req, res) => {
    try {
        const domains = await Domain.find({ userId: req.user._id }).sort({ createdAt: -1 });

        const domainsWithRecords = domains.map(d => {
            const records = getDnsRecords(d);
            return { ...d.toObject(), dnsRecords: records };
        });

        res.render('dashboard/domains', { domains: domainsWithRecords, statusMessage: null, error: null });
    } catch (err) {
        res.status(500).render('dashboard/domains', { domains: [], statusMessage: null, error: err.message });
    }
});

// POST /dashboard/domains/verify (Add new domain)
router.post('/verify', checkDomainLimit, async (req, res) => {
    try {
        let { domainName } = req.body;
        domainName = domainName.trim().toLowerCase();

        if (!domainName) {
            return res.redirect('/dashboard/domains?error=Please enter a domain.');
        }

        // Check if exists
        let domainDoc = await Domain.findOne({ userId: req.user._id, domain: domainName });
        if (!domainDoc) {
            domainDoc = new Domain({
                userId: req.user._id,
                domain: domainName
            });
            await domainDoc.save();
        }

        const { verificationToken, dkimTokens } = await verifyDomain(domainDoc);

        // Save tokens to DB
        domainDoc.verificationToken = verificationToken;
        domainDoc.dkimTokens = dkimTokens;
        await domainDoc.save();

        res.render('dashboard/domains', {
            domains: [{ ...domainDoc.toObject(), dnsRecords: getDnsRecords(domainDoc) }], // Show just this for a moment or redirect
            statusMessage: `✅ Domain ${domainName} added! Please add the DNS records below to verify.`,
            error: null,
        });

    } catch (err) {
        const domains = await Domain.find({ userId: req.user._id }).sort({ createdAt: -1 });
        const domainsWithRecords = domains.map(d => ({ ...d.toObject(), dnsRecords: getDnsRecords(d) }));
        res.render('dashboard/domains', {
            domains: domainsWithRecords,
            statusMessage: null,
            error: `AWS SES Error: ${err.message}`,
        });
    }
});

// GET /dashboard/domains/:id/status
router.get('/:id/status', async (req, res) => {
    try {
        const domainDoc = await Domain.findOne({ _id: req.params.id, userId: req.user._id });
        if (!domainDoc) {
            return res.redirect('/dashboard/domains?error=Domain not found.');
        }

        const { status, verified } = await checkVerificationStatus(domainDoc);

        if (verified && !domainDoc.isVerified) {
            domainDoc.isVerified = true;
            await domainDoc.save();
        }

        const domains = await Domain.find({ userId: req.user._id }).sort({ createdAt: -1 });
        const domainsWithRecords = domains.map(d => ({ ...d.toObject(), dnsRecords: getDnsRecords(d) }));

        res.render('dashboard/domains', {
            domains: domainsWithRecords,
            statusMessage: verified
                ? `🎉 ${domainDoc.domain} is verified! You can now create email accounts.`
                : `⏳ ${domainDoc.domain} verification status: ${status}. Please wait for DNS propagation.`,
            error: null,
        });
    } catch (err) {
        res.redirect(`/dashboard/domains?error=Could not check status: ${err.message}`);
    }
});

// POST /dashboard/domains/:id/delete
router.post('/:id/delete', async (req, res) => {
    try {
        await Domain.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.redirect('/dashboard/domains');
    } catch (err) {
        res.redirect('/dashboard/domains');
    }
});

export default router;
