# JD Gap Score — Software Requirements Specification (SRS) + Claude Code Build Plan

Version 1.0 — 9 July 2026
Owner: Rohit (solo founder/developer)
Build start: 10 July 2026 | Target launch: 8 working days

---

## 1. Product Overview

**One-line pitch (three-word test):** "Score your resume."

**What it does:** User uploads a resume (PDF/DOCX) and pastes one job description. The app returns (a) a match score from 0–100, (b) a specific gap list showing which JD requirements the resume fails to evidence, and (c) 3–5 rewritten resume bullets that close those gaps.

**Target user:** US/global English-speaking job seekers applying online, plus Indian job seekers targeting remote/foreign roles. Adults at a laptop, mid-application, willing to pay.

**Business model:** Freemium. 1 free analysis anonymous → 2 more after email signup → subscription paywall ($19/month or $9/week) for unlimited analyses.

**Core insight:** Everyone sends the same resume to every job. Per-job tailoring is the known fix but takes 40 minutes manually. We make it 40 seconds. The score is the shareable hook; the rewritten bullets are the paid value.

## 2. Goals and Non-Goals

### Goals (v0)
- G1: A first-time visitor gets a real, impressive analysis within 60 seconds of landing.
- G2: The full money loop works: visit → free analysis → signup → paywall → payment → unlimited access.
- G3: Total infrastructure cost ≈ ₹0/month at launch (free tiers), with a clean upgrade path.
- G4: Analysis quality is high enough that Rohit himself would pay for it (validated in Phase 0 before any product code).

### Non-Goals (explicitly CUT from v0 — do not build these)
- Cover letter generation
- Auto-apply / job application agent
- Job board scraping or job search
- LinkedIn integration
- Resume builder or WYSIWYG editor
- Analysis history dashboard beyond a simple list
- Team accounts, admin panels
- Mobile app, dark mode, i18n
- Vector database / embeddings pipeline (a single resume + JD fits in one LLM context window; plain structured prompting is sufficient for v0)

## 3. Tech Stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Frontend + API routes in one codebase. TypeScript. |
| UI | React + Tailwind CSS | Rohit's 5-year strength. |
| Database + Auth | Supabase (free tier) | Postgres + magic-link email auth. |
| LLM | Google Gemini Flash (free tier) via provider-agnostic wrapper | Model name in env var. Swap to a stronger model later with zero refactor. |
| Payments | Lemon Squeezy | Merchant of record; handles US sales tax; pays out to Indian bank account. |
| File parsing | `pdf-parse` (or `unpdf`) for PDF, `mammoth` for DOCX | Server-side only. |
| Hosting | Vercel (free tier) | One-click deploy from GitHub. |
| Analytics | Vercel Analytics or Plausible free trial | Track the funnel only. |

**Skills/knowledge Claude Code needs for this project** (all standard; no exotic domain knowledge required):
Next.js App Router + API routes, TypeScript, Tailwind, Supabase JS client + Row Level Security, magic-link auth flow, file upload handling (multipart), PDF/DOCX text extraction, calling an LLM REST API with structured JSON output + retries, webhook signature verification (Lemon Squeezy), basic rate limiting (per-IP and per-user), and environment-variable secret management.

## 4. Functional Requirements

### F1 — Landing page
- F1.1 Hero: headline ("Score your resume against any job description"), sub-line, single CTA button ("Score my resume — free").
- F1.2 One product screenshot/mock of a results card.
- F1.3 Pricing section: Free (1 analysis), Pro $19/mo or $9/wk (unlimited + rewritten bullets).
- F1.4 Footer: contact email, terms, privacy, refund policy links (simple static pages).

### F2 — Upload & Input
- F2.1 Resume upload: accepts .pdf and .docx, max 5 MB. Drag-and-drop + file picker.
- F2.2 JD input: plain textarea, paste-only, min 200 characters, max 15,000 characters.
- F2.3 Client-side validation with clear error messages ("File too large", "JD too short to analyze").
- F2.4 If PDF text extraction yields < 300 characters (likely a scanned/two-column PDF), show a graceful error: "We couldn't read this PDF cleanly — please upload a DOCX or a text-based PDF." Do NOT attempt OCR in v0.

