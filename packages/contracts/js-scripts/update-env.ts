import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Read the Foundry deployment artifact
const artifactPath = join(
	import.meta.dir,
	"../broadcast/DeployAndSeed.s.sol/31337/run-latest.json",
);

if (!existsSync(artifactPath)) {
	console.error("❌ Deployment artifact not found at:", artifactPath);
	console.error("Run deployment first: bun run deploy:local");
	process.exit(1);
}

const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

// Find ZKFair contract deployment
const zkfairDeployment = artifact.transactions.find(
	// biome-ignore lint/suspicious/noExplicitAny: <no need for type safety here>
	(tx: any) => tx.transactionType === "CREATE" && tx.contractName === "ZKFair",
);

if (!zkfairDeployment) {
	console.error("❌ ZKFair deployment not found in artifact");
	process.exit(1);
}

const contractAddress = zkfairDeployment.contractAddress;
console.log("✅ Found ZKFair contract at:", contractAddress);

// Update CLI .env
const cliEnvPath = join(import.meta.dir, "../../../apps/cli/.env");
updateEnvFile(cliEnvPath, "CONTRACT_ADDRESS", contractAddress);

// Update Web .env
const webEnvPath = join(import.meta.dir, "../../../apps/web/.env.local");
updateEnvFile(webEnvPath, "VITE_CONTRACT_ADDRESS", contractAddress);

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
	console.log(`✅ Updated ${filePath}`);
}

console.log("\n🎉 Contract address synced successfully!");
