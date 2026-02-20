# Expected Outputs — Toyota Professional Electrification Nurture Campaign

## Purpose
These are real, approved outputs from the Toyota Professional electrification nurture campaign. They serve as the **quality benchmark** for the agent system. When running the CRM → Nurture Journeys demo, agents should produce outputs that match this standard in structure, tone, depth, and compliance.

These outputs also serve as reference material for the Knowledge Bank — they represent what "good" looks like for each agent in the pipeline.

---

## 1. Demo Raw Input

This is the default demo prompt for CRM → Nurture Journeys. It is what the user types (or the system pre-loads) into the Context and Intent textarea:

> Write a Toyota Better Business fleet electrification nurture email campaign (max 4 emails) that takes prospects from "not sure where to start" to "ready to take the next step," covering Hybrid, Plug-in Hybrid, Battery Electric and Hydrogen (where relevant) and tackling costs, uptime, charging/infrastructure readiness and powertrain fit.

---

## 2. Expected Brief Output (Briefing Agent)

The Briefing Agent should produce a structured brief matching this standard:

### Toyota Better Business – Fleet Electrification Nurture Email Campaign (Max 4 emails)

**Purpose of this Brief:** This brief is the output of the Briefing Agent from the raw input and is intended to be used as the single source of truth for the Copy Agent and then the Compliance Agent.

**Business Challenge:** UK SME fleet decision-makers increasingly feel they should be thinking about electrification, but many are stalled by uncertainty: where to start, which technology fits which jobs, how charging will work in practice, and whether cost and uptime will remain predictable.

**Objective:** Create a review-ready nurture email campaign (max 4 emails) that moves SME fleet prospects from "not sure where to start" to "ready to take the next step" on electrification — making it feel practical, achievable and easy to phase in.

**Audience:** UK SME fleet decision-makers and influencers (typically 1–25 vehicles). Time-poor, balancing cost pressure, driver needs and operational continuity.

**Campaign Proposition:** More than one way to electrify. Toyota helps SMEs move forward by matching electrified options to real-world jobs, building cost and uptime confidence, and supporting a phased transition.

**Key Messages (Campaign Pillars):**
- You're not alone: many fleets are asking the same questions
- Options, not all-or-nothing: Hybrid, Plug-in Hybrid, Battery Electric and Hydrogen can all have a role
- Fit for the job: match technology to duty cycles
- Cost and uptime confidence: decisions are easier with a clearer whole-life view (TCO)
- Start small and phase: identify "EV-ready" vehicles/routes, pilot where it fits, then scale
- Human support: Toyota Fleet team as an extra pair of hands

**Journey Sequencing (Max 4 emails):**
- Email 1 – ORIENT / REASSURE: reduce anxiety, introduce multi-option approach
- Email 2 – POWERTRAIN FIT: explain technologies in plain language and link to real jobs
- Email 3 – COST & UPTIME (TCO): introduce TCO in accessible terms
- Email 4 – CHARGING + PHASING: make charging feel practical and bring it together with a phased rollout

**Mandatories / Guardrails:**
- Non-promotional, fleet-first. No offer language or product push.
- Avoid absolutes and guaranteed outcomes.
- Be careful with claims around savings, tax, emissions outcomes, charging speed/range certainty.
- "Zero emissions" is not permitted; "zero tailpipe emissions" only where appropriate.

---

## 3. Expected Copy Output (Copy Agent + Nurture Flow Sub-Agent)

The Copy Agent (with Nurture Flow sub-agent active) should produce copy matching this standard. Showing Email 1 and Email 4 as reference:

### Sequencing Rationale

- Email 1 starts by reducing anxiety and introducing Toyota's multi-pathway approach, so prospects feel they have options rather than a single "all or nothing" choice.
- Email 2 then explains powertrains in plain language and links Hybrid, Plugin, BEV and Hydrogen to real world duty cycles.
- Email 3 addresses cost and uptime, introducing TCO in accessible terms.
- Email 4 brings the journey together by combining charging/infrastructure reassurance with a low-risk phased transition and a clear human-led CTA.

