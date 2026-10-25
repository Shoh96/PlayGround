import Fastify, { type FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import { ZodError } from "zod";
import type { AuditLog } from "@rent/shared";
import type { OtpProvider } from "./auth/otp.js";
import { registerHealthRoute, type HealthDeps } from "./routes/health.js";
import { registerIdentityRoutes } from "./routes/identity.js";
import { registerKycRoutes } from "./routes/kyc.js";
import { IdentityService } from "./services/identityService.js";
import { KycService } from "./services/kycService.js";
import type { KycRepo, UserRepo } from "./ports/types.js";
import { AppError } from "./errors/AppError.js";

export interface ApiDeps extends HealthDeps {
  userRepo: UserRepo;
  kycRepo: KycRepo;
  audit: AuditLog;
  otp: OtpProvider;
  jwtSecret: string;
  now?: () => string;
}

/** Build the app; tests inject into this instance, prod listens via server.ts. */
export async function createApp(deps: ApiDeps): Promise<FastifyInstance> {
  const loggerOptions: { level: string; transport?: { target: string } } = {
    level: process.env.LOG_LEVEL ?? "info",
  };
  if (process.env.LOG_PRETTY === "1") loggerOptions.transport = { target: "pino-pretty" };

  const app = Fastify({ logger: loggerOptions });
  app.decorate("config", { JWT_SECRET: deps.jwtSecret });

  const identity = new IdentityService({
    userRepo: deps.userRepo,
    kycRepo: deps.kycRepo,
    otp: deps.otp,
    audit: deps.audit,
    jwtSecret: deps.jwtSecret,
    now: deps.now,
  });
  const kyc = new KycService({
    userRepo: deps.userRepo,
    kycRepo: deps.kycRepo,
    audit: deps.audit,
    now: deps.now,
  });

  // @fastify/swagger (dynamic mode) only decorates app.swagger(); serve the spec ourselves
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Rent Platform API",
        description: "Identity, KYC, listings, ledger and payments (phased).",
        version: "0.1.0",
      },
      tags: [
        { name: "auth", description: "Phone OTP signup and login" },
        { name: "kyc", description: "KYC tiers, submissions and verified badge" },
        { name: "admin", description: "Verification queue and decisions" },
      ],
    },
  });
  app.get("/openapi.json", () => app.swagger());

  app.setErrorHandler((raw, req, reply) => {
    if (raw instanceof AppError) {
      return reply.code(raw.statusCode).send({
        error: raw.code,
        message: raw.message,
        ...(raw.details ? { details: raw.details } : {}),
      });
    }
    if (raw instanceof ZodError) {
      return reply.code(400).send({ error: "validation_failed", issues: raw.issues });
    }
    const err = raw as { statusCode?: number; validation?: object };
    if (err.statusCode === 429) {
      return reply.code(429).send({ error: "otp_rate_limited", message: String(raw) });
    }
    if (err.validation) {
      return reply.code(400).send({ error: "invalid_request", message: String(raw) });
    }
    req.log.error({ err: raw }, "unhandled error");
    return reply.code(500).send({ error: "internal", message: "unexpected error" });
  });

  registerHealthRoute(app, deps);
  registerIdentityRoutes(app, identity);
  registerKycRoutes(app, kyc);
  return app;
}
