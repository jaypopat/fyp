/**
 * Drizzle schema tables for ZKFair SDK
 *
 * Providers merge these tables into their own Drizzle schema.
 *
 * @example
 * ```typescript
 * // provider's db/schema.ts
 * export { zkfairBatches, zkfairQueryLogs } from "@zkfair/sdk/schema";
 * export * from "./users"; // provider's own tables
 *
 * // provider's db/client.ts
 * import * as schema from "./schema";
 * const db = drizzle(sqlite, { schema });
 *
 * // provider's sdk.ts
 * import { ProviderSDK } from "@zkfair/sdk";
 * const provider = new ProviderSDK({ privateKey, db });
 * ```
 *
 * @packageDocumentation
 */

import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { zkfairSchema } from "./tables";

/**
 * Drizzle database instance type for ZKFair SDK
 */
export type DrizzleDB = BunSQLiteDatabase<typeof zkfairSchema>;

export {
	type Batch,
	type NewBatch,
	type NewQueryLog,
	type QueryLog,
	zkfairBatches,
	zkfairQueryLogs,
	zkfairSchema,
} from "./tables";
