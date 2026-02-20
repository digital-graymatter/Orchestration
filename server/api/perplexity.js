/* ── Perplexity API Proxy Route ──
   Proxies requests to Perplexity's sonar API for live web research.
   Used by specialists (Phase 5) and compliance verification. */

const PERPLEXITY_API = 'https://api.perplexity.ai/chat/completions';

/**
 * POST /api/perplexity
 * Body: { model, messages, system? }
 *
 * model: 'sonar-pro' for specialist research, 'sonar' for compliance fact-checking
 */
export async function perplexityRoute(req, res) {
  const API_KEY = process.env.PERPLEXITY_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'PERPLEXITY_API_KEY not configured. Add it to .env.' });
  }

  try {
    const { model = 'sonar-pro', messages, system } = req.body;

    const body = { model, messages };
    if (system) {
      body.system = system;
    }

    const response = await fetch(PERPLEXITY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Perplexity API error:', response.status, error);
      return res.status(response.status).json({ error });
    }

    const data = await response.json();

    // Normalise response to extract content + citations
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    res.json({ content, citations, raw: data });
  } catch (err) {
    console.error('Perplexity proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
