import { ContractClient } from "./client";
import { CommitAPI } from "./commit";
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

	constructor(options?: ZkFairOptions) {
		this.contracts = new ContractClient(options);

		this.model = new ModelAPI(this.contracts);
		this.proof = new ProofAPI(this.contracts);
		this.commit = new CommitAPI(this.contracts);
		this.verify = new VerifyAPI(this.contracts);
		this.queries = new QueriesAPI(this.contracts);
	}
}
