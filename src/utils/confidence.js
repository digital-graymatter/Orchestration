/* ── Confidence score extraction and display ── */

/** Extract confidence score (0–1) from agent markdown output */
export function extractConfidence(text) {
  if (!text) return null;
  const patterns = [
    /\*\*Confidence\s+score\*\*\s*\|\s*([\d.]+)/i,
    /Confidence\s+score[:\s]+(\d+(?:\.\d+)?)/i,
    /confidence[:\s]+(\d+(?:\.\d+)?)/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const val = parseFloat(m[1]);
      if (val >= 0 && val <= 1) return val;
    }
  }
  return null;
}

/** Map score to colour tokens and label */
export function confidenceColour(score) {
  if (score >= 0.8) return { bg: '#f0fdf4', text: '#16a34a', border: '#16a34a33', label: 'High' };
  if (score >= 0.5) return { bg: '#fffbeb', text: '#d97706', border: '#d9770633', label: 'Medium' };
  return { bg: '#fef2f2', text: '#dc2626', border: '#dc262633', label: 'Low' };
}
