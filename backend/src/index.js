const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(morgan('combined'));

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '30'), // 30 req/min
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// In-memory store
// Map: id -> { ciphertext, iv, meta: { createdAt, expiresAt, expireOnView } }
const store = new Map();

// Cleanup interval
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 min
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (entry.meta.expiresAt && entry.meta.expiresAt <= now) {
      store.delete(id);
      console.log('expired and removed', id);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Helpers
function makeId() {
  return uuidv4().split('-')[0]; // courte (8 chars)
}

// Create a new secret
// Expected body: { ciphertext: string (base64), iv: base64, tagLen?: number, expiresInSec: number|null, expireOnView: boolean }
app.post('/api/create', (req, res) => {
  try {
    const { ciphertext, iv, expiresInSec, expireOnView } = req.body || {};
    if (!ciphertext || !iv) return res.status(400).json({ error: 'ciphertext and iv required' });

    // Validate expiration: null or between 3600 (1h) and 259200 (72h)
    let expiresAt = null;
    if (typeof expiresInSec === 'number') {
      const min = 3600;
      const max = 72 * 3600;
      if (expiresInSec < min || expiresInSec > max) return res.status(400).json({ error: 'expiresInSec out of range' });
      expiresAt = Date.now() + expiresInSec * 1000;
    }

    const id = makeId();
    store.set(id, {
      ciphertext,
      iv,
      meta: {
        createdAt: Date.now(),
        expiresAt,
        expireOnView: !!expireOnView,
      },
    });

    // schedule deletion if expiresAt
    if (expiresAt) {
      const ttl = expiresAt - Date.now();
      setTimeout(() => store.delete(id), ttl + 5000);
    }

    res.json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal' });
  }
});

// Retrieve encrypted payload
app.get('/api/p/:id', (req, res) => {
  try {
    const id = req.params.id;
    const entry = store.get(id);
    if (!entry) return res.status(404).json({ error: 'not found or expired' });

    const now = Date.now();
    if (entry.meta.expiresAt && entry.meta.expiresAt <= now) {
      store.delete(id);
      return res.status(404).json({ error: 'expired' });
    }

    // return ciphertext + iv + flags
    res.json({ ciphertext: entry.ciphertext, iv: entry.iv, expireOnView: entry.meta.expireOnView, expiresAt: entry.meta.expiresAt });

    // if expireOnView, delete after sending
    if (entry.meta.expireOnView) {
      store.delete(id);
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal' });
  }
});

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`SecureShare backend listening on ${PORT}`));
