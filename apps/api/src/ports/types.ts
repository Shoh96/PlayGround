/**
 * Repository ports for identity/KYC. The service layer depends only on
 * these; adapters: drizzle (prod) + in-memory (tests, Phase 1).
 */
import type { KycRecord, User } from "@rent/domain";

export interface UserRepo {
  byId(userId: string): Promise<User | null>;
  byPhone(phone: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
}

export interface KycQueueEntry {
  user: User;
  kyc: KycRecord;
}

export interface KycRepo {
  byUser(userId: string): Promise<KycRecord | null>;
  upsert(userId: string, kyc: KycRecord): Promise<void>;
  listPendingReview(): Promise<KycQueueEntry[]>;
}
