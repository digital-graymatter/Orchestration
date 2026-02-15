/**
 * Local API proxy for Claude — runs alongside Vite dev server.
 * Keeps the API key server-side. Browser sends to localhost:3001,
 * proxy forwards to Anthropic API with auth header.
 *
 * Usage:
 *   1. Add your API key to .env:  ANTHROPIC_API_KEY=sk-ant-...
 *   2. Run:  node server.js
 *   3. Run Vite in another terminal:  npm run dev
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('\n\u274C  ANTHROPIC_API_KEY not found in .env file.');
  console.error('   Create a .env file in this folder with:\n');
  console.error('   ANTHROPIC_API_KEY=sk-ant-your-key-here\n');
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', response.status, error);
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n\u2705  API proxy running on http://localhost:${PORT}`);
  console.log('   Forwarding requests to Anthropic API\n');
});
