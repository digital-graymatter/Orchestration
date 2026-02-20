/* ── Specialist Management Routes ──
   Dynamic specialist creation. Uses _template.md to generate
   new specialist prompts at runtime. */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let templateContent = null;

/**
 * Load the specialist template on first use.
 */
async function getTemplate() {
  if (templateContent) return templateContent;
  const templatePath = path.resolve(__dirname, '../../src/agents/sub-agents/specialists/_template.md');
  templateContent = await fs.readFile(templatePath, 'utf-8');
  return templateContent;
}

/**
 * Generate a specialist prompt from the template.
 */
function populateTemplate(template, { name, domain, expertiseAreas, guardrails }) {
  let populated = template;

  // Remove the template comment block
  populated = populated.replace(/<!--[\s\S]*?-->\n?/, '');

  // Replace placeholders
  populated = populated.replace('[SPECIALIST NAME]', name);
  populated = populated.replace('[One-sentence description of what this specialist covers.]', domain);

  // Replace expertise bullets
  const expertiseBullets = (expertiseAreas || [])
    .map((area) => `- ${area}`)
    .join('\n');
  // Replace the template expertise bullets with populated ones
  populated = populated.replace(
    /## Expertise Covers\n(?:- \[.*?\]\n?)+/,
    `## Expertise Covers\n${expertiseBullets}\n`
  );

  // Replace KB category
  populated = populated.replace(`"[Specialist Name] Research"`, `"${name} Research"`);

  // Replace guardrails
  if (guardrails && guardrails.length > 0) {
    const guardrailBullets = guardrails.map((g) => `- ${g}`).join('\n');
    populated = populated.replace(
      /## Guardrails\n(?:- \[.*?\]\n?)+/,
      `## Guardrails\n${guardrailBullets}\n`
    );
  }

  return populated;
}

/**
 * Generate a URL-friendly ID from a specialist name.
 */
function generateId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * POST /api/specialists/create
 *
 * Body: {
 *   name: string,           — e.g. "Aftersales & Service Network"
 *   domain: string,         — one-sentence domain description
 *   expertiseAreas: string[], — list of expertise bullets
 *   guardrails?: string[],  — domain-specific guardrails
 *   icon?: string,          — emoji icon (default: 🔬)
 *   perplexity?: string,    — 'always' | 'optional' | 'never' (default: 'optional')
 * }
 *
 * Returns: {
 *   id: string,
 *   name: string,
 *   icon: string,
 *   systemPrompt: string,
 *   kbCategory: string,
 *   perplexity: string,
 * }
 */
export async function createSpecialistRoute(req, res) {
  try {
    const {
      name,
      domain,
      expertiseAreas = [],
      guardrails = [],
      icon = '🔬',
      perplexity = 'optional',
    } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!domain) return res.status(400).json({ error: 'domain is required' });
    if (expertiseAreas.length === 0) return res.status(400).json({ error: 'at least one expertiseArea is required' });

    const template = await getTemplate();
    const systemPrompt = populateTemplate(template, { name, domain, expertiseAreas, guardrails });
    const id = generateId(name);
    const kbCategory = `${name} Research`;

    res.json({
      id,
      name,
      icon,
      systemPrompt,
      kbCategory,
      perplexity,
      referenceFiles: [],
    });
  } catch (err) {
    console.error('Specialist creation error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
