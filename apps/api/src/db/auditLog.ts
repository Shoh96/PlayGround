/** Postgres-backed AuditLog (append-only table). */
import type { AuditEntry, AuditLog } from "@rent/shared";
import { validateAuditEntryPayload } from "@rent/shared";
import type { Db } from "./db.js";
import { auditLog } from "./schema.js";

export class PostgresAuditLog implements AuditLog {
  constructor(private readonly db: Db) {}

  async append<E>(entry: Omit<AuditEntry<E>, "seq">): Promise<AuditEntry<E>> {
    validateAuditEntryPayload(entry);
    const rows = await this.db
      .insert(auditLog)
      .values({
        at: new Date(entry.at),
        actor: entry.actor,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        before: entry.before === null ? null : (entry.before as never),
        after: entry.after as never,
        reason: entry.reason,
        traceId: entry.traceId ?? null,
      })
      .returning({ seq: auditLog.seq });
    const seq = rows.at(0)!.seq;
    return { ...entry, seq } as AuditEntry<E>;
  }

  async list(entityType: string, entityId: string): Promise<readonly AuditEntry[]> {
    const rows = await this.db.select().from(auditLog).orderBy(auditLog.seq);
    return rows
      .filter((r) => r.entityType === entityType && r.entityId === entityId)
      .map<AuditEntry>((r) => ({
        seq: Number(r.seq),
        at: r.at.toISOString(),
        actor: r.actor as never,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        before: (r.before ?? null) as never,
        after: r.after as never,
        reason: r.reason,
        traceId: r.traceId ?? undefined,
      }));
  }
}
