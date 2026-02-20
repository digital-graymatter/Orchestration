/* ── Agent orchestration layer ──
   Loads agent configs from agent-config.js (which imports .md prompts).
   Builds system prompts and calls Claude API. */

import { AGENTS, AGENT_ORDER, SUB_AGENTS } from './agent-config.js';

export { AGENTS, AGENT_ORDER };

// Production (Vercel): relative path to serverless function
// Local dev: Express proxy on port 3001
const API_URL = import.meta.env.PROD ? '/api/chat' : 'http://localhost:3001/api/chat';

/**
 * Build the system prompt for an agent, including:
 * - Orchestration framing (role identity)
 * - Agent base system prompt (from .md file)
 * - Nurture Flow sub-agent instructions (if copy agent + nurture mode)
 * - Reference material (passed in from caller, populated by backend in Phase 2)
 * - Knowledge bank entries (passed in from caller, populated in Phase 3)
 * - Approved output from previous agent(s)
 */
export function buildSystemPrompt(agentId, {
  nurtureFlowMode = false,
  channel = '',
  runbook = '',
  approvedOutputs = {},
  referenceContext = '',
  knowledgeBankContext = '',
} = {}) {
  const agent = AGENTS[agentId];
  if (!agent) return '';

  // Research channel + Strategy agent → use dedicated research prompt
  const isResearchMode = channel === 'Research' && agentId === 'strategy';
  const basePrompt = (isResearchMode && agent.researchPrompt) ? agent.researchPrompt : agent.systemPrompt;

  // Start with orchestration framing so the model knows exactly which agent it is
  const roleName = isResearchMode ? 'Research Analyst (Strategy Agent — Research Mode)' : agent.name;
  let sys = `[ORCHESTRATION CONTEXT]
You are the ${roleName}. You are operating inside a multi-agent marketing orchestration pipeline.
Your role is to produce YOUR OWN specialist output — not to route, hand off, or activate other agents.
Agent routing and handoff is handled by the orchestration layer, not by you.
Do NOT mention routing, handoff, or other agents in your output. Focus entirely on producing your deliverable.
${isResearchMode ? `You are in RESEARCH MODE. The user has selected the Research channel with runbook: "${runbook}". Produce a comprehensive, C-suite-grade research briefing — not a strategy summary. Follow your research output standards precisely.` : ''}
[END ORCHESTRATION CONTEXT]

${basePrompt}`;

  // Copy agent: append nurture sub-agent instructions ONLY for CRM > Nurture Journeys
  const isNurtureContext = channel === 'CRM' && runbook === 'Nurture Journeys';
  if (agentId === 'copy' && nurtureFlowMode && isNurtureContext) {
    sys += `\n\n---\n[NURTURE FLOW SUB-AGENT ACTIVE]\n${SUB_AGENTS.nurtureFlow.systemPrompt}`;
  }

  // Inject reference material (populated by backend in Phase 2)
  if (referenceContext) {
    sys += `\n\n${referenceContext}`;
  }

  // Inject knowledge bank entries (populated in Phase 3)
  if (knowledgeBankContext) {
    sys += `\n\n${knowledgeBankContext}`;
  }

  // Inject approved outputs from upstream agents
  if (agentId === 'strategy' && approvedOutputs.brief) {
    sys += `\n\n---APPROVED BRIEF (from upstream Briefing Agent — human-approved)---\n${approvedOutputs.brief}\n---END APPROVED BRIEF---`;
  }
  if (agentId === 'copy' && approvedOutputs.strategy) {
    const researchLabel = isResearchMode || channel === 'Research'
      ? 'APPROVED RESEARCH (from Research Analyst — human-approved)'
      : 'APPROVED STRATEGIC DIRECTION (from upstream Strategy Agent — human-approved)';
    sys += `\n\n---${researchLabel}---\n${approvedOutputs.strategy}\n---END ${researchLabel.split('(')[0].trim()}---`;
  }
  if (agentId === 'copy' && approvedOutputs.brief) {
    sys += `\n\n---APPROVED BRIEF (from upstream Briefing Agent — human-approved)---\n${approvedOutputs.brief}\n---END APPROVED BRIEF---`;
  }
  if (agentId === 'compliance' && approvedOutputs.copy) {
    sys += `\n\n---APPROVED COPY FOR COMPLIANCE REVIEW (from upstream Copy Agent — human-approved)---\n${approvedOutputs.copy}\n---END APPROVED COPY---`;
  }

  return sys;
}

/**
 * Call Claude API via proxy.
 * Takes full conversation history (role/content pairs) and system prompt.
 * Returns the assistant's text response.
 */
export async function callAgent(systemPrompt, messages) {
  // Filter to only user/assistant messages for the API
  const apiMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: systemPrompt,
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.content?.map((c) => c.text || '').join('\n') || 'No response received.';
}
