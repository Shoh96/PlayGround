/** Request guards: requireAuth (any session) + requireAdmin (role check). */
import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError.js";
import { verifySession, type SessionClaims } from "../auth/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    session?: SessionClaims;
  }
}

export function bearer(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length) || null;
}

export type Guard = (req: FastifyRequest, reply?: FastifyReply) => Promise<void>;

export const requireAuth: Guard = async (req) => {
  const token = bearer(req);
  if (!token) throw new AppError(401, "unauthorized", "missing bearer token");
  const claims = await verifySession(token, req.server.config.JWT_SECRET);
  if (!claims) throw new AppError(401, "unauthorized", "invalid or expired token");
  req.session = claims;
};

export const requireAdmin: Guard = async (req) => {
  await requireAuth(req);
  if (!req.session?.roles.includes("admin")) {
    throw new AppError(403, "forbidden", "admin role required");
  }
};

declare module "fastify" {
  interface FastifyInstance {
    config: { JWT_SECRET: string };
  }
}

export type { FastifyReply };
