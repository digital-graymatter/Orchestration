/**
 * Vercel-compatible reference material loader.
 * Reads .docx files from src/reference/ using mammoth.
 * Caches text in memory (persists across warm invocations).
 */

import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';

const REFERENCE_ROOT = path.resolve(process.cwd(), 'src/reference');

const cache = {};
let initialised = false;

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

async function ensureLoaded() {
  if (initialised) return;

  await Promise.allSettled(
    Object.entries(DOCX_FILES).map(async ([key, relPath]) => {
      try {
        const fullPath = path.join(REFERENCE_ROOT, relPath);
        const buffer = await fs.readFile(fullPath);
        const result = await mammoth.extractRawText({ buffer });
        cache[key] = result.value;
      } catch (e) {
        // File may not exist in Vercel build output — skip silently
      }
    })
  );

  initialised = true;
}

export async function getReferenceContext(agentId, channel = '', campaignContext = '') {
  await ensureLoaded();

  const refs = [];

  if (cache['better-business-content']) {
    refs.push({ name: 'Toyota Professional Better Business Content', content: cache['better-business-content'] });
  }
  if (cache['fleet-personas']) {
    refs.push({ name: 'Fleet Personas', content: cache['fleet-personas'] });
  }

  if (agentId === 'copy') {
    const tovMap = { Brand: 'tone-of-voice-brand', CRM: 'tone-of-voice-crm', Digital: 'tone-of-voice-digital' };
    const tovKey = tovMap[channel];
    if (tovKey && cache[tovKey]) {
      refs.push({ name: `Tone of Voice (${channel})`, content: cache[tovKey] });
    }
  }

  if (agentId === 'compliance' && cache['compliance-legal']) {
    refs.push({ name: 'Compliance & Legal Guidelines', content: cache['compliance-legal'] });
  }

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

  if (!refs.length) return '';

  const blocks = refs.map(r =>
    `[REFERENCE: ${r.name}]\n${r.content}\n[END REFERENCE: ${r.name}]`
  ).join('\n\n');

  return `--- REFERENCE MATERIAL ---\nThe following reference documents provide brand guidelines, product knowledge, personas, and compliance rules. Use these to ground your output in accurate, on-brand information.\n\n${blocks}\n--- END REFERENCE MATERIAL ---`;
}
