import express from 'express';
import User from '../models/User.js';
import domainRoutes from './domain.js';
import accountsRoutes from './accounts.js';
import apikeysRoutes from './apikeys.js';
import logsRoutes from './logs.js';
import adminRoutes from './admin.js';
import sendRoutes from './send.js';

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

router.get('/', (req, res) => {
    res.render('dashboard/overview');
});

router.use('/domains', domainRoutes);
router.use('/accounts', accountsRoutes);
router.use('/apikeys', apikeysRoutes);
router.use('/logs', logsRoutes);
router.use('/admin', adminRoutes);
router.use('/send', sendRoutes);

export default router;
