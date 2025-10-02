//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// BaseHonkVerifier
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const baseHonkVerifierAbi = [
	{
		type: "function",
		inputs: [
			{ name: "proof", internalType: "bytes", type: "bytes" },
			{ name: "publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
		],
		name: "verify",
		outputs: [{ name: "", internalType: "bool", type: "bool" }],
		stateMutability: "view",
	},
	{ type: "error", inputs: [], name: "ProofLengthWrong" },
	{ type: "error", inputs: [], name: "PublicInputsLengthWrong" },
	{ type: "error", inputs: [], name: "ShpleminiFailed" },
	{ type: "error", inputs: [], name: "SumcheckFailed" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Counter
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const counterAbi = [
	{
		type: "function",
		inputs: [],
		name: "increment",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [],
		name: "number",
		outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "newNumber", internalType: "uint256", type: "uint256" }],
		name: "setNumber",
		outputs: [],
		stateMutability: "nonpayable",
	},
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DeployScript
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const deployScriptAbi = [
	{
		type: "function",
		inputs: [],
		name: "IS_SCRIPT",
		outputs: [{ name: "", internalType: "bool", type: "bool" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "run",
		outputs: [],
		stateMutability: "nonpayable",
	},
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// HonkVerifier
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const honkVerifierAbi = [
	{
		type: "function",
		inputs: [
			{ name: "proof", internalType: "bytes", type: "bytes" },
			{ name: "publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
		],
		name: "verify",
		outputs: [{ name: "", internalType: "bool", type: "bool" }],
		stateMutability: "view",
	},
	{ type: "error", inputs: [], name: "ProofLengthWrong" },
	{ type: "error", inputs: [], name: "PublicInputsLengthWrong" },
	{ type: "error", inputs: [], name: "ShpleminiFailed" },
	{ type: "error", inputs: [], name: "SumcheckFailed" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IMulticall3
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iMulticall3Abi = [
	{
		type: "function",
		inputs: [
			{
				name: "calls",
				internalType: "struct IMulticall3.Call[]",
				type: "tuple[]",
				components: [
					{ name: "target", internalType: "address", type: "address" },
					{ name: "callData", internalType: "bytes", type: "bytes" },
				],
			},
		],
		name: "aggregate",
		outputs: [
			{ name: "blockNumber", internalType: "uint256", type: "uint256" },
			{ name: "returnData", internalType: "bytes[]", type: "bytes[]" },
		],
		stateMutability: "payable",
	},
	{
		type: "function",
		inputs: [
			{
				name: "calls",
				internalType: "struct IMulticall3.Call3[]",
				type: "tuple[]",
				components: [
					{ name: "target", internalType: "address", type: "address" },
					{ name: "allowFailure", internalType: "bool", type: "bool" },
					{ name: "callData", internalType: "bytes", type: "bytes" },
				],
			},
		],
		name: "aggregate3",
		outputs: [
			{
				name: "returnData",
				internalType: "struct IMulticall3.Result[]",
				type: "tuple[]",
				components: [
					{ name: "success", internalType: "bool", type: "bool" },
					{ name: "returnData", internalType: "bytes", type: "bytes" },
				],
			},
		],
		stateMutability: "payable",
	},
	{
		type: "function",
		inputs: [
			{
				name: "calls",
				internalType: "struct IMulticall3.Call3Value[]",
				type: "tuple[]",
				components: [
					{ name: "target", internalType: "address", type: "address" },
					{ name: "allowFailure", internalType: "bool", type: "bool" },
					{ name: "value", internalType: "uint256", type: "uint256" },
					{ name: "callData", internalType: "bytes", type: "bytes" },
				],
			},
		],
		name: "aggregate3Value",
		outputs: [
			{
				name: "returnData",
				internalType: "struct IMulticall3.Result[]",
				type: "tuple[]",
				components: [
					{ name: "success", internalType: "bool", type: "bool" },
					{ name: "returnData", internalType: "bytes", type: "bytes" },
				],
			},
		],
		stateMutability: "payable",
	},
	{
		type: "function",
		inputs: [
			{
				name: "calls",
				internalType: "struct IMulticall3.Call[]",
				type: "tuple[]",
				components: [
					{ name: "target", internalType: "address", type: "address" },
					{ name: "callData", internalType: "bytes", type: "bytes" },
				],
			},
		],
		name: "blockAndAggregate",
		outputs: [
			{ name: "blockNumber", internalType: "uint256", type: "uint256" },
			{ name: "blockHash", internalType: "bytes32", type: "bytes32" },
			{
				name: "returnData",
				internalType: "struct IMulticall3.Result[]",
				type: "tuple[]",
				components: [
					{ name: "success", internalType: "bool", type: "bool" },
					{ name: "returnData", internalType: "bytes", type: "bytes" },
				],
			},
		],
		stateMutability: "payable",
	},
	{
		type: "function",
		inputs: [],
		name: "getBasefee",
		outputs: [{ name: "basefee", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "blockNumber", internalType: "uint256", type: "uint256" }],
		name: "getBlockHash",
		outputs: [{ name: "blockHash", internalType: "bytes32", type: "bytes32" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "getBlockNumber",
		outputs: [
			{ name: "blockNumber", internalType: "uint256", type: "uint256" },
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "getChainId",
		outputs: [{ name: "chainid", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "getCurrentBlockCoinbase",
		outputs: [{ name: "coinbase", internalType: "address", type: "address" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "getCurrentBlockDifficulty",
		outputs: [{ name: "difficulty", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "getCurrentBlockGasLimit",
		outputs: [{ name: "gaslimit", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "getCurrentBlockTimestamp",
		outputs: [{ name: "timestamp", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "addr", internalType: "address", type: "address" }],
		name: "getEthBalance",
		outputs: [{ name: "balance", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "getLastBlockHash",
		outputs: [{ name: "blockHash", internalType: "bytes32", type: "bytes32" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [
			{ name: "requireSuccess", internalType: "bool", type: "bool" },
			{
				name: "calls",
				internalType: "struct IMulticall3.Call[]",
				type: "tuple[]",
				components: [
					{ name: "target", internalType: "address", type: "address" },
					{ name: "callData", internalType: "bytes", type: "bytes" },
				],
			},
		],
		name: "tryAggregate",
		outputs: [
			{
				name: "returnData",
				internalType: "struct IMulticall3.Result[]",
				type: "tuple[]",
				components: [
					{ name: "success", internalType: "bool", type: "bool" },
					{ name: "returnData", internalType: "bytes", type: "bytes" },
				],
			},
		],
		stateMutability: "payable",
	},
	{
		type: "function",
		inputs: [
			{ name: "requireSuccess", internalType: "bool", type: "bool" },
			{
				name: "calls",
				internalType: "struct IMulticall3.Call[]",
				type: "tuple[]",
				components: [
					{ name: "target", internalType: "address", type: "address" },
					{ name: "callData", internalType: "bytes", type: "bytes" },
				],
			},
		],
		name: "tryBlockAndAggregate",
		outputs: [
			{ name: "blockNumber", internalType: "uint256", type: "uint256" },
			{ name: "blockHash", internalType: "bytes32", type: "bytes32" },
			{
				name: "returnData",
				internalType: "struct IMulticall3.Result[]",
				type: "tuple[]",
				components: [
					{ name: "success", internalType: "bool", type: "bool" },
					{ name: "returnData", internalType: "bytes", type: "bytes" },
				],
			},
		],
		stateMutability: "payable",
	},
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IVerifier
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iVerifierAbi = [
	{
		type: "function",
		inputs: [
			{ name: "_proof", internalType: "bytes", type: "bytes" },
			{ name: "_publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
		],
		name: "verify",
		outputs: [{ name: "", internalType: "bool", type: "bool" }],
		stateMutability: "view",
	},
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MockVerifier
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const mockVerifierAbi = [
	{
		type: "constructor",
		inputs: [{ name: "_result", internalType: "bool", type: "bool" }],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [],
		name: "result",
		outputs: [{ name: "", internalType: "bool", type: "bool" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "_result", internalType: "bool", type: "bool" }],
		name: "setResult",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [
			{ name: "", internalType: "bytes", type: "bytes" },
			{ name: "", internalType: "bytes32[]", type: "bytes32[]" },
		],
		name: "verify",
		outputs: [{ name: "", internalType: "bool", type: "bool" }],
		stateMutability: "view",
	},
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Ownable
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const ownableAbi = [
	{
		type: "function",
		inputs: [],
		name: "owner",
		outputs: [{ name: "", internalType: "address", type: "address" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "renounceOwnership",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [{ name: "newOwner", internalType: "address", type: "address" }],
		name: "transferOwnership",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "previousOwner",
				internalType: "address",
				type: "address",
				indexed: true,
			},
			{
				name: "newOwner",
				internalType: "address",
				type: "address",
				indexed: true,
			},
		],
		name: "OwnershipTransferred",
	},
	{
		type: "error",
		inputs: [{ name: "owner", internalType: "address", type: "address" }],
		name: "OwnableInvalidOwner",
	},
	{
		type: "error",
		inputs: [{ name: "account", internalType: "address", type: "address" }],
		name: "OwnableUnauthorizedAccount",
	},
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ZKFair
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const zkFairAbi = [
	{
		type: "constructor",
		inputs: [
			{
				name: "_verifier",
				internalType: "contract IVerifier",
				type: "address",
			},
		],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [],
		name: "getAllModels",
		outputs: [
			{
				name: "models",
				internalType: "struct ZKFair.Model[]",
				type: "tuple[]",
				components: [
					{ name: "name", internalType: "string", type: "string" },
					{ name: "author", internalType: "address", type: "address" },
					{ name: "description", internalType: "string", type: "string" },
					{
						name: "datasetMerkleRoot",
						internalType: "bytes32",
						type: "bytes32",
					},
					{ name: "weightsHash", internalType: "bytes32", type: "bytes32" },
					{
						name: "status",
						internalType: "enum ZKFair.ModelStatus",
						type: "uint8",
					},
					{
						name: "registrationTimestamp",
						internalType: "uint256",
						type: "uint256",
					},
					{
						name: "verificationTimestamp",
						internalType: "uint256",
						type: "uint256",
					},
					{ name: "proofHash", internalType: "bytes32", type: "bytes32" },
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "modelId", internalType: "uint256", type: "uint256" }],
		name: "getModel",
		outputs: [
			{
				name: "model",
				internalType: "struct ZKFair.Model",
				type: "tuple",
				components: [
					{ name: "name", internalType: "string", type: "string" },
					{ name: "author", internalType: "address", type: "address" },
					{ name: "description", internalType: "string", type: "string" },
					{
						name: "datasetMerkleRoot",
						internalType: "bytes32",
						type: "bytes32",
					},
					{ name: "weightsHash", internalType: "bytes32", type: "bytes32" },
					{
						name: "status",
						internalType: "enum ZKFair.ModelStatus",
						type: "uint8",
					},
					{
						name: "registrationTimestamp",
						internalType: "uint256",
						type: "uint256",
					},
					{
						name: "verificationTimestamp",
						internalType: "uint256",
						type: "uint256",
					},
					{ name: "proofHash", internalType: "bytes32", type: "bytes32" },
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "weightsHash", internalType: "bytes32", type: "bytes32" }],
		name: "getModelByHash",
		outputs: [
			{
				name: "model",
				internalType: "struct ZKFair.Model",
				type: "tuple",
				components: [
					{ name: "name", internalType: "string", type: "string" },
					{ name: "author", internalType: "address", type: "address" },
					{ name: "description", internalType: "string", type: "string" },
					{
						name: "datasetMerkleRoot",
						internalType: "bytes32",
						type: "bytes32",
					},
					{ name: "weightsHash", internalType: "bytes32", type: "bytes32" },
					{
						name: "status",
						internalType: "enum ZKFair.ModelStatus",
						type: "uint8",
					},
					{
						name: "registrationTimestamp",
						internalType: "uint256",
						type: "uint256",
					},
					{
						name: "verificationTimestamp",
						internalType: "uint256",
						type: "uint256",
					},
					{ name: "proofHash", internalType: "bytes32", type: "bytes32" },
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "author", internalType: "address", type: "address" }],
		name: "getModelsByAuthor",
		outputs: [{ name: "", internalType: "uint256[]", type: "uint256[]" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "weightsHash", internalType: "bytes32", type: "bytes32" }],
		name: "getProofStatusByWeightsHash",
		outputs: [
			{
				name: "status",
				internalType: "enum ZKFair.ModelStatus",
				type: "uint8",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "getTotalModels",
		outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "owner",
		outputs: [{ name: "", internalType: "address", type: "address" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [
			{ name: "name", internalType: "string", type: "string" },
			{ name: "description", internalType: "string", type: "string" },
			{ name: "datasetMerkleRoot", internalType: "bytes32", type: "bytes32" },
			{ name: "weightsHash", internalType: "bytes32", type: "bytes32" },
		],
		name: "registerModel",
		outputs: [{ name: "modelId", internalType: "uint256", type: "uint256" }],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [],
		name: "renounceOwnership",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [],
		name: "s_verifier",
		outputs: [
			{ name: "", internalType: "contract IVerifier", type: "address" },
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [
			{
				name: "newVerifier",
				internalType: "contract IVerifier",
				type: "address",
			},
		],
		name: "setVerifier",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [{ name: "newOwner", internalType: "address", type: "address" }],
		name: "transferOwnership",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [
			{ name: "weightsHash", internalType: "bytes32", type: "bytes32" },
			{ name: "proof", internalType: "bytes", type: "bytes" },
			{ name: "publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
		],
		name: "verifyModel",
		outputs: [{ name: "", internalType: "bool", type: "bool" }],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "modelId",
				internalType: "uint256",
				type: "uint256",
				indexed: true,
			},
			{
				name: "author",
				internalType: "address",
				type: "address",
				indexed: true,
			},
			{ name: "name", internalType: "string", type: "string", indexed: false },
			{
				name: "datasetMerkleRoot",
				internalType: "bytes32",
				type: "bytes32",
				indexed: false,
			},
			{
				name: "weightsHash",
				internalType: "bytes32",
				type: "bytes32",
				indexed: false,
			},
		],
		name: "ModelRegistered",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "modelId",
				internalType: "uint256",
				type: "uint256",
				indexed: true,
			},
			{ name: "passed", internalType: "bool", type: "bool", indexed: false },
			{
				name: "proofHash",
				internalType: "bytes32",
				type: "bytes32",
				indexed: false,
			},
		],
		name: "ModelVerified",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "previousOwner",
				internalType: "address",
				type: "address",
				indexed: true,
			},
			{
				name: "newOwner",
				internalType: "address",
				type: "address",
				indexed: true,
			},
		],
		name: "OwnershipTransferred",
	},
	{
		type: "error",
		inputs: [{ name: "owner", internalType: "address", type: "address" }],
		name: "OwnableInvalidOwner",
	},
	{
		type: "error",
		inputs: [{ name: "account", internalType: "address", type: "address" }],
		name: "OwnableUnauthorizedAccount",
	},
	{ type: "error", inputs: [], name: "ZKFair__InvalidInput" },
	{ type: "error", inputs: [], name: "ZKFair__InvalidProof" },
	{ type: "error", inputs: [], name: "ZKFair__ModelAlreadyExists" },
	{ type: "error", inputs: [], name: "ZKFair__ModelNotFound" },
	{ type: "error", inputs: [], name: "ZKFair__UnauthorizedAccess" },
] as const;
