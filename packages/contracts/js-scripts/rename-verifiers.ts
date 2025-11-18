import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function renameVerifier(path: string, contractName: string, prefix: string) {
	if (!existsSync(path)) {
		console.log(`Verifier file not found: ${path}`);
		return;
	}
	let content = readFileSync(path, "utf-8");

	// Only rename if original Honk contract is present
	if (content.includes("contract HonkVerifier")) {
		console.log(`Renaming ${contractName}.sol...`);

		content = content
			// Interfaces
			.replace(/interface IVerifier/g, `interface I${prefix}Verifier`)
			// Main contract
			.replace(/contract HonkVerifier/g, `contract ${prefix}Verifier`)
			// Abstract base contract
			.replace(
				/abstract contract BaseZKHonkVerifier/g,
				`abstract contract Base${prefix}Verifier`,
			)
			// Base contract
			.replace(/BaseHonkVerifier/g, `Base${prefix}Verifier`)
			// Contract parent
			.replace(/is BaseZKHonkVerifier/g, `is Base${prefix}Verifier`)
			.replace(/is IVerifier/g, `is I${prefix}Verifier`)
			// Libraries
			.replace(/library ZKTranscriptLib/g, `library ${prefix}TranscriptLib`)
			.replace(/ZKTranscriptLib\./g, `${prefix}TranscriptLib.`)
			.replace(/using ZKTranscriptLib/g, `using ${prefix}TranscriptLib`)
			.replace(/library EcdsaLib/g, `library ${prefix}EcdsaLib`)
			.replace(/EcdsaLib\./g, `${prefix}EcdsaLib.`)
			.replace(/using EcdsaLib/g, `using ${prefix}EcdsaLib`)
			.replace(/library FrLib/g, `library ${prefix}FrLib`)
			.replace(/FrLib\./g, `${prefix}FrLib.`)
			.replace(/using FrLib/g, `using ${prefix}FrLib`)
			.replace(/library HonkLib/g, `library ${prefix}HonkLib`)
			.replace(/HonkLib\./g, `${prefix}HonkLib.`)
			.replace(/using HonkLib/g, `using ${prefix}HonkLib`)
			.replace(/library Honk\b/g, `library ${prefix}Honk`)
			// Only replace "Honk." where not already prefixed
			.replace(/(?<!${prefix})Honk\./g, `${prefix}Honk.`)
			.replace(/(?<!${prefix})Honk::/g, `${prefix}Honk::`)
			.replace(
				/library CommitmentSchemeLib/g,
				`library ${prefix}CommitmentSchemeLib`,
			)
			.replace(/CommitmentSchemeLib\./g, `${prefix}CommitmentSchemeLib.`)
			.replace(
				/using CommitmentSchemeLib/g,
				`using ${prefix}CommitmentSchemeLib`,
			)
			// VerificationKey (for HonkVerificationKey usage)
			.replace(/\bHonkVerificationKey\./g, `${prefix}HonkVerificationKey.`)
			.replace(
				/library HonkVerificationKey/g,
				`library ${prefix}HonkVerificationKey`,
			)
			.replace(/\bHonkVerificationKey\./g, `${prefix}HonkVerificationKey.`);

		writeFileSync(path, content);
		console.log(`Renamed HonkVerifier to ${prefix}Verifier`);
	} else {
		console.log(`${contractName}.sol already renamed, skipping.`);
	}
}

const trainingPath = resolve(import.meta.dir, "../src/TrainingVerifier.sol");
const fairnessPath = resolve(import.meta.dir, "../src/FairnessVerifier.sol");

// Run renamer for each contract
renameVerifier(trainingPath, "TrainingVerifier", "Training");
renameVerifier(fairnessPath, "FairnessVerifier", "Fairness");