### Email 1 – ORIENT / REASSURE

**Subject:** Not sure where to start with electrification?
**Pre-header:** A simpler way to plan your next step.

Hello [Name],

If electrification feels like something you should be thinking about, but you're not sure where to begin, you're not alone. Many SME and fleet managers are balancing cost, uptime and driver needs while trying to make sense of new options and changing expectations.

**Pod 1: More than one way to electrify**
Toyota offers Hybrid, Plug-in Hybrid, Battery Electric and Hydrogen — so you can match technology to the way your fleet actually works, not the other way around.
→ Explore options

**Pod 2: Start where it already makes sense**
Some journeys and vehicles are already a natural fit for electrification. Identifying those is the simplest first step — no full fleet overhaul required.
→ Find your starting point

**Pod 3: Support that fits your fleet**
Our Fleet team can help you make sense of the options, understand the costs and plan a transition at your pace — not someone else's.
→ Talk to our Fleet team

**LET'S TALK IT THROUGH**
Electrification doesn't have to mean all or nothing. A quick conversation with our Fleet team can help you see where it fits and what the next step looks like.
→ Get in touch

### Email 4 – CHARGING, PHASING & STRONG CTA

**Subject:** Ready to talk through electrification for your fleet?
**Pre-header:** Keep vehicles working while you move forward

Hello [Name],

Infrastructure and phasing are often the last big questions: "Will our vehicles stay on the road?" and "How do we do this without disrupting the business?"

**Pod 1: Charging that fits around your day**
Whether it is home, depot or public charging, options are growing — and many fleets find the infrastructure already works for a large part of their daily mileage.
→ Understand your charging options

**Pod 2: A transition your board can support**
A phased approach lets you start where it makes sense, prove value quickly and scale with confidence — without needing to replace your entire fleet at once.
→ Plan your phased approach

**Pod 3: Toyota beside you at every stage**
From choosing the right powertrain to installing wallboxes and managing energy costs, our Fleet team supports you through every step — with expertise, not pressure.
→ Book a fleet review

**LET'S TALK IT THROUGH**
There is no perfect time — but there is a practical next step. A conversation with our Fleet team can help you see what is achievable, plan around your business and move forward with confidence.
→ Get in touch

---

## 4. Expected Compliance Output (Compliance Agent)

The Compliance Agent should produce output matching this standard:

### Legal, Regulatory and Brand Assessment

This email series provides high-level, informational guidance for fleet decision-makers on planning electrification using a phased, multi-pathway approach. It positions Toyota and Lexus Business as a support partner and encourages discussion with Fleet specialists, without promoting specific vehicles, prices or guaranteed outcomes.

The copy is operationally focused and suitability-based, with no numerical claims, pricing, tax rates or performance guarantees. References to electrification, vehicle choice and planning are framed in general terms and tied to fleet-specific circumstances.

Residual risk is low. The main point to note is that mentioning Total Cost of Ownership could be interpreted as implying cost certainty; however, the copy does not promise savings and remains conditional, so this risk is manageable.

Only standard WLTP caveats are required for Hybrid and Battery Electric references. These have been applied at first mention using † and ^ footnotes.

### Key Compliance Actions Applied
- Added ^ caveat for Battery Electric vehicles at first mention with WLTP disclaimer
- Added † caveat for Hybrid vehicles at first mention with WLTP disclaimer
- Standard Toyota legal footer applied to each email
- Privacy notice, unsubscribe, and company registration details included
- "Zero tailpipe emissions" used correctly (not "zero emissions")

### Required Legal Footer (Applied to All Emails)

Toyota (GB) PLC. Registered Office: Great Burgh, Burgh Heath, Epsom, Surrey, KT18 5UZ. Registered in England and Wales. Company Number: 916634.

You are receiving this email because you opted in to communications from Toyota Fleet. To update your preferences or unsubscribe, click here. View our Privacy Notice.
