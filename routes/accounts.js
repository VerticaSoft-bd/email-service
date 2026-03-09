import { Router } from 'express';
import EmailAccount from '../models/EmailAccount.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bcrypt = require('../tmp-install/node_modules/bcrypt');

const router = Router();

router.get('/', async (req, res) => {
    try {
        const accounts = await EmailAccount.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.render('dashboard/accounts', { accounts, error: null, success: null });
    } catch (err) {
        res.render('dashboard/accounts', { accounts: [], error: err.message, success: null });
    }
});

router.post('/', async (req, res) => {
    try {
        const { prefix, password } = req.body;
        const domain = req.user.domain;

        if (!domain) {
            return res.render('dashboard/accounts', { accounts: [], error: 'Please set up a domain first in the Domains section.', success: null });
        }

        if (!req.user.domainVerified) {
            return res.render('dashboard/accounts', { accounts: [], error: 'Domain must be verified before creating accounts.', success: null });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const account = new EmailAccount({
            userId: req.user._id,
            prefix: prefix.toLowerCase().replace(/[^a-z0-9]/g, ''),
            domain,
            password: hashedPassword
        });

        await account.save();

        const accounts = await EmailAccount.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.render('dashboard/accounts', { accounts, error: null, success: `Email account ${account.prefix}@${domain} created successfully!` });
    } catch (err) {
        const accounts = await EmailAccount.find({ userId: req.user._id }).sort({ createdAt: -1 });
        let errorMsg = err.message;
        if (err.code === 11000) errorMsg = 'This email account already exists.';
        res.render('dashboard/accounts', { accounts, error: errorMsg, success: null });
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
