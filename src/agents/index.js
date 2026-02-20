// Agent registry — centralised config for all agents
// Live Claude API calls via local proxy (server.js)

import briefingAgent from './briefing';
import strategyAgent from './strategy';
import copyAgent from './copy';
import nurtureFlowAgent from './nurtureFlow';
import complianceAgent from './compliance';

export const AGENTS = {
  brief: briefingAgent,
  strategy: strategyAgent,
  copy: copyAgent,
  compliance: complianceAgent,
};

export const NURTURE_AGENT = nurtureFlowAgent;

export const AGENT_ORDER = ['brief', 'strategy', 'copy', 'compliance'];

// Production (Vercel): relative path to serverless function
// Local dev: Express proxy on port 3001
const API_URL = import.meta.env.PROD ? '/api/chat' : 'http://localhost:3001/api/chat';

/**
 * Build the system prompt for an agent, including:
 * - The agent's base system prompt
 * - Nurture Flow sub-agent instructions (if copy agent + nurture mode)
 * - Approved output from previous agent (if in pipeline)
 */
export function buildSystemPrompt(agentId, { nurtureFlowMode = false, channel = '', runbook = '', approvedOutputs = {} } = {}) {
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
    sys += `\n\n---\n[NURTURE FLOW SUB-AGENT ACTIVE]\n${nurtureFlowAgent.systemPrompt}`;
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
 * Call Claude API via local proxy.
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

// Kept for fallback / static demo mode
export function getAgentOutput(agentId, channel, runbook, demoData) {
  const channelData = demoData[channel];
  if (!channelData) return null;
  const runbookData = channelData.runbooks[runbook];
  if (!runbookData) return null;

  const outputMap = {
    brief: 'briefOutput',
    strategy: 'strategyOutput',
    copy: 'copyOutput',
    compliance: 'complianceOutput',
  };

  return runbookData[outputMap[agentId]] || null;
}
