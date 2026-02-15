/* ── Channel / runbook / persona / sector config ── */

export const CHANNELS = {
  Brand: { runbooks: ['Thought Leadership'] },
  CRM: { runbooks: ['Nurture Journeys'] },
  Digital: { runbooks: ['Website copy'] },
  Research: { runbooks: ['Market & Audience', 'Competitor Analysis', 'Product & Technology', 'Sector Deep Dive'] },
};

export const DEFAULT_RUNBOOKS = {
  Brand: 'Thought Leadership',
  CRM: 'Nurture Journeys',
  Digital: 'Website copy',
  Research: 'Market & Audience',
};

export const PERSONAS = ['SME', 'Fleet Manager', 'Corporate'];

export const SECTORS = [
  'Construction',
  'Logistics',
  'Retail & Wholesale',
  'Professional Services',
  'SME General Business',
];

export const DEMO_PROMPTS = {
  'Nurture Journeys': `Write a Toyota Better Business fleet electrification nurture email campaign (max 4 emails) that takes prospects from "not sure where to start" to "ready to take the next step," covering Hybrid, Plug-in Hybrid, Battery Electric and Hydrogen (where relevant) and tackling costs, uptime, charging/infrastructure readiness and powertrain fit.`,
  'Website copy': `Write review-ready website copy for the Toyota Better Business Fleet Electrification Hub page, explaining a practical phased route into electrification and how fleets can choose between Hybrid, Plug-in Hybrid, Battery Electric and Hydrogen (where relevant).`,
  'Thought Leadership': `Develop a non-promotional Toyota Better Business thought-leadership white paper that reframes fleet electrification as a managed, multi-path transition (not a single switch), grounded in real UK fleet operations (mixed fleets, site constraints, TCO, uptime) with clear guidance on risk, governance and scalable rollout. Deliver a review-ready two-page draft plus three distinct-angle Better Business social posts derived from the same POV.`,
  'Market & Audience': `Conduct a comprehensive analysis of the UK commercial vehicle electrification market, focusing on SME fleet operators. Include current adoption rates, key barriers, decision-making factors, and how Toyota Professional is positioned relative to competitors. Identify audience segments with the highest propensity to transition.`,
  'Competitor Analysis': `Analyse the competitive landscape for commercial fleet electrification in the UK. Compare Toyota Professional's positioning against key competitors (Ford Pro, Stellantis Pro One, Mercedes-Benz Vans, Volkswagen Commercial Vehicles). Identify gaps, opportunities, and strategic differentiators.`,
  'Product & Technology': `Research the current state of Toyota's commercial vehicle electrification technology, including the multi-path approach (HEV, PHEV, BEV, FCEV). Cover WLTP ranges, charging infrastructure requirements, real-world fleet performance data, and the technology roadmap relevant to UK fleet operators.`,
  'Sector Deep Dive': `Conduct a deep dive into the construction sector's fleet electrification readiness in the UK. Cover regulatory pressures (Clean Air Zones, ULEZ), operational requirements (payload, range, site access), current adoption barriers, and how Toyota Professional's multi-path approach addresses sector-specific needs.`,
};

/** Workflow control options */
export const WORKFLOW_CONTROLS = [
  { value: 'pause', label: 'Pause for review' },
  { value: 'continue', label: 'Continue workflow' },
  { value: 'stop', label: 'Stop workflow' },
];
