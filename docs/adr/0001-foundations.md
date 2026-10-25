# ADR 0001 — Foundations: TypeScript monorepo, Postgres, Drizzle, BullMQ

- **Status:** Accepted (2026-10-25)
- **Deciders:** lead engineer + product (per phase brief)
- **Applies to:** all phases 0–8

## Context

We are building a verified rental marketplace for MTN MoMo / Orange Money
markets with: KYC tiers, listings + inspections, an immutable ledger with
cash recording, PSP-facilitated payments (platform instructs, PSP
executes — we never hold funds), a WhatsApp support bot, a dispute
process, and admin/owner dashboards.

## Decision

1. **Language — TypeScript (Node 24, ESM)** across `apps/*` and
   `packages/*`. One language means the rules engine (pure, `packages/domain`)
   is callable from the API, the bot, and the PSP adapters without IPC.
2. **DB — PostgreSQL** with schema-first migration files. The audit log
   and ledger are append-only tables; Postgres gives transactions,
   partial indexes, and EXCLUDE constraints for idempotency keys.
3. **Validation — zod** at every boundary (user input, webhook bodies,
   entity invariants). Phase 0 delivers entities as `zod` schemas backed
   by inferred static types; transitions stay in the rules engine.
4. **Audit log** — storage-agnostic append-only primitive
   (`@rent/shared`): `actor + action + entityType/Id + before/after +
reason`, frozen entries, seq assigned by the log never by callers.
5. **Queue — Redis + BullMQ** starting Phase 4 (webhooks, retries,
   reconciliation). Infra ships both services now so no mid-phase surprise.
6. **Fastify** for the API. Injection-friendly app factory for tests.
7. **pnpm workspaces**; tsconfig shared via `packages/tsconfig`.
8. **Money** is `{ amount: int minor-units, currency: "XOF" }`. XOF has
   zero decimals; we still keep integer minor units for future markets.

## Consequences

- Phase tests live next to each module; CI (GitHub Actions) runs
  `pnpm -r lint/typecheck/build/test` plus a `make dev` smoke.
- We will not build rules logic inside zod schemas: schemas validate
  shape/invariants of a single state, transitions go in the rules engine.
- Anything that would hold customer funds is rejected at design level:
  the `PaymentProvider` adapter will return the PSP's own holding info.

## Alternatives considered

- **Python/FastAPI**: comparable ergonomics; rejected because the bot
  (WhatsApp) and PSP adapters would need a second runtime to share the
  rules engine and audit sink.
- **Prisma**: heavier binary/runtime coupling; we prefer plain SQL
  migrations so append-only ledger constraints live where they matter.
- **Escrow ledger on-platform**: explicitly out of scope — §Non-goals.
