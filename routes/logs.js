import { Router } from 'express';
import EmailLog from '../models/EmailLog.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const query = { userId: req.user._id };

        const logs = await EmailLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        const total = await EmailLog.countDocuments(query);
        const pages = Math.ceil(total / limit);

        res.render('dashboard/logs', {
            logs,
            page,
            pages,
            total,
            error: null
        });
    } catch (err) {
        res.render('dashboard/logs', { logs: [], page: 1, pages: 1, total: 0, error: err.message });
    }
});

export default router;
