# Orchestrator Demo v2 — Project State

**Last updated:** 2026-02-20
**Live URL:** https://orchestrator-demo-v2.vercel.app
**Repo:** https://github.com/digital-graymatter/Orchestration.git (branch: `main`)

---

## What this is

A React/Vite single-page application demonstrating a multi-agent marketing orchestration pipeline for Toyota Professional / Better Business. Four specialist AI agents (Brief, Strategy, Copy, Compliance) run sequentially or individually with human-in-the-loop approval at every stage. All agent outputs are generated via Claude Sonnet API calls.

---

## Architecture

```
User → React SPA (Vite)
         │
         ├── Local dev:  Express proxy (server.js :3001) → Claude API
         └── Production:  Vercel serverless fn (api/chat.js) → Claude API
```

- **Model:** `claude-sonnet-4-20250514`, 8 000 max tokens
- **Inline styles** throughout — no CSS framework
- **No router** — single-page with conditional rendering

---

## Key Principles

1. **Human-in-the-loop always.** Every agent output requires explicit human approval before it moves downstream. No auto-routing between agents.
2. **Orchestration framing.** Every agent call is wrapped in `[ORCHESTRATION CONTEXT]` so the model knows its role and does not attempt routing or handoff language.
3. **Approved outputs as system context.** When handing off, the approved upstream output is injected into the next agent's system prompt — not into the user message. This keeps the conversation clean.
4. **Research is always Open (live API).** The Research channel bypasses Guided/pre-scripted mode entirely.
5. **Format directives, not sub-agents.** The Research → Content flow passes a format directive (Social, Thought Leadership, Nurture, Website) to the existing Copy agent rather than creating specialist sub-agents. This validates the pattern first.

---

## Agent Pipeline

| Agent | Colour | Purpose |
|-------|--------|---------|
| **Briefing** | `#2563eb` (blue) | Converts unstructured input into a structured creative brief |
| **Strategy** | `#d97706` (amber) | Generates insight-led strategic direction; swaps to a dedicated C-suite research prompt when channel is Research |
| **Copy** | `#7c3aed` (purple) | Transforms strategy into on-brand copy variants with confidence scoring |
| **Compliance** | `#16a34a` (green) | Reviews copy for brand/legal/regulatory compliance (PASS/WARNING/FAIL) |

Sub-agent: **Nurture Flow** — activated under Copy when channel = CRM and runbook = Nurture Journeys.

---

## Execution Modes

- **Multi-agent orchestration:** Runs the active pipeline (Brief → Strategy → Copy → Compliance, with stages individually togglable). Approve → handoff → next agent.
- **Single agent:** Runs one selected agent in isolation.
- **Guided mode:** First turn uses pre-scripted outputs from `demoData.js` for consistent demos. Refinement turns still hit the live API.
- **Open mode:** Every turn hits the live Claude API. Research channel forces Open mode.

---

## Research → Content Flow

When channel = Research:
1. Strategy agent activates in single-agent mode with `researchPrompt` (C-suite research analyst persona)
2. After research output → user sees: **Create Content** | Save to Knowledge Bank (greyed) | Finalise Research
3. Create Content → format picker (2x2 grid): Social Posts, Thought Leadership, Nurture Campaign, Website Copy
4. Selected format triggers Copy agent with research as approved context + format directive
5. After copy output → user sees: **Approve → Compliance** | Finalise
6. After compliance output → user sees: **Finalise**

---

## File Map

### Source (`src/`)
| File | Purpose |
|------|---------|
| `App.jsx` | Main component — all state, workflow logic, UI rendering |
| `main.jsx` | React entry point |
| `icons.jsx` | SVG icon components + `AGENT_ICONS` lookup |
| `data/demoData.js` | Pre-scripted Guided-mode outputs (CRM, Digital, Brand) |

### Agents (`src/agents/`)
| File | Purpose |
|------|---------|
| `index.js` | Agent registry, `buildSystemPrompt()`, `callAgent()` API wrapper |
| `briefing.js` | Briefing Agent config + system prompt |
| `strategy.js` | Strategy Agent config + `systemPrompt` + `researchPrompt` |
| `copy.js` | Copy Agent config + system prompt |
| `compliance.js` | Compliance Agent config + system prompt |
| `nurtureFlow.js` | Nurture Flow sub-agent config + system prompt |

### Utilities (`src/utils/`)
| File | Purpose |
|------|---------|
| `theme.js` | `ACCENT` (green palette) + `THEME` (light mode tokens) |
| `confidence.js` | `extractConfidence()` regex + `confidenceColour()` mapping |
| `markdown.jsx` | Colour-coded ReactMarkdown components — compliance patterns + sources styling |
| `pipeline.js` | Pipeline routing: `getActivePipeline`, `getNextInPipeline`, `getDownstreamOptions` |
| `config.js` | Channels, runbooks, personas, sectors, demo prompts |

### Components (`src/components/`)
| File | Purpose |
|------|---------|
| `Header.jsx` | Top bar — REPLY branding + Audit Log button |
| `AuditLogPanel.jsx` | Slide-out 440px right drawer — filterable audit trail |

### Infrastructure
| File | Purpose |
|------|---------|
| `server.js` | Express proxy for local dev (port 3001 → Claude API) |
| `api/chat.js` | Vercel serverless function for production API proxy |
| `vercel.json` | Vercel config (rewrites `/api/chat` to serverless fn) |
| `vite.config.js` | Vite config |

---

## Channels and Runbooks

| Channel | Runbooks |
|---------|----------|
| **Brand** | Thought Leadership |
| **CRM** | Nurture Journeys |
| **Digital** | Website Copy |
| **Research** | Market & Audience, Competitor Analysis, Product & Technology, Sector Deep Dive, Open Research |

---

## Deployment

- **Vercel** — auto-deploys from `main` branch
- **Environment variable:** `ANTHROPIC_API_KEY` set in Vercel project settings
- **Build command:** `npm run build`
- **Output directory:** `dist`

---

## Agreed Roadmap (Not Yet Built)

1. **Knowledge Bank** — IndexedDB persistence, side panel, CRUD, category management, approval gates. Save to KB button is present but greyed out.
2. **Research Orchestration** — Strategy → Research Coordinator → Topical Specialists (sub-agent fan-out pattern)
3. **Dynamic Specialist Creation** — user-triggered specialist agents from research context
4. **Export All Approved Outputs** — single-click export of all approved agent outputs from a completed workflow

---

## Code Optimisation Notes (2026-02-20)

- Removed unused `getAgentOutput()` from `agents/index.js` (replaced by `getDemoOutput` in App.jsx)
- Removed unused `SunIcon` and `MoonIcon` from `icons.jsx` (dark mode was removed in v1)
- Extracted `CONTENT_FORMATS` to module scope in `App.jsx` (was recreated on every render)
- Added explanatory comment on `inSourcesSection` module-level flag pattern in `markdown.jsx`
- All files have section comments and JSDoc annotations
- Build compiles cleanly with no warnings
