import { Router } from 'express';
import User from '../models/User.js';
import EmailLog from '../models/EmailLog.js';
import EmailAccount from '../models/EmailAccount.js';

const router = Router();

// Middleware to ensure user is admin
router.use((req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send('Forbidden: Admins only');
    }
    next();
});

router.get('/', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalDomains = await User.countDocuments({ domainVerified: true });
        const totalEmailsSent = await EmailLog.countDocuments({ status: 'Sent' });
        const totalAccounts = await EmailAccount.countDocuments();

        const users = await User.find().sort({ createdAt: -1 }).limit(50);

        res.render('dashboard/admin', {
            stats: { totalUsers, totalDomains, totalEmailsSent, totalAccounts },
            users,
            error: null
        });
    } catch (err) {
        res.render('dashboard/admin', { stats: {}, users: [], error: err.message });
    }
});

router.post('/user/:id/suspend', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user && user.role !== 'admin') {
            user.role = user.role === 'suspended' ? 'user' : 'suspended';
            await user.save();
        }
        res.redirect('/dashboard/admin');
    } catch (err) {
        res.redirect('/dashboard/admin');
    }
});

export default router;
