import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), tanstackRouter({}), react()] as PluginOption[],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
