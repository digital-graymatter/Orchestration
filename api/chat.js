/**
 * Vercel Serverless Function — Claude API proxy with reference injection.
 * If _meta is provided in the request body, injects reference material
 * into the system prompt server-side before forwarding to Anthropic.
 */

import { getReferenceContext } from './reference-loader.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });

  try {
    let { model, max_tokens, system, messages, _meta } = req.body;

    // Server-side reference injection when _meta is provided
    if (_meta && _meta.agentId) {
      const refContext = await getReferenceContext(
        _meta.agentId,
        _meta.channel || '',
        _meta.campaignContext || ''
      );
      if (refContext) {
        system = system + '\n\n' + refContext;
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
