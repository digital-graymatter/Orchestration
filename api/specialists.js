/**
 * Vercel Serverless Function — Dynamic Specialist Creation.
 * Generates specialist prompts from a template.
 */

const TEMPLATE = `# Topical Specialist: [SPECIALIST NAME]

## Domain
[DOMAIN]

## Expertise Covers
[EXPERTISE]

## Knowledge Bank Category
"[KB_CATEGORY]"

## Reference Sources
When activated, draw from:
- Knowledge bank entries tagged under this category
- Approved campaign outputs relevant to this domain

## Output Format
When responding to a research request, provide:
- **Evidence summary** — factual findings relevant to the question
- **Proof points** — specific data, claims, or examples that can support messaging
- **Caveats and guardrails** — what cannot be claimed, what requires qualification
- **Source attribution** — where the evidence comes from

## Guardrails
[GUARDRAILS]
- If asked about topics outside your domain or where data is unavailable, say so — do not fabricate
- Research outputs should inform strategy, not become public-facing messaging directly`;

function generateId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    const id = generateId(name);
    const kbCategory = `${name} Research`;

    const systemPrompt = TEMPLATE
      .replace('[SPECIALIST NAME]', name)
      .replace('[DOMAIN]', domain)
      .replace('[EXPERTISE]', expertiseAreas.map((a) => `- ${a}`).join('\n'))
      .replace('[KB_CATEGORY]', kbCategory)
      .replace('[GUARDRAILS]', guardrails.length > 0
        ? guardrails.map((g) => `- ${g}`).join('\n')
        : '- Follow general research integrity standards');

    return res.status(200).json({
      id,
      name,
      icon,
      systemPrompt,
      kbCategory,
      perplexity,
      referenceFiles: [],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
