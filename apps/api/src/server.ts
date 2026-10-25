import { createDb } from "./db/db.js";
import { PostgresAuditLog } from "./db/auditLog.js";
import { DrizzleKycRepo, DrizzleUserRepo } from "./db/userKycRepo.js";
import { createApp } from "./app.js";
import { InMemoryOtpProvider } from "./auth/otp.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required (see infra/.env.example) — run `make up` first");
  process.exit(1);
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error("JWT_SECRET is required (32+ random chars). Generate: openssl rand -hex 32");
  process.exit(1);
}

const { sql, db } = createDb(url);
const userRepo = new DrizzleUserRepo(db);
const app = await createApp({
  dependencies: [
    { name: "postgres", ok: true, detail: "drizzle wired" },
    { name: "redis", ok: Boolean(process.env.REDIS_URL), detail: "wired in Phase 4 (queues)" },
  ],
  userRepo,
  kycRepo: new DrizzleKycRepo(db, userRepo),
  audit: new PostgresAuditLog(db),
  otp: new InMemoryOtpProvider({ exposeCode: process.env.NODE_ENV !== "production" }),
  jwtSecret,
});

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    app.close().finally(() => sql.end());
  });
}
