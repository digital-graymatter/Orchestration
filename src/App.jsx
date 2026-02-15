import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { AGENTS, AGENT_ORDER, buildSystemPrompt, callAgent } from './agents/index';
import demoData from './data/demoData';
import {
  AGENT_ICONS, CheckIcon, ArrowRightIcon, SkipIcon, SendIcon,
} from './icons';

/* ── Utility imports ── */
import { ACCENT, THEME as t } from './utils/theme';
import { extractConfidence, confidenceColour } from './utils/confidence';
import { agentMarkdownComponents, stripRoutingBlock } from './utils/markdown.jsx';
import {
  getActivePipeline, getNextInPipeline, getPrevInPipeline, getDownstreamOptions,
} from './utils/pipeline';
import {
  CHANNELS, DEFAULT_RUNBOOKS, PERSONAS, SECTORS, DEMO_PROMPTS,
} from './utils/config';

/* ── Component imports ── */
import Header from './components/Header';
import AuditLogPanel from './components/AuditLogPanel';

/* ── helper: render agent icon by id ─────────────────── */
function AgentIcon({ agentId, size = 18, color = 'currentColor' }) {
  const Icon = AGENT_ICONS[agentId];
  if (!Icon) return null;
  return <Icon size={size} color={color} />;
}

/* ── App ───────────────────────────────────────────────── */
export default function App() {
  /* config */
  const [channel, setChannel] = useState('CRM');
  const [runbook, setRunbook] = useState('Nurture Journeys');
  const [prompt, setPrompt] = useState('');
  const [persona, setPersona] = useState('SME');
  const [sector, setSector] = useState('SME General Business');
  const [executionMode, setExecutionMode] = useState('multi');
  const [singleAgent, setSingleAgent] = useState('brief');
  const [compliancePaste, setCompliancePaste] = useState('');

  /* multi-agent stage toggles — Strategy ON, Compliance ON */
  const [stages, setStages] = useState({
    brief: true,
    strategy: true,
    copy: true,
    compliance: true,
  });
  const [nurtureFlowMode, setNurtureFlowMode] = useState(true);
  const [demoMode, setDemoMode] = useState(true);

  /* workflow execution state */
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [workflowComplete, setWorkflowComplete] = useState(false);
  const [browsingCompleted, setBrowsingCompleted] = useState(false);

  const [conversations, setConversations] = useState({});
  const [agentSequence, setAgentSequence] = useState([]);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [completedAgents, setCompletedAgents] = useState([]);
  const [expandedMsgs, setExpandedMsgs] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [approvedOutputs, setApprovedOutputs] = useState({});
  const [apiError, setApiError] = useState(null);

  /* audit log */
  const [auditLog, setAuditLog] = useState([]);
  const [adminOpen, setAdminOpen] = useState(false);
  const [auditFilter, setAuditFilter] = useState('all');

  const addAuditEntry = useCallback((type, agentId, detail, meta = {}) => {
    setAuditLog((prev) => [...prev, {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      type,
      agentId,
      agentName: agentId ? AGENTS[agentId]?.name : null,
      detail,
      meta,
    }]);
  }, []);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  /* load demo prompt on runbook change */
  useEffect(() => {
    if (DEMO_PROMPTS[runbook]) {
      setPrompt(DEMO_PROMPTS[runbook]);
    }
  }, [runbook]);

  /* scroll to bottom of conversation */
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
    if (currentAgent && conversations[currentAgent]?.length > 0) {
      scrollToBottom();
    }
  }, [conversations, currentAgent, scrollToBottom]);

  /* focus input when agent changes */
  useEffect(() => {
    if (currentAgent && !isTyping) {
      inputRef.current?.focus();
    }
  }, [currentAgent, isTyping]);

  /* handlers */
  const handleChannelChange = (ch) => {
    setChannel(ch);
    setRunbook(DEFAULT_RUNBOOKS[ch]);
    resetWorkflow();
  };

  const handleRunbookChange = (rb) => {
    setRunbook(rb);
    resetWorkflow();
  };

  const resetWorkflow = () => {
    setConversations({});
    setAgentSequence([]);
    setCurrentAgent(null);
    setCompletedAgents([]);
    setApprovedOutputs({});
    setWorkflowStarted(false);
    setWorkflowComplete(false);
    setBrowsingCompleted(false);
    setExpandedMsgs({});
    setChatInput('');
    setApiError(null);
    setAuditLog([]);
  };

  const toggleStage = (id) => {
    setStages((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleExpand = (key) => {
    setExpandedMsgs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ── helper: get pre-scripted demo output for an agent ── */
  const getDemoOutput = (agentId) => {
    const channelData = demoData[channel];
    if (!channelData) return null;
    const runbookData = channelData.runbooks[runbook];
    if (!runbookData) return null;
    const outputMap = {
      brief: 'briefOutput',
      strategy: 'strategyOutput',
      copy: 'copyOutput',
      compliance: 'complianceOutput',
    };
    return runbookData[outputMap[agentId]] || null;
  };

  /* ── helper: call agent and update conversation ── */
  const callAgentAndUpdate = async (agentId, messagesForApi, opts = {}) => {
    setIsTyping(true);
    setApiError(null);

    const existingAssistant = (conversations[agentId] || []).some((m) => m.role === 'assistant');
    // Research channel always runs Open (live API) — no pre-scripted data
    const isResearch = channel === 'Research';
    const scripted = (demoMode && !isResearch && !existingAssistant) ? getDemoOutput(agentId) : null;
    if (scripted) {
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));
      const conf = extractConfidence(scripted);
      addAuditEntry('output', agentId, `${AGENTS[agentId].name} produced output (pre-scripted)`, { source: 'demo', confidence: conf, outputLength: scripted.length });
      setConversations((prev) => ({
        ...prev,
        [agentId]: [
          ...(prev[agentId] || []),
          { role: 'assistant', content: scripted },
        ],
      }));
      setIsTyping(false);
      return;
    }

    try {
      const systemPrompt = buildSystemPrompt(agentId, {
        nurtureFlowMode,
        channel,
        runbook,
        approvedOutputs,
        ...opts,
      });
      const reply = await callAgent(systemPrompt, messagesForApi);
      const conf = extractConfidence(reply);
      addAuditEntry('output', agentId, `${AGENTS[agentId].name} produced output (live API)`, { source: 'api', confidence: conf, outputLength: reply.length });
      setConversations((prev) => ({
        ...prev,
        [agentId]: [
          ...(prev[agentId] || []),
          { role: 'assistant', content: reply },
        ],
      }));
    } catch (err) {
      const errorMsg = err.message.includes('Failed to fetch')
        ? 'Cannot reach API proxy. Make sure `node server.js` is running on port 3001.'
        : `API error: ${err.message}`;
      setApiError(errorMsg);
      addAuditEntry('error', agentId, `Error: ${errorMsg}`);
      setConversations((prev) => ({
        ...prev,
        [agentId]: [
          ...(prev[agentId] || []),
          { role: 'assistant', content: `\u26A0\uFE0F ${errorMsg}` },
        ],
      }));
    }
    setIsTyping(false);
  };

  /* ── start workflow ── */
  const startWorkflow = async () => {
    resetWorkflow();
    setWorkflowStarted(true);

    if (executionMode === 'single') {
      const agentId = singleAgent;
      const userMsg = agentId === 'compliance' && compliancePaste
        ? compliancePaste
        : prompt;

      addAuditEntry('start', agentId, `Workflow started in single-agent mode`, { mode: 'single', channel, runbook, demoMode });
      const initialMessages = [{ role: 'user', content: userMsg }];
      setConversations({ [agentId]: [...initialMessages] });
      setAgentSequence([agentId]);
      setCurrentAgent(agentId);

      await callAgentAndUpdate(agentId, initialMessages);
    } else {
      const pipeline = getActivePipeline(stages);
      if (pipeline.length === 0) return;
      const firstAgent = pipeline[0];

      addAuditEntry('start', firstAgent, `Workflow started — pipeline: ${pipeline.map(id => AGENTS[id].name.replace(' Agent', '')).join(' → ')}`, { mode: 'multi', channel, runbook, persona, sector, demoMode, pipeline });

      let enrichedPrompt = prompt;
      if (persona || sector) {
        enrichedPrompt += `\n\nAudience context — Persona: ${persona}, Sector: ${sector}`;
      }

      const initialMessages = [{ role: 'user', content: enrichedPrompt }];
      setConversations({ [firstAgent]: [...initialMessages] });
      setAgentSequence([firstAgent]);
      setCurrentAgent(firstAgent);

      await callAgentAndUpdate(firstAgent, initialMessages);
    }
  };

  /* ── send chat message ── */
  const sendMessage = async () => {
    if (!chatInput.trim() || !currentAgent || isTyping) return;
    const msg = chatInput.trim();
    setChatInput('');

    addAuditEntry('refine', currentAgent, `Human refinement request sent to ${AGENTS[currentAgent].name}`);

    const updatedMessages = [
      ...(conversations[currentAgent] || []),
      { role: 'user', content: msg },
    ];
    setConversations((prev) => ({
      ...prev,
      [currentAgent]: updatedMessages,
    }));

    await callAgentAndUpdate(currentAgent, updatedMessages);
  };

  /* ── approve & hand off ── */
  const handleHandoff = async (targetAgentId) => {
    if (!currentAgent) return;

    const currentConvo = conversations[currentAgent] || [];
    const lastAssistant = [...currentConvo].reverse().find((m) => m.role === 'assistant');
    const approvedContent = lastAssistant?.content || '';
    const conf = extractConfidence(approvedContent);

    addAuditEntry('approve', currentAgent, `${AGENTS[currentAgent].name} output approved by human reviewer`, { confidence: conf });
    addAuditEntry('handoff', currentAgent, `Handoff: ${AGENTS[currentAgent].name} → ${AGENTS[targetAgentId].name}`, { targetAgent: targetAgentId });

    const newApprovedOutputs = { ...approvedOutputs, [currentAgent]: approvedContent };
    setApprovedOutputs(newApprovedOutputs);
    setCompletedAgents((prev) => [...prev, currentAgent]);
    setConversations((prev) => ({
      ...prev,
      [currentAgent]: [
        ...(prev[currentAgent] || []),
        { role: 'system', content: `Output approved \u2713` },
      ],
    }));

    const prevAgentName = AGENTS[currentAgent].name;
    const nextAgentName = AGENTS[targetAgentId].name;
    const handoffMessage = `You are the ${nextAgentName}. The human reviewer has approved the output from the ${prevAgentName} (provided in your system context). Please now produce your ${nextAgentName} deliverable based on that approved upstream output. Do not attempt to route or hand off to other agents — just produce your specialist output.`;

    const initialMessages = [{ role: 'user', content: handoffMessage }];
    setConversations((prev) => ({
      ...prev,
      [targetAgentId]: [
        { role: 'system', content: `Received approved output from ${prevAgentName}` },
        ...initialMessages,
      ],
    }));
    setAgentSequence((prev) => [...prev, targetAgentId]);
    setCurrentAgent(targetAgentId);

    await callAgentAndUpdate(targetAgentId, initialMessages, { approvedOutputs: newApprovedOutputs });
  };

  /* ── skip current agent ── */
  const handleSkip = async () => {
    if (!currentAgent || executionMode !== 'multi') return;
    const nextAgent = getNextInPipeline(currentAgent, stages);
    if (!nextAgent) return;

    addAuditEntry('skip', currentAgent, `${AGENTS[currentAgent].name} skipped by human reviewer`, { nextAgent });

    setConversations((prev) => ({
      ...prev,
      [currentAgent]: [
        ...(prev[currentAgent] || []),
        { role: 'system', content: `Agent skipped \u2192` },
      ],
    }));
    setCompletedAgents((prev) => [...prev, currentAgent]);

    const prevAgentName = AGENTS[currentAgent].name;
    const nextAgentName = AGENTS[nextAgent].name;
    const handoffMessage = `You are the ${nextAgentName}. The previous agent (${prevAgentName}) was skipped by the reviewer. Please produce your ${nextAgentName} deliverable. Use whatever approved upstream context is available in your system prompt. Do not attempt to route or hand off to other agents.`;

    const initialMessages = [{ role: 'user', content: handoffMessage }];
    setConversations((prev) => ({
      ...prev,
      [nextAgent]: [
        { role: 'system', content: `${prevAgentName} was skipped` },
        ...initialMessages,
      ],
    }));
    setAgentSequence((prev) => [...prev, nextAgent]);
    setCurrentAgent(nextAgent);

    await callAgentAndUpdate(nextAgent, initialMessages, { approvedOutputs });
  };

  /* ── go back ── */
  const handleGoBack = () => {
    if (!currentAgent || executionMode !== 'multi') return;
    const prevAgent = getPrevInPipeline(currentAgent, stages);
    if (!prevAgent) return;

    setCompletedAgents((prev) => prev.filter((id) => id !== prevAgent));
    setCurrentAgent(prevAgent);
    setApprovedOutputs((prev) => {
      const next = { ...prev };
      delete next[prevAgent];
      return next;
    });
  };

  /* ── finalise ── */
  const handleFinalise = () => {
    if (!currentAgent) return;

    const currentConvo = conversations[currentAgent] || [];
    const lastAssistant = [...currentConvo].reverse().find((m) => m.role === 'assistant');
    const approvedContent = lastAssistant?.content || '';
    const conf = extractConfidence(approvedContent);

    addAuditEntry('approve', currentAgent, `${AGENTS[currentAgent].name} output approved by human reviewer`, { confidence: conf });
    addAuditEntry('finalise', currentAgent, `Workflow finalised — all outputs approved`);

    setApprovedOutputs((prev) => ({ ...prev, [currentAgent]: approvedContent }));
    setCompletedAgents((prev) => [...prev, currentAgent]);
    setConversations((prev) => ({
      ...prev,
      [currentAgent]: [
        ...(prev[currentAgent] || []),
        { role: 'system', content: `Output approved \u2713` },
      ],
    }));
    setWorkflowComplete(true);
    setCurrentAgent(null);
  };

  /* ── browsing ── */
  const switchToAgent = (agentId) => {
    if (completedAgents.includes(agentId) || agentId === currentAgent) {
      setCurrentAgent(agentId);
    }
  };

  const browseCompletedAgent = (agentId) => {
    setCurrentAgent(agentId);
    setWorkflowComplete(false);
    setBrowsingCompleted(true);
  };

  const backToSummary = () => {
    setCurrentAgent(null);
    setBrowsingCompleted(false);
    setWorkflowComplete(true);
  };

  /* ── derived state ── */
  const isNurtureJourneys = channel === 'CRM' && runbook === 'Nurture Journeys';
  const currentMessages = currentAgent ? (conversations[currentAgent] || []) : [];
  const currentAgentDef = currentAgent ? AGENTS[currentAgent] : null;
  const isCurrentCompleted = currentAgent && completedAgents.includes(currentAgent);
  const nextAgentId = currentAgent && executionMode === 'multi' ? getNextInPipeline(currentAgent, stages) : null;
  const prevAgentId = currentAgent && executionMode === 'multi' ? getPrevInPipeline(currentAgent, stages) : null;
  const downstreamOptions = currentAgent ? getDownstreamOptions(currentAgent, executionMode, stages, completedAgents) : [];
  const hasDownstream = downstreamOptions.length > 0;
  const canHandoff = currentAgent && !isCurrentCompleted && !workflowComplete && currentMessages.some((m) => m.role === 'assistant');
  const activePipeline = getActivePipeline(stages);
  const pipelinePosition = currentAgent ? activePipeline.indexOf(currentAgent) + 1 : 0;

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, color: t.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      fontSize: 15, transition: 'background 0.25s, color 0.25s',
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dotPulse { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 0 ${ACCENT.ring}} 50%{box-shadow:0 0 0 6px rgba(22,163,74,0)} }
        .seg-btn { padding: 9px 22px; border: 1px solid ${t.border}; background: transparent; color: ${t.textSec}; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.15s; font-family: inherit; }
        .seg-btn:first-child { border-radius: 8px 0 0 8px; }
        .seg-btn:last-child { border-radius: 0 8px 8px 0; }
        .seg-btn:not(:first-child) { border-left: none; }
        .seg-btn:hover:not(.active) { background: ${t.surface}; }
        .seg-btn.active { background: ${ACCENT.primary}; color: #fff; border-color: ${ACCENT.primary}; }
        .seg-btn.active + .seg-btn { border-left-color: ${ACCENT.primary}; }
        .card { background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 12px; padding: 24px 28px; margin-bottom: 16px; }
        .section-label { font-size: 14px; font-weight: 700; letter-spacing: 0.3px; color: ${t.text}; margin-bottom: 6px; }
        .helper-text { font-size: 13px; color: ${t.textSec}; margin-bottom: 16px; line-height: 1.5; }
        select, .config-textarea { font-family: inherit; font-size: 14px; color: ${t.text}; background: ${t.inputBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 10px 12px; width: 100%; transition: border-color 0.15s; }
        .config-textarea { resize: vertical; min-height: 100px; line-height: 1.6; }
        select:focus, .config-textarea:focus { outline: none; border-color: ${ACCENT.primary}; }
        .primary-btn { padding: 12px 28px; border-radius: 10px; border: none; background: ${ACCENT.primary}; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .primary-btn:hover { background: ${ACCENT.hover}; transform: translateY(-1px); box-shadow: 0 4px 12px ${ACCENT.ring}; }
        .approve-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s; background: ${ACCENT.primary}; color: #fff; }
        .approve-btn:hover { background: ${ACCENT.hover}; transform: translateY(-1px); box-shadow: 0 4px 12px ${ACCENT.ring}; }
        .approve-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }
        .finalise-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 24px; border-radius: 10px; border: 2px solid ${ACCENT.primary}; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s; background: ${ACCENT.light}; color: ${ACCENT.text}; animation: pulseGlow 2.5s ease-in-out infinite; }
        .finalise-btn:hover { background: ${ACCENT.primary}; color: #fff; box-shadow: 0 4px 16px rgba(22,163,74,0.3); }
        .finalise-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; animation: none; }
        .skip-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1px solid ${t.border}; background: transparent; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; color: ${t.textSec}; transition: all 0.15s; }
        .skip-btn:hover { border-color: ${t.borderHover}; background: ${t.surface}; }
        .skip-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1px solid ${t.border}; background: transparent; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; color: ${t.textSec}; transition: all 0.15s; }
        .back-btn:hover { border-color: ${t.borderHover}; background: ${t.surface}; }
        .toggle-track { width: 44px; height: 24px; border-radius: 12px; position: relative; cursor: pointer; transition: background 0.2s; border: none; padding: 0; }
        .toggle-thumb { width: 20px; height: 20px; border-radius: 50%; background: #fff; position: absolute; top: 2px; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .pipeline-dot { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; position: relative; flex-shrink: 0; }
        .pipeline-connector { height: 2px; width: 32px; flex-shrink: 0; transition: background 0.3s; }
        .runbook-card { padding: 14px 18px; border: 1px solid ${t.border}; border-radius: 10px; cursor: pointer; transition: all 0.15s; background: transparent; text-align: left; font-family: inherit; width: 100%; color: ${t.text}; }
        .runbook-card.active { border-color: ${ACCENT.primary}; background: ${ACCENT.light}; }
        .runbook-card:hover { border-color: ${t.textSec}; }
        .msg-card { animation: fadeUp 0.3s ease-out; }
        .md h1 { font-size: 20px; font-weight: 700; margin: 20px 0 12px; }
        .md h2 { font-size: 18px; font-weight: 700; margin: 18px 0 10px; }
        .md h3 { font-size: 16px; font-weight: 600; margin: 16px 0 8px; }
        .md h4 { font-size: 15px; font-weight: 600; margin: 14px 0 6px; }
        .md p { margin: 8px 0; line-height: 1.7; }
        .md ul, .md ol { margin: 8px 0; padding-left: 24px; }
        .md li { margin: 4px 0; line-height: 1.6; }
        .md strong { font-weight: 600; }
        .md em { font-style: italic; }
        .md hr { border: none; border-top: 1px solid ${t.border}; margin: 20px 0; }
        .md table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px; }
        .md th, .md td { border: 1px solid ${t.border}; padding: 8px 12px; text-align: left; }
        .md th { background: ${t.surface}; font-weight: 600; }
        .md blockquote { border-left: 3px solid ${t.border}; padding-left: 16px; margin: 12px 0; color: ${t.textSec}; font-size: 13px; }
        .md code { background: ${t.surface}; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
        .icon-btn { background: transparent; border: 1px solid ${t.border}; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 12px; font-weight: 500; color: ${t.textSec}; font-family: inherit; transition: all 0.15s; }
        .icon-btn:hover { border-color: ${t.borderHover}; background: ${t.surface}; }
        .chat-input-area { font-family: inherit; font-size: 15px; color: ${t.text}; background: transparent; border: none; resize: none; line-height: 1.5; min-height: 24px; max-height: 150px; width: 100%; }
        .chat-input-area:focus { outline: none; }
        .chat-input-area::placeholder { color: ${t.textMut}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <Header auditLog={auditLog} adminOpen={adminOpen} setAdminOpen={setAdminOpen} />
      <AuditLogPanel auditLog={auditLog} adminOpen={adminOpen} setAdminOpen={setAdminOpen} auditFilter={auditFilter} setAuditFilter={setAuditFilter} />

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '36px 24px 40px' }}>
        {/* A) NEW STRUCTURE */}
        <div style={{ marginBottom: 36 }}>
          <div className="section-label">New Structure</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, letterSpacing: -0.3 }}>BRAND CREATIVE SYSTEM</div>
          <div style={{ fontSize: 15, color: t.textSec, fontWeight: 500 }}>ONE BRAND MEMORY {'\u2014'} Multiple CHANNEL WORKFLOWS.</div>
        </div>

        {/* B) CHANNEL SELECTION */}
        <div className="card">
          <div className="section-label">Channel Selection</div>
          <div style={{ display: 'flex' }}>
            {Object.keys(CHANNELS).map((ch) => (
              <button key={ch} className={`seg-btn ${channel === ch ? 'active' : ''}`} onClick={() => handleChannelChange(ch)}>{ch}</button>
            ))}
          </div>
        </div>

        {/* C) CONTENT TYPE */}
        <div className="card">
          <div className="section-label">Content Type</div>
          <div className="helper-text">Choose what you would like to create</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CHANNELS[channel].runbooks.map((rb) => (
              <button key={rb} className={`runbook-card ${runbook === rb ? 'active' : ''}`} onClick={() => handleRunbookChange(rb)}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{rb}</div>
              </button>
            ))}
          </div>
        </div>

        {/* D) CONTEXT AND INTENT */}
        <div className="card">
          <div className="section-label">Context and Intent</div>
          <div className="helper-text">Tell us what this is about and what you want to achieve</div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textSec, marginBottom: 6 }}>Raw prompt or input</label>
          <textarea className="config-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
        </div>

        {/* E) AUDIENCE CONTEXT */}
        <div className="card">
          <div className="section-label">Audience Context</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textSec, marginBottom: 6 }}>Persona</label>
              <select value={persona} onChange={(e) => setPersona(e.target.value)}>
                {PERSONAS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textSec, marginBottom: 6 }}>Sector</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)}>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* F) WORKFLOW GOVERNANCE */}
        <div className="card">
          <div className="section-label">Workflow Governance</div>
          <div className="helper-text">Control how work progresses through the workflow, including when it runs automatically and when human review is required.</div>

          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Execution Mode</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ display: 'flex' }}>
                <button className={`seg-btn ${executionMode === 'single' ? 'active' : ''}`} onClick={() => { setExecutionMode('single'); resetWorkflow(); }}>Single agent</button>
                <button className={`seg-btn ${executionMode === 'multi' ? 'active' : ''}`} onClick={() => { setExecutionMode('multi'); resetWorkflow(); }}>Multi-agent orchestration</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="toggle-track" onClick={() => setDemoMode(!demoMode)} style={{ background: demoMode ? ACCENT.primary : '#d1d5db' }} aria-label="Toggle Demo Mode">
                  <div className="toggle-thumb" style={{ left: demoMode ? 22 : 2 }} />
                </button>
                <span title={demoMode ? 'Guided — optimised outputs for consistent workflow demonstration' : 'Open — real-time generation, results may vary'} style={{ fontSize: 12, fontWeight: 600, color: demoMode ? ACCENT.text : t.textSec, cursor: 'help' }}>
                  {demoMode ? 'Guided' : 'Open'}
                </span>
              </div>
            </div>
          </div>

          {executionMode === 'single' && (
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textSec, marginBottom: 6 }}>Select agent</label>
              <select value={singleAgent} onChange={(e) => { setSingleAgent(e.target.value); resetWorkflow(); }} style={{ maxWidth: 280 }}>
                {AGENT_ORDER.filter((id) => stages[id]).map((id) => <option key={id} value={id}>{AGENTS[id].name}</option>)}
              </select>
              {singleAgent === 'compliance' && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textSec, marginBottom: 6 }}>Paste copy for compliance check</label>
                  <textarea className="config-textarea" value={compliancePaste} onChange={(e) => setCompliancePaste(e.target.value)} rows={6} placeholder="Paste the copy you want to check for compliance..." />
                </div>
              )}
            </div>
          )}

          {executionMode === 'multi' && (
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textSec, marginBottom: 14 }}>Pipeline stages</label>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
                {AGENT_ORDER.map((id, i) => {
                  const agent = AGENTS[id];
                  const active = stages[id];
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
                      <button onClick={() => toggleStage(id)} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 20px', minWidth: 130, borderRadius: 12,
                        border: active ? `2px solid ${agent.colour}` : `1px solid ${t.border}`,
                        background: active ? agent.colour + '08' : t.surface,
                        cursor: 'pointer', transition: 'all 0.2s', opacity: active ? 1 : 0.45, fontFamily: 'inherit', position: 'relative',
                      }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: active ? agent.colour : t.border, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                          <AgentIcon agentId={id} size={20} color={active ? '#fff' : t.textMut} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: active ? t.text : t.textMut, transition: 'color 0.2s' }}>{agent.name.replace(' Agent', '')}</span>
                        <span style={{ fontSize: 11, color: active ? t.textSec : t.textMut, lineHeight: 1.4, textAlign: 'center', maxWidth: 120, transition: 'color 0.2s' }}>{agent.short}</span>
                        {active && <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: agent.colour }} />}
                      </button>
                      {i < AGENT_ORDER.length - 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', color: (active && stages[AGENT_ORDER[i + 1]]) ? t.textSec : t.border, transition: 'color 0.2s' }}>
                          <svg width="20" height="12" viewBox="0 0 20 12" fill="none"><path d="M0 6h16m0 0l-4-4.5M16 6l-4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {isNurtureJourneys && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: nurtureFlowMode ? ACCENT.light : t.surfaceAlt, border: `1px solid ${nurtureFlowMode ? ACCENT.primary + '33' : t.border}`, transition: 'all 0.2s' }}>
                  <button className="toggle-track" onClick={() => setNurtureFlowMode(!nurtureFlowMode)} style={{ background: nurtureFlowMode ? ACCENT.primary : '#d1d5db' }} aria-label="Toggle Nurture Flow Mode">
                    <div className="toggle-thumb" style={{ left: nurtureFlowMode ? 22 : 2 }} />
                  </button>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: nurtureFlowMode ? ACCENT.text : t.textSec }}>Nurture Flow Mode</span>
                    <span style={{ fontSize: 12, color: t.textSec, marginLeft: 8 }}>{nurtureFlowMode ? 'Sub-agent active under Copy Agent' : 'Disabled'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* I) START WORKFLOW */}
        <div className="card">
          <div className="section-label">Start Workflow</div>
          <div className="helper-text">Begin the workflow using the selections and controls defined above.</div>
          <button className="primary-btn" onClick={startWorkflow}>Start workflow</button>
        </div>

        {/* ═══ CONVERSATION AREA ═══ */}
        {workflowStarted && agentSequence.length > 0 && (
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 200px)' }}>
            {/* Pipeline progress bar */}
            {executionMode === 'multi' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '20px 0 28px', flexShrink: 0 }}>
                {activePipeline.map((id, i) => {
                  const agent = AGENTS[id];
                  const isCompleted = completedAgents.includes(id);
                  const isActive = id === currentAgent && !isCompleted;
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="pipeline-dot" onClick={() => switchToAgent(id)} title={agent.name} style={{
                        background: isCompleted ? agent.colour : isActive ? agent.colour + '20' : '#e5e7eb',
                        color: isCompleted ? '#fff' : isActive ? agent.colour : t.textMut,
                        border: isActive ? `2px solid ${agent.colour}` : '2px solid transparent',
                        fontSize: isCompleted ? 14 : 15,
                      }}>
                        {isCompleted ? <CheckIcon size={14} color="#fff" /> : <AgentIcon agentId={id} size={16} color={isActive ? agent.colour : t.textMut} />}
                      </div>
                      {i < activePipeline.length - 1 && (
                        <div className="pipeline-connector" style={{ background: completedAgents.includes(id) ? AGENTS[activePipeline[i + 1]]?.colour || t.border : t.border }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Agent identity bar */}
            {currentAgentDef && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', marginBottom: 0, flexShrink: 0, background: currentAgentDef.colour + '08', borderRadius: '12px 12px 0 0', borderLeft: `4px solid ${currentAgentDef.colour}`, borderTop: `1px solid ${t.border}`, borderRight: `1px solid ${t.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: currentAgentDef.colour, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AgentIcon agentId={currentAgent} size={20} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: t.text }}>
                    {currentAgentDef.name}
                    {isCurrentCompleted && <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: ACCENT.light, color: ACCENT.text }}>Approved <CheckIcon size={10} color={ACCENT.text} /></span>}
                  </div>
                  <div style={{ fontSize: 12, color: t.textSec, marginTop: 2 }}>
                    {currentAgentDef.short}
                    {executionMode === 'multi' && !isCurrentCompleted && <span style={{ marginLeft: 8, color: t.textMut }}>{'\u2022'} Step {pipelinePosition} of {activePipeline.length}</span>}
                  </div>
                </div>
                {(() => {
                  const lastAssistant = [...currentMessages].reverse().find((m) => m.role === 'assistant');
                  const score = extractConfidence(lastAssistant?.content);
                  if (score === null) return null;
                  const c = confidenceColour(score);
                  return (
                    <span title={`Agent confidence: ${(score * 100).toFixed(0)}%`} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: c.bg, color: c.text, border: `1px solid ${c.border}`, cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.text, display: 'inline-block', flexShrink: 0 }} />
                      {c.label} confidence {'\u2014'} {(score * 100).toFixed(0)}%
                    </span>
                  );
                })()}
                {currentAgent === 'copy' && isNurtureJourneys && nurtureFlowMode && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: ACCENT.light, color: ACCENT.text }}>Nurture Flow active</span>
                )}
              </div>
            )}

            {/* Conversation card */}
            <div style={{ background: t.convoBg, borderLeft: `4px solid ${currentAgentDef?.colour || t.border}`, borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, borderRadius: '0 0 12px 12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 20px', minHeight: 0 }}>
                <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
                  {currentMessages.map((msg, idx) => {
                    const msgKey = `${currentAgent}-${idx}`;
                    if (msg.role === 'system') {
                      return (
                        <div key={msgKey} className="msg-card" style={{ padding: '16px 0', textAlign: 'center' }}>
                          <span style={{ fontSize: 12, color: t.textMut, background: t.surface, padding: '5px 14px', borderRadius: 20, border: `1px solid ${t.border}` }}>{msg.content}</span>
                        </div>
                      );
                    }
                    const isUser = msg.role === 'user';
                    const isLong = msg.content && msg.content.length > 800;
                    const isExpanded = expandedMsgs[msgKey] !== undefined ? expandedMsgs[msgKey] : !isLong;
                    return (
                      <div key={msgKey} className="msg-card" style={{ padding: '20px 0', borderBottom: idx < currentMessages.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          {isUser ? (
                            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>You</div>
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: currentAgentDef.colour + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <AgentIcon agentId={currentAgent} size={16} color={currentAgentDef.colour} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: isUser ? t.text : currentAgentDef.colour }}>{isUser ? 'You' : currentAgentDef.name}</div>
                              {!isUser && (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="icon-btn" onClick={() => copyToClipboard(msg.content, msgKey)} style={{ padding: '3px 8px', fontSize: 11 }}>{copiedKey === msgKey ? '\u2713 Copied' : 'Copy'}</button>
                                  {isLong && <button className="icon-btn" onClick={() => toggleExpand(msgKey)} style={{ padding: '3px 8px', fontSize: 11 }}>{isExpanded ? 'Less' : 'More'}</button>}
                                </div>
                              )}
                            </div>
                            <div style={{ maxHeight: isExpanded ? 'none' : 400, overflow: 'hidden', position: 'relative' }}>
                              {isUser ? (
                                <div style={{ fontSize: 14, lineHeight: 1.7, color: t.textSec, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                              ) : (
                                <div className="md"><ReactMarkdown components={agentMarkdownComponents}>{stripRoutingBlock(msg.content)}</ReactMarkdown></div>
                              )}
                              {!isExpanded && isLong && (
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: `linear-gradient(transparent, ${t.convoBg})`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6 }}>
                                  <button className="icon-btn" onClick={() => toggleExpand(msgKey)} style={{ fontSize: 11 }}>Show more</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isTyping && (
                    <div className="msg-card" style={{ padding: '20px 0' }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: currentAgentDef?.colour + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AgentIcon agentId={currentAgent} size={16} color={currentAgentDef?.colour} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: currentAgentDef?.colour }}>{currentAgentDef?.name}</div>
                          <div style={{ display: 'flex', gap: 5, padding: '4px 0' }}>
                            {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: t.textMut, animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </div>
              {apiError && (
                <div style={{ padding: '10px 24px', borderTop: `1px solid ${t.border}`, background: '#fef2f2', flexShrink: 0 }}>
                  <div style={{ maxWidth: 760, margin: '0 auto', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{apiError}</div>
                </div>
              )}
              {/* Input dock */}
              {currentAgent && !workflowComplete && !browsingCompleted && (
                <div style={{ borderTop: `1px solid ${t.border}`, padding: '16px 24px', flexShrink: 0, background: t.dockBg }}>
                  <div style={{ maxWidth: 760, margin: '0 auto' }}>
                    {!isCurrentCompleted && (
                      <div style={{ background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`, padding: '12px 14px', display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: canHandoff ? 14 : 0 }}>
                        <textarea ref={inputRef} className="chat-input-area" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                          onInput={(e) => { e.target.style.height = '24px'; e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'; }}
                          placeholder={`Refine with ${currentAgentDef?.name || 'agent'}...`} rows={1} />
                        <button onClick={sendMessage} disabled={!chatInput.trim() || isTyping} style={{
                          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                          background: chatInput.trim() && !isTyping ? ACCENT.primary : t.border,
                          border: 'none', cursor: chatInput.trim() && !isTyping ? 'pointer' : 'default',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
                        }}>
                          <SendIcon size={16} color={chatInput.trim() && !isTyping ? '#fff' : t.textMut} />
                        </button>
                      </div>
                    )}
                    {canHandoff && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {prevAgentId && <button className="back-btn" onClick={handleGoBack}><ArrowRightIcon size={12} color={t.textSec} /> Back</button>}
                          {nextAgentId && <button className="skip-btn" onClick={handleSkip} disabled={isTyping}><SkipIcon size={12} color={t.textSec} /> Skip</button>}
                          <span style={{ fontSize: 12, color: t.textMut }}>{hasDownstream ? 'Approve and route' : 'Approve to finalise'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {downstreamOptions.map((targetId, i) => (
                            <button key={targetId} className="approve-btn" onClick={() => handleHandoff(targetId)} disabled={isTyping}
                              style={i > 0 ? { background: 'transparent', border: `1px solid ${ACCENT.primary}`, color: ACCENT.text } : {}}>
                              {i === 0 && <CheckIcon size={12} color="#fff" />}
                              Approve <ArrowRightIcon size={12} color={i === 0 ? '#fff' : ACCENT.text} /> {AGENTS[targetId].name}
                            </button>
                          ))}
                          <button className="finalise-btn" onClick={handleFinalise} disabled={isTyping} style={hasDownstream ? { animation: 'none' } : {}}>
                            <CheckIcon size={14} color={ACCENT.text} /> Finalise
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Browse completed dock */}
              {browsingCompleted && currentAgent && (
                <div style={{ borderTop: `1px solid ${t.border}`, padding: '14px 24px', flexShrink: 0, background: t.dockBg }}>
                  <div style={{ maxWidth: 760, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                        {completedAgents.map((id) => {
                          const agent = AGENTS[id]; const isViewing = id === currentAgent;
                          return (
                            <button key={id} onClick={() => setCurrentAgent(id)} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8,
                              border: isViewing ? `2px solid ${agent.colour}` : `1px solid ${t.border}`,
                              background: isViewing ? agent.colour + '10' : 'transparent',
                              color: isViewing ? agent.colour : t.textSec, fontWeight: isViewing ? 700 : 500,
                              fontSize: 13, fontFamily: 'inherit', cursor: isViewing ? 'default' : 'pointer', transition: 'all 0.15s',
                            }}>
                              <AgentIcon agentId={id} size={14} color={isViewing ? agent.colour : t.textMut} />
                              {agent.name.replace(' Agent', '')}
                            </button>
                          );
                        })}
                      </div>
                      <button className="icon-btn" onClick={backToSummary} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <ArrowRightIcon size={12} color={t.textSec} /> Back to summary
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Workflow complete */}
            {workflowComplete && (
              <div style={{ textAlign: 'center', padding: '40px 0 32px', animation: 'fadeUp 0.4s ease-out', flexShrink: 0 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 32px', borderRadius: 14, background: ACCENT.light, border: `2px solid ${ACCENT.primary}33`, color: ACCENT.text, fontWeight: 700, fontSize: 16 }}>
                  <CheckIcon size={18} color={ACCENT.text} /> Workflow complete {'\u2014'} campaign ready for approval
                </div>
                {completedAgents.length > 0 && (
                  <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {completedAgents.map((id) => (
                      <button key={id} className="icon-btn" onClick={() => browseCompletedAgent(id)} style={{ padding: '10px 16px', borderRadius: 10, borderColor: AGENTS[id].colour + '44', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <AgentIcon agentId={id} size={16} color={AGENTS[id].colour} /> View {AGENTS[id].name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
