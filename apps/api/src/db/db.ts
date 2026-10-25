import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function createDb(url: string): { sql: postgres.Sql; db: Db } {
  const sql = postgres(url, { prepare: false });
  return { sql, db: drizzle(sql, { schema }) };
}
