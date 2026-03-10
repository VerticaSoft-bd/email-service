import { Router } from 'express';
import EmailAccount from '../models/EmailAccount.js';
import Domain from '../models/Domain.js';
import bcrypt from 'bcrypt';
import { checkIdentityLimit } from '../middleware/checkLimits.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const accounts = await EmailAccount.find({ userId: req.user._id }).sort({ createdAt: -1 });
        const domains = await Domain.find({ userId: req.user._id, isVerified: true });
        res.render('dashboard/accounts', { accounts, domains, error: null, success: null });
    } catch (err) {
        res.render('dashboard/accounts', { accounts: [], domains: [], error: err.message, success: null });
    }
});

router.post('/', checkIdentityLimit, async (req, res) => {
    try {
        const { prefix, password, domainId } = req.body;
        const domains = await Domain.find({ userId: req.user._id, isVerified: true });

        if (!domainId) {
            return res.render('dashboard/accounts', { accounts: [], domains, error: 'Please select a domain.', success: null });
        }

        const domainDoc = domains.find(d => d._id.toString() === domainId);
        if (!domainDoc) {
            return res.render('dashboard/accounts', { accounts: [], domains, error: 'Invalid or unverified domain selected.', success: null });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const account = new EmailAccount({
            userId: req.user._id,
            prefix: prefix.toLowerCase().replace(/[^a-z0-9]/g, ''),
            domain: domainDoc.domain,
            password: hashedPassword
        });

        await account.save();

        const accounts = await EmailAccount.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.render('dashboard/accounts', { accounts, domains, error: null, success: `Email account ${account.prefix}@${domainDoc.domain} created successfully!` });
    } catch (err) {
        const accounts = await EmailAccount.find({ userId: req.user._id }).sort({ createdAt: -1 });
        const domains = await Domain.find({ userId: req.user._id, isVerified: true });
        let errorMsg = err.message;
        if (err.code === 11000) errorMsg = 'This email account already exists.';
        res.render('dashboard/accounts', { accounts, domains, error: errorMsg, success: null });
    }
});

router.post('/:id/delete', async (req, res) => {
    try {
        await EmailAccount.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.redirect('/dashboard/accounts');
    } catch (err) {
        res.redirect('/dashboard/accounts');
    }
});

router.post('/:id/signature', async (req, res) => {
    try {
        const { signature } = req.body;
        await EmailAccount.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { signature }
        );
        res.redirect('/dashboard/accounts');
    } catch (err) {
        res.redirect('/dashboard/accounts');
    }
});

export default router;
