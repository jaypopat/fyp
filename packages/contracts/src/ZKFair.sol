// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import {IVerifier} from "./Verifier.sol";

/// @title ZKFair - Zero-Knowledge Fairness Auditing for ML Models
/// @notice Implements OATH protocol: Certification, Query Batching, Continuous Auditing
contract ZKFair is Ownable, ReentrancyGuard, Pausable {
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    IVerifier public verifier;
    
    uint256 private modelCounter;
    uint256 private batchCounter;
    uint256 private auditCounter;
    
    // ============================================
    // CONSTANTS
    // ============================================
    
    uint256 public constant PROVIDER_STAKE = 10 ether;
    uint256 public constant AUDIT_RESPONSE_DEADLINE = 24 hours;
    uint256 public constant REQUIRED_SAMPLES = 100;
    
    // ============================================
    // ENUMS
    // ============================================
    
    enum ModelStatus { REGISTERED, CERTIFIED, SLASHED }
    enum AuditStatus { PENDING, PASSED, FAILED, EXPIRED }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    /// @notice Phase 1: Model Registration & Certification
    struct Model {
        string name;
        address provider;
        string description;
        bytes32 weightsHash;
        bytes32 datasetMerkleRoot;
        uint256 fairnessThreshold;      // Scaled by 100 (e.g., 10 = 0.10 = 10%)
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
        uint256 timestampStart;
        uint256 timestampEnd;
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
    
    event ModelRegistered(uint256 indexed modelId, address indexed provider, bytes32 weightsHash, uint256 fairnessThreshold);
    event ModelCertified(uint256 indexed modelId, bytes32 proofHash);
    event BatchCommitted(uint256 indexed batchId, uint256 indexed modelId, bytes32 merkleRoot, uint256 queryCount);
    event AuditRequested(uint256 indexed auditId, uint256 indexed batchId, uint256[] sampleIndices, uint256 deadline);
    event AuditProofSubmitted(uint256 indexed auditId, bool passed);
    event AuditExpired(uint256 indexed auditId, uint256 indexed batchId, address indexed slasher);
    event ProviderSlashed(uint256 indexed modelId, address indexed provider, uint256 amount, string reason);
    event StakeWithdrawn(uint256 indexed modelId, address indexed provider, uint256 amount);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    
    // ============================================
    // ERRORS
    // ============================================
    
    error InvalidInput();
    error ModelNotFound();
    error BatchNotFound();
    error AuditNotFound();
    error UnauthorizedAccess();
    error InsufficientStake();
    error InvalidProof();
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
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address _verifier) Ownable(msg.sender) {
        if (_verifier == address(0)) revert InvalidInput();
        verifier = IVerifier(_verifier);
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
    /// @return modelId Unique identifier for the model
    function registerModel(
        string calldata name,
        string calldata description,
        bytes32 weightsHash,
        bytes32 datasetMerkleRoot,
        uint256 fairnessThreshold
    ) external payable whenNotPaused nonReentrant returns (uint256 modelId) {
        if (bytes(name).length == 0 || weightsHash == bytes32(0) || datasetMerkleRoot == bytes32(0)) {
            revert InvalidInput();
        }
        if (fairnessThreshold == 0 || fairnessThreshold > 100) revert InvalidInput();
        if (msg.value != PROVIDER_STAKE) revert InsufficientStake();
        if (modelByWeightsHash[weightsHash] != 0) revert ModelAlreadyExists();
        
        modelId = ++modelCounter;
        
        models[modelId] = Model({
            name: name,
            description: description,
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
        
        emit ModelRegistered(modelId, msg.sender, weightsHash, fairnessThreshold);
    }
    
    /// @notice Submit ZK proof that model satisfies fairness on calibration dataset D_val
    /// @param modelId ID of the registered model
    /// @param proof Noir ZK proof bytes
    /// @param publicInputs Public inputs: [weightsHash, datasetMerkleRoot, fairnessThreshold]
    function submitCertificationProof(
        uint256 modelId,
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external onlyProvider(modelId) validModel(modelId) whenNotPaused {
        Model storage model = models[modelId];
        
        if (model.status != ModelStatus.REGISTERED) revert InvalidModelStatus();
        
        bool valid = verifier.verify(proof, publicInputs);
        if (!valid) revert InvalidProof();
        
        model.status = ModelStatus.CERTIFIED;
        model.verifiedAt = block.timestamp;
        model.certificationProofHash = keccak256(proof);
        
        emit ModelCertified(modelId, model.certificationProofHash);
    }
    
    // ============================================
    // PHASE 2: QUERY BATCH COMMITMENT
    // ============================================
    
    /// @notice Commit a batch of queries served to clients
    /// @param modelId ID of the certified model used
    /// @param merkleRoot Merkle root of (query, output) pairs
    /// @param queryCount Number of queries in batch
    /// @param timestampStart Unix timestamp of first query
    /// @param timestampEnd Unix timestamp of last query
    /// @return batchId Unique identifier for the batch
    function commitBatch(
        uint256 modelId,
        bytes32 merkleRoot,
        uint256 queryCount,
        uint256 timestampStart,
        uint256 timestampEnd
    ) external onlyProvider(modelId) validModel(modelId) whenNotPaused returns (uint256 batchId) {
        Model storage model = models[modelId];
        
        if (model.status != ModelStatus.CERTIFIED) revert InvalidModelStatus();
        if (merkleRoot == bytes32(0) || queryCount == 0) revert InvalidInput();
        if (timestampEnd < timestampStart) revert InvalidInput();
        
        batchId = ++batchCounter;
        
        batches[batchId] = Batch({
            modelId: modelId,
            merkleRoot: merkleRoot,
            queryCount: queryCount,
            timestampStart: timestampStart,
            timestampEnd: timestampEnd,
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
    /// @param batchId ID of the batch to audit
    /// @return auditId Unique identifier for the audit
    function requestAudit(uint256 batchId)
        external
        validBatch(batchId)
        whenNotPaused
        returns (uint256 auditId)
    {
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
        uint256 seed = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            batchId,
            msg.sender,
            block.timestamp,
            auditCounter
        )));
        
        // Generate REQUIRED_SAMPLES random indices within batch range
        uint256[] memory sampleIndices = new uint256[](REQUIRED_SAMPLES);
        for (uint256 i = 0; i < REQUIRED_SAMPLES; i++) {
            uint256 randomNumber = uint256(keccak256(abi.encodePacked(seed, i)));
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

    
    /// @notice Provider submits ZK proof responding to audit
    /// @param auditId ID of the audit request
    /// @param proof Noir ZK proof bytes
    /// @param publicInputs Public inputs: [batchMerkleRoot, modelWeightsHash, fairnessThreshold]
    function submitAuditProof(
        uint256 auditId,
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external validAudit(auditId) nonReentrant {
        Audit storage audit = audits[auditId];
        Batch storage batch = batches[audit.batchId];
        Model storage model = models[batch.modelId];
        
        if (model.provider != msg.sender) revert UnauthorizedAccess();
        if (audit.responded) revert AlreadyResponded();
        if (block.timestamp > audit.deadline) revert DeadlinePassed();
        
        bool valid = verifier.verify(proof, publicInputs);
        
        audit.responded = true;
        audit.proofHash = keccak256(proof);
        batch.audited = true;
        
        if (valid) {
            audit.status = AuditStatus.PASSED;
            batch.auditStatus = AuditStatus.PASSED;
        } else {
            audit.status = AuditStatus.FAILED;
            batch.auditStatus = AuditStatus.FAILED;
            _slashProvider(batch.modelId, audit.challenger, "Invalid audit proof");
        }
        
        emit AuditProofSubmitted(auditId, valid);
    }
    
    /// @notice Slash provider for missing audit deadline (permissionless)
    /// @dev Anyone can call after deadline - challenger gets slashed stake as reward
    /// @param auditId ID of the expired audit
    function slashExpiredAudit(uint256 auditId) external validAudit(auditId) nonReentrant {
        Audit storage audit = audits[auditId];
        Batch storage batch = batches[audit.batchId];
        
        if (audit.responded) revert AlreadyResponded();
        if (block.timestamp <= audit.deadline) revert DeadlineNotPassed();
        
        audit.responded = true;
        audit.status = AuditStatus.EXPIRED;
        batch.audited = true;
        batch.auditStatus = AuditStatus.EXPIRED;
        
        // Slash and reward challenger
        _slashProvider(batch.modelId, audit.challenger, "Missed audit deadline");
        
        emit AuditExpired(auditId, audit.batchId, msg.sender);
    }
    
    // ============================================
    // STAKE MANAGEMENT
    // ============================================
    
    /// @dev Internal slashing function - sends stake to challenger
    function _slashProvider(uint256 modelId, address recipient, string memory reason) internal {
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
    function withdrawStake(uint256 modelId)
        external
        onlyProvider(modelId)
        validModel(modelId)
        nonReentrant
    {
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
    
    function getModel(uint256 modelId) external view validModel(modelId) returns (Model memory) {
        return models[modelId];
    }

    function getModelByWeightsHash(bytes32 weightsHash)
        external
        view
        returns (Model memory model)
    {
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
    function getBatch(uint256 batchId) external view validBatch(batchId) returns (Batch memory) {
        return batches[batchId];
    }
    
    function getAudit(uint256 auditId) external view validAudit(auditId) returns (Audit memory) {
        return audits[auditId];
    }
    
    function getModelsByProvider(address provider) external view returns (uint256[] memory) {
        return modelsByProvider[provider];
    }
    
    function getBatchesByModel(uint256 modelId) external view validModel(modelId) returns (uint256[] memory) {
        return batchesByModel[modelId];
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
    
    function setVerifier(address newVerifier) external onlyOwner {
        if (newVerifier == address(0)) revert InvalidInput();
        address oldVerifier = address(verifier);
        verifier = IVerifier(newVerifier);
        emit VerifierUpdated(oldVerifier, newVerifier);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}
