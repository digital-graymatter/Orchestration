/**
 * Vercel Serverless Function — Research Orchestration.
 * Fans out to specialist agents, compiles results.
 * Phase 5: Perplexity web research integrated into specialist flow.
 */

import { getReferenceContext } from './reference-loader.js';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const PERPLEXITY_API = 'https://api.perplexity.ai/chat/completions';

const SPECIALISTS = {
  'electrification-powertrain': { name: 'Electrification & Powertrain', icon: '⚡', perplexity: 'optional' },
  'tco-fleet-economics':        { name: 'TCO & Fleet Economics', icon: '💰', perplexity: 'always' },
  'audience-persona':           { name: 'Audience & Persona', icon: '👥', perplexity: 'optional' },
  'sector-intelligence':        { name: 'Sector Intelligence', icon: '🏗️', perplexity: 'always' },
  'competitor-market':          { name: 'Competitor & Market', icon: '📊', perplexity: 'always' },
};

const RUNBOOK_SPECIALIST_MAP = {
  'Market & Audience': ['audience-persona', 'competitor-market'],
  'Competitor Analysis': ['competitor-market'],
  'Product & Technology': ['electrification-powertrain'],
  'Sector Deep Dive': ['sector-intelligence', 'audience-persona'],
};

const PERPLEXITY_PROMPTS = {
  'electrification-powertrain': 'You are a specialist researcher in vehicle electrification, powertrains (HEV, PHEV, BEV, Hydrogen), charging infrastructure, and fleet transition. Provide current data, statistics, and evidence from reputable sources. Focus on the UK and European market.',
  'tco-fleet-economics': 'You are a specialist researcher in Total Cost of Ownership for commercial fleets, whole-life costs, BIK rates, fuel duty, tax incentives, and fleet budgeting. Provide current UK-specific data, rates, and regulations.',
  'audience-persona': 'You are a specialist researcher in B2B fleet decision-maker behaviours, SME fleet manager personas, procurement patterns, and buying journey insights. Focus on the UK commercial vehicle market.',
  'sector-intelligence': 'You are a specialist researcher in UK industry sectors that use commercial vehicle fleets: construction, logistics, retail, professional services, public sector. Provide current sector trends, operational patterns, and fleet usage data.',
  'competitor-market': 'You are a specialist researcher in the UK commercial vehicle market: OEM positioning, market share, model launches, pricing, fleet deals, and competitive messaging. Provide current and specific data.',
};

async function callPerplexity(specialistId, question, campaignContext, perplexityKey) {
  if (!perplexityKey) return null;

  const domainPrompt = PERPLEXITY_PROMPTS[specialistId] || '';
  const spec = SPECIALISTS[specialistId];

  try {
    const response = await fetch(PERPLEXITY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${perplexityKey}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `${domainPrompt}\n\nProvide specific, sourced data points. Include numbers, dates, and named sources. Structure your response with clear headings.`,
          },
          {
            role: 'user',
            content: `Research the following for ${spec?.name || 'specialist analysis'}:\n\n${question}\n\nContext: ${campaignContext}`,
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      citations: data.citations || [],
    };
  } catch {
    return null;
  }
}

