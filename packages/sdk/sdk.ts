import { AuditAPI } from "./audit";
import { BatchAPI } from "./batch";
import { CommitAPI } from "./commit";
import { ContractClient } from "./contract";
import { EventsAPI } from "./events";
import { ModelAPI } from "./model";
import { ProofAPI } from "./proof";
import type { ZkFairOptions } from "./types";

const DEFAULT_ATTESTATION_URL =
	process.env.ATTESTATION_SERVICE_URL || "http://localhost:3000";

export class SDK {
	// internal
	private contracts: ContractClient;

	public model: ModelAPI;
	public batch: BatchAPI;
	public proof: ProofAPI;
	public commit: CommitAPI;
	public events: EventsAPI;
	public audit: AuditAPI;

	constructor(options: ZkFairOptions) {
		this.contracts = new ContractClient(options);

		this.model = new ModelAPI(this.contracts);
		this.batch = new BatchAPI(this.contracts);
		this.proof = new ProofAPI(this.contracts, DEFAULT_ATTESTATION_URL);
		this.commit = new CommitAPI(this.contracts);
		this.events = new EventsAPI(this.contracts);
		this.audit = new AuditAPI(this.contracts, DEFAULT_ATTESTATION_URL);
	}
}
