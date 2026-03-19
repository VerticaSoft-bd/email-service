import { Router } from 'express';
import Unsubscribe from '../models/Unsubscribe.js';

const router = Router();

// GET /dashboard/suppressions
router.get('/', async (req, res) => {
    try {
        const suppressions = await Unsubscribe.find({ userId: req.user._id })
            .sort({ createdAt: -1 });
        
        res.render('dashboard/suppressions', { 
            suppressions,
            error: null,
            success: null
        });
    } catch (err) {
        res.render('dashboard/suppressions', { 
            suppressions: [], 
            error: err.message, 
            success: null 
        });
    }
});

// DELETE /dashboard/suppressions/:id
router.post('/delete/:id', async (req, res) => {
    try {
        await Unsubscribe.deleteOne({ _id: req.params.id, userId: req.user._id });
        res.redirect('/dashboard/suppressions');
    } catch (err) {
        res.redirect('/dashboard/suppressions?error=' + encodeURIComponent(err.message));
    }
});

export default router;
