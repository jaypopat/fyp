import { AuditAPI } from "./audit";
import { BatchAPI } from "./batch";
import { CommitAPI } from "./commit";
import { setGlobalConfig } from "./config";
import { ContractClient } from "./contract";
import { EventsAPI } from "./events";
import { ModelAPI } from "./model";
import { ProofAPI } from "./proof";
import type { ZkFairOptions } from "./types";

export class SDK {
	// internal
	private contracts: ContractClient;

	public model: ModelAPI;
	public batch: BatchAPI;
	public proof: ProofAPI;
	public commit: CommitAPI;
	public events: EventsAPI;
	public audit: AuditAPI;

	constructor(options: ZkFairOptions = {}) {
		if (options.environment) {
			// manual override for dev purposes
			setGlobalConfig(options.environment);
		}
		this.contracts = new ContractClient(options);

		this.model = new ModelAPI(this.contracts);
		this.batch = new BatchAPI(this.contracts);
		this.proof = new ProofAPI(this.contracts);
		this.commit = new CommitAPI(this.contracts);
		this.events = new EventsAPI(this.contracts);
		this.audit = new AuditAPI(this.contracts);
	}
}
