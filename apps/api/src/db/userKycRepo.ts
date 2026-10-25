/** Drizzle-backed adapters for UserRepo / KycRepo. */
import {
  KycRecord,
  User,
  emptyKyc,
  type User as UserType,
  type KycRecord as Kyc,
} from "@rent/domain";
import { eq } from "drizzle-orm";
import type { Db } from "./db.js";
import { kycRecords, users } from "./schema.js";
import type { KycQueueEntry, KycRepo, UserRepo } from "../ports/types.js";

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

type UserRow = typeof users.$inferSelect;
type KycRow = typeof kycRecords.$inferSelect;

function assembleUser(userRow: UserRow, kycRow: KycRow | null): UserType {
  const kyc: Kyc =
    kycRow && kycRow.userId !== null
      ? KycRecord.parse({
          tier: kycRow.tier,
          status: kycRow.status,
          pendingTier: kycRow.pendingTier,
          phoneVerifiedAt: iso(kycRow.phoneVerifiedAt),
          idDocumentRef: kycRow.idDocumentRef,
          addressProofRef: kycRow.addressProofRef,
          titleDocRef: kycRow.titleDocRef,
          payoutName: kycRow.payoutName,
          verifiedAt: iso(kycRow.verifiedAt),
          verifiedBy: kycRow.verifiedBy,
        })
      : KycRecord.parse(emptyKyc());
  return User.parse({
    id: userRow.id,
    phone: userRow.phone,
    displayName: userRow.displayName,
    roles: userRow.roles,
    status: userRow.status,
    kyc,
    createdAt: userRow.createdAt.toISOString(),
  });
}

export class DrizzleUserRepo implements UserRepo {
  constructor(private readonly db: Db) {}

  private async find(where: ReturnType<typeof eq>): Promise<UserType | null> {
    const rows = await this.db
      .select({ u: users, k: kycRecords })
      .from(users)
      .leftJoin(kycRecords, eq(kycRecords.userId, users.id))
      .where(where)
      .limit(1);
    const row = rows.at(0);
    return row ? assembleUser(row.u, row.k) : null;
  }

  async byId(userId: string): Promise<UserType | null> {
    return this.find(eq(users.id, userId));
  }

  async byPhone(phone: string): Promise<UserType | null> {
    return this.find(eq(users.phone, phone));
  }

  async create(user: UserType): Promise<UserType> {
    await this.db.insert(users).values({
      id: user.id,
      phone: user.phone,
      displayName: user.displayName,
      roles: [...user.roles],
      status: user.status,
      createdAt: new Date(user.createdAt),
    });
    return user;
  }

  async update(user: UserType): Promise<UserType> {
    await this.db
      .update(users)
      .set({ displayName: user.displayName, roles: [...user.roles], status: user.status })
      .where(eq(users.id, user.id));
    return user;
  }
}

export class DrizzleKycRepo implements KycRepo {
  constructor(
    private readonly db: Db,
    private readonly userRepo: DrizzleUserRepo,
  ) {}

  async byUser(userId: string): Promise<Kyc | null> {
    const row = (
      await this.db.select().from(kycRecords).where(eq(kycRecords.userId, userId))
    ).at(0);
    if (!row) return null;
    return assembleUser(
      (await this.db.select().from(users).where(eq(users.id, userId)).limit(1)).at(0)!,
      row,
    ).kyc;
  }

  async upsert(userId: string, kyc: Kyc): Promise<void> {
    const values = {
      userId,
      tier: kyc.tier,
      status: kyc.status,
      pendingTier: kyc.pendingTier,
      phoneVerifiedAt: kyc.phoneVerifiedAt ? new Date(kyc.phoneVerifiedAt) : null,
      idDocumentRef: kyc.idDocumentRef,
      addressProofRef: kyc.addressProofRef,
      titleDocRef: kyc.titleDocRef,
      payoutName: kyc.payoutName,
      verifiedAt: kyc.verifiedAt ? new Date(kyc.verifiedAt) : null,
      verifiedBy: kyc.verifiedBy,
      updatedAt: new Date(),
    };
    await this.db
      .insert(kycRecords)
      .values(values)
      .onConflictDoUpdate({ target: kycRecords.userId, set: values });
  }

  async listPendingReview(): Promise<KycQueueEntry[]> {
    const rows = await this.db
      .select({ u: users, k: kycRecords })
      .from(kycRecords)
      .innerJoin(users, eq(users.id, kycRecords.userId))
      .where(eq(kycRecords.status, "PENDING_REVIEW"));
    return rows.map((row) => ({
      user: assembleUser(row.u, row.k),
      kyc: assembleUser(row.u, row.k).kyc,
    }));
  }
}
