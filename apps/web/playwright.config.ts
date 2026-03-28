import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	timeout: 30_000,
	use: {
		baseURL: "http://localhost:3001",
		headless: true,
	},
	webServer: {
		command: "bun run dev",
		port: 3001,
		reuseExistingServer: true,
		timeout: 30_000,
	},
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
});
