# levibahn-api — server functions for levibahn.com 3.0

Two functions, deployed as the Vercel project `levibahn-api` from this public repo. The site itself stays a static export on Hostinger (repo `portfolio-site`, private); it calls these over HTTPS. This repo holds no secrets and no confidential case-study text; the facts file is the public resume and the public teasers, nothing gated.

| Route | What it does |
|---|---|
| `POST /api/chat` | Streams a Claude answer about Levi's design work. Caps: 6 per visitor per day, 12 per IP per day, 150 site-wide per day (`lib/caps.ts`). |
| `GET/POST /api/poll` | The notification screen's guess poll. One vote per visitor; returns live percentages. |

## What runs where

- The Anthropic key lives only in the Vercel project's environment variables. No file in this repo holds it, and the function never logs it.
- Counters live in Upstash Redis (attached through the Vercel Marketplace, free tier, no idle pausing). Without Redis attached, production refuses chat requests with `503 no-store`, because the caps are what protect the spend limit. Previews fall back to an in-memory counter.
- The hard stop is the $20 monthly limit in the Anthropic console.

## One-time setup (Levi, in the Vercel dashboard)

1. [vercel.com/new](https://vercel.com/new) → Import `The-Shokunin-Crafthouse/levibahn-api`. (Public repo, so the free plan accepts it.)
2. Project name `levibahn-api`. Framework preset: **Other**. Leave Root Directory, build and output blank. Click Deploy.
3. Project → **Settings → Environment Variables** → add `ANTHROPIC_API_KEY`, paste the key, tick Production and Preview, tick **Sensitive**, Save.
4. Project → **Storage** tab → Create → **Upstash Redis** (free) → connect to `levibahn-api`, all environments. Vercel writes the `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` variables itself.
5. Project → **Deployments** → Redeploy the latest so the new variables load.

Optional: `CHAT_MODEL` env var overrides the model (default `claude-haiku-5-5`). `ALLOWED_ORIGINS` adds comma-separated origins to the CORS allowlist.

## Local

```
npm install && npm test
```

Tests cover the cap logic with an in-memory store and are run with a planted bug before merge (studio learning #231).

## Studio

Part of The Shokunin Crafthouse. Decisions for this code live in `portfolio-site/decisions/decisions.md` (Gate 1 block, 2026-10-22, and its backend amendment).
