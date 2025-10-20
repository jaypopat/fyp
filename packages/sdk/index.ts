import type { Hex } from "viem";
import { CommitAPI } from "./commit";
import { ContractClient } from "./contract";
import { EventsAPI } from "./events";
import { InferenceClient } from "./inference";
import { ModelAPI } from "./model";
import { ProofAPI } from "./proof";
import { QueriesAPI } from "./queries";
import type { ZkFairOptions } from "./types";
import { VerifyAPI } from "./verify";

export class SDK {
	public model: ModelAPI;
	private contracts: ContractClient;
	public proof: ProofAPI;
	public commit: CommitAPI;
	public verify: VerifyAPI;
	public queries: QueriesAPI;
	public events: EventsAPI;
	public inference: InferenceClient | undefined;

	constructor(options: ZkFairOptions) {
		this.contracts = new ContractClient(options);

		this.model = new ModelAPI(this.contracts);
		this.proof = new ProofAPI(this.contracts);
		this.commit = new CommitAPI(this.contracts);
		this.verify = new VerifyAPI(this.contracts);
		this.queries = new QueriesAPI(this.contracts);
		this.events = new EventsAPI(this.contracts);
	}

	// Helper to set up inference client with provider keys
	useInference(providerPubKey: Hex, macKey?: Hex) {
		this.inference = new InferenceClient(providerPubKey, macKey);
		return this.inference;
	}
}
