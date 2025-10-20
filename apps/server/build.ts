await Bun.build({
	entrypoints: ["./index.ts"],
	outdir: "./dist",
	target: "bun",
	format: "esm",
	external: ["onnxruntime-node"],
	packages: "bundle",
});