function needsCurrentData(question, context) {
  const combined = `${question} ${context}`.toLowerCase();
  const signals = [
    'current', 'latest', 'recent', '2024', '2025', '2026',
    'today', 'this year', 'market share', 'price', 'pricing',
    'rate', 'rates', 'regulation', 'policy', 'incentive',
    'trend', 'forecast', 'competitor', 'launch', 'announce',
    'bik', 'ulez', 'zev', 'mandate', 'subsidy', 'grant',
    'statistic', 'data point', 'benchmark', 'study',
  ];
  return signals.some(s => combined.includes(s));
}

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

  const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;

  try {
    const {
      question, campaignContext = '', runbook = '', persona = '', sector = '',
      specialistIds, specialistPrompts = {}, knowledgeBankContexts = {},
    } = req.body;

    if (!question) return res.status(400).json({ error: 'question is required' });

    const targetIds = specialistIds || RUNBOOK_SPECIALIST_MAP[runbook] || Object.keys(SPECIALISTS);

    const enrichedQuestion = `Research Question: ${question}\n\nCampaign Context: ${campaignContext}\nAudience: ${persona} — ${sector}\nChannel: Research | Runbook: ${runbook}\n\nProvide a thorough, evidence-based response grounded in your specialist domain. Include specific data points, examples, and actionable insights. Structure your response clearly with headings.`;

    const webSources = [];

    const results = await Promise.allSettled(
      targetIds.map(async (specId) => {
        const spec = SPECIALISTS[specId];
        if (!spec) throw new Error(`Unknown specialist: ${specId}`);

        // Step 1: Perplexity web research
        let perplexityResult = null;
        const shouldCallPerplexity = PERPLEXITY_KEY && (
          spec.perplexity === 'always' ||
          (spec.perplexity === 'optional' && needsCurrentData(question, campaignContext))
        );

        if (shouldCallPerplexity) {
          perplexityResult = await callPerplexity(specId, question, campaignContext, PERPLEXITY_KEY);
          if (perplexityResult?.citations?.length) {
            webSources.push({ specialistId: specId, specialistName: spec.name, citations: perplexityResult.citations });
          }
        }

        // Step 2: Build specialist system prompt
        const basePrompt = specialistPrompts[specId] || '';
        const refContext = await getReferenceContext(specId, 'Research', campaignContext);
        const kbContext = knowledgeBankContexts[specId] || '';

        let systemPrompt = `[SPECIALIST CONTEXT]\nYou are the ${spec.name} Specialist Agent.\n[END SPECIALIST CONTEXT]\n\n${basePrompt}`;
        if (refContext) systemPrompt += `\n\n${refContext}`;
        if (kbContext) systemPrompt += `\n\n${kbContext}`;

        // Inject Perplexity results
        if (perplexityResult?.content) {
          systemPrompt += `\n\n---WEB RESEARCH (live data from Perplexity)---\n${perplexityResult.content}`;
          if (perplexityResult.citations?.length) {
            systemPrompt += `\n\nSources:\n${perplexityResult.citations.map((c, i) => `[${i + 1}] ${c}`).join('\n')}`;
          }
          systemPrompt += `\n---END WEB RESEARCH---`;
        }

        // Step 3: Call Claude specialist
        const response = await callSpecialist(specId, systemPrompt, enrichedQuestion, API_KEY);
        return { id: specId, name: spec.name, icon: spec.icon, response, webResearch: !!perplexityResult?.content };
      })
    );

    const specialists = [];
    const failed = [];
    for (const result of results) {
      if (result.status === 'fulfilled') specialists.push(result.value);
      else failed.push(result.reason?.message || 'Unknown error');
    }

    const compiledSections = specialists.map((s) => {
      const webTag = s.webResearch ? ' 🌐' : '';
      return `## ${s.icon} ${s.name}${webTag}\n\n${s.response}`;
    });

    let compiled = `# Research Findings\n\n*Research contributors: ${specialists.map(s => `${s.icon} ${s.name}`).join(', ')}*\n\n${compiledSections.join('\n\n---\n\n')}`;

    if (webSources.length > 0) {
      compiled += `\n\n---\n\n### 🌐 Web Research Sources\n`;
      for (const ws of webSources) {
        compiled += `\n**${ws.specialistName}:**\n`;
        ws.citations.forEach((c, i) => { compiled += `${i + 1}. ${c}\n`; });
      }
    }

    if (failed.length) compiled += `\n\n---\n\n**Note:** ${failed.length} specialist(s) encountered errors.`;

    const contributors = specialists.map(s => ({ id: s.id, name: s.name, icon: s.icon, webResearch: s.webResearch }));
    return res.status(200).json({ specialists, compiled, contributors, webSources, failed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
