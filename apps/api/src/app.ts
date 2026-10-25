import Fastify, { type FastifyInstance } from "fastify";
import { registerHealthRoute, type HealthDeps } from "./routes/health.js";

/** Build the app; tests inject into this instance, prod listens via server.ts. */
export async function createApp(deps: HealthDeps): Promise<FastifyInstance> {
  const loggerOptions: {
    level: string;
    transport?: { target: string };
  } = { level: process.env.LOG_LEVEL ?? "info" };

  const pretty = process.env.LOG_PRETTY === "1";
  if (pretty) loggerOptions.transport = { target: "pino-pretty" };

  const app = Fastify({ logger: loggerOptions });
  registerHealthRoute(app, deps);
  return app;
}