### F3 — Analysis Engine (the product core)
- F3.1 Server-side pipeline, 2 sequential LLM calls:
  - Call 1 (extraction): parse resume text and JD text into structured JSON — resume: {skills, roles, achievements, keywords, years_of_experience}; JD: {must_have_requirements[], nice_to_have[], seniority, keywords[]}.
  - Call 2 (analysis): given both JSON objects + raw texts, produce: match_score (0–100 with rubric below), gaps[] (each: {jd_requirement, evidence_in_resume: "none" | quote, severity: high/medium/low, why_it_matters}), rewritten_bullets[] (3–5 bullets, each tied to a specific gap, truthful to the resume's actual experience — never fabricate experience).
- F3.2 Scoring rubric (embedded in prompt): 40% must-have requirement coverage, 25% keyword/terminology alignment, 20% seniority/experience match, 15% quantified-achievement quality. Score bands: 0–49 "Likely filtered out", 50–69 "Borderline", 70–84 "Competitive", 85–100 "Strong match".
- F3.3 LLM responses must be requested and validated as strict JSON. On parse failure, retry once; on second failure, show a friendly error and do not count the attempt against the user's quota.
- F3.4 Hard timeout 60s; show progress state ("Reading resume… Matching against JD… Writing suggestions…").
- F3.5 Ethical constraint in prompt: rewritten bullets may reframe and re-emphasize real experience but must never invent employers, titles, dates, or skills not present in the resume.

### F4 — Results Page (the screenshot-worthy screen)
- F4.1 Score displayed prominently (large number + band label + colored gauge/ring).
- F4.2 Gap cards: requirement, severity badge, what's missing, why it matters.
- F4.3 Rewritten bullets section with one-click "Copy" per bullet. For free users, show the FIRST bullet fully and blur the rest behind the paywall CTA ("Unlock all suggestions — Pro").
- F4.4 "Analyze another job" button.
- F4.5 Subtle branded footer on the results card ("Scored with JDGapScore.com") so screenshots market the product.

### F5 — Quota & Accounts
- F5.1 Anonymous visitor: 1 free analysis (tracked by IP + browser fingerprint cookie; accept imperfection).
- F5.2 After the free analysis, prompt email signup (Supabase magic link) → 2 additional free analyses.
- F5.3 After 3 total, paywall modal on every analyze attempt.
- F5.4 Quota state stored in Supabase; anonymous usage in a `anon_usage` table keyed by hashed IP.

### F6 — Payments
- F6.1 Lemon Squeezy hosted checkout, two variants: $19/month, $9/week.
- F6.2 Webhook endpoint verifies signature, then on `subscription_created`/`subscription_updated`/`subscription_cancelled` updates `subscriptions` table (user_id, status, plan, renews_at).
- F6.3 Access rule: user with status `active` or `on_trial` = unlimited analyses.
- F6.4 Customer portal link (Lemon Squeezy hosted) on the account page for cancel/manage — cancellation must be self-serve and easy (honest business, low chargebacks).

### F7 — Rate Limiting & Abuse Protection (NON-NEGOTIABLE)
- F7.1 Per-IP: max 5 analyze requests/hour for anonymous; per-user: max 20/hour for free accounts; max 60/hour for paid (generous but bounded).
- F7.2 Global daily circuit-breaker: if total daily LLM calls exceed a configurable cap (protects the free-tier quota / API budget), return a friendly "We're at capacity today" message.
- F7.3 All LLM keys server-side only. No secrets in client bundle. Ever.

### F8 — Account Page
- F8.1 Shows: email, plan status, analyses used, "Manage subscription" (Lemon Squeezy portal), "Log out".
- F8.2 Simple list of past analyses (title = first 60 chars of JD, date, score) — view only, links back to stored results.

## 5. Data Model (Supabase / Postgres)

- `profiles` (id → auth.users, email, created_at)
- `analyses` (id, user_id nullable, anon_hash nullable, jd_excerpt, score, result_json, created_at)
- `subscriptions` (id, user_id, ls_subscription_id, status, plan, renews_at, updated_at)
- `anon_usage` (anon_hash PK, count, first_seen, last_seen)

Row Level Security: users read only their own rows; service role (server) writes.

## 6. API Routes (Next.js)

- `POST /api/analyze` — multipart (file + jd text) or (stored resume ref + jd). Auth optional. Enforces quota + rate limits. Returns result JSON.
- `POST /api/webhooks/lemonsqueezy` — signature-verified webhook handler.
- `GET /api/me` — profile + plan + quota state.
- Auth handled by Supabase client helpers (magic link).

## 7. Non-Functional Requirements

- NFR1: p95 analysis time ≤ 45 s.
- NFR2: Zero secrets client-side; env vars documented in `.env.example`.
- NFR3: Works on mobile browsers (responsive), but desktop is the primary target.
- NFR4: Basic funnel analytics events: landing_view, analyze_started, analyze_completed, signup, checkout_started, subscription_active.
- NFR5: Graceful degradation on LLM failure (retry once, then apologize, don't burn quota).

## 8. Launch Checklist (Day 8)

- Money loop tested end-to-end in Lemon Squeezy test mode AND one real $9 self-purchase + refund.
- Rate limits verified by scripted hammering.
- Domain connected, SSL live, results card screenshot looks good when shared.
- 60-second raw demo video recorded.
- Posts drafted for X, LinkedIn, one relevant subreddit; 30 creator DMs drafted.

---

# Part B — CLAUDE.md Workflow + Stepwise Prompts

## How to run this build

1. Create the repo, then create `CLAUDE.md` at the root with the initial content below.
2. Feed Claude Code ONE phase prompt at a time. Do not paste the whole SRS as a single "build everything" prompt.
3. After each phase passes its acceptance checks, tell Claude Code to update `CLAUDE.md` (status section) and commit. Then move to the next phase.
4. You review every diff. You are the architect; Claude Code is the fast junior. If output drifts from the SRS, quote the relevant SRS section back at it.

## Initial CLAUDE.md (paste into repo root)

```markdown
# JD Gap Score — project context for Claude Code

## What this is
Web app: upload resume + paste job description → match score (0–100),
gap list, rewritten bullets. Freemium; Lemon Squeezy subscriptions.

## Stack (do not change without asking)
Next.js 14+ App Router, TypeScript, Tailwind, Supabase (Postgres + magic-link auth),
Gemini Flash via provider-agnostic wrapper in /lib/llm.ts, Lemon Squeezy payments,
Vercel hosting. pdf-parse for PDF, mammoth for DOCX.

## Hard rules
- All LLM/API keys server-side only. Never in client code.
- LLM calls only through /lib/llm.ts (model name from env var LLM_MODEL).
- All LLM outputs requested as strict JSON and validated with zod; retry once on parse failure.
- Rewritten bullets must never fabricate experience not present in the resume.
- Every /api/analyze request passes quota + rate-limit checks BEFORE any LLM call.
- Keep v0 scope: NO cover letters, NO auto-apply, NO job scraping, NO vector DB.

## Conventions
- App Router, server components by default, client components only where needed.
- zod schemas in /lib/schemas.ts shared by API and UI.
- Errors returned as { error: { code, message } }.

## Status
- [ ] Phase 1: Scaffold + landing
- [ ] Phase 2: Upload + parsing
- [ ] Phase 3: Analysis engine
- [ ] Phase 4: Results UI
- [ ] Phase 5: Auth + quota
- [ ] Phase 6: Payments
- [ ] Phase 7: Rate limits + hardening
- [ ] Phase 8: Polish + launch prep

## Decisions log
(append one line per significant decision)
```

## Phase 0 — Prompt validation (Day 1, BEFORE any product code, NOT in Claude Code)

Do this in a Python/Gradio notebook or even a plain script. Goal: prove the analysis prompts are worth paying for.

- Implement the two-call pipeline from F3.1–F3.2 against the Gemini free API.
- Run it on YOUR resume vs 5 real JDs you are actually applying to.
- Exit criteria: at least 4 of 5 outputs make you say "I would act on this." If not, iterate the rubric and prompt wording. The winning prompt text becomes the spec for Phase 3.
- Deliverable: `prompts/extraction.md` and `prompts/analysis.md` files containing the final prompt text (these get copied into the repo in Phase 3).

## Phase 1 — Scaffold + landing page

Prompt to Claude Code:

```
Read CLAUDE.md first. Create a new Next.js 14 App Router project with TypeScript
and Tailwind. Set up: ESLint, a basic layout with header/footer, and an
.env.example listing GEMINI_API_KEY, LLM_MODEL, SUPABASE_URL, SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_WEBHOOK_SECRET,
DAILY_LLM_CALL_CAP.

Build the landing page per SRS F1: hero with headline "Score your resume against
any job description", sub-line, CTA button linking to /analyze, a placeholder
screenshot section, a pricing section (Free: 1 analysis; Pro: $19/mo or $9/wk,
unlimited + all rewritten bullets), and footer links to /terms, /privacy,
/refunds (create simple static pages with placeholder text).

Acceptance: `npm run dev` renders the landing page cleanly on desktop and mobile
widths. No console errors.
When done: update the Status section in CLAUDE.md and commit.
```

## Phase 2 — Upload + text extraction

```
Read CLAUDE.md. Build the /analyze page per SRS F2: resume upload (drag-drop +
picker, .pdf/.docx only, max 5MB) and a JD textarea (min 200, max 15000 chars)
with client-side validation and clear error states.

Create POST /api/extract (temporary dev route) that accepts the file, extracts
text server-side (pdf-parse for PDF, mammoth for DOCX), and returns
{ text, chars }. If extracted text < 300 chars, return error code
UNREADABLE_RESUME with the message from SRS F2.4.

Acceptance: uploading a normal text PDF returns its text; uploading a scanned
PDF returns the graceful UNREADABLE_RESUME error; oversize and wrong-type files
are rejected client-side.
Update CLAUDE.md status and commit.
```

## Phase 3 — Analysis engine (core)

```
Read CLAUDE.md and the prompt files prompts/extraction.md and
prompts/analysis.md (final validated prompts — treat their wording as spec).

Create /lib/llm.ts: a provider-agnostic completeJSON() helper that calls the
Gemini API using env LLM_MODEL, requests strict JSON, validates against a
provided zod schema, retries once on parse failure, and throws a typed error
after the second failure.

Create POST /api/analyze implementing SRS F3: two sequential LLM calls
(extraction → analysis), zod schemas in /lib/schemas.ts for both stages
(resume struct, jd struct, and the final result: match_score, band, gaps[],
rewritten_bullets[]), 60s hard timeout, and the ethical constraint from F3.5
embedded in the analysis prompt.

Store each completed analysis in a local JSON file for now (Supabase comes in
Phase 5) — write a thin storage interface so the swap is one file.

Acceptance: calling /api/analyze with a real resume + JD returns valid JSON
matching the schema in under 45s; a malformed LLM response triggers exactly one
retry; the failure path returns { error } without counting quota.
Update CLAUDE.md status and commit.
```

## Phase 4 — Results UI

```
Read CLAUDE.md. Build the results view per SRS F4: large score with colored
ring and band label, gap cards (requirement, severity badge, evidence, why it
matters), rewritten bullets with per-bullet Copy buttons. Add the loading
progress states from F3.4 during analysis. Add "Analyze another job". Add the
subtle branded footer line on the results card.

Add a paywallPreview prop: when true, show the first bullet fully and blur the
remaining bullets behind an "Unlock all suggestions — Pro" CTA (wiring to real
plan state comes in Phase 5/6; for now drive it with a query param for testing).

Acceptance: the full flow upload → analyzing states → results renders well at
desktop and mobile widths, and the results card looks good in a screenshot.
Update CLAUDE.md status and commit.
```

## Phase 5 — Supabase: auth, storage, quota

```
Read CLAUDE.md. Integrate Supabase: magic-link email auth (login/logout,
session in header), and create tables per SRS section 5 (profiles, analyses,
subscriptions, anon_usage) with RLS as specified. Provide the SQL migration
file in /supabase/migrations.

Replace the Phase 3 file storage with Supabase (analyses table). Implement
quota per SRS F5: anonymous = 1 analysis (hashed IP + cookie in anon_usage),
signed-in free = 3 total, paid = unlimited (subscriptions check stubbed to
false until Phase 6). Enforce quota inside /api/analyze BEFORE any LLM call.
Build the /account page per F8 (plan status stubbed).

Acceptance: anonymous second analysis triggers the signup prompt; after magic-
link signup, 2 more analyses work, then the paywall modal appears; analyses
list shows on /account; RLS verified (one user cannot read another's rows).
Update CLAUDE.md status and commit.
```

## Phase 6 — Lemon Squeezy payments

```
Read CLAUDE.md. Integrate Lemon Squeezy per SRS F6: checkout links for the
$19/month and $9/week variants (env-configured variant IDs), a
POST /api/webhooks/lemonsqueezy route that verifies the signature with
LEMONSQUEEZY_WEBHOOK_SECRET and upserts the subscriptions table on
subscription_created/updated/cancelled, and an access helper
isProUser(userId) used by /api/analyze and the results paywallPreview.
Add "Manage subscription" (customer portal link) to /account.

Acceptance (test mode): completing a test checkout flips the user to unlimited
within one webhook delivery; cancelling flips them back at period end; webhook
requests with bad signatures are rejected with 401; the paywall blur disappears
for pro users.
Update CLAUDE.md status and commit.
```

## Phase 7 — Rate limiting + hardening

```
Read CLAUDE.md. Implement SRS F7: per-IP and per-user rate limits on
/api/analyze (5/hr anon, 20/hr free, 60/hr pro) using Supabase or an in-memory
+ DB hybrid suitable for Vercel serverless, and the global daily circuit
breaker driven by DAILY_LLM_CALL_CAP with the friendly "at capacity" message.
Audit the client bundle to confirm zero secrets ship to the browser. Add the
funnel analytics events from NFR4.

Acceptance: a scripted loop hitting /api/analyze gets 429s at the right
thresholds; the circuit breaker triggers when the cap is set low; grep of the
built client bundle finds no key material.
Update CLAUDE.md status and commit.
```

## Phase 8 — Polish + launch prep

```
Read CLAUDE.md. Final pass: connect the real domain, tighten landing copy,
replace the placeholder screenshot with a real results-card screenshot, handle
the top PDF parsing failures gracefully (two-column PDFs → UNREADABLE_RESUME
guidance), verify all error states have human messages, and produce a
LAUNCH.md checklist confirming SRS section 8 items.

Acceptance: full production flow works on the live domain with a real resume,
including one real $9 purchase and refund. LAUNCH.md all boxes checked.
Update CLAUDE.md status, tag v0.1.0, commit.
```

---

## Final notes for Rohit

- Phase 0 is the only phase where YOU write the core logic (prompts). It is also the most important phase. Do not let excitement about scaffolding pull you past it.
- One phase per Claude Code session keeps context clean and CLAUDE.md accurate. Resist "just add one more feature while we're here."
- The riskiest phases are 6 (webhooks) and 2 (messy PDFs). Budget slack there.
- Launch day is a distribution day, not a coding day. The DMs are part of the build.
