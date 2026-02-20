/* ── Knowledge Bank Query ──
   Query logic for injecting KB entries into agent context.
   Retrieves the top N most recent entries for the agent's KB category
   and formats them as a system prompt block. */

import { getEntriesByCategory } from './store.js';

const MAX_KB_ENTRIES = 3;

/**
 * Get formatted KB context for an agent's system prompt.
 * Looks up the agent's KB category and returns the top 3 most recent entries.
 *
 * @param {string} category — the KB category for this agent (e.g. 'Approved Briefs')
 * @returns {string} Formatted block for system prompt injection, or '' if no entries.
 */
export async function getKBContext(category) {
  if (!category) return '';

  try {
    const entries = await getEntriesByCategory(category);
    if (entries.length === 0) return '';

    const top = entries.slice(0, MAX_KB_ENTRIES);

    const blocks = top.map((entry, i) => {
      const date = new Date(entry.timestamp).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
      return `[KB Entry ${i + 1}: ${entry.tag || 'Untitled'} — ${date}]\n${entry.content}\n[END KB Entry ${i + 1}]`;
    }).join('\n\n');

    return `--- KNOWLEDGE BANK REFERENCE ---
The following approved outputs from previous campaigns may be relevant.
Use these as quality benchmarks and reference material, not as templates to copy:

${blocks}
--- END KNOWLEDGE BANK ---`;
  } catch (err) {
    console.error('KB query error:', err);
    return '';
  }
}
