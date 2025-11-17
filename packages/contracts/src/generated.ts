//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// BaseFairnessVerifier
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const baseFairnessVerifierAbi = [
	{
		type: "function",
		inputs: [
			{ name: "proof", internalType: "bytes", type: "bytes" },
			{ name: "publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
		],
		name: "verify",
		outputs: [{ name: "verified", internalType: "bool", type: "bool" }],
		stateMutability: "view",
	},
	{ type: "error", inputs: [], name: "ConsistencyCheckFailed" },
	{ type: "error", inputs: [], name: "GeminiChallengeInSubgroup" },
	{ type: "error", inputs: [], name: "ProofLengthWrong" },
	{
		type: "error",
		inputs: [
			{ name: "logN", internalType: "uint256", type: "uint256" },
			{ name: "actualLength", internalType: "uint256", type: "uint256" },
			{ name: "expectedLength", internalType: "uint256", type: "uint256" },
		],
		name: "ProofLengthWrongWithLogN",
	},
	{ type: "error", inputs: [], name: "PublicInputsLengthWrong" },
	{ type: "error", inputs: [], name: "ShpleminiFailed" },
	{ type: "error", inputs: [], name: "SumcheckFailed" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// BaseTrainingVerifier
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const baseTrainingVerifierAbi = [
	{
		type: "function",
		inputs: [
			{ name: "proof", internalType: "bytes", type: "bytes" },
			{ name: "publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
		],
		name: "verify",
		outputs: [{ name: "verified", internalType: "bool", type: "bool" }],
		stateMutability: "view",
	},
	{ type: "error", inputs: [], name: "ConsistencyCheckFailed" },
	{ type: "error", inputs: [], name: "GeminiChallengeInSubgroup" },
	{ type: "error", inputs: [], name: "ProofLengthWrong" },
	{
		type: "error",
		inputs: [
			{ name: "logN", internalType: "uint256", type: "uint256" },
			{ name: "actualLength", internalType: "uint256", type: "uint256" },
			{ name: "expectedLength", internalType: "uint256", type: "uint256" },
		],
		name: "ProofLengthWrongWithLogN",
	},
	{ type: "error", inputs: [], name: "PublicInputsLengthWrong" },
	{ type: "error", inputs: [], name: "ShpleminiFailed" },
	{ type: "error", inputs: [], name: "SumcheckFailed" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FairnessTranscriptLib
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const fairnessTranscriptLibAbi = [
	{
		type: "function",
		inputs: [
			{
				name: "proof",
				internalType: "struct FairnessHonk.ZKProof",
				type: "tuple",
				components: [
					{
						name: "pairingPointObject",
						internalType: "Fr[16]",
						type: "uint256[16]",
					},
					{
						name: "w1",
						internalType: "struct FairnessHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "w2",
						internalType: "struct FairnessHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "w3",
						internalType: "struct FairnessHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "w4",
						internalType: "struct FairnessHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "lookupReadCounts",
						internalType: "struct FairnessHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "lookupReadTags",
						internalType: "struct FairnessHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "lookupInverses",
						internalType: "struct FairnessHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "zPerm",
						internalType: "struct FairnessHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "libraCommitments",
						internalType: "struct FairnessHonk.G1Point[3]",
						type: "tuple[3]",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{ name: "libraSum", internalType: "Fr", type: "uint256" },
					{
						name: "sumcheckUnivariates",
						internalType: "Fr[9][28]",
						type: "uint256[9][28]",
					},
					{
						name: "sumcheckEvaluations",
						internalType: "Fr[41]",
						type: "uint256[41]",
					},
					{ name: "libraEvaluation", internalType: "Fr", type: "uint256" },
					{
						name: "geminiMaskingPoly",
						internalType: "struct FairnessHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{ name: "geminiMaskingEval", internalType: "Fr", type: "uint256" },
					{
						name: "geminiFoldComms",
						internalType: "struct FairnessHonk.G1Point[27]",
						type: "tuple[27]",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "geminiAEvaluations",
						internalType: "Fr[28]",
						type: "uint256[28]",
					},
					{ name: "libraPolyEvals", internalType: "Fr[4]", type: "uint256[4]" },
					{
						name: "shplonkQ",
						internalType: "struct FairnessHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "kzgQuotient",
						internalType: "struct FairnessHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
				],
			},
			{ name: "publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
			{ name: "vkHash", internalType: "uint256", type: "uint256" },
			{ name: "publicInputsSize", internalType: "uint256", type: "uint256" },
			{ name: "logN", internalType: "uint256", type: "uint256" },
		],
		name: "generateTranscript",
		outputs: [
			{
				name: "t",
				internalType: "struct ZKTranscript",
				type: "tuple",
				components: [
					{
						name: "relationParameters",
						internalType: "struct FairnessHonk.RelationParameters",
						type: "tuple",
						components: [
							{ name: "eta", internalType: "Fr", type: "uint256" },
							{ name: "etaTwo", internalType: "Fr", type: "uint256" },
							{ name: "etaThree", internalType: "Fr", type: "uint256" },
							{ name: "beta", internalType: "Fr", type: "uint256" },
							{ name: "gamma", internalType: "Fr", type: "uint256" },
							{
								name: "publicInputsDelta",
								internalType: "Fr",
								type: "uint256",
							},
						],
					},
					{ name: "alphas", internalType: "Fr[27]", type: "uint256[27]" },
					{
						name: "gateChallenges",
						internalType: "Fr[28]",
						type: "uint256[28]",
					},
					{ name: "libraChallenge", internalType: "Fr", type: "uint256" },
					{
						name: "sumCheckUChallenges",
						internalType: "Fr[28]",
						type: "uint256[28]",
					},
					{ name: "rho", internalType: "Fr", type: "uint256" },
					{ name: "geminiR", internalType: "Fr", type: "uint256" },
					{ name: "shplonkNu", internalType: "Fr", type: "uint256" },
					{ name: "shplonkZ", internalType: "Fr", type: "uint256" },
					{ name: "publicInputsDelta", internalType: "Fr", type: "uint256" },
				],
			},
		],
		stateMutability: "pure",
	},
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FairnessVerifier
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const fairnessVerifierAbi = [
	{
		type: "function",
		inputs: [
			{ name: "proof", internalType: "bytes", type: "bytes" },
			{ name: "publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
		],
		name: "verify",
		outputs: [{ name: "verified", internalType: "bool", type: "bool" }],
		stateMutability: "view",
	},
	{ type: "error", inputs: [], name: "ConsistencyCheckFailed" },
	{ type: "error", inputs: [], name: "GeminiChallengeInSubgroup" },
	{ type: "error", inputs: [], name: "ProofLengthWrong" },
	{
		type: "error",
		inputs: [
			{ name: "logN", internalType: "uint256", type: "uint256" },
			{ name: "actualLength", internalType: "uint256", type: "uint256" },
			{ name: "expectedLength", internalType: "uint256", type: "uint256" },
		],
		name: "ProofLengthWrongWithLogN",
	},
	{ type: "error", inputs: [], name: "PublicInputsLengthWrong" },
	{ type: "error", inputs: [], name: "ShpleminiFailed" },
	{ type: "error", inputs: [], name: "SumcheckFailed" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IFairnessVerifier
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iFairnessVerifierAbi = [
	{
		type: "function",
		inputs: [
			{ name: "_proof", internalType: "bytes", type: "bytes" },
			{ name: "_publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
		],
		name: "verify",
		outputs: [{ name: "", internalType: "bool", type: "bool" }],
		stateMutability: "nonpayable",
	},
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
// ITrainingVerifier
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iTrainingVerifierAbi = [
	{
		type: "function",
		inputs: [
			{ name: "_proof", internalType: "bytes", type: "bytes" },
			{ name: "_publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
		],
		name: "verify",
		outputs: [{ name: "", internalType: "bool", type: "bool" }],
		stateMutability: "nonpayable",
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
// Pausable
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const pausableAbi = [
	{
		type: "function",
		inputs: [],
		name: "paused",
		outputs: [{ name: "", internalType: "bool", type: "bool" }],
		stateMutability: "view",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "account",
				internalType: "address",
				type: "address",
				indexed: false,
			},
		],
		name: "Paused",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "account",
				internalType: "address",
				type: "address",
				indexed: false,
			},
		],
		name: "Unpaused",
	},
	{ type: "error", inputs: [], name: "EnforcedPause" },
	{ type: "error", inputs: [], name: "ExpectedPause" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TrainingTranscriptLib
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const trainingTranscriptLibAbi = [
	{
		type: "function",
		inputs: [
			{
				name: "proof",
				internalType: "struct TrainingHonk.ZKProof",
				type: "tuple",
				components: [
					{
						name: "pairingPointObject",
						internalType: "Fr[16]",
						type: "uint256[16]",
					},
					{
						name: "w1",
						internalType: "struct TrainingHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "w2",
						internalType: "struct TrainingHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "w3",
						internalType: "struct TrainingHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "w4",
						internalType: "struct TrainingHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "lookupReadCounts",
						internalType: "struct TrainingHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "lookupReadTags",
						internalType: "struct TrainingHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "lookupInverses",
						internalType: "struct TrainingHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "zPerm",
						internalType: "struct TrainingHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "libraCommitments",
						internalType: "struct TrainingHonk.G1Point[3]",
						type: "tuple[3]",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{ name: "libraSum", internalType: "Fr", type: "uint256" },
					{
						name: "sumcheckUnivariates",
						internalType: "Fr[9][28]",
						type: "uint256[9][28]",
					},
					{
						name: "sumcheckEvaluations",
						internalType: "Fr[41]",
						type: "uint256[41]",
					},
					{ name: "libraEvaluation", internalType: "Fr", type: "uint256" },
					{
						name: "geminiMaskingPoly",
						internalType: "struct TrainingHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{ name: "geminiMaskingEval", internalType: "Fr", type: "uint256" },
					{
						name: "geminiFoldComms",
						internalType: "struct TrainingHonk.G1Point[27]",
						type: "tuple[27]",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "geminiAEvaluations",
						internalType: "Fr[28]",
						type: "uint256[28]",
					},
					{ name: "libraPolyEvals", internalType: "Fr[4]", type: "uint256[4]" },
					{
						name: "shplonkQ",
						internalType: "struct TrainingHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
					{
						name: "kzgQuotient",
						internalType: "struct TrainingHonk.G1Point",
						type: "tuple",
						components: [
							{ name: "x", internalType: "uint256", type: "uint256" },
							{ name: "y", internalType: "uint256", type: "uint256" },
						],
					},
				],
			},
			{ name: "publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
			{ name: "vkHash", internalType: "uint256", type: "uint256" },
			{ name: "publicInputsSize", internalType: "uint256", type: "uint256" },
			{ name: "logN", internalType: "uint256", type: "uint256" },
		],
		name: "generateTranscript",
		outputs: [
			{
				name: "t",
				internalType: "struct ZKTranscript",
				type: "tuple",
				components: [
					{
						name: "relationParameters",
						internalType: "struct TrainingHonk.RelationParameters",
						type: "tuple",
						components: [
							{ name: "eta", internalType: "Fr", type: "uint256" },
							{ name: "etaTwo", internalType: "Fr", type: "uint256" },
							{ name: "etaThree", internalType: "Fr", type: "uint256" },
							{ name: "beta", internalType: "Fr", type: "uint256" },
							{ name: "gamma", internalType: "Fr", type: "uint256" },
							{
								name: "publicInputsDelta",
								internalType: "Fr",
								type: "uint256",
							},
						],
					},
					{ name: "alphas", internalType: "Fr[27]", type: "uint256[27]" },
					{
						name: "gateChallenges",
						internalType: "Fr[28]",
						type: "uint256[28]",
					},
					{ name: "libraChallenge", internalType: "Fr", type: "uint256" },
					{
						name: "sumCheckUChallenges",
						internalType: "Fr[28]",
						type: "uint256[28]",
					},
					{ name: "rho", internalType: "Fr", type: "uint256" },
					{ name: "geminiR", internalType: "Fr", type: "uint256" },
					{ name: "shplonkNu", internalType: "Fr", type: "uint256" },
					{ name: "shplonkZ", internalType: "Fr", type: "uint256" },
					{ name: "publicInputsDelta", internalType: "Fr", type: "uint256" },
				],
			},
		],
		stateMutability: "pure",
	},
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TrainingVerifier
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const trainingVerifierAbi = [
	{
		type: "function",
		inputs: [
			{ name: "proof", internalType: "bytes", type: "bytes" },
			{ name: "publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
		],
		name: "verify",
		outputs: [{ name: "verified", internalType: "bool", type: "bool" }],
		stateMutability: "view",
	},
	{ type: "error", inputs: [], name: "ConsistencyCheckFailed" },
	{ type: "error", inputs: [], name: "GeminiChallengeInSubgroup" },
	{ type: "error", inputs: [], name: "ProofLengthWrong" },
	{
		type: "error",
		inputs: [
			{ name: "logN", internalType: "uint256", type: "uint256" },
			{ name: "actualLength", internalType: "uint256", type: "uint256" },
			{ name: "expectedLength", internalType: "uint256", type: "uint256" },
		],
		name: "ProofLengthWrongWithLogN",
	},
	{ type: "error", inputs: [], name: "PublicInputsLengthWrong" },
	{ type: "error", inputs: [], name: "ShpleminiFailed" },
	{ type: "error", inputs: [], name: "SumcheckFailed" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ZKFair
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const zkFairAbi = [
	{
		type: "constructor",
		inputs: [
			{ name: "_trainingVerifier", internalType: "address", type: "address" },
			{ name: "_fairnessVerifier", internalType: "address", type: "address" },
		],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [],
		name: "AUDIT_RESPONSE_DEADLINE",
		outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "PROVIDER_STAKE",
		outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "REQUIRED_SAMPLES",
		outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "", internalType: "uint256", type: "uint256" }],
		name: "audits",
		outputs: [
			{ name: "batchId", internalType: "uint256", type: "uint256" },
			{ name: "requestedAt", internalType: "uint256", type: "uint256" },
			{ name: "deadline", internalType: "uint256", type: "uint256" },
			{ name: "challenger", internalType: "address", type: "address" },
			{ name: "responded", internalType: "bool", type: "bool" },
			{
				name: "status",
				internalType: "enum ZKFair.AuditStatus",
				type: "uint8",
			},
			{ name: "proofHash", internalType: "bytes32", type: "bytes32" },
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "", internalType: "uint256", type: "uint256" }],
		name: "batches",
		outputs: [
			{ name: "modelId", internalType: "uint256", type: "uint256" },
			{ name: "merkleRoot", internalType: "bytes32", type: "bytes32" },
			{ name: "queryCount", internalType: "uint256", type: "uint256" },
			{ name: "timestampStart", internalType: "uint256", type: "uint256" },
			{ name: "timestampEnd", internalType: "uint256", type: "uint256" },
			{ name: "committedAt", internalType: "uint256", type: "uint256" },
			{ name: "audited", internalType: "bool", type: "bool" },
			{
				name: "auditStatus",
				internalType: "enum ZKFair.AuditStatus",
				type: "uint8",
			},
			{ name: "activeAuditId", internalType: "uint256", type: "uint256" },
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [
			{ name: "modelId", internalType: "uint256", type: "uint256" },
			{ name: "merkleRoot", internalType: "bytes32", type: "bytes32" },
			{ name: "queryCount", internalType: "uint256", type: "uint256" },
			{ name: "timestampStart", internalType: "uint256", type: "uint256" },
			{ name: "timestampEnd", internalType: "uint256", type: "uint256" },
		],
		name: "commitBatch",
		outputs: [{ name: "batchId", internalType: "uint256", type: "uint256" }],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [],
		name: "fairnessVerifier",
		outputs: [
			{ name: "", internalType: "contract IFairnessVerifier", type: "address" },
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "getAllModels",
		outputs: [
			{
				name: "_models",
				internalType: "struct ZKFair.Model[]",
				type: "tuple[]",
				components: [
					{ name: "name", internalType: "string", type: "string" },
					{ name: "provider", internalType: "address", type: "address" },
					{ name: "description", internalType: "string", type: "string" },
					{ name: "inferenceUrl", internalType: "string", type: "string" },
					{ name: "weightsHash", internalType: "bytes32", type: "bytes32" },
					{
						name: "datasetMerkleRoot",
						internalType: "bytes32",
						type: "bytes32",
					},
					{
						name: "fairnessThreshold",
						internalType: "uint256",
						type: "uint256",
					},
					{
						name: "status",
						internalType: "enum ZKFair.ModelStatus",
						type: "uint8",
					},
					{ name: "stake", internalType: "uint256", type: "uint256" },
					{ name: "registeredAt", internalType: "uint256", type: "uint256" },
					{ name: "verifiedAt", internalType: "uint256", type: "uint256" },
					{
						name: "certificationProofHash",
						internalType: "bytes32",
						type: "bytes32",
					},
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "auditId", internalType: "uint256", type: "uint256" }],
		name: "getAudit",
		outputs: [
			{
				name: "",
				internalType: "struct ZKFair.Audit",
				type: "tuple",
				components: [
					{ name: "batchId", internalType: "uint256", type: "uint256" },
					{
						name: "sampleIndices",
						internalType: "uint256[]",
						type: "uint256[]",
					},
					{ name: "requestedAt", internalType: "uint256", type: "uint256" },
					{ name: "deadline", internalType: "uint256", type: "uint256" },
					{ name: "challenger", internalType: "address", type: "address" },
					{ name: "responded", internalType: "bool", type: "bool" },
					{
						name: "status",
						internalType: "enum ZKFair.AuditStatus",
						type: "uint8",
					},
					{ name: "proofHash", internalType: "bytes32", type: "bytes32" },
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "batchId", internalType: "uint256", type: "uint256" }],
		name: "getBatch",
		outputs: [
			{
				name: "",
				internalType: "struct ZKFair.Batch",
				type: "tuple",
				components: [
					{ name: "modelId", internalType: "uint256", type: "uint256" },
					{ name: "merkleRoot", internalType: "bytes32", type: "bytes32" },
					{ name: "queryCount", internalType: "uint256", type: "uint256" },
					{ name: "timestampStart", internalType: "uint256", type: "uint256" },
					{ name: "timestampEnd", internalType: "uint256", type: "uint256" },
					{ name: "committedAt", internalType: "uint256", type: "uint256" },
					{ name: "audited", internalType: "bool", type: "bool" },
					{
						name: "auditStatus",
						internalType: "enum ZKFair.AuditStatus",
						type: "uint8",
					},
					{ name: "activeAuditId", internalType: "uint256", type: "uint256" },
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "modelId", internalType: "uint256", type: "uint256" }],
		name: "getBatchesByModel",
		outputs: [{ name: "", internalType: "uint256[]", type: "uint256[]" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "modelId", internalType: "uint256", type: "uint256" }],
		name: "getModel",
		outputs: [
			{
				name: "",
				internalType: "struct ZKFair.Model",
				type: "tuple",
				components: [
					{ name: "name", internalType: "string", type: "string" },
					{ name: "provider", internalType: "address", type: "address" },
					{ name: "description", internalType: "string", type: "string" },
					{ name: "inferenceUrl", internalType: "string", type: "string" },
					{ name: "weightsHash", internalType: "bytes32", type: "bytes32" },
					{
						name: "datasetMerkleRoot",
						internalType: "bytes32",
						type: "bytes32",
					},
					{
						name: "fairnessThreshold",
						internalType: "uint256",
						type: "uint256",
					},
					{
						name: "status",
						internalType: "enum ZKFair.ModelStatus",
						type: "uint8",
					},
					{ name: "stake", internalType: "uint256", type: "uint256" },
					{ name: "registeredAt", internalType: "uint256", type: "uint256" },
					{ name: "verifiedAt", internalType: "uint256", type: "uint256" },
					{
						name: "certificationProofHash",
						internalType: "bytes32",
						type: "bytes32",
					},
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "weightsHash", internalType: "bytes32", type: "bytes32" }],
		name: "getModelByWeightsHash",
		outputs: [
			{
				name: "model",
				internalType: "struct ZKFair.Model",
				type: "tuple",
				components: [
					{ name: "name", internalType: "string", type: "string" },
					{ name: "provider", internalType: "address", type: "address" },
					{ name: "description", internalType: "string", type: "string" },
					{ name: "inferenceUrl", internalType: "string", type: "string" },
					{ name: "weightsHash", internalType: "bytes32", type: "bytes32" },
					{
						name: "datasetMerkleRoot",
						internalType: "bytes32",
						type: "bytes32",
					},
					{
						name: "fairnessThreshold",
						internalType: "uint256",
						type: "uint256",
					},
					{
						name: "status",
						internalType: "enum ZKFair.ModelStatus",
						type: "uint8",
					},
					{ name: "stake", internalType: "uint256", type: "uint256" },
					{ name: "registeredAt", internalType: "uint256", type: "uint256" },
					{ name: "verifiedAt", internalType: "uint256", type: "uint256" },
					{
						name: "certificationProofHash",
						internalType: "bytes32",
						type: "bytes32",
					},
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "weightsHash", internalType: "bytes32", type: "bytes32" }],
		name: "getModelIdByWeightsHash",
		outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [{ name: "provider", internalType: "address", type: "address" }],
		name: "getModelsByProvider",
		outputs: [{ name: "", internalType: "uint256[]", type: "uint256[]" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "getTotalAudits",
		outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [],
		name: "getTotalBatches",
		outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
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
		inputs: [{ name: "", internalType: "uint256", type: "uint256" }],
		name: "models",
		outputs: [
			{ name: "name", internalType: "string", type: "string" },
			{ name: "provider", internalType: "address", type: "address" },
			{ name: "description", internalType: "string", type: "string" },
			{ name: "inferenceUrl", internalType: "string", type: "string" },
			{ name: "weightsHash", internalType: "bytes32", type: "bytes32" },
			{ name: "datasetMerkleRoot", internalType: "bytes32", type: "bytes32" },
			{ name: "fairnessThreshold", internalType: "uint256", type: "uint256" },
			{
				name: "status",
				internalType: "enum ZKFair.ModelStatus",
				type: "uint8",
			},
			{ name: "stake", internalType: "uint256", type: "uint256" },
			{ name: "registeredAt", internalType: "uint256", type: "uint256" },
			{ name: "verifiedAt", internalType: "uint256", type: "uint256" },
			{
				name: "certificationProofHash",
				internalType: "bytes32",
				type: "bytes32",
			},
		],
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
		inputs: [],
		name: "pause",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [],
		name: "paused",
		outputs: [{ name: "", internalType: "bool", type: "bool" }],
		stateMutability: "view",
	},
	{
		type: "function",
		inputs: [
			{ name: "name", internalType: "string", type: "string" },
			{ name: "description", internalType: "string", type: "string" },
			{ name: "inferenceUrl", internalType: "string", type: "string" },
			{ name: "weightsHash", internalType: "bytes32", type: "bytes32" },
			{ name: "datasetMerkleRoot", internalType: "bytes32", type: "bytes32" },
			{ name: "fairnessThreshold", internalType: "uint256", type: "uint256" },
		],
		name: "registerModel",
		outputs: [{ name: "modelId", internalType: "uint256", type: "uint256" }],
		stateMutability: "payable",
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
		inputs: [{ name: "batchId", internalType: "uint256", type: "uint256" }],
		name: "requestAudit",
		outputs: [{ name: "auditId", internalType: "uint256", type: "uint256" }],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [{ name: "newVerifier", internalType: "address", type: "address" }],
		name: "setFairnessVerifier",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [{ name: "newVerifier", internalType: "address", type: "address" }],
		name: "setTrainingVerifier",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [{ name: "auditId", internalType: "uint256", type: "uint256" }],
		name: "slashExpiredAudit",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [
			{ name: "auditId", internalType: "uint256", type: "uint256" },
			{ name: "proof", internalType: "bytes", type: "bytes" },
			{ name: "publicInputs", internalType: "bytes32[]", type: "bytes32[]" },
		],
		name: "submitAuditProof",
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
		name: "submitCertificationProof",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [],
		name: "trainingVerifier",
		outputs: [
			{ name: "", internalType: "contract ITrainingVerifier", type: "address" },
		],
		stateMutability: "view",
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
		inputs: [],
		name: "unpause",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [
			{ name: "modelId", internalType: "uint256", type: "uint256" },
			{ name: "newInferenceUrl", internalType: "string", type: "string" },
		],
		name: "updateInferenceUrl",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		inputs: [{ name: "modelId", internalType: "uint256", type: "uint256" }],
		name: "withdrawStake",
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "auditId",
				internalType: "uint256",
				type: "uint256",
				indexed: true,
			},
			{
				name: "batchId",
				internalType: "uint256",
				type: "uint256",
				indexed: true,
			},
			{
				name: "slasher",
				internalType: "address",
				type: "address",
				indexed: true,
			},
		],
		name: "AuditExpired",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "auditId",
				internalType: "uint256",
				type: "uint256",
				indexed: true,
			},
			{ name: "passed", internalType: "bool", type: "bool", indexed: false },
		],
		name: "AuditProofSubmitted",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "auditId",
				internalType: "uint256",
				type: "uint256",
				indexed: true,
			},
			{
				name: "batchId",
				internalType: "uint256",
				type: "uint256",
				indexed: true,
			},
			{
				name: "sampleIndices",
				internalType: "uint256[]",
				type: "uint256[]",
				indexed: false,
			},
			{
				name: "deadline",
				internalType: "uint256",
				type: "uint256",
				indexed: false,
			},
		],
		name: "AuditRequested",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "batchId",
				internalType: "uint256",
				type: "uint256",
				indexed: true,
			},
			{
				name: "modelId",
				internalType: "uint256",
				type: "uint256",
				indexed: true,
			},
			{
				name: "merkleRoot",
				internalType: "bytes32",
				type: "bytes32",
				indexed: false,
			},
			{
				name: "queryCount",
				internalType: "uint256",
				type: "uint256",
				indexed: false,
			},
		],
		name: "BatchCommitted",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "oldVerifier",
				internalType: "address",
				type: "address",
				indexed: true,
			},
			{
				name: "newVerifier",
				internalType: "address",
				type: "address",
				indexed: true,
			},
		],
		name: "FairnessVerifierUpdated",
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
				name: "newUrl",
				internalType: "string",
				type: "string",
				indexed: false,
			},
		],
		name: "InferenceUrlUpdated",
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
				name: "proofHash",
				internalType: "bytes32",
				type: "bytes32",
				indexed: false,
			},
		],
		name: "ModelCertified",
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
				name: "provider",
				internalType: "address",
				type: "address",
				indexed: true,
			},
			{
				name: "weightsHash",
				internalType: "bytes32",
				type: "bytes32",
				indexed: false,
			},
			{
				name: "fairnessThreshold",
				internalType: "uint256",
				type: "uint256",
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
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "account",
				internalType: "address",
				type: "address",
				indexed: false,
			},
		],
		name: "Paused",
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
				name: "provider",
				internalType: "address",
				type: "address",
				indexed: true,
			},
			{
				name: "amount",
				internalType: "uint256",
				type: "uint256",
				indexed: false,
			},
			{
				name: "reason",
				internalType: "string",
				type: "string",
				indexed: false,
			},
		],
		name: "ProviderSlashed",
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
				name: "provider",
				internalType: "address",
				type: "address",
				indexed: true,
			},
			{
				name: "amount",
				internalType: "uint256",
				type: "uint256",
				indexed: false,
			},
		],
		name: "StakeWithdrawn",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "oldVerifier",
				internalType: "address",
				type: "address",
				indexed: true,
			},
			{
				name: "newVerifier",
				internalType: "address",
				type: "address",
				indexed: true,
			},
		],
		name: "TrainingVerifierUpdated",
	},
	{
		type: "event",
		anonymous: false,
		inputs: [
			{
				name: "account",
				internalType: "address",
				type: "address",
				indexed: false,
			},
		],
		name: "Unpaused",
	},
	{ type: "error", inputs: [], name: "ActiveAuditExists" },
	{ type: "error", inputs: [], name: "AlreadyAudited" },
	{ type: "error", inputs: [], name: "AlreadyResponded" },
	{ type: "error", inputs: [], name: "AuditNotFound" },
	{ type: "error", inputs: [], name: "BatchNotFound" },
	{ type: "error", inputs: [], name: "DeadlineNotPassed" },
	{ type: "error", inputs: [], name: "DeadlinePassed" },
	{ type: "error", inputs: [], name: "EnforcedPause" },
	{ type: "error", inputs: [], name: "ExpectedPause" },
	{ type: "error", inputs: [], name: "HasPendingAudits" },
	{ type: "error", inputs: [], name: "InsufficientStake" },
	{ type: "error", inputs: [], name: "InvalidInput" },
	{ type: "error", inputs: [], name: "InvalidModelStatus" },
	{ type: "error", inputs: [], name: "InvalidProof" },
	{ type: "error", inputs: [], name: "ModelAlreadyExists" },
	{ type: "error", inputs: [], name: "ModelNotFound" },
	{ type: "error", inputs: [], name: "NoStakeToWithdraw" },
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
	{ type: "error", inputs: [], name: "TransferFailed" },
	{ type: "error", inputs: [], name: "UnauthorizedAccess" },
] as const;
