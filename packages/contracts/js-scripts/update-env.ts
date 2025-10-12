import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

async function main() {
	// Determine which network to sync (default to local/anvil)
	const network = process.argv[2] || "local";
	const chainId = network === "sepolia" ? "11155111" : "31337";

	console.log(`🔄 Syncing ${network} deployment...`);

	// Read the Foundry deployment artifact
	const artifactPath = join(
		import.meta.dir,
		`../broadcast/DeployAndSeed.s.sol/${chainId}/run-latest.json`,
	);

	if (!existsSync(artifactPath)) {
		console.error("❌ Deployment artifact not found at:", artifactPath);
		console.error(`Run deployment first: bun run deploy-${network}`);
		process.exit(1);
	}

	const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

	// Find ZKFair contract deployment
	const zkfairDeployment = artifact.transactions.find(
		// biome-ignore lint/suspicious/noExplicitAny: <no need for type safety here>
		(tx: any) =>
			tx.transactionType === "CREATE" && tx.contractName === "ZKFair",
	);

	if (!zkfairDeployment) {
		console.error("❌ ZKFair deployment not found in artifact");
		process.exit(1);
	}

	const contractAddress = zkfairDeployment.contractAddress;
	console.log("✅ Found ZKFair contract at:", contractAddress);

	// Update web config.ts
	const webConfigPath = join(
		import.meta.dir,
		"../../../apps/web/src/config.ts",
	);
	updateConfigFile(webConfigPath, network, contractAddress);

	// Update CLI .env
	const cliEnvPath = join(import.meta.dir, "../../../apps/cli/.env");
	const cliKey =
		network === "sepolia" ? "ONCHAIN_CONTRACT_ADDRESS" : "CONTRACT_ADDRESS";
	updateEnvFile(cliEnvPath, cliKey, contractAddress);

	console.log(`\n🎉 ${network} contract address synced successfully!`);
	console.log(`   Contract: ${contractAddress}`);

	if (network === "sepolia") {
		console.log("\n📦 Next steps:");
		console.log("   1. Commit the updated config.ts to git");
		console.log(
			"   2. Vercel will automatically use the new contract address\n",
		);
	}
}

function updateConfigFile(
	filePath: string,
	network: string,
	address: string,
): void {
	if (!existsSync(filePath)) {
		console.error("❌ Config file not found at:", filePath);
		process.exit(1);
	}

	let content = readFileSync(filePath, "utf-8");

	// Update the appropriate network configuration
	const configKey = network === "sepolia" ? "sepolia" : "local";
	const addressRegex = new RegExp(
		`(${configKey}:\\s*{[^}]*contractAddress:\\s*)"0x[a-fA-F0-9]+"`,
		"s",
	);

	if (!addressRegex.test(content)) {
		console.error(
			`❌ Could not find ${configKey}.contractAddress in config file`,
		);
		process.exit(1);
	}

	content = content.replace(addressRegex, `$1"${address}"`);

	writeFileSync(filePath, content);
	console.log(`✅ Updated ${filePath} (${configKey}.contractAddress)`);
}

function updateEnvFile(filePath: string, key: string, value: string): void {
	let envContent = "";

	// Read existing content if file exists
	if (existsSync(filePath)) {
		envContent = readFileSync(filePath, "utf-8");
	}

	const envLine = `${key}=${value}`;
	const regex = new RegExp(`^${key}=.*`, "m");

	if (regex.test(envContent)) {
		// Update existing line
		envContent = envContent.replace(regex, envLine);
	} else {
		// Append new line
		envContent += envContent.endsWith("\n") ? "" : "\n";
		envContent += `${envLine}\n`;
	}

	writeFileSync(filePath, envContent);
	console.log(`✅ Updated ${filePath} (${key})`);
}

main().catch((err) => {
	console.error("❌ Error during sync:", err);
	process.exit(1);
});
