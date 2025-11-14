import { join } from "node:path";

// Config
const MAX_DATASET_SIZE = 1200;
const NUM_FEATURES = 14;
const NUM_WEIGHTS = 14;

const __dirname = new URL(".", import.meta.url).pathname;
const TRAINING_PROVER_TOML_PATH = join(__dirname, "../training/Prover.toml");
const FAIRNESS_AUDIT_PROVER_TOML_PATH = join(
	__dirname,
	"../fairness_audit/Prover.toml",
);

const CALIBRATION_CSV_PATH = join(
	__dirname,
	"../../../examples/adult-income/calibration_dataset.csv",
);
const FAIRNESS_THRESHOLD_PATH = join(
	__dirname,
	"../../../examples/adult-income/fairness_threshold.json",
);
const WEIGHTS_BIN_PATH = join(
	__dirname,
	"../../../examples/adult-income/weights.bin",
);

function main() {}
main();
