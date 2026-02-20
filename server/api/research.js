/* ── Research Orchestration Endpoint ──
   Receives a research request, fans out to relevant specialists,
   collects responses, compiles with attribution, returns to frontend. */

import { getReferenceContext } from './reference.js';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

/* ── Specialist registry (server-side copy of key fields) ── */
const SPECIALISTS = {
  'electrification-powertrain': { name: 'Electrification & Powertrain', icon: '⚡', perplexity: 'optional' },
  'tco-fleet-economics':        { name: 'TCO & Fleet Economics', icon: '💰', perplexity: 'always' },
  'audience-persona':           { name: 'Audience & Persona', icon: '👥', perplexity: 'optional' },
  'sector-intelligence':        { name: 'Sector Intelligence', icon: '🏗️', perplexity: 'always' },
  'competitor-market':          { name: 'Competitor & Market', icon: '📊', perplexity: 'always' },
};

/* ── Runbook → specialist mapping ── */
const RUNBOOK_SPECIALIST_MAP = {
  'Market & Audience': ['audience-persona', 'competitor-market'],
  'Competitor Analysis': ['competitor-market'],
  'Product & Technology': ['electrification-powertrain'],
  'Sector Deep Dive': ['sector-intelligence', 'audience-persona'],
};

/**
 * Call a single specialist via Claude API.
 */
async function callSpecialist(specialistId, systemPrompt, question, apiKey) {
  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Specialist ${specialistId} API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content?.map((c) => c.text || '').join('\n') || '';
}

/**
 * POST /api/research
 *
 * Body: {
 *   question: string,           — the research question
 *   campaignContext: string,     — user's original prompt
 *   runbook: string,             — research runbook (determines default specialists)
 *   persona: string,
 *   sector: string,
 *   specialistIds?: string[],    — override: specific specialists to activate
 *   specialistPrompts: Object,   — { [id]: systemPrompt } — specialist .md content from frontend
 *   knowledgeBankContexts?: Object, — { [id]: kbContext } — KB entries per specialist
 * }
 *
 * Returns: {
 *   specialists: [{ id, name, icon, response }],
 *   compiled: string,  — all specialist outputs with attribution
 *   contributors: [{ id, name, icon }],
 * }
 */
export async function researchRoute(req, res) {
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  try {
    const {
      question,
      campaignContext = '',
      runbook = '',
      persona = '',
      sector = '',
      specialistIds,
      specialistPrompts = {},
      knowledgeBankContexts = {},
    } = req.body;

    if (!question) return res.status(400).json({ error: 'question is required' });

    // Determine which specialists to activate
    const targetIds = specialistIds || RUNBOOK_SPECIALIST_MAP[runbook] || Object.keys(SPECIALISTS);

    // Build research question with context
    const enrichedQuestion = `Research Question: ${question}

Campaign Context: ${campaignContext}
Audience: ${persona} — ${sector}
Channel: Research | Runbook: ${runbook}

Provide a thorough, evidence-based response grounded in your specialist domain. Include specific data points, examples, and actionable insights. Structure your response clearly with headings.`;

    // Fan out to all specialists in parallel
    const results = await Promise.allSettled(
      targetIds.map(async (specId) => {
        const spec = SPECIALISTS[specId];
        if (!spec) throw new Error(`Unknown specialist: ${specId}`);

        // Build specialist system prompt
        const basePrompt = specialistPrompts[specId] || '';
        const refContext = getReferenceContext(specId, 'Research', campaignContext);
        const kbContext = knowledgeBankContexts[specId] || '';

        let systemPrompt = `[SPECIALIST CONTEXT]\nYou are the ${spec.name} Specialist Agent. You are being activated by the Research Coordinator to provide domain-specific research.\n[END SPECIALIST CONTEXT]\n\n${basePrompt}`;

        if (refContext) systemPrompt += `\n\n${refContext}`;
        if (kbContext) systemPrompt += `\n\n${kbContext}`;

        const response = await callSpecialist(specId, systemPrompt, enrichedQuestion, API_KEY);
        return { id: specId, name: spec.name, icon: spec.icon, response };
      })
    );

    // Collect successful results
    const specialists = [];
    const failed = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        specialists.push(result.value);
      } else {
        failed.push(result.reason?.message || 'Unknown error');
      }
    }

    // Compile all specialist outputs with attribution
    const compiledSections = specialists.map((s) =>
      `## ${s.icon} ${s.name}\n\n${s.response}`
    );

    let compiled = `# Research Findings\n\n*Research contributors: ${specialists.map(s => `${s.icon} ${s.name}`).join(', ')}*\n\n${compiledSections.join('\n\n---\n\n')}`;

    if (failed.length > 0) {
      compiled += `\n\n---\n\n**Note:** ${failed.length} specialist(s) encountered errors.`;
    }

    const contributors = specialists.map(s => ({ id: s.id, name: s.name, icon: s.icon }));

    res.json({ specialists, compiled, contributors, failed });
  } catch (err) {
    console.error('Research orchestration error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
