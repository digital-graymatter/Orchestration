/* ── Colour-coded markdown components for agent output ──
   Detects compliance / confidence patterns and applies visual treatment.
   Passed as `components` prop to ReactMarkdown. */

function getTextContent(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(getTextContent).join('');
  if (children?.props?.children) return getTextContent(children.props.children);
  return '';
}

const COLOUR_PATTERNS = {
  pass:    { bg: '#f0fdf4', text: '#16a34a', border: '#16a34a', icon: '✅' },
  fail:    { bg: '#fef2f2', text: '#dc2626', border: '#dc2626', icon: '🚫' },
  warning: { bg: '#fffbeb', text: '#d97706', border: '#d97706', icon: '⚠️' },
  low:     { bg: '#fef2f2', text: '#dc2626', border: '#dc2626', icon: '' },
  high:    { bg: '#f0fdf4', text: '#16a34a', border: '#16a34a', icon: '' },
  medium:  { bg: '#fffbeb', text: '#d97706', border: '#d97706', icon: '' },
};

function detectPattern(text) {
  if (/rating:\s*✅\s*pass/i.test(text) || /✅\s*pass/i.test(text)) return 'pass';
  if (/rating:\s*🚫\s*fail/i.test(text) || /🚫\s*fail/i.test(text)) return 'fail';
  if (/rating:\s*⚠️?\s*warning/i.test(text) || /⚠️?\s*warning/i.test(text)) return 'warning';
  if (/residual risk is low/i.test(text) || /risk.*assessed as low/i.test(text)) return 'pass';
  if (/residual risk is high/i.test(text) || /risk.*assessed as high/i.test(text)) return 'fail';
  if (/no.*changes.*required/i.test(text) || /no.*amendments.*required/i.test(text)) return 'pass';
  if (/suitable for publication/i.test(text)) return 'pass';
  return null;
}

/* ── Track whether we're inside a Sources / References section ──
   Module-level flag — set when we encounter a ## Sources heading,
   cleared on the next non-sources heading. This lets child elements
   (ol, ul, li, a) render in smaller, muted grey for citation lists.
   Safe because ReactMarkdown renders synchronously in a single pass. */
let inSourcesSection = false;

export const agentMarkdownComponents = {
  h2: ({ children, ...props }) => {
    const text = getTextContent(children);
    inSourcesSection = /^sources|^references/i.test(text.trim());
    if (inSourcesSection) {
      return (
        <h2 {...props} style={{
          fontSize: 13, fontWeight: 700, color: '#6b7280',
          borderTop: '1px solid #e5e7eb', paddingTop: 16, marginTop: 24,
          marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase',
        }}>
          {children}
        </h2>
      );
    }
    return <h2 {...props}>{children}</h2>;
  },
  h3: ({ children, ...props }) => {
    const text = getTextContent(children);
    // A non-sources h3 exits the sources section
    if (!/^sources|^references/i.test(text.trim())) {
      inSourcesSection = false;
    }
    const pattern = detectPattern(text);
    if (pattern) {
      const c = COLOUR_PATTERNS[pattern];
      return (
        <h3 {...props} style={{
          background: c.bg, color: c.text, padding: '12px 18px',
          borderRadius: 10, border: `1.5px solid ${c.border}22`,
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 16, fontWeight: 700,
        }}>
          {children}
        </h3>
      );
    }
    return <h3 {...props}>{children}</h3>;
  },
  p: ({ children, ...props }) => {
    const text = getTextContent(children);
    const pattern = detectPattern(text);
    if (pattern) {
      const c = COLOUR_PATTERNS[pattern];
      return (
        <p {...props} style={{
          background: c.bg, color: c.text, padding: '10px 16px',
          borderRadius: 8, borderLeft: `3px solid ${c.border}`,
          fontWeight: 600, fontSize: 14,
        }}>
          {children}
        </p>
      );
    }
    return <p {...props}>{children}</p>;
  },
  td: ({ children, ...props }) => {
    const text = getTextContent(children);
    const confMatch = text.match(/^([\d.]+)$/);
    if (confMatch) {
      const val = parseFloat(confMatch[1]);
      if (val >= 0 && val <= 1) {
        const level = val >= 0.8 ? 'high' : val >= 0.5 ? 'medium' : 'low';
        const c = COLOUR_PATTERNS[level];
        return (
          <td {...props} style={{
            background: c.bg, color: c.text, fontWeight: 700,
            border: '1px solid #e5e7eb', padding: '8px 12px',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: c.text,
                display: 'inline-block', flexShrink: 0,
              }} />
              {children}
            </span>
          </td>
        );
      }
    }
    if (/✅\s*PASS/i.test(text)) {
      const c = COLOUR_PATTERNS.pass;
      return <td {...props} style={{ background: c.bg, color: c.text, fontWeight: 700, border: '1px solid #e5e7eb', padding: '8px 12px' }}>{children}</td>;
    }
    if (/🚫\s*FAIL/i.test(text)) {
      const c = COLOUR_PATTERNS.fail;
      return <td {...props} style={{ background: c.bg, color: c.text, fontWeight: 700, border: '1px solid #e5e7eb', padding: '8px 12px' }}>{children}</td>;
    }
    if (/⚠️?\s*WARNING/i.test(text)) {
      const c = COLOUR_PATTERNS.warning;
      return <td {...props} style={{ background: c.bg, color: c.text, fontWeight: 700, border: '1px solid #e5e7eb', padding: '8px 12px' }}>{children}</td>;
    }
    return <td {...props}>{children}</td>;
  },
  strong: ({ children, ...props }) => {
    const text = getTextContent(children);
    if (/residual risk is low/i.test(text) || /residual.*risk.*low/i.test(text)) {
      return <strong {...props} style={{ color: '#16a34a' }}>{children}</strong>;
    }
    if (/residual risk is high/i.test(text) || /residual.*risk.*high/i.test(text)) {
      return <strong {...props} style={{ color: '#dc2626' }}>{children}</strong>;
    }
    if (/confidence\s+score/i.test(text)) {
      return <strong {...props} style={{ color: '#2563eb' }}>{children}</strong>;
    }
    return <strong {...props}>{children}</strong>;
  },
  ol: ({ children, ...props }) => {
    if (inSourcesSection) {
      return <ol {...props} style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7, paddingLeft: 20, margin: '4px 0' }}>{children}</ol>;
    }
    return <ol {...props}>{children}</ol>;
  },
  ul: ({ children, ...props }) => {
    if (inSourcesSection) {
      return <ul {...props} style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7, paddingLeft: 20, margin: '4px 0' }}>{children}</ul>;
    }
    return <ul {...props}>{children}</ul>;
  },
  li: ({ children, ...props }) => {
    if (inSourcesSection) {
      return <li {...props} style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{children}</li>;
    }
    return <li {...props}>{children}</li>;
  },
  a: ({ children, href, ...props }) => {
    if (inSourcesSection) {
      return <a href={href} target="_blank" rel="noopener noreferrer" {...props} style={{ color: '#2563eb', fontSize: 11, textDecoration: 'underline', wordBreak: 'break-all' }}>{children}</a>;
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" {...props} style={{ color: '#2563eb', textDecoration: 'underline' }}>{children}</a>;
  },
};

/** Strip agent-to-agent routing metadata from rendered output */
export function stripRoutingBlock(text) {
  if (!text) return text;
  return text
    .replace(/\n---\n\n### Routing Recommendation[\s\S]*$/, '')
    .replace(/### Routing Recommendation[\s\S]*$/, '')
    .trimEnd();
}
