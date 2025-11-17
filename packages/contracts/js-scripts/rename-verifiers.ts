import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const trainingPath = resolve(import.meta.dir, "../src/TrainingVerifier.sol");
const fairnessPath = resolve(import.meta.dir, "../src/FairnessVerifier.sol");

console.log("Renaming verifier contracts...");

let trainingContent = readFileSync(trainingPath, "utf-8");
trainingContent = trainingContent
	.replace(/interface IVerifier/g, "interface ITrainingVerifier")
	.replace(/contract HonkVerifier/g, "contract TrainingVerifier")
	.replace(/BaseHonkVerifier/g, "BaseTrainingVerifier")
	.replace(
		/abstract contract BaseZKHonkVerifier/g,
		"abstract contract BaseTrainingVerifier",
	)
	.replace(/is BaseZKHonkVerifier/g, "is BaseTrainingVerifier")
	.replace(/is IVerifier/g, "is ITrainingVerifier")
	// Rename all internal libraries to avoid conflicts
	.replace(/library ZKTranscriptLib/g, "library TrainingTranscriptLib")
	.replace(/ZKTranscriptLib\./g, "TrainingTranscriptLib.")
	.replace(/using ZKTranscriptLib/g, "using TrainingTranscriptLib")
	.replace(/library EcdsaLib/g, "library TrainingEcdsaLib")
	.replace(/EcdsaLib\./g, "TrainingEcdsaLib.")
	.replace(/using EcdsaLib/g, "using TrainingEcdsaLib")
	.replace(/library FrLib/g, "library TrainingFrLib")
	.replace(/FrLib\./g, "TrainingFrLib.")
	.replace(/using FrLib/g, "using TrainingFrLib")
	.replace(/library HonkLib/g, "library TrainingHonkLib")
	.replace(/HonkLib\./g, "TrainingHonkLib.")
	.replace(/using HonkLib/g, "using TrainingHonkLib")
	.replace(/library Honk/g, "library TrainingHonk")
	.replace(/(?<!TrainingHonk)Honk\./g, "TrainingHonk.")
	.replace(
		/library CommitmentSchemeLib/g,
		"library TrainingCommitmentSchemeLib",
	)
	.replace(/CommitmentSchemeLib\./g, "TrainingCommitmentSchemeLib.")
	.replace(/using CommitmentSchemeLib/g, "using TrainingCommitmentSchemeLib")
	// Fix HonkVerificationKey references (library name already changed by library Honk replacement)
	.replace(/\bHonkVerificationKey\./g, "TrainingHonkVerificationKey.");
writeFileSync(trainingPath, trainingContent);
console.log("Renamed HonkVerifier to TrainingVerifier");

let fairnessContent = readFileSync(fairnessPath, "utf-8");
fairnessContent = fairnessContent
	.replace(/interface IVerifier/g, "interface IFairnessVerifier")
	.replace(/contract HonkVerifier/g, "contract FairnessVerifier")
	.replace(/BaseHonkVerifier/g, "BaseFairnessVerifier")
	.replace(
		/abstract contract BaseZKHonkVerifier/g,
		"abstract contract BaseFairnessVerifier",
	)
	.replace(/is BaseZKHonkVerifier/g, "is BaseFairnessVerifier")
	.replace(/is IVerifier/g, "is IFairnessVerifier")
	// Rename all internal libraries to avoid conflicts
	.replace(/library ZKTranscriptLib/g, "library FairnessTranscriptLib")
	.replace(/ZKTranscriptLib\./g, "FairnessTranscriptLib.")
	.replace(/using ZKTranscriptLib/g, "using FairnessTranscriptLib")
	.replace(/library EcdsaLib/g, "library FairnessEcdsaLib")
	.replace(/EcdsaLib\./g, "FairnessEcdsaLib.")
	.replace(/using EcdsaLib/g, "using FairnessEcdsaLib")
	.replace(/library FrLib/g, "library FairnessFrLib")
	.replace(/FrLib\./g, "FairnessFrLib.")
	.replace(/using FrLib/g, "using FairnessFrLib")
	.replace(/library HonkLib/g, "library FairnessHonkLib")
	.replace(/HonkLib\./g, "FairnessHonkLib.")
	.replace(/using HonkLib/g, "using FairnessHonkLib")
	.replace(/library Honk/g, "library FairnessHonk")
	.replace(/(?<!FairnessHonk)Honk\./g, "FairnessHonk.")
	.replace(
		/library CommitmentSchemeLib/g,
		"library FairnessCommitmentSchemeLib",
	)
	.replace(/CommitmentSchemeLib\./g, "FairnessCommitmentSchemeLib.")
	.replace(/using CommitmentSchemeLib/g, "using FairnessCommitmentSchemeLib")
	// Fix HonkVerificationKey references (library name already changed by library Honk replacement)
	.replace(/\bHonkVerificationKey\./g, "FairnessHonkVerificationKey.");
writeFileSync(fairnessPath, fairnessContent);
console.log("Renamed HonkVerifier to FairnessVerifier");
