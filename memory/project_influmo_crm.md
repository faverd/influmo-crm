---
name: project-influmo-crm
description: WhatsApp CRM project "Influmo" with AI agent Berta — Next.js 15 + Supabase + OpenRouter + Resend
metadata:
  type: project
---

WhatsApp CRM for content creator/influencer agency called Influmo, with AI agent "Berta".

**Why:** User provided Figma design mockups (C-1.png through C-5.png) and a detailed product spec.

**Stack:**
- Next.js 15.1.0 (App Router) — lives at `CRM-CLUDE/`
- Supabase (auth + DB) — schema in `schema.sql`
- WhatsApp Business API (Meta) — webhook at `/api/webhook`
- OpenRouter (DeepSeek deepseek-chat-v3-0324) — `lib/openrouter.ts`
- Resend (email alerts) — `lib/resend.ts`
- Vercel deployment — `vercel.json` has cron config

**Key files:**
- `schema.sql` — run in Supabase SQL Editor to create tables
- `.env.local.example` — all required env vars listed
- `lib/supabase/server.ts` — uses `CookieOptions` type from `@supabase/ssr` to avoid implicit `any`
- `lib/resend.ts` — lazy initialization (Resend constructor called inside functions, not at module level, to avoid build-time errors)

**Build status:** Passes `next build` cleanly as of 2026-05-20.

**How to apply:** When continuing this project, check `.env.local.example` for required credentials.
