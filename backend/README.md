# LoanApp backend

Express + TypeScript + Prisma + PostgreSQL API that mirrors the mobile app's mock
services (`mobile/src/services/mock/*`) behind the same HTTP contract
`mobile/src/services/api/httpClient.ts` expects: `{success, data}` /
`{success:false, error:{code,message,details}}` envelopes, `{items,page,limit,
total,totalPages}` pagination, JWT access+refresh tokens, and `Idempotency-Key`
support on sale/purchase/payment creation.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (a Neon connection
   string works directly) plus generated JWT secrets.
3. `npm run prisma:migrate` — creates the schema against `DATABASE_URL`.
4. `npm run seed` — loads the same demo shop/customers/products the mock uses
   (login: `demo@loanapp.com` / `demo1234`).
5. `npm run dev` — starts the API on `http://localhost:4000/api/v1`.
6. `npm test` — runs the integration test suite (see `tests/`).

## Deploying (Neon + Render)

1. **Neon**: create a project at neon.tech, copy the pooled connection string
   (the one with `-pooler` in the hostname) into `DATABASE_URL`.
2. **Render**: create a new Web Service from this repo, root directory
   `backend/` (or use the included `render.yaml` blueprint). Set `DATABASE_URL`
   to the same Neon string, plus `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (Render
   can generate these for you, or use `render.yaml`'s `generateValue: true`).
   Build command: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`.
   Start command: `npm run start`. Health check path: `/health`.
3. Once deployed, point the mobile app at it by setting, in `mobile/.env`:
   ```
   EXPO_PUBLIC_API_URL=https://<your-render-service>.onrender.com/api/v1
   EXPO_PUBLIC_USE_MOCK=false
   ```
   (Deliberately not done automatically — flip this when you're ready to switch
   off mock mode.)

## Known v1 simplifications

- Dashboard "today" uses UTC day boundaries, not the shop's IANA timezone.
- Report cost-of-goods uses each product's *current* buying price, not the
  price at the time of the historical sale.
- Reminders are stubbed (`POST /reminders/:id/send` just marks the row `SENT`)
  — no real SMS/push/email provider is wired up.
- Single owner/user per shop, matching the mock's model — no roles or
  multi-user shops yet.

## Performance notes

- All list/aggregate endpoints run their filtering, sorting, and pagination in
  SQL (indexed columns, `COUNT(*) OVER()` for total counts) rather than loading
  rows into memory, so they scale with data volume instead of shop count.
- Customer balances are computed via batched aggregate queries (one query for
  a whole page of customers, not one query per customer).
- Sale/payment creation uses per-row atomic conditional updates (stock
  decrement, customer balance check via `pg_advisory_xact_lock`) inside a DB
  transaction, so concurrent requests can't race past a stock or balance limit.
- One pooled `PrismaClient` per process; use Neon's pooled connection string in
  production so Render's process doesn't exhaust Neon's connection limit.
