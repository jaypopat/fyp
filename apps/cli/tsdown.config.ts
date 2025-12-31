import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["index.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	outDir: "dist",
	shims: true,
	target: false,
});
