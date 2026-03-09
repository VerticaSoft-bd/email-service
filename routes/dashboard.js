import express from 'express';
import User from '../models/User.js';
import domainRoutes from './domain.js';
import accountsRoutes from './accounts.js';
import apikeysRoutes from './apikeys.js';
import logsRoutes from './logs.js';
import adminRoutes from './admin.js';
import sendRoutes from './send.js';
import docsRoutes from './docs.js';
import campaignsRoutes from './campaigns.js';
import Domain from '../models/Domain.js';
import EmailAccount from '../models/EmailAccount.js';

const router = express.Router();

// Middleware to protect dashboard routes
router.use(async (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth/login');
        }
        req.user = user;
        // Make user available to EJS templates without passing it every time
        res.locals.user = user;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/', async (req, res) => {
    try {
        const domainCount = await Domain.countDocuments({ userId: req.user._id });
        const accountCount = await EmailAccount.countDocuments({ userId: req.user._id });
        res.render('dashboard/overview', { domainCount, accountCount });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.render('dashboard/overview', { domainCount: 0, accountCount: 0 });
    }
});

router.use('/domains', domainRoutes);
router.use('/accounts', accountsRoutes);
router.use('/apikeys', apikeysRoutes);
router.use('/logs', logsRoutes);
router.use('/admin', adminRoutes);
router.use('/send', sendRoutes);
router.use('/docs', docsRoutes);
router.use('/campaigns', campaignsRoutes);

export default router;
