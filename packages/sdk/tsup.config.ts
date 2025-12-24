import { defineConfig } from "tsup";

console.log("Building SDK with Env:", process.env.ZKFAIR_ENV);

export default defineConfig({
	env: {
		ZKFAIR_ENV: process.env.ZKFAIR_ENV || "local",
	},
	entry: [
		"index.ts",
		"browser.ts",
		"model.ts",
		"client.ts",
		"merkle.ts",
		"hash.ts",
		"utils.ts",
		"schema/index.ts",
	],
	format: ["esm"],
	dts: true,
	clean: true,
	noExternal: ["@zkfair/contracts", "@zkfair/zk-circuits"],
});
