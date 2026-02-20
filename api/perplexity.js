/**
 * Vercel Serverless Function — Perplexity API proxy.
 * Used for live web research (specialists) and compliance fact-checking.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = process.env.PERPLEXITY_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'PERPLEXITY_API_KEY not configured' });

  try {
    const { model = 'sonar-pro', messages, system } = req.body;

    const body = { model, messages };
    if (system) body.system = system;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    return res.status(200).json({ content, citations, raw: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
