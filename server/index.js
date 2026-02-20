/**
 * Express backend — runs alongside Vite dev server.
 * Handles: Claude API proxy, Perplexity proxy, reference material loading.
 *
 * Usage:
 *   1. Add keys to .env:
 *        ANTHROPIC_API_KEY=sk-ant-...
 *        PERPLEXITY_API_KEY=pplx-...   (optional, needed for web research)
 *   2. Run:  node server/index.js
 *   3. Run Vite in another terminal:  npm run dev
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { initReferenceCache } from './api/reference.js';
import { chatRoute } from './api/chat.js';
import { perplexityRoute } from './api/perplexity.js';
import { referenceRoute } from './api/reference.js';

// Load .env from project root (one level up from server/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });

const app = express();
const PORT = process.env.PORT || 3001;

/* ── Validate required keys ── */
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n\u274C  ANTHROPIC_API_KEY not found in .env file.');
  console.error('   Create a .env file with:  ANTHROPIC_API_KEY=sk-ant-...\n');
  process.exit(1);
}

if (!process.env.PERPLEXITY_API_KEY) {
  console.warn('\n\u26A0\uFE0F  PERPLEXITY_API_KEY not found — web research will be unavailable.');
  console.warn('   Add to .env:  PERPLEXITY_API_KEY=pplx-...\n');
}

/* ── Middleware ── */
app.use(cors());
app.use(express.json({ limit: '50mb' }));

/* ── Routes ── */
app.post('/api/chat', chatRoute);
app.post('/api/perplexity', perplexityRoute);
app.get('/api/reference', referenceRoute);

/* ── Startup: load reference material then listen ── */
async function start() {
  console.log('\n  Loading reference material...');
  await initReferenceCache();

  app.listen(PORT, () => {
    console.log(`\n\u2705  Backend running on http://localhost:${PORT}`);
    console.log('   Routes:');
    console.log('     POST /api/chat        — Claude API proxy (with reference injection)');
    console.log('     POST /api/perplexity  — Perplexity API proxy');
    console.log('     GET  /api/reference   — Query reference material');
    console.log('');
  });
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
