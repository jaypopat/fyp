// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ZKFair} from "../src/ZKFair.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract ZKFairTest is Test {
    ZKFair public zkFair;

    // Test accounts
    address public owner;
    uint256 public ownerKey;
    address public provider;
    uint256 public providerKey;
    address public attestationService;
    uint256 public attestationKey;
    address public challenger;
    uint256 public challengerKey;
    address public user;
    uint256 public userKey;

    // Test data
    bytes32 public weightsHash = keccak256("test_weights");
    bytes32 public datasetMerkleRoot = keccak256("test_dataset");
    uint256 public fairnessThreshold = 10; // 10%
    string public modelName = "Test Model";
    string public modelDescription = "A test model";
    string public inferenceUrl = "https://api.test.com/predict";

    function setUp() public {
        // Create test accounts with known private keys
        (owner, ownerKey) = makeAddrAndKey("owner");
        (provider, providerKey) = makeAddrAndKey("provider");
        (attestationService, attestationKey) = makeAddrAndKey("attestation");
        (challenger, challengerKey) = makeAddrAndKey("challenger");
        (user, userKey) = makeAddrAndKey("user");

        // Fund accounts
        vm.deal(owner, 100 ether);
        vm.deal(provider, 100 ether);
        vm.deal(challenger, 100 ether);
        vm.deal(user, 100 ether);

        // Deploy contract
        vm.prank(owner);
        zkFair = new ZKFair(attestationService);
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function _registerModel() internal returns (uint256 modelId) {
        vm.startPrank(provider);
        modelId = zkFair.registerModel{value: zkFair.PROVIDER_STAKE()}(
            modelName,
            modelDescription,
            inferenceUrl,
            weightsHash,
            datasetMerkleRoot,
            fairnessThreshold
        );
        vm.stopPrank();
    }

    function _certifyModel(uint256 /* modelId */) internal {
        // Create attestation hash
        bytes32 attestationHash = keccak256("proof_data");

        // Sign the attestation
        bytes32 messageHash = keccak256(
            abi.encodePacked(weightsHash, attestationHash, "TRAINING_CERT")
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attestationKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.startPrank(provider);
        zkFair.submitCertificationProof(weightsHash, attestationHash, signature);
        vm.stopPrank();
    }

    function _commitBatch(uint256 modelId) internal returns (uint256 batchId) {
        bytes32 merkleRoot = keccak256("batch_merkle_root");
        uint256 queryCount = 100;
        uint256 seqNumStart = 1;
        uint256 seqNumEnd = 100;

        vm.startPrank(provider);
        batchId = zkFair.commitBatch(modelId, merkleRoot, queryCount, seqNumStart, seqNumEnd);
        vm.stopPrank();
    }

    function _requestAudit(uint256 batchId) internal returns (uint256 auditId) {
        vm.startPrank(challenger);
        auditId = zkFair.requestAudit{value: zkFair.AUDIT_STAKE()}(batchId);
        vm.stopPrank();
    }

    function _signAuditAttestation(uint256 auditId, bytes32 attestationHash, bool passed)
        internal view returns (bytes memory signature)
    {
        bytes32 messageHash = keccak256(
            abi.encodePacked(uint256(auditId), attestationHash, passed, "AUDIT")
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attestationKey, ethSignedMessageHash);
        signature = abi.encodePacked(r, s, v);
    }

    // ============================================
    // MODEL REGISTRATION TESTS
    // ============================================

    function test_registerModel_success() public {
        uint256 modelId = _registerModel();

        assertEq(modelId, 1);
        ZKFair.Model memory model = zkFair.getModel(modelId);
        assertEq(model.name, modelName);
        assertEq(model.provider, provider);
        assertEq(model.weightsHash, weightsHash);
        assertEq(model.stake, zkFair.PROVIDER_STAKE());
        assertEq(uint(model.status), uint(ZKFair.ModelStatus.REGISTERED));
    }

    function test_registerModel_insufficientStake() public {
        vm.startPrank(provider);
        vm.expectRevert(ZKFair.InsufficientStake.selector);
        zkFair.registerModel{value: 0}(
            modelName,
            modelDescription,
            inferenceUrl,
            weightsHash,
            datasetMerkleRoot,
            fairnessThreshold
        );
        vm.stopPrank();
    }

    function test_registerModel_duplicateWeightsHash() public {
        _registerModel();

        // Use a different provider to avoid confusion
        address provider2 = makeAddr("provider2");
        vm.deal(provider2, 1 ether);

        // Get stake value BEFORE expectRevert
        uint256 stake = zkFair.PROVIDER_STAKE();

        vm.startPrank(provider2);
        vm.expectRevert(ZKFair.ModelAlreadyExists.selector);
        zkFair.registerModel{value: stake}(
            "Another Model",
            modelDescription,
            inferenceUrl,
            weightsHash, // Same weights hash
            datasetMerkleRoot,
            fairnessThreshold
        );
        vm.stopPrank();
    }

    // ============================================
    // CERTIFICATION TESTS
    // ============================================

    function test_submitCertificationProof_success() public {
        uint256 modelId = _registerModel();
        _certifyModel(modelId);

        ZKFair.Model memory model = zkFair.getModel(modelId);
        assertEq(uint(model.status), uint(ZKFair.ModelStatus.CERTIFIED));
        assertTrue(model.verifiedAt > 0);
    }

    function test_submitCertificationProof_invalidSignature() public {
        _registerModel();

        bytes32 attestationHash = keccak256("proof_data");

        // Sign with wrong key
        bytes32 messageHash = keccak256(
            abi.encodePacked(weightsHash, attestationHash, "TRAINING_CERT")
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(providerKey, ethSignedMessageHash); // Wrong key!
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.startPrank(provider);
        vm.expectRevert(ZKFair.InvalidSignature.selector);
        zkFair.submitCertificationProof(weightsHash, attestationHash, signature);
        vm.stopPrank();
    }

    // ============================================
    // BATCH COMMITMENT TESTS
    // ============================================

    function test_commitBatch_success() public {
        uint256 modelId = _registerModel();
        uint256 batchId = _commitBatch(modelId);

        assertEq(batchId, 1);
        ZKFair.Batch memory batch = zkFair.getBatch(batchId);
        assertEq(batch.modelId, modelId);
        assertEq(batch.queryCount, 100);
    }

    function test_commitBatch_notProvider() public {
        uint256 modelId = _registerModel();

        vm.startPrank(challenger); // Not the provider
        vm.expectRevert(ZKFair.UnauthorizedAccess.selector);
        zkFair.commitBatch(modelId, keccak256("root"), 100, 1, 100);
        vm.stopPrank();
    }

    // ============================================
    // AUDIT STAKING TESTS
    // ============================================

    function test_requestAudit_requiresStake() public {
        uint256 modelId = _registerModel();
        uint256 batchId = _commitBatch(modelId);

        vm.startPrank(challenger);
        vm.expectRevert(ZKFair.InsufficientStake.selector);
        zkFair.requestAudit{value: 0}(batchId); // No stake
        vm.stopPrank();
    }

    function test_requestAudit_wrongStakeAmount() public {
        uint256 modelId = _registerModel();
        uint256 batchId = _commitBatch(modelId);

        // Get stake value BEFORE expectRevert
        uint256 auditStake = zkFair.AUDIT_STAKE();

        vm.startPrank(challenger);
        vm.expectRevert(ZKFair.InsufficientStake.selector);
        zkFair.requestAudit{value: auditStake - 1}(batchId); // Too little
        vm.stopPrank();
    }

    function test_requestAudit_success() public {
        uint256 modelId = _registerModel();
        uint256 batchId = _commitBatch(modelId);
        uint256 auditId = _requestAudit(batchId);

        assertEq(auditId, 1);
        ZKFair.Audit memory audit = zkFair.getAudit(auditId);
        assertEq(audit.batchId, batchId);
        assertEq(audit.challenger, challenger);
    }

    function test_submitAuditProof_passed_providerGetsStake() public {
        uint256 modelId = _registerModel();
        uint256 batchId = _commitBatch(modelId);
        uint256 auditId = _requestAudit(batchId);

        uint256 providerBalanceBefore = provider.balance;

        bytes32 attestationHash = keccak256("audit_proof");
        bytes memory signature = _signAuditAttestation(auditId, attestationHash, true);

        vm.startPrank(provider);
        zkFair.submitAuditProof(auditId, attestationHash, signature, true);
        vm.stopPrank();

        // Provider should receive challenger's stake
        assertEq(provider.balance, providerBalanceBefore + zkFair.AUDIT_STAKE());

        ZKFair.Audit memory audit = zkFair.getAudit(auditId);
        assertEq(uint(audit.status), uint(ZKFair.AuditStatus.PASSED));
    }

    function test_submitAuditProof_failed_challengerGetsStakes() public {
        uint256 modelId = _registerModel();
        uint256 batchId = _commitBatch(modelId);
        uint256 auditId = _requestAudit(batchId);

        uint256 challengerBalanceBefore = challenger.balance;

        bytes32 attestationHash = keccak256("audit_proof");
        bytes memory signature = _signAuditAttestation(auditId, attestationHash, false);

        vm.startPrank(provider);
        zkFair.submitAuditProof(auditId, attestationHash, signature, false);
        vm.stopPrank();

        // Challenger should get their stake back + provider's stake
        assertEq(
            challenger.balance,
            challengerBalanceBefore + zkFair.AUDIT_STAKE() + zkFair.PROVIDER_STAKE()
        );

        ZKFair.Audit memory audit = zkFair.getAudit(auditId);
        assertEq(uint(audit.status), uint(ZKFair.AuditStatus.FAILED));

        // Provider should be slashed
        ZKFair.Model memory model = zkFair.getModel(modelId);
        assertEq(uint(model.status), uint(ZKFair.ModelStatus.SLASHED));
    }

    function test_slashExpiredAudit_challengerGetsStakes() public {
        uint256 modelId = _registerModel();
        uint256 batchId = _commitBatch(modelId);
        uint256 auditId = _requestAudit(batchId);

        uint256 challengerBalanceBefore = challenger.balance;

        // Warp past deadline
        vm.warp(block.timestamp + zkFair.AUDIT_RESPONSE_DEADLINE() + 1);

        // Anyone can call slashExpiredAudit
        vm.startPrank(user);
        zkFair.slashExpiredAudit(auditId);
        vm.stopPrank();

        // Challenger should get their stake back + provider's stake
        assertEq(
            challenger.balance,
            challengerBalanceBefore + zkFair.AUDIT_STAKE() + zkFair.PROVIDER_STAKE()
        );

        ZKFair.Audit memory audit = zkFair.getAudit(auditId);
        assertEq(uint(audit.status), uint(ZKFair.AuditStatus.EXPIRED));
    }

    function test_slashExpiredAudit_beforeDeadline_reverts() public {
        uint256 modelId = _registerModel();
        uint256 batchId = _commitBatch(modelId);
        uint256 auditId = _requestAudit(batchId);

        // Try to slash before deadline
        vm.startPrank(user);
        vm.expectRevert(ZKFair.DeadlineNotPassed.selector);
        zkFair.slashExpiredAudit(auditId);
        vm.stopPrank();
    }

    // ============================================
    // DISPUTE STAKING TESTS
    // ============================================

    function test_disputeNonInclusion_requiresStake() public {
        uint256 modelId = _registerModel();

        // Create a valid signature from provider
        uint256 seqNum = 1;
        uint256 timestamp = block.timestamp;
        bytes32 featuresHash = keccak256("features");
        uint256 sensitiveAttr = 0;
        int256 prediction = 1000000;

        bytes32 dataHash = keccak256(
            abi.encodePacked(seqNum, modelId, featuresHash, sensitiveAttr, prediction, timestamp)
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(dataHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(providerKey, ethSignedMessageHash);
        bytes memory providerSignature = abi.encodePacked(r, s, v);

        // Skip time past grace period
        vm.warp(block.timestamp + zkFair.DISPUTE_GRACE_PERIOD() + 1);

        vm.startPrank(user);
        vm.expectRevert(ZKFair.InsufficientStake.selector);
        zkFair.disputeNonInclusion{value: 0}(
            modelId,
            seqNum,
            timestamp,
            featuresHash,
            sensitiveAttr,
            prediction,
            providerSignature
        );
        vm.stopPrank();
    }

    function test_disputeFraudulentInclusion_requiresStake() public {
        uint256 modelId = _registerModel();
        uint256 batchId = _commitBatch(modelId);

        vm.startPrank(user);
        vm.expectRevert(ZKFair.InsufficientStake.selector);
        zkFair.disputeFraudulentInclusion{value: 0}(
            batchId,
            1,
            keccak256("leaf"),
            new bytes32[](0),
            new uint8[](0)
        );
        vm.stopPrank();
    }

    // ============================================
    // STAKE WITHDRAWAL TESTS
    // ============================================

    function test_withdrawStake_allBatchesPassed() public {
        uint256 modelId = _registerModel();
        _certifyModel(modelId);
        uint256 batchId = _commitBatch(modelId);
        uint256 auditId = _requestAudit(batchId);

        // Submit passing audit proof
        bytes32 attestationHash = keccak256("audit_proof");
        bytes memory signature = _signAuditAttestation(auditId, attestationHash, true);

        vm.startPrank(provider);
        zkFair.submitAuditProof(auditId, attestationHash, signature, true);
        vm.stopPrank();

        uint256 providerBalanceBefore = provider.balance;

        vm.startPrank(provider);
        zkFair.withdrawStake(modelId);
        vm.stopPrank();

        // Provider should get their original stake back
        assertEq(
            provider.balance,
            providerBalanceBefore + zkFair.PROVIDER_STAKE()
        );

        ZKFair.Model memory model = zkFair.getModel(modelId);
        assertEq(model.stake, 0);
    }

    function test_withdrawStake_pendingAudits_reverts() public {
        uint256 modelId = _registerModel();
        _certifyModel(modelId);
        _commitBatch(modelId);

        // No audit submitted, batch not audited
        vm.startPrank(provider);
        vm.expectRevert(ZKFair.HasPendingAudits.selector);
        zkFair.withdrawStake(modelId);
        vm.stopPrank();
    }
}
