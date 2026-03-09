import express from 'express';
import User from '../models/User.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bcrypt = require('../tmp-install/node_modules/bcrypt');

const router = express.Router();

router.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('login', { error: 'Invalid email or password' });
        }

        req.session.userId = user._id;
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Internal server error' });
    }
});

router.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, company } = req.body;

        if (await User.findOne({ email })) {
            return res.render('register', { error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, company });
        await user.save();

        req.session.userId = user._id;
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('register', { error: 'Internal server error' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});

export default router;
