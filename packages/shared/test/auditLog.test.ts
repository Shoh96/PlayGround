import { describe, expect, it } from "vitest";
import { AppendOnlyAuditLog } from "../src/audit/auditLog.js";
import { id, money } from "../src/primitives.js";

const baseEntry = {
  at: "2026-10-25T10:00:00Z" as const,
  actor: { kind: "system" as const, id: "bot-001" },
  action: "lease.created",
  entityType: "Lease",
  entityId: "lease_1",
  after: { rent: money(120_000) },
  reason: "lease signed by tenant",
};

describe("AppendOnlyAuditLog", () => {
  it("appends entries with monotonically increasing seq", async () => {
    const log = new AppendOnlyAuditLog();
    const first = await log.append(baseEntry);
    const second = await log.append({ ...baseEntry, entityId: "lease_2" });
    expect(first.seq).toBe(1);
    expect(second.seq).toBe(2);
    expect(log.size()).toBe(2);
  });

  it("reads entries filtered by entity", async () => {
    const log = new AppendOnlyAuditLog();
    await log.append(baseEntry);
    await log.append({ ...baseEntry, action: "lease.amended", reason: "rent change" });
    await log.append({ ...baseEntry, entityType: "Property", entityId: "prop_1" });
    const entries = await log.list("Lease", "lease_1");
    expect(entries).toHaveLength(2);
    const other = await log.list("Property", "prop_1");
    expect(other).toHaveLength(1);
  });

  it("rejects entries without a reason", async () => {
    const log = new AppendOnlyAuditLog();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { reason, ...silent } = baseEntry;
    await expect(log.append(silent)).rejects.toThrow(TypeError);
  });

  it("rejects entries that carry seq or rev fields", async () => {
    const log = new AppendOnlyAuditLog();
    await expect(log.append({ ...baseEntry, seq: 99 })).rejects.toThrow(/seq/);
    await expect(log.append({ ...baseEntry, rev: 3 })).rejects.toThrow(/rev/);
  });

  it("rejects entries without an after snapshot", async () => {
    const log = new AppendOnlyAuditLog();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { after, ...hollow } = baseEntry;
    await expect(log.append(hollow)).rejects.toThrow(/after/);
  });

  it("freezes appended entries so records cannot be mutated in place", async () => {
    const log = new AppendOnlyAuditLog();
    const entry = await log.append(baseEntry);
    expect(Object.isFrozen(entry)).toBe(true);
    expect(() => {
      "use strict";
      (entry as { reason: string }).reason = "tampered";
    }).toThrow(TypeError);
    const read = await log.list("Lease", "lease_1");
    expect(read[0]?.reason).toBe("lease signed by tenant");
    expect(id("x")).toBe("x");
  });
});
