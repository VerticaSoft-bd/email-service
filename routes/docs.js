import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
    // Generate the dynamic API URL based on the current host
    const apiUrl = `${req.protocol}://${req.get('host')}/api/send`;
    res.render('dashboard/docs', { apiUrl });
});

export default router;
