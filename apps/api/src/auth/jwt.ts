/** JWT sessions (HS256 via jose). Phone-OTP proves identity; claim carries roles. */
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@rent/domain";

export interface SessionClaims {
  sub: string;
  phone: string;
  roles: Role[];
}

const encoder = new TextEncoder();

export const DEFAULT_TTL = "7d";

export function signSession(
  claims: SessionClaims,
  secret: string,
  ttl: string = DEFAULT_TTL,
): Promise<string> {
  return new SignJWT({ phone: claims.phone, roles: claims.roles })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(encoder.encode(secret));
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret));
    if (!payload.sub || typeof payload.phone !== "string" || !Array.isArray(payload.roles)) {
      return null;
    }
    return { sub: payload.sub, phone: payload.phone, roles: payload.roles as Role[] };
  } catch {
    return null;
  }
}
