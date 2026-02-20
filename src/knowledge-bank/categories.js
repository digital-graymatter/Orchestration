/* ── Knowledge Bank Categories ──
   Base categories for manager agents and specialists.
   Grows dynamically when new specialists are created. */

export const MANAGER_CATEGORIES = [
  'Approved Briefs',
  'Strategic Research & Insights',
  'Approved Copy',
  'Compliance Rulings & Precedents',
  'Tone & Messaging Examples',
  'Campaign Templates',
];

export const SPECIALIST_CATEGORIES = [
  'Electrification & Powertrain Research',
  'TCO & Fleet Economics Research',
  'Audience & Persona Research',
  'Sector Intelligence Research',
  'Competitor & Market Research',
];

/** All categories — manager + specialist + any dynamically created */
export function getAllCategories(dynamicCategories = []) {
  return [...MANAGER_CATEGORIES, ...SPECIALIST_CATEGORIES, ...dynamicCategories];
}
