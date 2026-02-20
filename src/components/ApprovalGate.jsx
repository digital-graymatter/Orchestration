/* ── Approval Gate ──
   Replaces inline approve buttons. Adds KB save option before approval.
   Shows: checkbox to save to KB, tag input, category selector, approve/request changes. */

import { useState, useEffect } from 'react';
import { ACCENT, THEME as t } from '../utils/theme';
import { CheckIcon, ArrowRightIcon } from '../icons';
import { AGENTS } from '../agents/index';
import { getAllCategories } from '../knowledge-bank/categories.js';

export default function ApprovalGate({
  agentId,
  onApprove,       // (saveToKB, tag, category) => void
  onRequestChanges, // () => void — re-focus chat input
  downstreamOptions, // [agentId, ...] — agents to hand off to
  isLastAgent,      // true if no downstream agents
  isTyping,
  disabled,
}) {
  const agent = AGENTS[agentId];
  const defaultCategory = agent?.kbCategory || 'Approved Briefs';

  const [saveToKB, setSaveToKB] = useState(true);
  const [tag, setTag] = useState('');
  const [category, setCategory] = useState(defaultCategory);

  // Reset when agent changes
  useEffect(() => {
    setSaveToKB(true);
    setTag('');
    setCategory(agent?.kbCategory || 'Approved Briefs');
  }, [agentId, agent?.kbCategory]);

  const categories = getAllCategories();

  const handleApprove = (targetAgentId) => {
    onApprove({
      saveToKB,
      tag: tag.trim() || null,
      category,
      targetAgentId,
    });
  };

  return (
    <div style={{ animation: 'fadeUp 0.2s ease-out' }}>
      {/* KB save option */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
        borderRadius: 10, background: saveToKB ? ACCENT.light : t.surfaceAlt,
        border: `1px solid ${saveToKB ? ACCENT.primary + '33' : t.border}`,
        marginBottom: 12, transition: 'all 0.15s',
      }}>
        <input
          type="checkbox" checked={saveToKB} onChange={(e) => setSaveToKB(e.target.checked)}
          style={{ marginTop: 2, accentColor: ACCENT.primary, cursor: 'pointer' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: saveToKB ? ACCENT.text : t.textSec, cursor: 'pointer' }}
            onClick={() => setSaveToKB(!saveToKB)}
          >
            Save to Knowledge Bank
          </div>
          {saveToKB && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text" value={tag} onChange={(e) => setTag(e.target.value)}
                placeholder="Tag (e.g. Electrification brief — SME fleet)"
                style={{
                  flex: 1, minWidth: 180, padding: '6px 10px', borderRadius: 6,
                  border: `1px solid ${t.border}`, background: t.inputBg,
                  fontSize: 12, color: t.text, fontFamily: 'inherit',
                }}
              />
              <select
                value={category} onChange={(e) => setCategory(e.target.value)}
                style={{
                  padding: '6px 10px', borderRadius: 6, border: `1px solid ${t.border}`,
                  background: t.inputBg, fontSize: 12, color: t.text, fontFamily: 'inherit',
                }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={onRequestChanges}
          disabled={isTyping || disabled}
          style={{
            padding: '8px 14px', borderRadius: 8, border: `1px solid ${t.border}`,
            background: 'transparent', fontSize: 12, fontWeight: 500,
            cursor: isTyping || disabled ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', color: t.textSec, transition: 'all 0.15s',
            opacity: isTyping || disabled ? 0.4 : 1,
          }}
        >
          Request Changes
        </button>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Hand off to downstream agents */}
          {downstreamOptions.map((targetId, i) => (
            <button
              key={targetId}
              className="approve-btn"
              onClick={() => handleApprove(targetId)}
              disabled={isTyping || disabled}
              style={i > 0 ? { background: 'transparent', border: `1px solid ${ACCENT.primary}`, color: ACCENT.text } : {}}
            >
              {i === 0 && <CheckIcon size={12} color="#fff" />}
              Approve <ArrowRightIcon size={12} color={i === 0 ? '#fff' : ACCENT.text} /> {AGENTS[targetId]?.name}
            </button>
          ))}

          {/* Finalise button */}
          <button
            className={isLastAgent ? 'finalise-btn' : 'finalise-btn'}
            onClick={() => handleApprove(null)}
            disabled={isTyping || disabled}
            style={!isLastAgent ? { animation: 'none' } : {}}
          >
            <CheckIcon size={14} color={ACCENT.text} /> {isLastAgent ? 'Approve & Finalise' : 'Finalise'}
          </button>
        </div>
      </div>
    </div>
  );
}
