/* ── Audit Log slide-out panel ── */
import { AGENTS } from '../agents/index';
import { confidenceColour } from '../utils/confidence';
import { ACCENT, THEME as t } from '../utils/theme';

export default function AuditLogPanel({ auditLog, adminOpen, setAdminOpen, auditFilter, setAuditFilter }) {
  if (!adminOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setAdminOpen(false)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
        background: t.surface, zIndex: 201,
        borderLeft: `1px solid ${t.border}`,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        animation: 'fadeUp 0.2s ease-out',
      }}>
        {/* Panel header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Audit Log</div>
            <div style={{ fontSize: 12, color: t.textSec, marginTop: 2 }}>
              Decision trail — every agent action, approval and handoff
            </div>
          </div>
          <button
            onClick={() => setAdminOpen(false)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: t.textMut, fontSize: 18, padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{
          padding: '10px 20px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0,
        }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'brief', label: 'Brief' },
            { key: 'strategy', label: 'Strategy' },
            { key: 'copy', label: 'Copy' },
            { key: 'compliance', label: 'Compliance' },
            { key: 'approve', label: 'Approvals' },
            { key: 'handoff', label: 'Handoffs' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setAuditFilter(f.key)}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: `1px solid ${auditFilter === f.key ? ACCENT.primary : t.border}`,
                background: auditFilter === f.key ? ACCENT.light : 'transparent',
                color: auditFilter === f.key ? ACCENT.text : t.textSec,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Log entries */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {auditLog.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px', color: t.textMut, fontSize: 13,
            }}>
              No entries yet. Start a workflow to generate audit trail.
            </div>
          ) : (
            auditLog
              .filter((entry) => {
                if (auditFilter === 'all') return true;
                if (['approve', 'handoff'].includes(auditFilter)) return entry.type === auditFilter;
                return entry.agentId === auditFilter;
              })
              .map((entry) => {
                const typeConfig = {
                  start: { colour: '#2563eb', icon: '▶', label: 'START' },
                  output: { colour: AGENTS[entry.agentId]?.colour || t.textSec, icon: '◆', label: 'OUTPUT' },
                  approve: { colour: '#16a34a', icon: '✓', label: 'APPROVED' },
                  handoff: { colour: '#0f766e', icon: '→', label: 'HANDOFF' },
                  skip: { colour: '#d97706', icon: '⏭', label: 'SKIPPED' },
                  finalise: { colour: '#16a34a', icon: '★', label: 'FINALISED' },
                  refine: { colour: '#6366f1', icon: '↻', label: 'REFINE' },
                  error: { colour: '#dc2626', icon: '!', label: 'ERROR' },
                };
                const tc = typeConfig[entry.type] || { colour: t.textSec, icon: '•', label: entry.type.toUpperCase() };
                return (
                  <div key={entry.id} style={{
                    padding: '12px 0',
                    borderBottom: `1px solid ${t.border}`,
                    animation: 'fadeUp 0.3s ease-out',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                        background: tc.colour + '15',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, color: tc.colour, fontWeight: 700,
                      }}>
                        {tc.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 6px',
                            borderRadius: 4, background: tc.colour + '18', color: tc.colour,
                            letterSpacing: 0.5,
                          }}>
                            {tc.label}
                          </span>
                          {entry.agentName && (
                            <span style={{
                              fontSize: 11, fontWeight: 600,
                              color: AGENTS[entry.agentId]?.colour || t.textSec,
                            }}>
                              {entry.agentName.replace(' Agent', '')}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: t.textMut, marginLeft: 'auto', flexShrink: 0 }}>
                            {entry.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: t.text, lineHeight: 1.5 }}>
                          {entry.detail}
                        </div>
                        {(entry.meta.confidence !== undefined && entry.meta.confidence !== null) && (
                          <div style={{ marginTop: 4 }}>
                            {(() => {
                              const c = confidenceColour(entry.meta.confidence);
                              return (
                                <span style={{
                                  fontSize: 10, fontWeight: 600, padding: '2px 8px',
                                  borderRadius: 4, background: c.bg, color: c.text,
                                  border: `1px solid ${c.border}`,
                                }}>
                                  Confidence: {(entry.meta.confidence * 100).toFixed(0)}%
                                </span>
                              );
                            })()}
                          </div>
                        )}
                        {entry.meta.source && (
                          <span style={{
                            fontSize: 10, fontWeight: 500, padding: '2px 6px',
                            borderRadius: 4, background: t.surfaceAlt, color: t.textMut,
                            marginTop: 4, display: 'inline-block',
                          }}>
                            Mode: {entry.meta.source === 'demo' ? 'Guided' : 'Open'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Panel footer */}
        {auditLog.length > 0 && (
          <div style={{
            padding: '12px 20px', borderTop: `1px solid ${t.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: t.textMut }}>
              {auditLog.length} event{auditLog.length !== 1 ? 's' : ''} logged
            </span>
            <button
              onClick={() => {
                const data = JSON.stringify(auditLog.map(e => ({
                  ...e, timestamp: e.timestamp.toISOString(),
                })), null, 2);
                navigator.clipboard.writeText(data);
              }}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: `1px solid ${t.border}`, background: 'transparent',
                color: t.textSec, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Copy JSON
            </button>
          </div>
        )}
      </div>
    </>
  );
}
