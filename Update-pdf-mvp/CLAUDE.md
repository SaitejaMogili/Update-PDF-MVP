# UpdatePDF — Cursor Project Rules (v1.1)

You are helping build UpdatePDF.com, an AI-powered document SaaS. Read these rules before generating any code, and reference them throughout the session.

## STACK (immutable)
- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Database + Auth + Storage:** Supabase (Postgres + pgvector + Auth + Storage + Realtime)
- **Payments:** Stripe (Checkout + Customer Portal + webhooks)
- **Queue:** BullMQ + Redis (Upstash)
- **Workers:** Railway / Fly.io (separate service from Vercel)
- **PDF processing:** PDF.co API (don't reimplement)
- **PDF rendering for templates:** pdf-lib or react-pdf (server-side)
- **AI:** OpenAI (embeddings + GPT-4o-mini), Anthropic (Claude Sonnet for chat + generation), Whisper (voice→text)
- **Visualizations:** D3 (knowledge graph for Brain)
- **Hosting:** Vercel
- **Email:** Resend
- **Analytics:** PostHog
- **Errors:** Sentry

## DESIGN SYSTEM (premium icons, v4)
- Colors: cobalt `#2563EB`, deep `#1D4ED8`, sky `#38BDF8`, ink `#0F172A`, ai violet `#7C3AED`, emerald `#059669`, red `#DC2626`, indigo `#4F46E5`, cyan `#06B6D4`
- Backgrounds: `#FFFFFF`, soft `#F8FAFC`, line `#E2E8F0`
- Fonts: Plus Jakarta Sans (display), Inter (UI), JetBrains Mono (mono)
- Surface gradients (icons + badges):
  - Basic: `linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)` (cobalt)
  - AI: `linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)` (violet)
  - Finance: `linear-gradient(135deg, #DC2626 0%, #F87171 100%)` (red)
  - Brain: `linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)` (indigo→cyan)
  - Templates: `linear-gradient(135deg, #059669 0%, #34D399 100%)` (emerald)
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`

## NON-NEGOTIABLE RULES

### Security
1. **Every Supabase table has RLS enabled.** Never disable. After every query, verify the RLS policy permits the operation.
2. **Service-role keys are server-only.** Never import `SUPABASE_SERVICE_ROLE_KEY` in a client component or `'use client'` file.
3. **Stripe secrets are server-only.** Webhook signature verification is mandatory on every webhook handler.
4. **Signed URLs only** for file downloads. Never expose Storage public URLs.
5. **Auth check first.** Every API route starts with: get session → if null, 401.
6. **Input validation.** Use zod for every API route body. Reject unknown fields.

### Data
7. **Credits debited BEFORE expensive operation, refunded on failure.** Use a transaction.
8. **`credit_ledger` is append-only.** Never UPDATE or DELETE rows. Always INSERT.
9. **Files auto-delete after 1 hour.** Cron handles this; do not store user files indefinitely.
10. **PII never in URLs, logs, or analytics events.** Hash before logging.
11. **Templates and brand_kits are user-scoped.** RLS by user_id. Templates table has public read for is_published=true rows only.
12. **Brain workspaces are user-scoped.** Multi-doc queries must filter by workspace.file_ids before vector search.

### Code structure
13. **Tools live in `lib/tools/{slug}.ts`** — pure functions only. Side-effects belong in workers.
14. **Templates live in `/templates/{category}/{slug}/{template.json,preview.png}`** — sync to DB at build time.
15. **Workers live in `workers/processors/{slug}.processor.ts`** — they call lib/tools functions.
16. **API routes live in `app/api/tools/{slug}/route.ts`** — they enqueue jobs, never process synchronously if >10s expected.
17. **Reuse the tool template** — every tool page extends `components/tool/tool-page-shell.tsx`. Don't duplicate layout.
18. **Pricing in one place:** `lib/config/pricing.ts`. Components import from there.
19. **Templates registry:** `lib/templates/registry.ts` is the single source of truth for which templates exist. DB syncs from this.

### Performance
20. **No edge runtime for routes that touch Postgres** unless using Supabase REST.
21. **RSC by default**, `'use client'` only when needed (interactivity, hooks).
22. **Image optimization:** use `next/image` always. Never `<img>`.
23. **Dynamic imports** for heavy client components (chat window, PDF viewer, knowledge graph).

### Testing
24. **Every new tool gets a Playwright e2e test.** Happy path + 1 error case minimum.
25. **lib/credits.ts has 100% test coverage.** This is the money path.
26. **Template render pipeline gets a snapshot test.** Render each MVP template against a fixed values file, compare PDF byte-for-byte.

### Credentials
27. **NEVER embed credentials in command arguments.** Passwords, tokens, and connection strings with embedded passwords must never appear directly in command arguments — they leak into shell history, log files, and chat output.

    Instead, ALWAYS:
    - Use environment variables for secrets (`$env:VAR_NAME` in PowerShell)
    - Use CLI auth mechanisms (`supabase login`, `gh auth login`, `vercel login`) which manage credentials internally
    - Reference connection strings via env var: `postgresql://user:$env:DB_PASSWORD@host/db`
    - For `supabase db push` specifically: use the link approach (`supabase link`), not `--db-url` with an embedded password

    If a command requires a password and the user hasn't already set the relevant env variable, **STOP and ask the user to set it manually before retrying.** Never construct a command that would print the password to terminal output.

## v1 SCOPE (22 tools + 10 templates + Brain + Studio)

### Tools (22)
**Basic (9):** Merge, Split, Compress, PDF→Word, PDF→JPG, Protect, OCR, **Edit PDF**, **Fill PDF Form**
**AI (5):** Chat with PDF, Summarize, Translate, **Document Health Score**, **Voice→Document**
**Finance (2):** Cheque Printing, Invoice Generator
**Brain (6 features):** Cross-doc Search, Multi-doc Chat, Custom AI Agents (Legal/HR/Finance/General), Knowledge Graph, Library Health, Workflow Marketplace stub

### Templates (10 in v1, 100 long-term)
Invoice Generator, AI Resume Builder, Contract Generator, Proposal Generator, Salary Slip Generator, Daily Planner, Content Calendar, Business Plan, Cheque Template, Job Description

Plus AI Template Generator (universal prompt-to-PDF)

### Hero features (homepage spotlight)
- Cheque Printing — acquisition magnet
- Chat with PDF — retention engine
- Document Brain — enterprise upsell
- Document Studio — repeat-use surface

## CREDIT COSTS

| Tool | Credits |
|---|---|
| Basic tools | 1 |
| Edit PDF, Fill PDF Form | 1-2 |
| AI Summary | 3 |
| OCR | 5 |
| AI Chat (per message) | 5 |
| Multi-doc chat (Brain) | 5 |
| Document Health Score | 5 |
| Voice→Document | 10 |
| AI Template Generator | 10 |
| Template (free tier) | 1 |
| Template (AI tier) | 3-5 |
| Fraud Scan | 10 |
| Cheque print | 1 |

## PLANS

| Plan | Price | Credits/mo | Brain limit | Templates |
|---|---|---|---|---|
| Free | $0 | 100 | 5 docs | Free templates only, watermark |
| Pro | $19/seat/mo | 2,000 | 50 docs | All templates, no watermark, brand kit |
| Business | $49/seat/mo | 10,000 | unlimited | Team brand kits, custom templates |

## TYPICAL USER FLOWS

### Tool execution (unchanged)
```
Browser → POST /api/upload (signed Supabase Storage URL)
Browser → PUT to Storage (file uploaded)
Browser → POST /api/tools/{slug} { fileIds, params }
API → check auth → check credits → insert tool_jobs → enqueue BullMQ job → return 202 { jobId }
Browser → poll GET /api/jobs/{jobId} every 1.5s
Worker → process job, write output to Storage, update tool_jobs.status='done'
Browser → polling sees done → render download link
```

### Template render (new)
```
Browser → GET /api/templates → list of templates
Browser → opens /templates/{slug} (editor page)
Browser → fills fields, picks brand_kit → POST /api/templates/{slug}/render
API → check auth + credits → insert template_instance + tool_job → enqueue render job
Worker → render(layout, values, brand_kit) → upload PDF → update job
Browser → polling → render link
```

### AI Template Generator (new)
```
Browser → user types prompt → POST /api/templates/generate
API → check auth + credits (10) → enqueue generator job
Worker → classify(prompt) → if match: fill existing template; else: generate layout
Worker → render → upload PDF → update job
Browser → polling → preview + edit + save as instance
```

### Document Brain (new)
```
Browser → opens /brain/{workspaceId}
Browser → POST /api/brain/{id}/query { message, agent_id }
API → check auth + credits → SSE stream
Worker → vector search across workspace.file_ids → assemble context → Claude with agent system prompt → stream tokens
Browser → renders messages with file-aware citations [VendorA-MSA.pdf, p.4]
```

## WHEN I AM VAGUE

If my prompt is unclear, ASK before building. Ask things like:
- "Should this be RSC or Client component?"
- "Auth required or anonymous-allowed?"
- "What credits should this charge?"
- "Where should errors surface — toast or page?"
- "Free, Pro, or Business tier feature?"

## WHEN YOU FINISH A TASK

Always do these three things:
1. Walk me through what you built, line by line where non-obvious.
2. List edge cases this does NOT handle.
3. Suggest the next thing I should build.

## CRITICAL FILES

When working on this project, prefer to read these for context first:
- `/UpdatePDF-Developer-Handoff-Pack.docx` — original spec
- `/UpdatePDF-Handoff-Pack-Addendum-v1.1.docx` — expanded scope (Brain + Studio + 10 tools)
- `/updatepdf-homepage-v4.html` — design reference (premium icons + featured trio + Studio)
- `/updatepdf-tool-template-merge.html` — basic tool page template
- `/updatepdf-tool-template-chat.html` — AI tool page template
