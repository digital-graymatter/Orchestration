/**
 * Vercel Serverless Function — Research Orchestration.
 * Fans out to specialist agents, compiles results.
 */

import { getReferenceContext } from './reference-loader.js';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const SPECIALISTS = {
  'electrification-powertrain': { name: 'Electrification & Powertrain', icon: '⚡' },
  'tco-fleet-economics':        { name: 'TCO & Fleet Economics', icon: '💰' },
  'audience-persona':           { name: 'Audience & Persona', icon: '👥' },
  'sector-intelligence':        { name: 'Sector Intelligence', icon: '🏗️' },
  'competitor-market':          { name: 'Competitor & Market', icon: '📊' },
};

const RUNBOOK_SPECIALIST_MAP = {
  'Market & Audience': ['audience-persona', 'competitor-market'],
  'Competitor Analysis': ['competitor-market'],
  'Product & Technology': ['electrification-powertrain'],
  'Sector Deep Dive': ['sector-intelligence', 'audience-persona'],
};

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
    throw new Error(`Specialist ${specialistId} error: ${err}`);
  }

  const data = await response.json();
  return data.content?.map((c) => c.text || '').join('\n') || '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  try {
    const {
      question, campaignContext = '', runbook = '', persona = '', sector = '',
      specialistIds, specialistPrompts = {}, knowledgeBankContexts = {},
    } = req.body;

    if (!question) return res.status(400).json({ error: 'question is required' });

    const targetIds = specialistIds || RUNBOOK_SPECIALIST_MAP[runbook] || Object.keys(SPECIALISTS);

    const enrichedQuestion = `Research Question: ${question}\n\nCampaign Context: ${campaignContext}\nAudience: ${persona} — ${sector}\nChannel: Research | Runbook: ${runbook}\n\nProvide a thorough, evidence-based response grounded in your specialist domain. Include specific data points, examples, and actionable insights. Structure your response clearly with headings.`;

    const results = await Promise.allSettled(
      targetIds.map(async (specId) => {
        const spec = SPECIALISTS[specId];
        if (!spec) throw new Error(`Unknown specialist: ${specId}`);

        const basePrompt = specialistPrompts[specId] || '';
        const refContext = await getReferenceContext(specId, 'Research', campaignContext);
        const kbContext = knowledgeBankContexts[specId] || '';

        let systemPrompt = `[SPECIALIST CONTEXT]\nYou are the ${spec.name} Specialist Agent.\n[END SPECIALIST CONTEXT]\n\n${basePrompt}`;
        if (refContext) systemPrompt += `\n\n${refContext}`;
        if (kbContext) systemPrompt += `\n\n${kbContext}`;

        const response = await callSpecialist(specId, systemPrompt, enrichedQuestion, API_KEY);
        return { id: specId, name: spec.name, icon: spec.icon, response };
      })
    );

    const specialists = [];
    const failed = [];
    for (const result of results) {
      if (result.status === 'fulfilled') specialists.push(result.value);
      else failed.push(result.reason?.message || 'Unknown error');
    }

    const compiledSections = specialists.map((s) => `## ${s.icon} ${s.name}\n\n${s.response}`);
    let compiled = `# Research Findings\n\n*Research contributors: ${specialists.map(s => `${s.icon} ${s.name}`).join(', ')}*\n\n${compiledSections.join('\n\n---\n\n')}`;
    if (failed.length) compiled += `\n\n---\n\n**Note:** ${failed.length} specialist(s) encountered errors.`;

    const contributors = specialists.map(s => ({ id: s.id, name: s.name, icon: s.icon }));
    return res.status(200).json({ specialists, compiled, contributors, failed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
