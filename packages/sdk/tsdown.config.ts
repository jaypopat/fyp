import { defineConfig } from "tsdown";

console.log("Building SDK with Env:", process.env.ZKFAIR_ENV);

export default defineConfig({
	env: {
		ZKFAIR_ENV: process.env.ZKFAIR_ENV || "local",
	},
	entry: [
		"index.ts",
		"browser.ts",
		"model.ts",
		"merkle.ts",
		"hash.ts",
		"utils.ts",
		"dispute",
		"schema/index.ts",
		"provider.ts",
	],
	format: ["esm"],
	dts: true,
	clean: true,
	noExternal: ["@zkfair/contracts", "@zkfair/zk-circuits"],
	target: false,
});
