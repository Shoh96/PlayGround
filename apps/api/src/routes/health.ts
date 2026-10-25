/** Health check: probe-only report of process + pending infra wiring. */
import type { FastifyInstance } from "fastify";

export interface HealthDeps {
  /** Presence checks run later; Phase 0 wires Postgres/Redis here via make dev. */
  dependencies: readonly { name: string; ok: boolean; detail: string }[];
}

export function registerHealthRoute(app: FastifyInstance, deps: HealthDeps): void {
  app.get("/health", async () => {
    const degraded = deps.dependencies.some((d) => !d.ok);
    return {
      status: degraded ? "degraded" : "ok",
      service: "api",
      version: process.env.npm_package_version ?? "0.1.0",
      dependencies: deps.dependencies,
      checkedAt: new Date().toISOString(),
    };
  });
}
