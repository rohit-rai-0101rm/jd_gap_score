@AGENTS.md

# JD Gap Score — project context for Claude Code

## What this is
Web app: upload resume + paste job description → match score (0–100),
gap list, rewritten bullets. Freemium; Lemon Squeezy subscriptions.

## Stack (do not change without asking)
Next.js 14+ App Router, TypeScript, Tailwind, Supabase (Postgres + magic-link auth),
Gemini Flash via provider-agnostic wrapper in /lib/llm.ts, Lemon Squeezy payments,
Vercel hosting. pdf-parse for PDF, mammoth for DOCX.

Note: scaffolded with Next.js 16.2.10 (satisfies "14+") and Tailwind v4
(CSS-based config via `@import "tailwindcss"` in globals.css, no tailwind.config.js).

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
- [x] Phase 1: Scaffold + landing
- [x] Phase 2: Upload + parsing
- [x] Phase 3: Analysis engine
- [ ] Phase 4: Results UI
- [ ] Phase 5: Auth + quota
- [ ] Phase 6: Payments
- [ ] Phase 7: Rate limits + hardening
- [ ] Phase 8: Polish + launch prep

## Decisions log
- 2026-07-10: Skipped Phase 0 (manual prompt validation) at owner's discretion; risk accepted that F3 prompts are unvalidated going into Phase 3.
- 2026-07-10: Scaffolded with create-next-app using yarn, Next.js 16.2.10 + Tailwind v4 (latest, satisfies "14+" requirement).
- 2026-07-10: pdf-parse v2 (pdfjs-dist-based) fails under Turbopack's default server bundling — it tries to load `pdf.worker.mjs` via a relative path that breaks once bundled. Fixed by adding `serverExternalPackages: ["pdf-parse", "pdfjs-dist"]` in next.config.ts so Node resolves it natively. Verified working under both `next dev` and `next build && next start`.
- 2026-07-13: Phase 0 was skipped, so prompts/extraction.md and prompts/analysis.md were drafted directly from SRS F3.1/F3.2/F3.5 rather than validated against real resumes/JDs first. Live-tested once against a real resume + JD (see Phase 3 commit) with a good-looking result, but treat prompt quality as unvalidated until Rohit reviews more outputs.
- 2026-07-13: LLM SDK: `@google/genai` (Google's current unified Gen AI SDK) via `GoogleGenAI.models.generateContent` with `responseMimeType: "application/json"`. Default model `gemini-2.5-flash` (env `LLM_MODEL`).
- 2026-07-13: /api/analyze stores results as one JSON file per analysis under `.data/analyses/{id}.json` via the `AnalysisStorage` interface in /lib/storage.ts — swap the one `analysisStorage` binding for a Supabase implementation in Phase 5.
