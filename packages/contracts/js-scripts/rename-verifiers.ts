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
	.replace(/is IVerifier/g, "is ITrainingVerifier");
writeFileSync(trainingPath, trainingContent);
console.log("Renamed HonkVerifier to TrainingVerifier");

let fairnessContent = readFileSync(fairnessPath, "utf-8");
fairnessContent = fairnessContent
	.replace(/interface IVerifier/g, "interface IFairnessVerifier")
	.replace(/contract HonkVerifier/g, "contract FairnessVerifier")
	.replace(/BaseHonkVerifier/g, "BaseFairnessVerifier")
	.replace(/is IVerifier/g, "is IFairnessVerifier");
writeFileSync(fairnessPath, fairnessContent);
console.log("Renamed HonkVerifier to FairnessVerifier");
