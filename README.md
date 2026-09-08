# CLUB 90s

Mobile-first PWA for a private football club: membership, match RSVP & team
formation, finance, tournament player bidding, anonymous president elections,
and a lightweight community feed. Built from `CLUB90s_SRS_TDD.md`.

**Stack:** Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS 4,
Prisma 7 (`@prisma/adapter-mariadb` driver adapter) on MySQL (Aiven), session
auth with argon2id, Resend for email, Cloudflare R2 for file storage (not yet
provisioned).

## Setup

```bash
npm install
cp .env.example .env   # fill in real values — see below
npx prisma migrate deploy
npm run db:seed        # creates roles, default sectors, finance categories, a bootstrap admin
npm run dev
```

Log in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env` — **change that password after first login.**

## Environment variables

See `.env.example` for the full list. Notable ones:

- `DATABASE_URL` / `DB_*` — MySQL connection. Aiven's TLS uses a private CA, so
  connections use `sslaccept=accept_invalid_certs` (CLI/migrations) and
  `DB_SSL_REJECT_UNAUTHORIZED=false` (app runtime) — still encrypted, just not
  CA-pinned. To harden this later, download Aiven's CA cert and switch to
  `rejectUnauthorized: true` with `ca: <cert>` in `lib/db/client.ts`.
- `SESSION_SECRET` — not currently used for cookie signing (sessions are opaque
  random tokens, hashed server-side — see `lib/auth/session.ts`), reserved for
  future use.
- `RESEND_API_KEY` / `EMAIL_FROM` — leave `RESEND_API_KEY` blank in dev; emails
  (activation links) log to the server console instead of sending.
- `R2_*` — not yet wired into any upload code path (profile photos,
  achievement images, receipts are schema-ready via `*ImageUrl`/`attachmentUrl`
  columns, but the direct-to-object-storage upload flow from SRS §25.5 isn't
  built yet).

## Database migrations

`prisma migrate dev` requires an interactive terminal and will refuse to run
non-interactively. Use this instead when adding schema changes:

```bash
npx prisma migrate diff --from-config-datasource --to-schema=prisma/schema.prisma --script > /tmp/diff.sql
# review the SQL, then create prisma/migrations/<timestamp>_<name>/migration.sql with it
npx prisma migrate deploy
npx prisma generate
```

**After any migration + generate, restart `next dev`.** Turbopack's dev server
has been observed serving a stale generated Prisma client after
`prisma generate` runs in a separate process — the client-side symptom looks
unrelated (e.g. Tailwind classes rendering as if absent, due to a *different*
but same-shaped stale-chunk issue from the service worker). A full restart of
the dev server resolves it. This project's service worker is registered
production-only for exactly this reason — see
`components/pwa/service-worker-registration.tsx`.

## What's built (MVP scope per SRS §34)

Done and manually verified end-to-end (browser + API): auth (session-based,
argon2id, account lockout), RBAC with dynamic sectors, member import
(CSV/XLSX, dry-run, activation emails), role assignment (Tier 2 re-auth),
matches + RSVP + waitlist promotion, team formation (manual + shuffle),
finance ledger + fee-status derivation + VOID/reversal, tournament player
bidding (server-authoritative timer, row-locked bids, budget/increment
validation), elections (anonymous ballots, two-admin Tier 3 confirmation),
community feed + comments + reactions + moderation, achievements,
announcements, birthdays (day/month only), in-app notifications, PWA
manifest/icons/service worker.

**Not yet built:** recruitment application workflow (§12.3), CSRF token
defense-in-depth (§28 — currently relying on SameSite=Lax only), historical
finance migration UI (member import exists; finance-specific import per §17.4
doesn't), object storage upload flow (§25.5), Web Push (correctly deferred to
Phase 2 per SRS), broader test coverage (current suite is unit-level only —
`lib/finance/fee-status.test.ts`, `lib/permissions/can.test.ts`,
`prisma/election-privacy.test.ts`; SRS §31 calls for integration and
concurrency-race tests too, which need a dedicated non-production test
database per §26.2 rather than the shared Aiven dev instance this was built
against).

Run tests: `npm test`. Lint: `npm run lint`. Build: `npm run build`.
