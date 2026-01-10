import { zkfairSchema } from "@zkfair/sdk/schema";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
});

export const schema = {
	...zkfairSchema, // tables required by zkfair
	users,
};
