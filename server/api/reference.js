/* ── Reference Material Loader ──
   Reads .docx files on startup using mammoth, caches plain text.
   Exports helper to get reference material per agent/channel/context. */

import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REFERENCE_ROOT = path.resolve(__dirname, '../../src/reference');

/* ── In-memory cache (loaded once on startup) ── */
const cache = {};

/* ── Map of all .docx files to load ── */
const DOCX_FILES = {
  'better-business-content': 'brand/better-business-content.docx',
  'fleet-personas':          'personas/fleet-personas.docx',
  'compliance-legal':        'compliance/compliance-legal.docx',
  'electrification':         'product/electrification.docx',
  'hilux-content':           'product/hilux-content.docx',
  'prius-content':           'product/prius-content.docx',
  'tone-of-voice-brand':     'tone-of-voice/tone-of-voice-brand.docx',
  'tone-of-voice-crm':       'tone-of-voice/tone-of-voice-crm.docx',
  'tone-of-voice-digital':   'tone-of-voice/tone-of-voice-digital.docx',
};

/**
 * Load a single .docx as plain text via mammoth.
 */
async function loadDocx(filePath) {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Initialise the cache — call once on server startup.
 * Logs which files loaded successfully and which failed.
 */
export async function initReferenceCache() {
  const results = await Promise.allSettled(
    Object.entries(DOCX_FILES).map(async ([key, relPath]) => {
      const fullPath = path.join(REFERENCE_ROOT, relPath);
      const text = await loadDocx(fullPath);
      cache[key] = text;
      return key;
    })
  );

  const loaded = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  const failed = results
    .map((r, i) => r.status === 'rejected' ? Object.keys(DOCX_FILES)[i] : null)
    .filter(Boolean);

  console.log(`  Reference loaded: ${loaded.length}/${Object.keys(DOCX_FILES).length} files`);
  if (failed.length) console.warn(`  Reference FAILED: ${failed.join(', ')}`);

  return { loaded, failed };
}

/**
 * Get reference material entries for a given agent, channel, and campaign context.
 * Returns an array of { name, content } objects.
 *
 * Injection rules (from build spec):
 *   ALWAYS:    better-business-content + fleet-personas (all agents)
 *   COPY:      channel-specific tone-of-voice
 *   COMPLIANCE: compliance-legal.docx
 *   PRODUCT:   electrification/hilux/prius when campaign context matches
 */
export function getReferenceMaterial(agentId, channel = '', campaignContext = '') {
  const refs = [];

  // Always loaded for every agent
  if (cache['better-business-content']) {
    refs.push({ name: 'Toyota Professional Better Business Content', content: cache['better-business-content'] });
  }
  if (cache['fleet-personas']) {
    refs.push({ name: 'Fleet Personas', content: cache['fleet-personas'] });
  }

  // Copy agent — channel-specific tone of voice
  if (agentId === 'copy') {
    const tovMap = {
      Brand: 'tone-of-voice-brand',
      CRM: 'tone-of-voice-crm',
      Digital: 'tone-of-voice-digital',
    };
    const tovKey = tovMap[channel];
    if (tovKey && cache[tovKey]) {
      refs.push({ name: `Tone of Voice (${channel})`, content: cache[tovKey] });
    }
  }

  // Compliance agent — legal reference
  if (agentId === 'compliance' && cache['compliance-legal']) {
    refs.push({ name: 'Compliance & Legal Guidelines', content: cache['compliance-legal'] });
  }

  // Product-specific — triggered by campaign context keywords
  const ctx = `${campaignContext} ${channel}`.toLowerCase();
  if (cache['electrification'] && /electrif|hybrid|bev|phev|hydrogen|powertrain|ev\b/i.test(ctx)) {
    refs.push({ name: 'Electrification & Powertrain', content: cache['electrification'] });
  }
  if (cache['hilux-content'] && /hilux/i.test(ctx)) {
    refs.push({ name: 'Hilux Product Content', content: cache['hilux-content'] });
  }
  if (cache['prius-content'] && /prius/i.test(ctx)) {
    refs.push({ name: 'Prius Product Content', content: cache['prius-content'] });
  }

  return refs;
}

/**
 * Format reference material array into a system prompt block.
 */
export function formatReferenceContext(refs) {
  if (!refs.length) return '';

  const blocks = refs.map(r =>
    `[REFERENCE: ${r.name}]\n${r.content}\n[END REFERENCE: ${r.name}]`
  ).join('\n\n');

  return `--- REFERENCE MATERIAL ---\nThe following reference documents provide brand guidelines, product knowledge, personas, and compliance rules. Use these to ground your output in accurate, on-brand information.\n\n${blocks}\n--- END REFERENCE MATERIAL ---`;
}

/**
 * Get pre-formatted reference context string ready for system prompt injection.
 */
export function getReferenceContext(agentId, channel = '', campaignContext = '') {
  const refs = getReferenceMaterial(agentId, channel, campaignContext);
  return formatReferenceContext(refs);
}

/**
 * Express route handler: GET /api/reference
 * Returns reference material for a given agent/channel/context.
 * Used by the frontend to get reference context for system prompt building.
 */
export function referenceRoute(req, res) {
  const { agentId, channel, campaignContext } = req.query;

  if (!agentId) {
    return res.status(400).json({ error: 'agentId query param required' });
  }

  const context = getReferenceContext(agentId, channel || '', campaignContext || '');
  const refs = getReferenceMaterial(agentId, channel || '', campaignContext || '');
  const names = refs.map(r => r.name);

  res.json({ referenceContext: context, referenceNames: names });
}
