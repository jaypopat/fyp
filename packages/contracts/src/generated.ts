//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ECDSA
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const ecdsaAbi = [
  { type: 'error', inputs: [], name: 'ECDSAInvalidSignature' },
  {
    type: 'error',
    inputs: [{ name: 'length', internalType: 'uint256', type: 'uint256' }],
    name: 'ECDSAInvalidSignatureLength',
  },
  {
    type: 'error',
    inputs: [{ name: 's', internalType: 'bytes32', type: 'bytes32' }],
    name: 'ECDSAInvalidSignatureS',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IMulticall3
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iMulticall3Abi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'calls',
        internalType: 'struct IMulticall3.Call[]',
        type: 'tuple[]',
        components: [
          { name: 'target', internalType: 'address', type: 'address' },
          { name: 'callData', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'aggregate',
    outputs: [
      { name: 'blockNumber', internalType: 'uint256', type: 'uint256' },
      { name: 'returnData', internalType: 'bytes[]', type: 'bytes[]' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'calls',
        internalType: 'struct IMulticall3.Call3[]',
        type: 'tuple[]',
        components: [
          { name: 'target', internalType: 'address', type: 'address' },
          { name: 'allowFailure', internalType: 'bool', type: 'bool' },
          { name: 'callData', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'aggregate3',
    outputs: [
      {
        name: 'returnData',
        internalType: 'struct IMulticall3.Result[]',
        type: 'tuple[]',
        components: [
          { name: 'success', internalType: 'bool', type: 'bool' },
          { name: 'returnData', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'calls',
        internalType: 'struct IMulticall3.Call3Value[]',
        type: 'tuple[]',
        components: [
          { name: 'target', internalType: 'address', type: 'address' },
          { name: 'allowFailure', internalType: 'bool', type: 'bool' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'callData', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'aggregate3Value',
    outputs: [
      {
        name: 'returnData',
        internalType: 'struct IMulticall3.Result[]',
        type: 'tuple[]',
        components: [
          { name: 'success', internalType: 'bool', type: 'bool' },
          { name: 'returnData', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'calls',
        internalType: 'struct IMulticall3.Call[]',
        type: 'tuple[]',
        components: [
          { name: 'target', internalType: 'address', type: 'address' },
          { name: 'callData', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'blockAndAggregate',
    outputs: [
      { name: 'blockNumber', internalType: 'uint256', type: 'uint256' },
      { name: 'blockHash', internalType: 'bytes32', type: 'bytes32' },
      {
        name: 'returnData',
        internalType: 'struct IMulticall3.Result[]',
        type: 'tuple[]',
        components: [
          { name: 'success', internalType: 'bool', type: 'bool' },
          { name: 'returnData', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBasefee',
    outputs: [{ name: 'basefee', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'blockNumber', internalType: 'uint256', type: 'uint256' }],
    name: 'getBlockHash',
    outputs: [{ name: 'blockHash', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBlockNumber',
    outputs: [
      { name: 'blockNumber', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getChainId',
    outputs: [{ name: 'chainid', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCurrentBlockCoinbase',
    outputs: [{ name: 'coinbase', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCurrentBlockDifficulty',
    outputs: [{ name: 'difficulty', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCurrentBlockGasLimit',
    outputs: [{ name: 'gaslimit', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCurrentBlockTimestamp',
    outputs: [{ name: 'timestamp', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'addr', internalType: 'address', type: 'address' }],
    name: 'getEthBalance',
    outputs: [{ name: 'balance', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getLastBlockHash',
    outputs: [{ name: 'blockHash', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'requireSuccess', internalType: 'bool', type: 'bool' },
      {
        name: 'calls',
        internalType: 'struct IMulticall3.Call[]',
        type: 'tuple[]',
        components: [
          { name: 'target', internalType: 'address', type: 'address' },
          { name: 'callData', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'tryAggregate',
    outputs: [
      {
        name: 'returnData',
        internalType: 'struct IMulticall3.Result[]',
        type: 'tuple[]',
        components: [
          { name: 'success', internalType: 'bool', type: 'bool' },
          { name: 'returnData', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'requireSuccess', internalType: 'bool', type: 'bool' },
      {
        name: 'calls',
        internalType: 'struct IMulticall3.Call[]',
        type: 'tuple[]',
        components: [
          { name: 'target', internalType: 'address', type: 'address' },
          { name: 'callData', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'tryBlockAndAggregate',
    outputs: [
      { name: 'blockNumber', internalType: 'uint256', type: 'uint256' },
      { name: 'blockHash', internalType: 'bytes32', type: 'bytes32' },
      {
        name: 'returnData',
        internalType: 'struct IMulticall3.Result[]',
        type: 'tuple[]',
        components: [
          { name: 'success', internalType: 'bool', type: 'bool' },
          { name: 'returnData', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    stateMutability: 'payable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MessageHashUtils
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const messageHashUtilsAbi = [
  { type: 'error', inputs: [], name: 'ERC5267ExtensionsNotSupported' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Ownable
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const ownableAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Pausable
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const pausableAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Paused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Unpaused',
  },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SafeCast
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const safeCastAbi = [
  {
    type: 'error',
    inputs: [
      { name: 'bits', internalType: 'uint8', type: 'uint8' },
      { name: 'value', internalType: 'int256', type: 'int256' },
    ],
    name: 'SafeCastOverflowedIntDowncast',
  },
  {
    type: 'error',
    inputs: [{ name: 'value', internalType: 'int256', type: 'int256' }],
    name: 'SafeCastOverflowedIntToUint',
  },
  {
    type: 'error',
    inputs: [
      { name: 'bits', internalType: 'uint8', type: 'uint8' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'SafeCastOverflowedUintDowncast',
  },
  {
    type: 'error',
    inputs: [{ name: 'value', internalType: 'uint256', type: 'uint256' }],
    name: 'SafeCastOverflowedUintToInt',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Strings
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const stringsAbi = [
  {
    type: 'error',
    inputs: [
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'length', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'StringsInsufficientHexLength',
  },
  { type: 'error', inputs: [], name: 'StringsInvalidAddressFormat' },
  { type: 'error', inputs: [], name: 'StringsInvalidChar' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ZKFair
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const zkFairAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_attestationService', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'AUDIT_RESPONSE_DEADLINE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'AUDIT_STAKE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DISPUTE_GRACE_PERIOD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DISPUTE_STAKE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROVIDER_STAKE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REQUIRED_SAMPLES',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'attestationService',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'audits',
    outputs: [
      { name: 'batchId', internalType: 'uint256', type: 'uint256' },
      { name: 'requestedAt', internalType: 'uint256', type: 'uint256' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
      { name: 'challenger', internalType: 'address', type: 'address' },
      { name: 'responded', internalType: 'bool', type: 'bool' },
      {
        name: 'status',
        internalType: 'enum ZKFair.AuditStatus',
        type: 'uint8',
      },
      { name: 'proofHash', internalType: 'bytes32', type: 'bytes32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'batches',
    outputs: [
      { name: 'modelId', internalType: 'uint256', type: 'uint256' },
      { name: 'merkleRoot', internalType: 'bytes32', type: 'bytes32' },
      { name: 'queryCount', internalType: 'uint256', type: 'uint256' },
      { name: 'seqNumStart', internalType: 'uint256', type: 'uint256' },
      { name: 'seqNumEnd', internalType: 'uint256', type: 'uint256' },
      { name: 'committedAt', internalType: 'uint256', type: 'uint256' },
      { name: 'audited', internalType: 'bool', type: 'bool' },
      {
        name: 'auditStatus',
        internalType: 'enum ZKFair.AuditStatus',
        type: 'uint8',
      },
      { name: 'activeAuditId', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'modelId', internalType: 'uint256', type: 'uint256' },
      { name: 'merkleRoot', internalType: 'bytes32', type: 'bytes32' },
      { name: 'queryCount', internalType: 'uint256', type: 'uint256' },
      { name: 'seqNumStart', internalType: 'uint256', type: 'uint256' },
      { name: 'seqNumEnd', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'commitBatch',
    outputs: [{ name: 'batchId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'batchId', internalType: 'uint256', type: 'uint256' },
      { name: 'seqNum', internalType: 'uint256', type: 'uint256' },
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
      { name: 'featuresHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'sensitiveAttr', internalType: 'uint256', type: 'uint256' },
      { name: 'prediction', internalType: 'int256', type: 'int256' },
      { name: 'providerSignature', internalType: 'bytes', type: 'bytes' },
      { name: 'merkleProof', internalType: 'bytes32[]', type: 'bytes32[]' },
      { name: 'proofPositions', internalType: 'uint8[]', type: 'uint8[]' },
    ],
    name: 'disputeFraudulentInclusion',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'modelId', internalType: 'uint256', type: 'uint256' },
      { name: 'seqNum', internalType: 'uint256', type: 'uint256' },
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
      { name: 'featuresHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'sensitiveAttr', internalType: 'uint256', type: 'uint256' },
      { name: 'prediction', internalType: 'int256', type: 'int256' },
      { name: 'providerSignature', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'disputeNonInclusion',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getAllModels',
    outputs: [
      {
        name: '_models',
        internalType: 'struct ZKFair.Model[]',
        type: 'tuple[]',
        components: [
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'provider', internalType: 'address', type: 'address' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'inferenceUrl', internalType: 'string', type: 'string' },
          { name: 'weightsHash', internalType: 'bytes32', type: 'bytes32' },
          {
            name: 'datasetMerkleRoot',
            internalType: 'bytes32',
            type: 'bytes32',
          },
          {
            name: 'fairnessThreshold',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'status',
            internalType: 'enum ZKFair.ModelStatus',
            type: 'uint8',
          },
          { name: 'stake', internalType: 'uint256', type: 'uint256' },
          { name: 'registeredAt', internalType: 'uint256', type: 'uint256' },
          { name: 'verifiedAt', internalType: 'uint256', type: 'uint256' },
          {
            name: 'certificationProofHash',
            internalType: 'bytes32',
            type: 'bytes32',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'auditId', internalType: 'uint256', type: 'uint256' }],
    name: 'getAudit',
    outputs: [
      {
        name: '',
        internalType: 'struct ZKFair.Audit',
        type: 'tuple',
        components: [
          { name: 'batchId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'sampleIndices',
            internalType: 'uint256[]',
            type: 'uint256[]',
          },
          { name: 'requestedAt', internalType: 'uint256', type: 'uint256' },
          { name: 'deadline', internalType: 'uint256', type: 'uint256' },
          { name: 'challenger', internalType: 'address', type: 'address' },
          { name: 'responded', internalType: 'bool', type: 'bool' },
          {
            name: 'status',
            internalType: 'enum ZKFair.AuditStatus',
            type: 'uint8',
          },
          { name: 'proofHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'batchId', internalType: 'uint256', type: 'uint256' }],
    name: 'getBatch',
    outputs: [
      {
        name: '',
        internalType: 'struct ZKFair.Batch',
        type: 'tuple',
        components: [
          { name: 'modelId', internalType: 'uint256', type: 'uint256' },
          { name: 'merkleRoot', internalType: 'bytes32', type: 'bytes32' },
          { name: 'queryCount', internalType: 'uint256', type: 'uint256' },
          { name: 'seqNumStart', internalType: 'uint256', type: 'uint256' },
          { name: 'seqNumEnd', internalType: 'uint256', type: 'uint256' },
          { name: 'committedAt', internalType: 'uint256', type: 'uint256' },
          { name: 'audited', internalType: 'bool', type: 'bool' },
          {
            name: 'auditStatus',
            internalType: 'enum ZKFair.AuditStatus',
            type: 'uint8',
          },
          { name: 'activeAuditId', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'modelId', internalType: 'uint256', type: 'uint256' }],
    name: 'getBatchesByModel',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'modelId', internalType: 'uint256', type: 'uint256' }],
    name: 'getModel',
    outputs: [
      {
        name: '',
        internalType: 'struct ZKFair.Model',
        type: 'tuple',
        components: [
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'provider', internalType: 'address', type: 'address' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'inferenceUrl', internalType: 'string', type: 'string' },
          { name: 'weightsHash', internalType: 'bytes32', type: 'bytes32' },
          {
            name: 'datasetMerkleRoot',
            internalType: 'bytes32',
            type: 'bytes32',
          },
          {
            name: 'fairnessThreshold',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'status',
            internalType: 'enum ZKFair.ModelStatus',
            type: 'uint8',
          },
          { name: 'stake', internalType: 'uint256', type: 'uint256' },
          { name: 'registeredAt', internalType: 'uint256', type: 'uint256' },
          { name: 'verifiedAt', internalType: 'uint256', type: 'uint256' },
          {
            name: 'certificationProofHash',
            internalType: 'bytes32',
            type: 'bytes32',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'weightsHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getModelByWeightsHash',
    outputs: [
      {
        name: 'model',
        internalType: 'struct ZKFair.Model',
        type: 'tuple',
        components: [
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'provider', internalType: 'address', type: 'address' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'inferenceUrl', internalType: 'string', type: 'string' },
          { name: 'weightsHash', internalType: 'bytes32', type: 'bytes32' },
          {
            name: 'datasetMerkleRoot',
            internalType: 'bytes32',
            type: 'bytes32',
          },
          {
            name: 'fairnessThreshold',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'status',
            internalType: 'enum ZKFair.ModelStatus',
            type: 'uint8',
          },
          { name: 'stake', internalType: 'uint256', type: 'uint256' },
          { name: 'registeredAt', internalType: 'uint256', type: 'uint256' },
          { name: 'verifiedAt', internalType: 'uint256', type: 'uint256' },
          {
            name: 'certificationProofHash',
            internalType: 'bytes32',
            type: 'bytes32',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'weightsHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getModelIdByWeightsHash',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'provider', internalType: 'address', type: 'address' }],
    name: 'getModelsByProvider',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTotalAudits',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTotalBatches',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTotalModels',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'models',
    outputs: [
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'provider', internalType: 'address', type: 'address' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'inferenceUrl', internalType: 'string', type: 'string' },
      { name: 'weightsHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'datasetMerkleRoot', internalType: 'bytes32', type: 'bytes32' },
      { name: 'fairnessThreshold', internalType: 'uint256', type: 'uint256' },
      {
        name: 'status',
        internalType: 'enum ZKFair.ModelStatus',
        type: 'uint8',
      },
      { name: 'stake', internalType: 'uint256', type: 'uint256' },
      { name: 'registeredAt', internalType: 'uint256', type: 'uint256' },
      { name: 'verifiedAt', internalType: 'uint256', type: 'uint256' },
      {
        name: 'certificationProofHash',
        internalType: 'bytes32',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'inferenceUrl', internalType: 'string', type: 'string' },
      { name: 'weightsHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'datasetMerkleRoot', internalType: 'bytes32', type: 'bytes32' },
      { name: 'fairnessThreshold', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'registerModel',
    outputs: [{ name: 'modelId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'batchId', internalType: 'uint256', type: 'uint256' }],
    name: 'requestAudit',
    outputs: [{ name: 'auditId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newService', internalType: 'address', type: 'address' }],
    name: 'setAttestationService',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'auditId', internalType: 'uint256', type: 'uint256' }],
    name: 'slashExpiredAudit',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'auditId', internalType: 'uint256', type: 'uint256' },
      { name: 'attestationHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
      { name: 'passed', internalType: 'bool', type: 'bool' },
    ],
    name: 'submitAuditProof',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'weightsHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'attestationHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'submitCertificationProof',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'modelId', internalType: 'uint256', type: 'uint256' },
      { name: 'newInferenceUrl', internalType: 'string', type: 'string' },
    ],
    name: 'updateInferenceUrl',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'modelId', internalType: 'uint256', type: 'uint256' }],
    name: 'withdrawStake',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldService',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newService',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AttestationServiceUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'auditId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'batchId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'slasher',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AuditExpired',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'auditId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'passed', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'AuditProofSubmitted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'auditId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'batchId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'sampleIndices',
        internalType: 'uint256[]',
        type: 'uint256[]',
        indexed: false,
      },
      {
        name: 'deadline',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AuditRequested',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'batchId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'modelId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'merkleRoot',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
      {
        name: 'queryCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'BatchCommitted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'modelId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'seqNum',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'reason',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'DisputeRaised',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'modelId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'newUrl',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'InferenceUrlUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'modelId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'proofHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
    ],
    name: 'ModelCertified',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'modelId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'provider',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'weightsHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
      {
        name: 'fairnessThreshold',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ModelRegistered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Paused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'modelId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'provider',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'reason',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'ProviderSlashed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'modelId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'provider',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StakeWithdrawn',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Unpaused',
  },
  { type: 'error', inputs: [], name: 'ActiveAuditExists' },
  { type: 'error', inputs: [], name: 'AlreadyAudited' },
  { type: 'error', inputs: [], name: 'AlreadyResponded' },
  { type: 'error', inputs: [], name: 'AuditNotFound' },
  { type: 'error', inputs: [], name: 'BatchNotFound' },
  { type: 'error', inputs: [], name: 'DeadlineNotPassed' },
  { type: 'error', inputs: [], name: 'DeadlinePassed' },
  { type: 'error', inputs: [], name: 'DisputeGracePeriodNotPassed' },
  { type: 'error', inputs: [], name: 'ECDSAInvalidSignature' },
  {
    type: 'error',
    inputs: [{ name: 'length', internalType: 'uint256', type: 'uint256' }],
    name: 'ECDSAInvalidSignatureLength',
  },
  {
    type: 'error',
    inputs: [{ name: 's', internalType: 'bytes32', type: 'bytes32' }],
    name: 'ECDSAInvalidSignatureS',
  },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  { type: 'error', inputs: [], name: 'HasPendingAudits' },
  { type: 'error', inputs: [], name: 'InsufficientStake' },
  { type: 'error', inputs: [], name: 'InvalidAttestation' },
  { type: 'error', inputs: [], name: 'InvalidInput' },
  { type: 'error', inputs: [], name: 'InvalidMerkleProof' },
  { type: 'error', inputs: [], name: 'InvalidModelStatus' },
  { type: 'error', inputs: [], name: 'InvalidSignature' },
  { type: 'error', inputs: [], name: 'ModelAlreadyExists' },
  { type: 'error', inputs: [], name: 'ModelNotFound' },
  { type: 'error', inputs: [], name: 'NoStakeToWithdraw' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
  { type: 'error', inputs: [], name: 'ProofValid' },
  { type: 'error', inputs: [], name: 'SeqNumAlreadyBatched' },
  { type: 'error', inputs: [], name: 'SeqNumNotInBatchRange' },
  { type: 'error', inputs: [], name: 'TransferFailed' },
  { type: 'error', inputs: [], name: 'UnauthorizedAccess' },
] as const
