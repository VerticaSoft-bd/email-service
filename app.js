import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import emailRoutes from './routes/email.js';
import { createRequire } from 'module';
import trackRoutes from './routes/track.js';
import unsubscribeRoutes from './routes/unsubscribe.js';
import { startCampaignWorker } from './services/campaignWorker.js';

const require = createRequire(import.meta.url);
const session = require('./tmp-install/node_modules/express-session');
const MongoStore = require('./tmp-install/node_modules/connect-mongo').default;

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

// Redirect root to landing page
app.get('/', (req, res) => res.render('index'));

// ── Database & Server ──────────────────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅  Connected to MongoDB');
    startCampaignWorker();
    app.listen(PORT, () => {
      console.log(`🚀  Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });
