/* ── Agent & Specialist Registry ──
   Central config for all agents, sub-agents, and topical specialists.
   Prompt content is loaded from .md files via Vite raw imports. */

/* ── Import agent prompts as raw strings ── */
import briefingPrompt from './briefing.md?raw';
import strategyPrompt from './strategy.md?raw';
import strategyResearchPrompt from './strategy-research.md?raw';
import copyPrompt from './copy.md?raw';
import compliancePrompt from './compliance.md?raw';
import nurtureFlowPrompt from './sub-agents/nurture-flow.md?raw';
import researchCoordinatorPrompt from './sub-agents/research-coordinator.md?raw';

/* ── Import specialist prompts ── */
import electrificationPrompt from './sub-agents/specialists/electrification-powertrain.md?raw';
import tcoPrompt from './sub-agents/specialists/tco-fleet-economics.md?raw';
import audiencePrompt from './sub-agents/specialists/audience-persona.md?raw';
import sectorPrompt from './sub-agents/specialists/sector-intelligence.md?raw';
import competitorPrompt from './sub-agents/specialists/competitor-market.md?raw';
import specialistTemplate from './sub-agents/specialists/_template.md?raw';

/* ── Manager Agent Registry (Tier 1 — user-facing pipeline) ── */
export const AGENT_REGISTRY = {
  brief: {
    id: 'brief',
    name: 'Briefing Agent',
    colour: '#2563eb',
    short: 'Structures input into actionable briefs',
    kbCategory: 'Approved Briefs',
    systemPrompt: briefingPrompt,
  },
  strategy: {
    id: 'strategy',
    name: 'Strategy Agent',
    colour: '#d97706',
    short: 'Evidence-led strategic direction',
    kbCategory: 'Strategic Research & Insights',
    systemPrompt: strategyPrompt,
    researchPrompt: strategyResearchPrompt,
  },
  copy: {
    id: 'copy',
    name: 'Copy Agent',
    colour: '#7c3aed',
    short: 'Transforms strategy into on-brand copy',
    kbCategory: 'Approved Copy',
    systemPrompt: copyPrompt,
  },
  compliance: {
    id: 'compliance',
    name: 'Compliance Agent',
    colour: '#16a34a',
    short: 'Reviews for brand and legal compliance',
    kbCategory: 'Compliance Rulings & Precedents',
    systemPrompt: compliancePrompt,
  },
};

/* ── Sub-Agent Prompts (Tier 2) ── */
export const SUB_AGENTS = {
  nurtureFlow: {
    id: 'nurtureFlow',
    name: 'Nurture Flow',
    icon: '✉️',
    systemPrompt: nurtureFlowPrompt,
    parentAgent: 'copy',
    triggerCondition: { channel: 'CRM', runbook: 'Nurture Journeys' },
  },
  researchCoordinator: {
    id: 'researchCoordinator',
    name: 'Research Coordinator',
    icon: '🔍',
    systemPrompt: researchCoordinatorPrompt,
    parentAgent: 'strategy',
  },
};

/* ── Topical Specialist Registry (Tier 3 — under Research Coordinator) ── */
export const SPECIALIST_REGISTRY = {
  'electrification-powertrain': {
    id: 'electrification-powertrain',
    name: 'Electrification & Powertrain',
    icon: '⚡',
    systemPrompt: electrificationPrompt,
    kbCategory: 'Electrification & Powertrain Research',
    perplexity: 'optional',
    referenceFiles: ['product/electrification.docx'],
  },
  'tco-fleet-economics': {
    id: 'tco-fleet-economics',
    name: 'TCO & Fleet Economics',
    icon: '💰',
    systemPrompt: tcoPrompt,
    kbCategory: 'TCO & Fleet Economics Research',
    perplexity: 'always',
    referenceFiles: [],
  },
  'audience-persona': {
    id: 'audience-persona',
    name: 'Audience & Persona',
    icon: '👥',
    systemPrompt: audiencePrompt,
    kbCategory: 'Audience & Persona Research',
    perplexity: 'optional',
    referenceFiles: ['personas/fleet-personas.docx'],
  },
  'sector-intelligence': {
    id: 'sector-intelligence',
    name: 'Sector Intelligence',
    icon: '🏗️',
    systemPrompt: sectorPrompt,
    kbCategory: 'Sector Intelligence Research',
    perplexity: 'always',
    referenceFiles: [],
  },
  'competitor-market': {
    id: 'competitor-market',
    name: 'Competitor & Market',
    icon: '📊',
    systemPrompt: competitorPrompt,
    kbCategory: 'Competitor & Market Research',
    perplexity: 'always',
    referenceFiles: [],
  },
};

/* ── Research runbook → specialist mapping ── */
export const RUNBOOK_SPECIALIST_MAP = {
  'Market & Audience': ['audience-persona', 'competitor-market'],
  'Competitor Analysis': ['competitor-market'],
  'Product & Technology': ['electrification-powertrain'],
  'Sector Deep Dive': ['sector-intelligence', 'audience-persona'],
};

/* ── Specialist template (for dynamic creation) ── */
export const SPECIALIST_TEMPLATE = specialistTemplate;

/* ── Canonical pipeline order ── */
export const AGENT_ORDER = ['brief', 'strategy', 'copy', 'compliance'];

/* ── Build AGENTS map (backward-compatible shape for App.jsx) ── */
export const AGENTS = Object.fromEntries(
  Object.entries(AGENT_REGISTRY).map(([id, cfg]) => [id, {
    ...cfg,
    id,
    nextAgent: AGENT_ORDER[AGENT_ORDER.indexOf(id) + 1] || null,
  }])
);
