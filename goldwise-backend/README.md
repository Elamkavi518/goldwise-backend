# GoldWise / Thangam — Backend API

A real, working Node.js + Express + PostgreSQL (or SQLite for local dev) backend for the Thangam gold
valuation, loan comparison, and jewelry marketplace platform.

This was built and smoke-tested end-to-end (signup, login, JWT-protected routes, real
wastage-aware pricing, admin role gating, store-manager ownership checks, OTP dev-mode
logging) before being handed off — see **§6 What was actually tested** below for exactly
what that covered and what it didn't.

---

## 1. Quick start (local, zero external services)

```bash
npm install
cp .env.example .env
# .env already defaults to DB_DIALECT=sqlite, so no database install is required to try this.
npm run seed     # creates the admin account, a demo verified store with real wastage %s,
                  # 4 loan providers, and one starting gold-rate row
npm start
```

The API is now running at `http://localhost:5000/api`. Try:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/gold-rate/latest
```

Seeded accounts (from `.env.example` — change these before any real deployment):
- **Admin:** `admin@goldwise.app` / `ChangeThisPassword123!`
- **Demo store manager:** `store.demo@thangam.app` / `DemoStore123!`

## 2. Deploying on Vercel

This repo now also works on Vercel — `api/index.js` wraps the same Express app as a
serverless function, `vercel.json` routes all `/api/*` traffic to it, and the gold-rate
cron job is replaced with two mechanisms that both work within Vercel's serverless model:

1. **Lazy refresh-on-read** — `GET /api/gold-rate/latest` checks if the cached price is
   older than 30 minutes and re-fetches it inline before responding. This means real
   traffic keeps the price current with no background process required.
2. **Vercel Cron** (`vercel.json`) — hits `GET /api/cron/refresh-gold-rate` once a day
   (the fastest interval Vercel's free Hobby plan allows) as a backstop, protected by a
   `CRON_SECRET` instead of a login.

### Steps

1. You need a Postgres database reachable from the internet — Vercel doesn't include one.
   **Neon** (neon.tech) has a genuinely permanent free tier and is a common Vercel pairing:
   sign up, create a project, copy its connection string.
2. On vercel.com → **Add New** → **Project** → import this repo.
3. **Root Directory:** set this to wherever this backend folder actually sits in your repo
   (e.g. `goldwise-backend`, if it's alongside your frontend — see below).
4. Under **Environment Variables**, add the same variables as the Render setup, plus:
   - `CRON_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
5. Deploy. Vercel gives you a URL like `https://goldwise-backend.vercel.app`.
6. Run the seed script once — since there's no persistent shell on Vercel like Render's,
   the simplest way is to run it locally against your production `DATABASE_URL`:
   ```bash
   DATABASE_URL="your-neon-connection-string" DB_DIALECT=postgres npm run seed
   ```
7. Test it: `https://goldwise-backend.vercel.app/api/health`

### One real limitation, stated plainly

Serverless functions are short-lived — each cold start can open its own small database
connection pool. This backend keeps that pool small (`max: 3`) specifically to avoid
exhausting Postgres's connection limit, but under real concurrent traffic a pooling-aware
database (Neon's pooled connection string, or PgBouncer) will hold up better than a
database without pooling. This wasn't load-tested from this environment.

### If this backend and `thangam.html` are in the same repo

Set **Root Directory** to this folder's path when importing *this* backend as its own
Vercel project — don't try to deploy both from one Vercel project, since the frontend is a
static site and this is a Node API; they need to be two separate Vercel projects (or one
on Vercel, one on Render), even if they live in the same GitHub repo.

## 3. Real production setup — Render (alternative to Vercel)

Render runs this as a traditional persistent process, so `src/server.js`'s in-process
`node-cron` job works as originally designed (fetches every `GOLD_RATE_POLL_MINUTES`,
default 5) — no lazy-refresh workaround needed. Use this path if you'd rather not deal
with the serverless connection-pooling caveat above.


1. Create a Postgres database (e.g. on Railway, Render, Neon, or your own server).
2. In `.env`, set `DB_DIALECT=postgres` and `DATABASE_URL=postgres://user:pass@host:5432/dbname`.
3. Generate real secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` — run twice, put the results in `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
4. Set a real `ADMIN_PASSWORD` before running `npm run seed`.
5. **Use real migrations, not `sequelize.sync()`, for schema changes after the first deploy.** This project intentionally does *not* run `sync({ alter: true })` — that combination has a known bug where it can silently lose data on SQLite, and it's not a safe practice on Postgres either. Install `sequelize-cli`, generate migrations from the models in `src/models/`, and run them as part of your deploy step.
6. `npm start`.

## 4. Connect the frontend

The existing `thangam.html` frontend currently keeps everything (cart, login, reviews) in
`localStorage`, which is why it only works per-browser. To connect it to this real backend:

- Replace the frontend's `fetch('https://api.goldprice.dev/...')` call with `GET {API_URL}/api/gold-rate/latest`.
- Replace the client-side login/localStorage auth with real calls to `POST /api/auth/signup`, `/login`, and storing the returned `accessToken` in memory (not localStorage, to reduce XSS risk) — send it as `Authorization: Bearer <token>` on every protected request.
- Set `CLIENT_ORIGIN` in `.env` to the exact origin the frontend is served from (e.g. `https://your-vercel-app.vercel.app`), so CORS allows it.
- This wiring (updating `thangam.html` to actually call these endpoints instead of doing client-only math) is the natural next step and wasn't done as part of this backend build — say the word and it's next.

## 5. What's real vs. what needs your own credentials

| Capability | Status |
|---|---|
| Signup/login, JWT auth, refresh tokens, logout, role-based access | **Fully real.** Passwords hashed with bcrypt, refresh tokens stored hashed in DB so logout actually revokes them. |
| Gold calculator, wastage-aware pricing, loan EMI math | **Fully real math**, run against whatever is actually in the database. |
| OTP / email / SMS delivery | **Real logic, dev-mode delivery.** Without `SMTP_HOST` or Twilio credentials in `.env`, codes are logged to the server console instead of sent — clearly labeled `[DEV MODE]` so it's never mistaken for real delivery. Add real SMTP/Twilio credentials to make delivery real. |
| Live gold rate | **Real fetch logic, unverified live response.** See §5. |
| Admin dashboard APIs | **Fully real** — user/store management, review moderation, gold-rate status, audit logs, system settings. |

## 6. Live gold rate — important caveat

`GOLD_RATE_PROVIDER=goldapi` uses **goldapi.io**, a well-documented, industry-standard paid/free-tier
provider — the recommended choice for production. It requires a `GOLDAPI_KEY` (sign up at goldapi.io).

`GOLD_RATE_PROVIDER=gold-api` (the default) uses **gold-api.com**, which advertises no API key
required. It returns a USD spot price per troy ounce, which this backend converts to INR/gram
using a **static fallback exchange rate** (`GOLD_RATE_USD_INR_FALLBACK`, default ~87.5) — for
real accuracy, replace that with a live forex API call in `src/services/goldRateProvider.js`.

**Important:** the sandbox this backend was built and tested in cannot reach either external
domain (network egress is restricted to a small allowlist that doesn't include gold-price APIs),
so the parsing logic was written against each provider's *documented* response shape but could
not be verified against a live response from here. When you first deploy this for real:

1. Watch the server log right after boot — it logs the raw error if parsing fails.
2. If you see "Unexpected response shape," open `src/services/goldRateProvider.js` and adjust
   the field names in `fetchFromGoldApi()` / `fetchFromGoldApiCom()` to match what's actually
   returned.
3. The system never fabricates a price — if every fetch attempt fails, `/api/gold-rate/latest`
   keeps serving the last successful DB row and flags `isLive: false` with a stale notice, exactly
   per the "never hard-code fake live prices" requirement.

## 7. What was actually tested

Run in this environment against a local SQLite database (see `/logs` output referenced in the
build), confirmed working end-to-end:

- ✅ Signup → JWT issued → protected route rejects no token (401) → accepts valid token
- ✅ Login (customer, store manager, admin)
- ✅ Gold calculator: real wastage % and making charge % pulled from the database and applied correctly (verified the exact numbers in the response)
- ✅ Store manager can update their own store's wastage; a *different* store manager is blocked (403) — ownership enforcement is real, not decorative
- ✅ Admin-only routes reject non-admin tokens (403)
- ✅ OTP generation, hashing, and dev-mode console delivery
- ✅ Wishlist create/list scoped to the signed-in user

**Not tested (couldn't be, from this environment):** the live gold-rate API calls themselves
(network-restricted sandbox), PostgreSQL specifically (tested against SQLite, which uses the
same Sequelize model code, but Postgres-specific behavior like SSL connections and concurrent
transaction handling wasn't exercised), real email/SMS delivery, and the frontend integration
(not yet wired — see §3).

## 8. Project structure

```
src/
  config/       env loader, winston logger, Sequelize connection
  models/       Sequelize models + associations (index.js)
  middleware/   JWT auth, role guard, validation, rate limiting, error handler
  controllers/  one file per resource (auth, users, calculator, wastage, stores, loans,
                wishlist, orders, reviews, admin, gold-rate)
  routes/       route definitions + validation rules, mounted in routes/index.js
  services/     notificationService (email/SMS), goldRateProvider (external API calls)
  jobs/         goldRateCron.js — polls the live provider on a schedule
  seed/         seed.js — one-time admin/demo-data bootstrap
```

## 9. Security checklist implemented

- Passwords hashed with bcrypt (cost factor 12)
- JWT access tokens (short-lived) + refresh tokens (hashed in DB, revocable — real logout)
- Role-based access control: `customer`, `store_manager`, `admin`
- Rate limiting (general + a stricter limit specifically on auth endpoints)
- `express-validator` on every write endpoint
- `helmet` for security headers, CORS locked to `CLIENT_ORIGIN`
- Centralized error handler that never leaks stack traces to the client
- Winston logging to file (`logs/error.log`, `logs/combined.log`) plus console in dev
- Database indexes on every foreign key and lookup column used in a `WHERE` clause
- Audit log for every admin action (role changes, store verification, review moderation, settings changes)
