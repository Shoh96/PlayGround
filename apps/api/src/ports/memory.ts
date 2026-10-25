/** In-memory adapters for fast tests and ephemeral dev runs. */
import { type KycRecord, type User } from "@rent/domain";
import type { KycQueueEntry, KycRepo, UserRepo } from "./types.js";

export class MemoryUserRepo implements UserRepo {
  private users = new Map<string, User>();

  /** Exposed so companion repos (Kyc) can resolve users for queue joins. */
  get store(): Map<string, User> {
    return this.users;
  }

  async byId(userId: string): Promise<User | null> {
    return this.users.get(userId) ?? null;
  }

  async byPhone(phone: string): Promise<User | null> {
    for (const u of this.users.values()) if (u.phone === phone) return u;
    return null;
  }

  async create(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  async update(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  /** Test helper: seed directly (e.g. an admin). */
  seed(user: User): void {
    this.users.set(user.id, user);
  }
}

export class MemoryKycRepo implements KycRepo {
  private records = new Map<string, KycRecord>();

  constructor(private readonly users: Map<string, User> = new Map()) {}

  async byUser(userId: string): Promise<KycRecord | null> {
    return this.records.get(userId) ?? null;
  }

  async upsert(userId: string, kyc: KycRecord): Promise<void> {
    this.records.set(userId, kyc);
  }

  async listPendingReview(): Promise<KycQueueEntry[]> {
    const out: KycQueueEntry[] = [];
    for (const [userId, kyc] of this.records) {
      if (kyc.status !== "PENDING_REVIEW") continue;
      const user = this.users.get(userId);
      if (!user) continue;
      out.push({ user, kyc });
    }
    return out;
  }
}
