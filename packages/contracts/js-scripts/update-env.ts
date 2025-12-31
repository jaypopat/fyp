import { join } from "path";

async function main() {
	// Determine which network to sync (default to local/anvil)
	const network = process.argv[2] || "local";
	const chainId = network === "sepolia" ? "11155111" : "31337";

	console.log(` Syncing ${network} deployment...`);

	// Read the Foundry deployment artifact
	const artifactPath = join(
		import.meta.dir,
		`../broadcast/DeployAndSeed.s.sol/${chainId}/run-latest.json`,
	);

	try {
		await Bun.file(artifactPath).exists();
	} catch {
		console.error(" Deployment artifact not found at:", artifactPath);
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
		console.error(" ZKFair deployment not found in artifact");
		process.exit(1);
	}

	const contractAddress = zkfairDeployment.contractAddress;
	console.log(" Found ZKFair contract at:", contractAddress);

	// Update SDK config.ts (centralised config)
	const sdkConfigPath = join(
		import.meta.dir,
		"../../../packages/sdk/config.ts",
	);
	updateConfigFile(sdkConfigPath, network, contractAddress);
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
			` Could not find ${configKey}.contractAddress in config file`,
		);
		process.exit(1);
	}

	content = content.replace(addressRegex, `$1"${address}"`);

	await Bun.write(filePath, content);
	console.log(` Updated ${filePath} (${configKey}.contractAddress)`);
}

main().catch((err) => {
	console.error(" Error during sync:", err);
	process.exit(1);
});
