/* ── Claude API Proxy Route ──
   Receives chat requests from frontend, injects reference material
   into system prompt, forwards to Anthropic API. */

import { getReferenceContext } from './reference.js';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

/**
 * POST /api/chat
 * Body: { model, max_tokens, system, messages, _meta?: { agentId, channel, campaignContext } }
 *
 * If _meta is provided, reference material is injected into the system prompt
 * server-side. The frontend can either pre-build the full system prompt (current)
 * or pass _meta to let the server inject references.
 */
export async function chatRoute(req, res) {
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    let { model, max_tokens, system, messages, _meta } = req.body;

    // Server-side reference injection when _meta is provided
    if (_meta && _meta.agentId) {
      const refContext = getReferenceContext(
        _meta.agentId,
        _meta.channel || '',
        _meta.campaignContext || ''
      );
      if (refContext) {
        system = system + '\n\n' + refContext;
      }
    }

    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens, system, messages }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', response.status, error);
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Chat proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
