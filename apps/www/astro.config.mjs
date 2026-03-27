import starlight from "@astrojs/starlight";
import { defineConfig, passthroughImageService } from "astro/config";

const url = "https://fyp.jaypopat.me";

export default defineConfig({
	site: url,
	devToolbar: {
		enabled: false,
	},
	image: {
		service: passthroughImageService(),
	},
	vite: {
		ssr: {
			noExternal: ["zod"],
		},
	},
	integrations: [
		starlight({
			title: "zk-Fair Docs",
			description:
				"Privacy-preserving AI model fairness auditing using zero-knowledge proofs.",
			customCss: ["./src/styles/custom.css", "./src/styles/lander.css"],
			expressiveCode: {
				styleOverrides: {
					borderRadius: "0px",
				},
			},

			// Use JetBrains Mono to match landing page
			head: [
				{
					tag: "style",
					content: `
            :root {
              --sl-font: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
              --sl-font-system: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
            }
          `,
				},
			],

			sidebar: [
				{ label: "Introduction", slug: "docs" },
				{ label: "Architecture", slug: "docs/core/architecture" },
				{
					label: "ZK Circuits",
					items: [
						{ label: "Training Certification", slug: "docs/circuits/training" },
						{ label: "Fairness Audit", slug: "docs/circuits/audit" },
					],
				},
			],
		}),
	],
});
