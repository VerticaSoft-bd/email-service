import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import emailRoutes from './routes/email.js';
import trackRoutes from './routes/track.js';
import unsubscribeRoutes from './routes/unsubscribe.js';
import snsRoutes from './routes/sns.js';
import { startCampaignWorker } from './services/campaignWorker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/emailSaaS';

// ── Middleware ──────────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-1234',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 14 } // 14 days
}));

// ── View Engine ────────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', emailRoutes);
app.use('/track', trackRoutes);
app.use('/unsubscribe', unsubscribeRoutes);
app.use('/sns', express.text({ type: 'text/plain' }), snsRoutes);

// Redirect root to landing page
app.get('/', (req, res) => res.render('index'));

// ── Database & Server ──────────────────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅  Connected to MongoDB');
    if (process.env.NODE_ENV !== 'production' || process.env.START_WORKER === 'true') {
      startCampaignWorker();
    }
    if (import.meta.url === `file://${process.argv[1]}`) {
      app.listen(PORT, () => {
        console.log(`🚀  Server running at http://localhost:${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.error('❌  MongoDB connection error:', err.message);
  });

export default app;
