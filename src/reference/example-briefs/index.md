# Example Briefs – Reference Index

## Purpose
This file catalogues the example briefs stored in this folder. These are real, approved Toyota Professional / Toyota Fleet CRM briefs produced by Graymatter Reply. They serve as quality benchmarks for the Briefing Agent and should be injected as context when the agent is activated — not embedded in the system prompt.

## How Claude Code Should Use These

### For the Briefing Agent
When the Briefing Agent is activated, select the most relevant example brief based on the user's input (campaign type, channel, product) and inject it as reference context alongside the system prompt. The agent should match the structural quality, level of detail, and professional tone of these examples.

### Selection Logic
- **Nurture / journey campaigns** → Use Urban Cruiser or Electrification (handoff document) as reference
- **Product offer / stock campaigns** → Use LCV Product Offer as reference
- **Awareness / education / mythbusting** → Use Hilux EM Campaign as reference
- **If unclear** → Use LCV Product Offer (most general structure)

### What the agent should learn from these examples
- Brief structure: overview → objectives → EM strategy (per-email breakdown) → timeline → dependencies → resources
- Each EM has: objective, audience, primary/secondary CTAs
- Timelines follow a consistent milestone format
- Scope is clearly split between inclusions and exclusions
- Professional, consultative tone throughout

---

## Brief Catalogue

### 1. Hilux EM Campaign (Q4 2025)
- **File:** Hilux_EMCampaign_GMR_SOW_18_09_2025.docx
- **Type:** Education / Mythbusting / Reassurance
- **Product:** Hilux 48v
- **Emails:** 2x EMs
  - EM1: Power without compromise (reframe mild hybrid perception)
  - EM2: Smarter business choice (TCO and reliability)
- **Audience:** Owned opted-in fleet data (MSD) + bought third-party fleet data
- **CTAs:** Hilux landing page, Fleet and business callback form
- **Key themes:** 48v technology education, myth-busting "hybrid = compromise", TCO confidence, reliability proof points
- **Use as reference when:** Campaign is about education, reframing perceptions, or product-specific reassurance

### 2. LCV Product Offer (Fleet CRM)
- **File:** LCV_ProductOffer_GMR_SOW_27_10_2025__1_.docx
- **Type:** Offer-led / Stock clearance
- **Product:** Toyota Professional LCV range
- **Emails:** 3x EMs
  - EM1: Stock and offer launch
  - EM2: Offer reminder / mid-campaign push
  - EM3: Final offer reminder / brand trust
- **Audience:** Owned and bought fleet contacts
- **CTAs:** Toyota Commercial Vehicles / LCV offer page, Fleet and business callback
- **Key themes:** Stock movement, offer urgency, reliability, low running costs, brand trust
- **Note:** Offer details TBC at time of briefing — placeholder approach used
- **Use as reference when:** Campaign is offer-led, product-push, or stock-driven

### 3. Urban Cruiser Nurture Journey (Fleet CRM)
- **File:** UrbanCruiser_NurtureJourney_GMR_SOW_03_11_2025.docx
- **Type:** Hand-raiser nurture / Product launch journey
- **Product:** Urban Cruiser (self-charging hybrid)
- **Emails:** 3x EMs
  - EM1: Launch hero concept ("Fantasy vs Reality" or similar)
  - EM2: Follow-up – Urban Cruiser benefits
  - EM3: It's here – conversion push
- **Audience:** Owned and bought fleet hand-raisers, early-stage prospects with SUV interest
- **CTAs:** Discover Urban Cruiser, I'm interested, Explore Toyota Fleet Range, Book a Test Drive, Buy now
- **Key themes:** Creative-led launch, self-charging hybrid efficiency, urban versatility, reliability, nurture-to-conversion flow
- **Sectors:** Professional Services, Public Sector, Wholesale & Retail, Information & Communication
- **Use as reference when:** Campaign is a nurture journey, product launch, or hand-raiser follow-up

---

## Structural Patterns Across All Briefs

All three briefs follow a consistent Graymatter Reply structure:

1. **Header block:** Campaign name, date, TGB lead, GMR lead, version
2. **Brief overview / Campaign context:** 2–3 bullet points setting the scene
3. **Objectives:** What the campaign must achieve (typically 3–4 points)
4. **EM strategy:** Number of emails with one-line descriptions
5. **Per-EM detail:** Objective, audience, CTAs for each email
6. **Timeline:** Milestone table with dates and responsible parties
7. **Scope:** Inclusions and exclusions
8. **Resources and costs:** Team members, days, rates, totals with contingency

The Briefing Agent's output does not need to include resource/cost tables (that's a scoping function), but it should match the quality and completeness of sections 1–6.
