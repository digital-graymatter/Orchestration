/* ── Header bar ── */
import { ACCENT, THEME as t } from '../utils/theme';

export default function Header({ auditLog, adminOpen, setAdminOpen, kbCount, kbOpen, setKbOpen }) {
  return (
    <header style={{
      height: 56, borderBottom: `1px solid ${t.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', position: 'sticky', top: 0,
      background: t.headerBg, zIndex: 100, backdropFilter: 'blur(8px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.5 }}>REPLY</span>
        <span style={{ color: t.textMut, fontSize: 14 }}>{'\u2014'}</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: t.textSec }}>
          Multi-Agent Marketing Orchestrator
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Knowledge Bank button */}
        <button
          onClick={() => setKbOpen(!kbOpen)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8,
            border: `1px solid ${kbOpen ? '#d97706' : t.border}`,
            background: kbOpen ? '#fffbeb' : 'transparent',
            color: kbOpen ? '#d97706' : t.textSec,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Knowledge Bank
          {kbCount > 0 && (
            <span style={{
              background: '#d97706', color: '#fff', fontSize: 10, fontWeight: 700,
              padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center',
            }}>
              {kbCount}
            </span>
          )}
        </button>

        {/* Audit Log button */}
        <button
          onClick={() => setAdminOpen(!adminOpen)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8,
            border: `1px solid ${adminOpen ? ACCENT.primary : t.border}`,
            background: adminOpen ? ACCENT.light : 'transparent',
            color: adminOpen ? ACCENT.text : t.textSec,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Audit Log
          {auditLog.length > 0 && (
            <span style={{
              background: ACCENT.primary, color: '#fff', fontSize: 10, fontWeight: 700,
              padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center',
            }}>
              {auditLog.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
