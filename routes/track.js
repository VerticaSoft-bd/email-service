import { Router } from 'express';
import EmailLog from '../models/EmailLog.js';

const router = Router();

// Transparent 1x1 pixel image buffer
const pixelBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

router.get('/:logId', async (req, res) => {
    try {
        const { logId } = req.params;

        // Find the log entry without blocking the response
        EmailLog.findById(logId).then(log => {
            if (log) {
                log.opened = true;
                log.openCount += 1;
                log.lastOpenedAt = new Date();
                log.save().catch(err => console.error('Error saving open log:', err));
            }
        }).catch(err => console.error('Error fetching email log for tracking:', err));

        // Immediately respond with the 1x1 transparent GIF
        res.set({
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(pixelBuffer);

    } catch (err) {
        // Fallback to sending pixel even if something throws
        res.set('Content-Type', 'image/gif');
        res.end(pixelBuffer);
    }
});

export default router;
