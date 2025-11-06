import { AuditAPI } from "./audit";
import { BatchAPI } from "./batch";
import { CommitAPI } from "./commit";
import { ContractClient } from "./contract";
import { EventsAPI } from "./events";
import type { InferenceClient } from "./inference";
import { ModelAPI } from "./model";
import { ProofAPI } from "./proof";
import type { ZkFairOptions } from "./types";
import { VerifyAPI } from "./verify";

export class SDK {
	public model: ModelAPI;
	public batch: BatchAPI;
	private contracts: ContractClient;
	public proof: ProofAPI;
	public commit: CommitAPI;
	public verify: VerifyAPI;
	public events: EventsAPI;
	public audit: AuditAPI;
	public inference: InferenceClient | undefined;

	constructor(options: ZkFairOptions) {
		this.contracts = new ContractClient(options);

		this.model = new ModelAPI(this.contracts);
		this.batch = new BatchAPI(this.contracts);
		this.proof = new ProofAPI(this.contracts);
		this.commit = new CommitAPI(this.contracts);
		this.verify = new VerifyAPI(this.contracts);
		this.events = new EventsAPI(this.contracts);
		this.audit = new AuditAPI(this.contracts);
	}
}
