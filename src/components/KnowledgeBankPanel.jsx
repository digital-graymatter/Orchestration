/* ── Knowledge Bank Panel ──
   Side panel showing all saved KB entries, grouped by category.
   Supports search, filter, expand, and delete. */

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ACCENT, THEME as t } from '../utils/theme';
import { agentMarkdownComponents } from '../utils/markdown.jsx';
import { getAllEntries, deleteEntry } from '../knowledge-bank/store.js';
import { getAllCategories } from '../knowledge-bank/categories.js';

export default function KnowledgeBankPanel({ open, onClose, onRefresh }) {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Load entries when panel opens
  useEffect(() => {
    if (open) loadEntries();
  }, [open]);

  const loadEntries = async () => {
    try {
      const all = await getAllEntries();
      setEntries(all);
    } catch (err) {
      console.error('Failed to load KB entries:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setConfirmDelete(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to delete KB entry:', err);
    }
  };

  // Filter + search
  const categories = getAllCategories();
  const usedCategories = [...new Set(entries.map((e) => e.category))];
  const filtered = entries.filter((e) => {
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (e.tag || '').toLowerCase().includes(q) ||
        (e.content || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by category
  const grouped = {};
  filtered.forEach((e) => {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  });

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
      background: t.surface, borderLeft: `1px solid ${t.border}`,
      zIndex: 200, display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
      animation: 'fadeUp 0.2s ease-out',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: t.text }}>Knowledge Bank</div>
          <div style={{ fontSize: 12, color: t.textSec, marginTop: 2 }}>{entries.length} entries saved</div>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`,
          background: 'transparent', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 16, color: t.textSec,
        }}>{'\u2715'}</button>
      </div>

      {/* Search + filter */}
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: 8 }}>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entries..."
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${t.border}`,
            background: t.inputBg, fontSize: 13, color: t.text, fontFamily: 'inherit',
          }}
        />
        <select
          value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: '8px 10px', borderRadius: 8, border: `1px solid ${t.border}`,
            background: t.inputBg, fontSize: 12, color: t.text, fontFamily: 'inherit',
            maxWidth: 160,
          }}
        >
          <option value="all">All categories</option>
          {usedCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Entries list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: t.textMut, fontSize: 13 }}>
            {entries.length === 0 ? 'No entries yet. Approve agent outputs to save them here.' : 'No entries match your search.'}
          </div>
        ) : (
          Object.entries(grouped).map(([category, catEntries]) => (
            <div key={category} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: t.textSec, textTransform: 'uppercase',
                letterSpacing: 0.5, marginBottom: 8, padding: '4px 0',
                borderBottom: `1px solid ${t.border}`,
              }}>
                {category} ({catEntries.length})
              </div>
              {catEntries.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const date = new Date(entry.timestamp).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                });
                return (
                  <div key={entry.id} style={{
                    padding: '12px 14px', borderRadius: 8, border: `1px solid ${t.border}`,
                    marginBottom: 8, background: isExpanded ? t.surfaceAlt : 'transparent',
                    transition: 'background 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: t.text,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {entry.tag || 'Untitled'}
                        </div>
                        <div style={{ fontSize: 11, color: t.textMut, marginTop: 2 }}>
                          {date} {'\u2022'} {entry.channel || ''} {entry.runbook ? `\u2022 ${entry.runbook}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setExpandedId(isExpanded ? null : entry.id)} style={{
                          padding: '4px 8px', borderRadius: 6, border: `1px solid ${t.border}`,
                          background: 'transparent', fontSize: 11, color: t.textSec,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                          {isExpanded ? 'Less' : 'View'}
                        </button>
                        {confirmDelete === entry.id ? (
                          <button onClick={() => handleDelete(entry.id)} style={{
                            padding: '4px 8px', borderRadius: 6, border: '1px solid #ef4444',
                            background: '#fef2f2', fontSize: 11, color: '#dc2626',
                            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                          }}>
                            Confirm
                          </button>
                        ) : (
                          <button onClick={() => setConfirmDelete(entry.id)} style={{
                            padding: '4px 8px', borderRadius: 6, border: `1px solid ${t.border}`,
                            background: 'transparent', fontSize: 11, color: t.textMut,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{
                        marginTop: 10, padding: '10px 12px', borderRadius: 6,
                        background: t.surface, border: `1px solid ${t.border}`,
                        maxHeight: 300, overflowY: 'auto', fontSize: 13,
                      }}>
                        <div className="md">
                          <ReactMarkdown components={agentMarkdownComponents}>{entry.content}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
