import { Router } from 'express';
import User from '../models/User.js';
import EmailLog from '../models/EmailLog.js';
import EmailAccount from '../models/EmailAccount.js';
import Order from '../models/Order.js';

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
        
        // Fetch pending refund requests
        const refundRequests = await Order.find({ status: 'refund-requested' })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.render('dashboard/admin', {
            stats: { totalUsers, totalDomains, totalEmailsSent, totalAccounts },
            users,
            refundRequests,
            error: null
        });
    } catch (err) {
        res.render('dashboard/admin', { stats: {}, users: [], refundRequests: [], error: err.message });
    }
});

// Approve Refund Request
router.post('/refund/approve/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order || order.status !== 'refund-requested') {
            return res.redirect('/dashboard/admin?error=InvalidOrder');
        }

        order.status = 'refunded';
        await order.save();

        // Downgrade User Plan
        await User.findByIdAndUpdate(order.userId, {
            plan: 'starter',
            $unset: { subscriptionExpiry: "" }
        });

        res.redirect('/dashboard/admin?success=RefundApproved');
    } catch (err) {
        console.error('Error approving refund:', err);
        res.redirect('/dashboard/admin?error=RefundApprovalFailed');
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
