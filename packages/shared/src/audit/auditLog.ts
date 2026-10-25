/**
 * Append-only audit log primitive.
 *
 * Every financial or state change in the platform writes one entry here:
 * actor, action, entity, before/after snapshots, reason, timestamp.
 * The interface is intentionally storage-agnostic; the DB adapter will
 * implement the same shape on an append-only table.
 */
import type { Actor, IsoDateTime } from "../primitives.js";

export interface AuditEntry<E = unknown> {
  readonly seq: number;
  readonly at: IsoDateTime;
  readonly actor: Actor;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  /** Full state before the change (null when created). */
  readonly before: E | null;
  /** Full state after the change. */
  readonly after: E;
  /** Human or rules-engine supplied reason; never empty. */
  readonly reason: string;
  /** Optional trace id linking the entry to a request/command. */
  readonly traceId?: string;
}

/** The only operations an append-only log exposes: append and read. */
export interface AuditLog {
  append<E>(entry: Omit<AuditEntry<E>, "seq">): Promise<AuditEntry<E>>;
  list(entityType: string, entityId: string): Promise<readonly AuditEntry[]>;
}

export type AuditLogPort = AuditLog;

/**
 * Defense in depth shared by every audit sink (memory, postgres, bot):
 * reject anything that smells like a mutation envelope or a silent change.
 */
export function validateAuditEntryPayload(entry: object): void {
  if (Object.hasOwn(entry, "seq") || Object.hasOwn(entry, "rev")) {
    throw new TypeError("audit entries must not carry sequence or revision fields");
  }
  const { actor, action, entityType, entityId, after, reason, at } = entry as Record<
    string,
    unknown
  >;
  if (typeof action !== "string" || action.length === 0) {
    throw new TypeError("action is required");
  }
  if (typeof entityType !== "string" || typeof entityId !== "string") {
    throw new TypeError("entityType/entityId are required");
  }
  if (after === undefined) {
    throw new TypeError("after snapshot is required");
  }
  if (typeof reason !== "string" || reason.length === 0) {
    throw new TypeError("reason is required; audit entries are never silent");
  }
  if (actor === undefined || at === undefined) {
    throw new TypeError("actor and at are required");
  }
}

export class AppendOnlyAuditLog implements AuditLog {
  private nextSeq = 1;
  private store: AuditEntry[] = [];

  async append<E>(entry: Omit<AuditEntry<E>, "seq">): Promise<AuditEntry<E>> {
    validateAuditEntryPayload(entry);
    const full: AuditEntry<E> = Object.freeze({ ...entry, seq: this.nextSeq++ });
    this.store = [...this.store, full];
    return full;
  }

  async list(entityType: string, entityId: string): Promise<readonly AuditEntry[]> {
    return this.store.filter((e) => e.entityType === entityType && e.entityId === entityId);
  }

  size(): number {
    return this.store.length;
  }
}
