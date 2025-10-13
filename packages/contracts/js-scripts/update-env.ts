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

	try {
		await Bun.file(artifactPath).exists();
	} catch {
		console.error("❌ Deployment artifact not found at:", artifactPath);
		console.error(`Run deployment first: bun run deploy-${network}`);
		process.exit(1);
	}

	const artifact = JSON.parse(await Bun.file(artifactPath).text());

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
}

async function updateConfigFile(
	filePath: string,
	network: string,
	address: string,
): Promise<void> {
	if (!(await Bun.file(filePath).exists())) {
		console.error("Config file not found at:", filePath);
		process.exit(1);
	}

	let content = await Bun.file(filePath).text();

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

	await Bun.write(filePath, content);
	console.log(`✅ Updated ${filePath} (${configKey}.contractAddress)`);
}

async function updateEnvFile(
	filePath: string,
	key: string,
	value: string,
): Promise<void> {
	let envContent = "";
	if (await Bun.file(filePath).exists()) {
		envContent = await Bun.file(filePath).text();
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

	await Bun.write(filePath, envContent);
	console.log(`✅ Updated ${filePath} (${key})`);
}

main().catch((err) => {
	console.error("❌ Error during sync:", err);
	process.exit(1);
});
