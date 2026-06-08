# Pase Arena — Backend API

Fight engine + leaderboard + waitlist for Pase Arena ($PASE).
Stack: Fastify + TypeScript on Railway · Supabase · OpenRouter (Claude Haiku).

## What it does

- `POST /fight` — runs a full 3-round AI debate (blue argues FOR the thesis,
  red AGAINST), a neutral judge scores each argument as damage, returns the
  full transcript + HP + winner/method. The frontend animates from this data.
- `GET /leaderboard` — recent fights.
- `POST /waitlist` — store email/wallet in Supabase.
- `GET /fighters` — roster for the frontend.
- `GET /health` — health check.

All four fighters run on `anthropic/claude-haiku-4.5` with distinct personas
(cheapest + most stable). To give a fighter a different model later, edit only
`src/config.ts` → `FIGHTERS[id].model`.

## Endpoints

### POST /fight
```json
// request
{ "thesis": "fair launches beat VC funding", "blue": "haiku", "red": "hermes" }

// response (shape)
{
  "id": "uuid",
  "thesis": "...",
  "blue": "haiku", "red": "hermes",
  "punches": [
    { "round": 1, "attacker": "blue", "fighter": "haiku",
      "argument": "...", "damage": 17, "note": "strong evidence" }
  ],
  "hpBlue": 0, "hpRed": 42,
  "winner": "red", "method": "KO", "koRound": 3
}
```
Fighter ids: `haiku`, `hermes`, `sonnet`, `nous`.

### POST /waitlist
```json
{ "email": "you@example.com" }   // or { "wallet": "<solana address>" }
```

## Local dev

```bash
npm install
cp .env.example .env     # fill in keys
npm run dev              # http://localhost:8080
```

## Deploy on Railway

1. Push this folder to a GitHub repo (e.g. `pasearena/pase-api`).
2. Railway → New Project → Deploy from GitHub repo.
3. Add Variables (from `.env.example`):
   - `OPENROUTER_API_KEY`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service_role key)
   - `ALLOWED_ORIGIN=https://pasearena.xyz`
   - `OPENROUTER_REFERER=https://pasearena.xyz`
4. Railway auto-builds (`npm install && npm run build`) and starts (`npm start`).
5. Note your public URL, e.g. `https://pase-api-production.up.railway.app`.

## Supabase setup

Run `schema.sql` in the Supabase SQL editor. It creates `fights` + `waitlist`
with RLS enabled. The API uses the service-role key (bypasses RLS); the frontend
never touches the DB directly.

## Wire up the frontend

Open `frontend-integration.js` — it shows how to point the landing page's
"Ring the bell" at `POST /fight` so the demo uses real AI debate + judge damage,
while keeping your existing 3D ring animation. Set `API_BASE` to your Railway URL.

## Cost / safety notes

- Rate limits: `/fight` 8/min/IP, `/waitlist` 5/min/IP, others 30/min.
- Each fight = up to 6 fighter calls + 6 judge calls on Haiku (cheap, but it
  adds up). Consider tightening `/fight` limits or adding token-gating before
  a big launch.
- `max_tokens` is capped low (200 fighter / 60 judge) to control cost.
```
