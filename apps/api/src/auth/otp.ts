/**
 * OTP provider port + in-memory stub. The real provider (BSP slot) lands
 * behind this same interface; nothing else in the codebase changes.
 *
 * NOTE: in-memory state means codes live per API process. Fine for the
 * stub; Redis persistence arrives with the real provider (open question
 * in the Phase 1 summary).
 */
import { createHash, randomUUID } from "node:crypto";
import type { IsoDateTime } from "@rent/domain";

export interface OtpIssue {
  requestId: string;
  expiresAt: IsoDateTime;
  /** Exposed only by dev/test stubs so the flow is testable end-to-end. */
  devCode?: string;
}

export interface OtpProvider {
  issue(phone: string): Promise<OtpIssue>;
  /** True iff requestId+code is valid, unconsumed and for this phone. */
  verify(phone: string, requestId: string, code: string): Promise<boolean>;
}

const hash = (code: string, salt: string): string =>
  createHash("sha256").update(`${salt}:${code}`).digest("hex");

interface OtpRecord {
  phone: string;
  codeHash: string;
  salt: string;
  expiresAt: Date;
  consumed: boolean;
  attempts: number;
}

export class InMemoryOtpProvider implements OtpProvider {
  private records = new Map<string, OtpRecord>();
  /** phone → issue timestamps for rate limiting */
  private issued = new Map<string, number[]>();

  constructor(
    private readonly opts: {
      exposeCode?: boolean;
      ttlMs?: number;
      maxPerWindow?: number;
      windowMs?: number;
      maxAttempts?: number;
      now?: () => Date;
    } = {},
  ) {}

  async issue(phone: string): Promise<OtpIssue> {
    const now = (this.opts.now ?? (() => new Date()))();
    const windowMs = this.opts.windowMs ?? 10 * 60_000;
    const maxPerWindow = this.opts.maxPerWindow ?? 5;

    const recent = (this.issued.get(phone) ?? []).filter((t) => now.getTime() - t < windowMs);
    if (recent.length >= maxPerWindow) {
      const err = new Error("too many OTP requests; try again later") as Error & {
        statusCode?: number;
        code?: string;
      };
      err.statusCode = 429;
      err.code = "otp_rate_limited";
      throw err;
    }
    recent.push(now.getTime());
    this.issued.set(phone, recent);

    const code = String(Math.floor(100_000 + Math.random() * 900_000));
    const salt = randomUUID();
    const ttlMs = this.opts.ttlMs ?? 5 * 60_000;
    const requestId = randomUUID();
    this.records.set(requestId, {
      phone,
      codeHash: hash(code, salt),
      salt,
      expiresAt: new Date(now.getTime() + ttlMs),
      consumed: false,
      attempts: 0,
    });
    return {
      requestId,
      expiresAt: new Date(now.getTime() + ttlMs).toISOString() as IsoDateTime,
      ...(this.opts.exposeCode ? { devCode: code } : {}),
    };
  }

  async verify(phone: string, requestId: string, code: string): Promise<boolean> {
    const now = (this.opts.now ?? (() => new Date()))();
    const rec = this.records.get(requestId);
    if (!rec || rec.consumed || rec.phone !== phone) return false;
    if (rec.expiresAt.getTime() < now.getTime()) return false;
    if (rec.attempts >= (this.opts.maxAttempts ?? 5)) return false;
    rec.attempts += 1;
    if (rec.codeHash !== hash(code, rec.salt)) return false;
    rec.consumed = true;
    this.records.delete(requestId);
    return true;
  }
}
