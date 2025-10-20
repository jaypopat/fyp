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
				{
					label: "Getting Started",
					items: [
						{ label: "Introduction", slug: "docs" },
						{ label: "Quick Start", slug: "docs/start/standalone" },
						{ label: "Installation", slug: "docs/start/installation" },
						{ label: "Your First Model", slug: "docs/start/your-first-model" },
					],
				},

				{
					label: "Core Concepts",
					items: [
						{ label: "Architecture Overview", slug: "docs/core/architecture" },
						{ label: "The Three Phases", slug: "docs/core/phases" },
						{ label: "IT-MAC Protocol", slug: "docs/core/it-mac" },
						{ label: "Zero-Knowledge Proofs", slug: "docs/core/zk-proofs" },
						{ label: "Fairness Metrics", slug: "docs/core/fairness-metrics" },
					],
				},

				{
					label: "Phase 1 - Certification",
					items: [
						{ label: "Overview", slug: "docs/phase1/overview" },
						{ label: "Training Your Model", slug: "docs/phase1/training" },
						{ label: "Computing Commitments", slug: "docs/phase1/commitments" },
						{
							label: "Generating Proofs",
							slug: "docs/phase1/generating-proofs",
						},
						{
							label: "On-Chain Registration",
							slug: "docs/phase1/on-chain-registration",
						},
						{ label: "IT-MAC Key Setup", slug: "docs/phase1/itmac-setup" },
					],
				},

				{
					label: "Phase 2 - Serving",
					items: [
						{ label: "Overview", slug: "docs/phase2/overview" },
						{ label: "Provider Setup", slug: "docs/phase2/provider-setup" },
						{
							label: "Query Authentication",
							slug: "docs/phase2/query-authentication",
						},
						{
							label: "Batch Commitments",
							slug: "docs/phase2/batch-commitments",
						},
						{
							label: "Client Integration",
							slug: "docs/phase2/client-integration",
						},
					],
				},

				{
					label: "Phase 3 - Auditing",
					items: [
						{ label: "Overview", slug: "docs/phase3/overview" },
						{
							label: "Becoming an Auditor",
							slug: "docs/phase3/becoming-an-auditor",
						},
						{ label: "Audit Triggers", slug: "docs/phase3/audit-triggers" },
						{ label: "Sampling Queries", slug: "docs/phase3/sampling-queries" },
						{
							label: "Generating Proofs",
							slug: "docs/phase3/generating-proofs",
						},
						{
							label: "Submitting Results",
							slug: "docs/phase3/submitting-results",
						},
					],
				},

				{
					label: "Smart Contracts",
					items: [
						{ label: "Model Registry", slug: "docs/contracts/model-registry" },
						{ label: "Auditor Pool", slug: "docs/contracts/auditor-pool" },
						{ label: "Query Batching", slug: "docs/contracts/query-batching" },
						{
							label: "Proof Verification",
							slug: "docs/contracts/proof-verification",
						},
						{ label: "Contract Events", slug: "docs/contracts/events" },
					],
				},

				{
					label: "ZK Circuits",
					items: [
						{ label: "Circuit 1: Training", slug: "docs/circuits/training" },
						{ label: "Circuit 2: Fairness Audit", slug: "docs/circuits/audit" },
						{
							label: "Input/Output Reference",
							slug: "docs/circuits/io-reference",
						},
						{
							label: "Circuit Optimization",
							slug: "docs/circuits/optimization",
						},
						{ label: "Testing Circuits", slug: "docs/circuits/testing" },
					],
				},

				{
					label: "SDK Reference",
					items: [
						{ label: "CommitAPI", slug: "docs/sdk/commitapi" },
						{ label: "ProofAPI", slug: "docs/sdk/proofapi" },
						{ label: "ContractClient", slug: "docs/sdk/contractclient" },
						{ label: "InferenceClient", slug: "docs/sdk/inferenceclient" },
						{ label: "QueriesAPI", slug: "docs/sdk/queriesapi" },
					],
				},

				{
					label: "IT-MAC Library",
					items: [
						{ label: "ProviderITMAC", slug: "docs/itmac/provider" },
						{ label: "ClientITMAC", slug: "docs/itmac/client" },
						{ label: "AuditorITMAC", slug: "docs/itmac/auditor" },
						{ label: "ITMACSetup", slug: "docs/itmac/setup" },
						{ label: "ThresholdScheme", slug: "docs/itmac/threshold" },
					],
				},

				{
					label: "CLI Reference",
					items: [
						{ label: "model:commit", slug: "docs/cli/model-commit" },
						{ label: "model:register", slug: "docs/cli/model-register" },
						{ label: "proof:training", slug: "docs/cli/proof-training" },
						{ label: "proof:audit", slug: "docs/cli/proof-audit" },
						{ label: "client:query", slug: "docs/cli/client-query" },
						{ label: "auditor:register", slug: "docs/cli/auditor-register" },
					],
				},

				{
					label: "Provider Guide",
					items: [
						{ label: "Setting Up Server", slug: "docs/provider-guide/setup" },
						{ label: "Loading Models", slug: "docs/provider-guide/loading" },
						{ label: "Event Listeners", slug: "docs/provider-guide/events" },
						{ label: "Deployment Options", slug: "docs/provider-guide/deploy" },
						{
							label: "Monitoring & Logs",
							slug: "docs/provider-guide/monitoring",
						},
					],
				},

				{
					label: "Client Guide",
					items: [
						{ label: "Querying Models", slug: "docs/client-guide/querying" },
						{ label: "Storing Proofs", slug: "docs/client-guide/storing" },
						{
							label: "Verifying Commitments",
							slug: "docs/client-guide/verifying",
						},
						{
							label: "Challenging Audits",
							slug: "docs/client-guide/challenging",
						},
					],
				},

				{
					label: "Auditor Guide",
					items: [
						{
							label: "Registration Process",
							slug: "docs/auditor-guide/registration",
						},
						{
							label: "Key Management",
							slug: "docs/auditor-guide/key-management",
						},
						{ label: "Running Audits", slug: "docs/auditor-guide/running" },
						{ label: "Earning Rewards", slug: "docs/auditor-guide/rewards" },
						{
							label: "Reputation System",
							slug: "docs/auditor-guide/reputation",
						},
					],
				},

				{
					label: "Examples",
					items: [
						{ label: "Adult Income Model", slug: "docs/examples/adult-income" },
						{
							label: "Credit Scoring Model",
							slug: "docs/examples/credit-scoring",
						},
						{
							label: "Loan Approval Model",
							slug: "docs/examples/loan-approval",
						},
						{
							label: "Custom Model Integration",
							slug: "docs/examples/custom-integration",
						},
					],
				},

				{
					label: "Advanced Topics",
					items: [
						{
							label: "Threshold Cryptography",
							slug: "docs/advanced/threshold-cryptography",
						},
						{ label: "Merkle Tree Construction", slug: "docs/advanced/merkle" },
						{ label: "VRF-based Sampling", slug: "docs/advanced/vrf-sampling" },
						{
							label: "Gas Optimization",
							slug: "docs/advanced/gas-optimization",
						},
						{ label: "Privacy Considerations", slug: "docs/advanced/privacy" },
					],
				},

				{
					label: "Deployment",
					items: [
						{ label: "Local Development", slug: "docs/deployment/local" },
						{ label: "Testnet Deployment", slug: "docs/deployment/testnet" },
						{ label: "Mainnet Deployment", slug: "docs/deployment/mainnet" },
						{ label: "Docker Setup", slug: "docs/deployment/docker" },
						{ label: "Railway/Fly.io", slug: "docs/deployment/railway-fly" },
					],
				},

				{
					label: "Troubleshooting",
					items: [
						{
							label: "Common Errors",
							slug: "docs/troubleshooting/common-errors",
						},
						{ label: "Debugging Tips", slug: "docs/troubleshooting/debugging" },
						{
							label: "Performance Issues",
							slug: "docs/troubleshooting/performance",
						},
						{ label: "FAQ", slug: "docs/troubleshooting/faq" },
					],
				},

				{
					label: "Research",
					items: [
						{ label: "OATH Paper Summary", slug: "docs/research/oath-summary" },
						{ label: "Related Work", slug: "docs/research/related-work" },
						{ label: "Future Directions", slug: "docs/research/future" },
						{ label: "Academic Resources", slug: "docs/research/resources" },
					],
				},

				{
					label: "Contributing",
					items: [
						{ label: "Development Setup", slug: "docs/contributing/setup" },
						{ label: "Code Style Guide", slug: "docs/contributing/style" },
						{ label: "Pull Request Process", slug: "docs/contributing/pr" },
						{
							label: "Testing Requirements",
							slug: "docs/contributing/testing",
						},
					],
				},

				{
					label: "Appendix",
					items: [
						{ label: "Glossary", slug: "docs/appendix/glossary" },
						{ label: "API Reference Tables", slug: "docs/appendix/api-tables" },
						{ label: "Gas Cost Tables", slug: "docs/appendix/gas" },
						{ label: "Benchmark Results", slug: "docs/appendix/benchmarks" },
					],
				},
			],
		}),
	],
});
