// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title ZKFair - Zero-Knowledge Fairness Auditing for ML Models
/// @notice Implements OATH protocol: Certification, Query Batching, Continuous Auditing
/// @dev Uses off-chain attestation service for proof verification
contract ZKFair is Ownable, Pausable {
    // ============================================
    // STATE VARIABLES
    // ============================================

    address public attestationService; // Off-chain attestation service signer

    uint256 private modelCounter;
    uint256 private batchCounter;
    uint256 private auditCounter;

    // ============================================
    // CONSTANTS
    // ============================================

    uint256 public constant PROVIDER_STAKE = 0.0001 ether;
    uint256 public constant AUDIT_STAKE = 0.00005 ether; // Stake required to request audit
    uint256 public constant DISPUTE_STAKE = 0.0001 ether; // Stake required to file dispute
    uint256 public constant AUDIT_RESPONSE_DEADLINE = 24 hours;
    uint256 public constant REQUIRED_SAMPLES = 10;
    uint256 public constant DISPUTE_GRACE_PERIOD = 10 seconds; // Time provider has to batch before dispute allowed (short for demo)

    // ============================================
    // ENUMS
    // ============================================

    enum ModelStatus {
        REGISTERED,
        CERTIFIED,
        SLASHED
    }
    enum AuditStatus {
        PENDING,
        PASSED,
        FAILED,
        EXPIRED
    }

    // ============================================
    // STRUCTS
    // ============================================

    /// @notice Phase 1: Model Registration & Certification
    struct Model {
        string name;
        address provider;
        string description;
        string inferenceUrl; // Provider's inference endpoint
        bytes32 weightsHash;
        bytes32 datasetMerkleRoot;
        uint256 fairnessThreshold; // Scaled by 100 (e.g., 10 = 0.10 = 10%)
        ModelStatus status;
        uint256 stake;
        uint256 registeredAt;
        uint256 verifiedAt;
        bytes32 certificationProofHash;
    }

    /// @notice Phase 2: Query Batch Commitment
    struct Batch {
        uint256 modelId;
        bytes32 merkleRoot;
        uint256 queryCount;
        uint256 seqNumStart;
        uint256 seqNumEnd;
        uint256 committedAt;
        bool audited;
        AuditStatus auditStatus;
        uint256 activeAuditId;
    }

    /// @notice Phase 3: Audit Request & Response
    struct Audit {
        uint256 batchId;
        uint256[] sampleIndices;
        uint256 requestedAt;
        uint256 deadline;
        address challenger;
        bool responded;
        AuditStatus status;
        bytes32 proofHash;
    }

    // ============================================
    // STORAGE MAPPINGS
    // ============================================

    mapping(uint256 => Model) public models;
    mapping(uint256 => Batch) public batches;
    mapping(uint256 => Audit) public audits;

    mapping(bytes32 => uint256) private modelByWeightsHash;
    mapping(address => uint256[]) private modelsByProvider;
    mapping(uint256 => uint256[]) private batchesByModel;

    // ============================================
    // EVENTS
    // ============================================

    event ModelRegistered(
        uint256 indexed modelId,
        address indexed provider,
        bytes32 weightsHash,
        uint256 fairnessThreshold
    );
    event ModelCertified(uint256 indexed modelId, bytes32 proofHash);
    event InferenceUrlUpdated(uint256 indexed modelId, string newUrl);
    event BatchCommitted(
        uint256 indexed batchId,
        uint256 indexed modelId,
        bytes32 merkleRoot,
        uint256 queryCount
    );
    event AuditRequested(
        uint256 indexed auditId,
        uint256 indexed batchId,
        uint256[] sampleIndices,
        uint256 deadline
    );
    event AuditProofSubmitted(uint256 indexed auditId, bool passed);
    event AuditExpired(
        uint256 indexed auditId,
        uint256 indexed batchId,
        address indexed slasher
    );
    event ProviderSlashed(
        uint256 indexed modelId,
        address indexed provider,
        uint256 amount,
        string reason
    );
    event StakeWithdrawn(
        uint256 indexed modelId,
        address indexed provider,
        uint256 amount
    );
    event AttestationServiceUpdated(
        address indexed oldService,
        address indexed newService
    );
    event DisputeRaised(
        uint256 indexed modelId,
        address indexed user,
        uint256 seqNum,
        string reason
    );

    // ============================================
    // ERRORS
    // ============================================

    error InvalidInput();
    error ModelNotFound();
    error BatchNotFound();
    error AuditNotFound();
    error UnauthorizedAccess();
    error InsufficientStake();
    error InvalidAttestation();
    error InvalidSignature();
    error ModelAlreadyExists();
    error InvalidModelStatus();
    error DeadlineNotPassed();
    error DeadlinePassed();
    error AlreadyAudited();
    error AlreadyResponded();
    error TransferFailed();
    error NoStakeToWithdraw();
    error HasPendingAudits();
    error ActiveAuditExists();
    error DisputeGracePeriodNotPassed();
    error SeqNumAlreadyBatched();
    error SeqNumNotInBatchRange();
    error InvalidMerkleProof();
    error ProofValid();

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor(address _attestationService) Ownable(msg.sender) {
        if (_attestationService == address(0)) revert InvalidInput();
        attestationService = _attestationService;
    }

    // ============================================
    // MODIFIERS
    // ============================================

    modifier onlyProvider(uint256 modelId) {
        if (models[modelId].provider != msg.sender) revert UnauthorizedAccess();
        _;
    }

    modifier validModel(uint256 modelId) {
        if (modelId == 0 || modelId > modelCounter) revert ModelNotFound();
        _;
    }

    modifier validBatch(uint256 batchId) {
        if (batchId == 0 || batchId > batchCounter) revert BatchNotFound();
        _;
    }

    modifier validAudit(uint256 auditId) {
        if (auditId == 0 || auditId > auditCounter) revert AuditNotFound();
        _;
    }

    // ============================================
    // PHASE 1: MODEL CERTIFICATION
    // ============================================

    /// @notice Register a new ML model with stake
    /// @param name Human-readable model name
    /// @param weightsHash Keccak256 hash of model weights
    /// @param datasetMerkleRoot Merkle root of calibration dataset D_val
    /// @param fairnessThreshold Maximum allowed fairness disparity (scaled by 100, e.g., 10 = 10%)
    /// @param inferenceUrl Provider's inference endpoint URL
    /// @return modelId Unique identifier for the model
    function registerModel(
        string calldata name,
        string calldata description,
        string calldata inferenceUrl,
        bytes32 weightsHash,
        bytes32 datasetMerkleRoot,
        uint256 fairnessThreshold
    ) external payable whenNotPaused returns (uint256 modelId) {
        if (
            bytes(name).length == 0 ||
            weightsHash == bytes32(0) ||
            datasetMerkleRoot == bytes32(0)
        ) {
            revert InvalidInput();
        }
        if (bytes(inferenceUrl).length == 0) revert InvalidInput();
        if (fairnessThreshold == 0 || fairnessThreshold > 100)
            revert InvalidInput();
        if (msg.value != PROVIDER_STAKE) revert InsufficientStake();
        if (modelByWeightsHash[weightsHash] != 0) revert ModelAlreadyExists();

        modelId = ++modelCounter;

        models[modelId] = Model({
            name: name,
            description: description,
            inferenceUrl: inferenceUrl,
            provider: msg.sender,
            weightsHash: weightsHash,
            datasetMerkleRoot: datasetMerkleRoot,
            fairnessThreshold: fairnessThreshold,
            status: ModelStatus.REGISTERED,
            stake: msg.value,
            registeredAt: block.timestamp,
            verifiedAt: 0,
            certificationProofHash: bytes32(0)
        });

        modelByWeightsHash[weightsHash] = modelId;
        modelsByProvider[msg.sender].push(modelId);

        emit ModelRegistered(
            modelId,
            msg.sender,
            weightsHash,
            fairnessThreshold
        );
    }

    /// @notice Submit attestation that proof was verified off-chain by attestation service
    /// @param weightsHash Hash of model weights (canonical identifier)
    /// @param attestationHash Hash of the attestation (keccak256(proof || "TRAINING_CERT"))
    /// @param signature Signature from attestation service
    function submitCertificationProof(
        bytes32 weightsHash,
        bytes32 attestationHash,
        bytes calldata signature
    ) external whenNotPaused {
        uint256 modelId = modelByWeightsHash[weightsHash];
        if (modelId == 0) revert ModelNotFound();

        Model storage model = models[modelId];

        if (model.provider != msg.sender) revert UnauthorizedAccess();
        if (model.status != ModelStatus.REGISTERED) revert InvalidModelStatus();

        // Verify attestation signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(weightsHash, attestationHash, "TRAINING_CERT")
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );
        address recoveredSigner = ECDSA.recover(
            ethSignedMessageHash,
            signature
        );

        if (recoveredSigner != attestationService) revert InvalidSignature();

        model.status = ModelStatus.CERTIFIED;
        model.verifiedAt = block.timestamp;
        model.certificationProofHash = attestationHash;

        emit ModelCertified(modelId, attestationHash);
    }

    /// @notice Update inference URL for a registered model
    /// @param modelId ID of the model
    /// @param newInferenceUrl New inference endpoint URL
    function updateInferenceUrl(
        uint256 modelId,
        string calldata newInferenceUrl
    ) external whenNotPaused {
        if (modelId == 0 || modelId > modelCounter) revert ModelNotFound();

        Model storage model = models[modelId];

        if (model.provider != msg.sender) revert UnauthorizedAccess();
        if (bytes(newInferenceUrl).length == 0) revert InvalidInput();

        model.inferenceUrl = newInferenceUrl;

        emit InferenceUrlUpdated(modelId, newInferenceUrl);
    }

    // ============================================
    // PHASE 2: QUERY BATCH COMMITMENT
    // ============================================

    /// @notice Commit a batch of queries served to clients
    /// @param modelId ID of the certified model used
    /// @param merkleRoot Merkle root of (query, output) pairs
    /// @param queryCount Number of queries in batch
    /// @param seqNumStart Sequence number of first query
    /// @param seqNumEnd Sequence number of last query
    /// @return batchId Unique identifier for the batch
    function commitBatch(
        uint256 modelId,
        bytes32 merkleRoot,
        uint256 queryCount,
        uint256 seqNumStart,
        uint256 seqNumEnd
    )
        external
        onlyProvider(modelId)
        validModel(modelId)
        whenNotPaused
        returns (uint256 batchId)
    {
        Model storage model = models[modelId];

        // Allow REGISTERED or CERTIFIED for development
        // In production, require CERTIFIED only
        if (
            model.status != ModelStatus.CERTIFIED &&
            model.status != ModelStatus.REGISTERED
        ) {
            revert InvalidModelStatus();
        }
        if (merkleRoot == bytes32(0) || queryCount == 0) revert InvalidInput();
        if (seqNumEnd < seqNumStart) revert InvalidInput();

        batchId = ++batchCounter;

        batches[batchId] = Batch({
            modelId: modelId,
            merkleRoot: merkleRoot,
            queryCount: queryCount,
            seqNumStart: seqNumStart,
            seqNumEnd: seqNumEnd,
            committedAt: block.timestamp,
            audited: false,
            auditStatus: AuditStatus.PENDING,
            activeAuditId: 0
        });

        batchesByModel[modelId].push(batchId);

        emit BatchCommitted(batchId, modelId, merkleRoot, queryCount);
    }

    // ============================================
    // PHASE 3: AUDITING
    // ============================================

    /// @notice Request audit on a committed batch (generates random samples on-chain)
    /// @dev Uses blockhash-based pseudo-randomness - sufficient for most use cases
    /// @dev Requires AUDIT_STAKE which is forfeited if provider passes, or returned + provider stake if provider fails
    /// @param batchId ID of the batch to audit
    /// @return auditId Unique identifier for the audit
    function requestAudit(
        uint256 batchId
    ) external payable validBatch(batchId) whenNotPaused returns (uint256 auditId) {
        if (msg.value != AUDIT_STAKE) revert InsufficientStake();

        Batch storage batch = batches[batchId];

        if (batch.audited) revert AlreadyAudited();

        // Check for active audit
        if (batch.activeAuditId != 0) {
            Audit storage activeAudit = audits[batch.activeAuditId];
            if (!activeAudit.responded) {
                revert ActiveAuditExists();
            }
        }

        // Generate pseudo-random seed using blockhash
        // Using previous block hash for unpredictability
        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(
                    blockhash(block.number - 1),
                    batchId,
                    msg.sender,
                    block.timestamp,
                    auditCounter
                )
            )
        );

        // Generate REQUIRED_SAMPLES random indices within batch range
        uint256[] memory sampleIndices = new uint256[](REQUIRED_SAMPLES);
        for (uint256 i = 0; i < REQUIRED_SAMPLES; i++) {
            uint256 randomNumber = uint256(
                keccak256(abi.encodePacked(seed, i))
            );
            sampleIndices[i] = randomNumber % batch.queryCount;
        }

        // Create audit
        auditId = ++auditCounter;
        uint256 deadline = block.timestamp + AUDIT_RESPONSE_DEADLINE;

        audits[auditId] = Audit({
            batchId: batchId,
            sampleIndices: sampleIndices,
            requestedAt: block.timestamp,
            deadline: deadline,
            challenger: msg.sender,
            responded: false,
            status: AuditStatus.PENDING,
            proofHash: bytes32(0)
        });

        batch.activeAuditId = auditId;

        emit AuditRequested(auditId, batchId, sampleIndices, deadline);
    }

    /// @notice Provider submits attestation that audit proof was verified off-chain by attestation service
    /// @param auditId ID of the audit request
    /// @param attestationHash Hash of the attestation (keccak256(proof || "AUDIT"))
    /// @param signature Signature from attestation service
    /// @param passed Whether the proof passed or failed
    function submitAuditProof(
        uint256 auditId,
        bytes32 attestationHash,
        bytes calldata signature,
        bool passed
    ) external validAudit(auditId) whenNotPaused {
        Audit storage audit = audits[auditId];
        Batch storage batch = batches[audit.batchId];
        Model storage model = models[batch.modelId];

        if (model.provider != msg.sender) revert UnauthorizedAccess();
        if (audit.responded) revert AlreadyResponded();
        if (block.timestamp > audit.deadline) revert DeadlinePassed();

        // Verify attestation signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(uint256(auditId), attestationHash, passed, "AUDIT")
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );
        address recoveredSigner = ECDSA.recover(
            ethSignedMessageHash,
            signature
        );

        if (recoveredSigner != attestationService) revert InvalidSignature();

        audit.responded = true;
        audit.proofHash = attestationHash;
        batch.audited = true;

        if (passed) {
            audit.status = AuditStatus.PASSED;
            batch.auditStatus = AuditStatus.PASSED;
            // Provider wins - gets challenger's stake as reward
            _safeTransfer(model.provider, AUDIT_STAKE);
        } else {
            audit.status = AuditStatus.FAILED;
            batch.auditStatus = AuditStatus.FAILED;
            // Challenger wins - gets their stake back + provider's stake
            _safeTransfer(audit.challenger, AUDIT_STAKE);
            _slashProvider(
                batch.modelId,
                audit.challenger,
                "Invalid audit proof"
            );
        }

        emit AuditProofSubmitted(auditId, passed);
    }

    /// @notice Slash provider for missing audit deadline (permissionless)
    /// @dev Anyone can call after deadline - challenger gets their stake back + provider's stake
    /// @param auditId ID of the expired audit
    function slashExpiredAudit(
        uint256 auditId
    ) external validAudit(auditId) whenNotPaused {
        Audit storage audit = audits[auditId];
        Batch storage batch = batches[audit.batchId];

        if (audit.responded) revert AlreadyResponded();
        if (block.timestamp <= audit.deadline) revert DeadlineNotPassed();

        audit.responded = true;
        audit.status = AuditStatus.EXPIRED;
        batch.audited = true;
        batch.auditStatus = AuditStatus.EXPIRED;

        // Return challenger's stake first
        _safeTransfer(audit.challenger, AUDIT_STAKE);

        // Slash provider and reward challenger
        _slashProvider(
            batch.modelId,
            audit.challenger,
            "Missed audit deadline"
        );

        emit AuditExpired(auditId, audit.batchId, msg.sender);
    }

    // ============================================
    // PHASE 4: USER DISPUTES
    // ============================================

    /// @notice Dispute when provider never batched a query (Type A fraud)
    /// @dev User must have a signed receipt from provider proving the query existed
    /// @dev Requires DISPUTE_STAKE which is returned + provider stake if valid, or forfeited if invalid
    /// @param modelId Model ID from receipt
    /// @param seqNum Sequence number from receipt
    /// @param timestamp Timestamp from receipt
    /// @param featuresHash Hash of features (for privacy, user doesn't reveal actual features)
    /// @param sensitiveAttr Sensitive attribute from receipt
    /// @param prediction Prediction from receipt (scaled by 1e6)
    /// @param providerSignature Provider's signature on the receipt data
    function disputeNonInclusion(
        uint256 modelId,
        uint256 seqNum,
        uint256 timestamp,
        bytes32 featuresHash,
        uint256 sensitiveAttr,
        int256 prediction,
        bytes calldata providerSignature
    ) external payable validModel(modelId) whenNotPaused {
        if (msg.value != DISPUTE_STAKE) revert InsufficientStake();

        Model storage model = models[modelId];

        // 1. Verify grace period has passed (give provider time to batch)
        if (block.timestamp < timestamp + DISPUTE_GRACE_PERIOD) {
            revert DisputeGracePeriodNotPassed();
        }

        // 2. Verify provider signature matches the receipt data
        _verifyReceiptAndComputeLeaf(
            seqNum,
            modelId,
            featuresHash,
            sensitiveAttr,
            prediction,
            timestamp,
            providerSignature,
            model.provider
        );

        // 3. Check that no batch contains this seqNum
        uint256[] memory modelBatches = batchesByModel[modelId];
        for (uint256 i = 0; i < modelBatches.length; i++) {
            Batch storage batch = batches[modelBatches[i]];
            if (seqNum >= batch.seqNumStart && seqNum <= batch.seqNumEnd) {
                // SeqNum IS in a batch - this dispute type doesn't apply
                // User should use disputeFraudulentInclusion instead
                // Forfeit dispute stake to provider for invalid dispute
                _safeTransfer(model.provider, msg.value);
                revert SeqNumAlreadyBatched();
            }
        }

        // 4. Provider failed to batch this query - return stake and slash provider
        _safeTransfer(msg.sender, msg.value); // Return disputer's stake
        emit DisputeRaised(modelId, msg.sender, seqNum, "Query never batched");
        _slashProvider(modelId, msg.sender, "Failed to batch user query");
    }

    /// @notice Dispute when provider batched wrong/tampered data (Type B fraud)
    /// @dev User must have a signed receipt from provider proving the query data
    /// @dev Contract computes leafHash from verified receipt data to prevent user manipulation
    /// @dev Requires DISPUTE_STAKE which is returned + provider stake if valid, or forfeited if invalid
    /// @param batchId The batch that claims to contain this query
    /// @param seqNum Sequence number from receipt
    /// @param timestamp Timestamp from receipt
    /// @param featuresHash Hash of features (for privacy, user doesn't reveal actual features)
    /// @param sensitiveAttr Sensitive attribute from receipt
    /// @param prediction Prediction from receipt (scaled by 1e6)
    /// @param providerSignature Provider's signature on the receipt data
    /// @param merkleProof Array of sibling hashes for Merkle proof
    /// @param proofPositions Array of positions (0=left, 1=right) for each sibling
    function disputeFraudulentInclusion(
        uint256 batchId,
        uint256 seqNum,
        uint256 timestamp,
        bytes32 featuresHash,
        uint256 sensitiveAttr,
        int256 prediction,
        bytes calldata providerSignature,
        bytes32[] calldata merkleProof,
        uint8[] calldata proofPositions
    ) external payable validBatch(batchId) whenNotPaused {
        if (msg.value != DISPUTE_STAKE) revert InsufficientStake();

        Batch storage batch = batches[batchId];
        uint256 modelId = batch.modelId;
        Model storage model = models[modelId];

        // 1. Verify seqNum is in this batch's claimed range
        if (seqNum < batch.seqNumStart || seqNum > batch.seqNumEnd) {
            revert SeqNumNotInBatchRange();
        }

        // 2. Verify provider signature and compute leafHash
        bytes32 leafHash = _verifyReceiptAndComputeLeaf(
            seqNum,
            modelId,
            featuresHash,
            sensitiveAttr,
            prediction,
            timestamp,
            providerSignature,
            model.provider
        );

        // 3. Verify Merkle proof FAILS against on-chain root
        if (_computeMerkleRoot(leafHash, merkleProof, proofPositions) == batch.merkleRoot) {
            // Proof is valid - provider included the data they signed
            _safeTransfer(model.provider, msg.value);
            revert ProofValid();
        }

        // 4. Merkle proof failed - provider provably lied
        _safeTransfer(msg.sender, msg.value); // Return disputer's stake
        emit DisputeRaised(modelId, msg.sender, seqNum, "Fraudulent batch inclusion");
        _slashProvider(modelId, msg.sender, "Committed tampered batch data");
    }

    /// @dev Verify provider signature on receipt data and compute leaf hash
    function _verifyReceiptAndComputeLeaf(
        uint256 seqNum,
        uint256 modelId,
        bytes32 featuresHash,
        uint256 sensitiveAttr,
        int256 prediction,
        uint256 timestamp,
        bytes calldata providerSignature,
        address expectedProvider
    ) internal pure returns (bytes32) {
        // Compute data hash (same as receipt encoding)
        bytes32 dataHash = keccak256(
            abi.encodePacked(
                seqNum,
                modelId,
                featuresHash,
                sensitiveAttr,
                prediction,
                timestamp
            )
        );

        // Verify provider signed this data
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(dataHash);
        address recoveredSigner = ECDSA.recover(ethSignedMessageHash, providerSignature);

        if (recoveredSigner != expectedProvider) revert InvalidSignature();

        // Return the leaf hash
        return dataHash;
    }

    /// @dev Compute Merkle root from leaf and proof
    function _computeMerkleRoot(
        bytes32 leaf,
        bytes32[] calldata proof,
        uint8[] calldata positions
    ) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            if (positions[i] == 0) {
                // Sibling is on the left
                computedHash = keccak256(abi.encodePacked(proof[i], computedHash));
            } else {
                // Sibling is on the right
                computedHash = keccak256(abi.encodePacked(computedHash, proof[i]));
            }
        }

        return computedHash;
    }

    // ============================================
    // STAKE MANAGEMENT
    // ============================================

    /// @dev Internal slashing function - sends stake to challenger
    function _slashProvider(
        uint256 modelId,
        address recipient,
        string memory reason
    ) internal {
        Model storage model = models[modelId];

        if (model.status == ModelStatus.SLASHED) return;

        uint256 slashAmount = model.stake;
        model.stake = 0;
        model.status = ModelStatus.SLASHED;

        _safeTransfer(recipient, slashAmount);

        emit ProviderSlashed(modelId, model.provider, slashAmount, reason);
    }

    /// @notice Withdraw stake if all batches audited and passed
    /// @param modelId ID of the model
    function withdrawStake(
        uint256 modelId
    ) external onlyProvider(modelId) validModel(modelId) whenNotPaused {
        Model storage model = models[modelId];

        if (model.status != ModelStatus.CERTIFIED) revert InvalidModelStatus();
        if (model.stake == 0) revert NoStakeToWithdraw();

        // Verify all batches are audited
        uint256[] memory modelBatches = batchesByModel[modelId];
        for (uint256 i = 0; i < modelBatches.length; i++) {
            Batch storage batch = batches[modelBatches[i]];
            if (!batch.audited || batch.auditStatus != AuditStatus.PASSED) {
                revert HasPendingAudits();
            }
        }

        uint256 amount = model.stake;
        model.stake = 0;

        _safeTransfer(msg.sender, amount);

        emit StakeWithdrawn(modelId, msg.sender, amount);
    }

    // ============================================
    // INTERNAL HELPERS
    // ============================================

    function _safeTransfer(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getModel(
        uint256 modelId
    ) external view validModel(modelId) returns (Model memory) {
        return models[modelId];
    }

    function getModelByWeightsHash(
        bytes32 weightsHash
    ) external view returns (Model memory model) {
        uint256 modelId = modelByWeightsHash[weightsHash];
        if (modelId == 0) revert ModelNotFound();
        return models[modelId];
    }

    function getAllModels() external view returns (Model[] memory _models) {
        _models = new Model[](modelCounter);
        for (uint256 i = 1; i <= modelCounter; i++) {
            _models[i - 1] = models[i];
        }
    }

    function getBatch(
        uint256 batchId
    ) external view validBatch(batchId) returns (Batch memory) {
        return batches[batchId];
    }

    function getAudit(
        uint256 auditId
    ) external view validAudit(auditId) returns (Audit memory) {
        return audits[auditId];
    }

    function getModelsByProvider(
        address provider
    ) external view returns (uint256[] memory) {
        return modelsByProvider[provider];
    }

    function getBatchesByModel(
        uint256 modelId
    ) external view validModel(modelId) returns (uint256[] memory) {
        return batchesByModel[modelId];
    }

    function getModelIdByWeightsHash(
        bytes32 weightsHash
    ) external view returns (uint256) {
        uint256 modelId = modelByWeightsHash[weightsHash];
        if (modelId == 0) revert ModelNotFound();
        return modelId;
    }

    function getTotalModels() external view returns (uint256) {
        return modelCounter;
    }

    function getTotalBatches() external view returns (uint256) {
        return batchCounter;
    }

    function getTotalAudits() external view returns (uint256) {
        return auditCounter;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    function setAttestationService(address newService) external onlyOwner {
        if (newService == address(0)) revert InvalidInput();
        address oldService = attestationService;
        attestationService = newService;
        emit AttestationServiceUpdated(oldService, newService);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
