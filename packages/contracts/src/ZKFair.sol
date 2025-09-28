// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IVerifier} from "./Verifier.sol";

/**
 * @title ZKFair
 * @notice A simple zero-knowledge proof based AI model fairness verification system
 * @dev This contract manages AI model registration and fairness verification using ZK proofs
 */
contract ZKFair is Ownable {
    // State variables
    IVerifier public s_verifier;
    uint256 private s_modelCounter;

    // Enums
    enum ModelStatus {
        REGISTERED,
        VERIFIED,
        FAILED
    }

    // Structs
    struct Model {
        string name;
        address author;
        string description;
        bytes32 datasetMerkleRoot;
        bytes32 weightsHash;
        ModelStatus status;
        uint256 registrationTimestamp;
        uint256 verificationTimestamp;
        bytes32 proofHash;
    }

    // Storage mappings
    mapping(uint256 => Model) private s_models;
    mapping(address => uint256[]) private s_authorModels;

    // New mapping from weightsHash to modelId
    mapping(bytes32 => uint256) private s_modelByHash;

    // Events
    event ModelRegistered(
        uint256 indexed modelId,
        address indexed author,
        string name,
        bytes32 datasetMerkleRoot,
        bytes32 weightsHash
    );

    event ModelVerified(
        uint256 indexed modelId,
        bool passed,
        bytes32 proofHash
    );

    // Custom Errors
    error ZKFair__ModelNotFound();
    error ZKFair__UnauthorizedAccess();
    error ZKFair__InvalidProof();
    error ZKFair__ModelAlreadyExists();
    error ZKFair__InvalidInput();

    constructor(IVerifier _verifier) Ownable(msg.sender) {
        if (address(_verifier) == address(0)) revert ZKFair__InvalidInput();
        s_verifier = _verifier;
    }

    // Modifiers
    modifier onlyModelAuthor(uint256 modelId) {
        if (s_models[modelId].author != msg.sender)
            revert ZKFair__UnauthorizedAccess();
        _;
    }

    modifier modelExists(uint256 modelId) {
        if (modelId == 0 || modelId > s_modelCounter)
            revert ZKFair__ModelNotFound();
        _;
    }

    /**
     * @notice Register a new AI model
     * @param name The name of the model
     * @param description A description of the model
     * @param datasetMerkleRoot The merkle root of the training dataset
     * @param weightsHash The hash of the model weights
     * @return modelId The unique identifier for the registered model
     */
    function registerModel(
        string calldata name,
        string calldata description,
        bytes32 datasetMerkleRoot,
        bytes32 weightsHash
    ) external returns (uint256 modelId) {
        if (bytes(name).length == 0) revert ZKFair__InvalidInput();
        if (datasetMerkleRoot == bytes32(0)) revert ZKFair__InvalidInput();
        if (weightsHash == bytes32(0)) revert ZKFair__InvalidInput();

        // Check if model with this weightsHash already registered
        if (s_modelByHash[weightsHash] != 0)
            revert ZKFair__ModelAlreadyExists();

        // Increment counter and assign ID
        s_modelCounter++;
        modelId = s_modelCounter;

        // Initialize model struct
        Model storage newModel = s_models[modelId];
        newModel.name = name;
        newModel.author = msg.sender;
        newModel.description = description;
        newModel.datasetMerkleRoot = datasetMerkleRoot;
        newModel.weightsHash = weightsHash;
        newModel.status = ModelStatus.REGISTERED;
        newModel.registrationTimestamp = block.timestamp;

        // Update hash to model mapping
        s_modelByHash[weightsHash] = modelId;

        // Add to author's model list
        s_authorModels[msg.sender].push(modelId);

        emit ModelRegistered(
            modelId,
            msg.sender,
            name,
            datasetMerkleRoot,
            weightsHash
        );
    }

    /**
     * @notice Get proof verification status by weights hash
     * @param weightsHash The hash of the model weights
     * @return status ModelStatus enum value: 0=REGISTERED, 1=VERIFIED, 2=FAILED
     */
    function getProofStatusByWeightsHash(
        bytes32 weightsHash
    ) external view returns (ModelStatus status) {
        uint256 modelId = s_modelByHash[weightsHash];
        if (modelId == 0) {
            revert ZKFair__ModelNotFound();
        }
        return s_models[modelId].status;
    }

    /**
     * @notice Submit a ZK proof to verify model fairness
     * @param modelId The ID of the model to verify
     * @param proof The ZK proof bytes
     * @param publicInputs Public inputs for the proof
     */
    function verifyModel(
    uint256 modelId,
    bytes calldata proof,
    bytes32[] calldata publicInputs
) external modelExists(modelId) returns (bool) {
    // Verify the ZK proof
    bool proofValid = s_verifier.verify(proof, publicInputs);
    bytes32 proofHash = keccak256(proof);
    Model storage model = s_models[modelId];
    
    if (proofValid) {
        model.status = ModelStatus.VERIFIED;
    } else {
        model.status = ModelStatus.FAILED;
    }
    
    model.verificationTimestamp = block.timestamp;
    model.proofHash = proofHash;
    
    emit ModelVerified(modelId, proofValid, proofHash);
    
    // Return the verification result
    return proofValid;
}


    /**
     * @notice Get details of a specific model
     * @param modelId The ID of the model to retrieve
     * @return model The model struct
     */
    function getModel(
        uint256 modelId
    ) external view modelExists(modelId) returns (Model memory model) {
        return s_models[modelId];
    }

    /**
     * @notice Get model details by weights hash
     * @param weightsHash The hash of the model weights
     * @return model The model struct
     */
    function getModelByHash(
        bytes32 weightsHash
    ) external view returns (Model memory model) {
        uint256 modelId = s_modelByHash[weightsHash];
        if (modelId == 0) {
            revert ZKFair__ModelNotFound();
        }
        return s_models[modelId];
    }

    /**
     * @notice Get all registered models
     * @return models Array of all models
     */
    function getAllModels() external view returns (Model[] memory models) {
        models = new Model[](s_modelCounter);
        for (uint256 i = 1; i <= s_modelCounter; i++) {
            models[i - 1] = s_models[i];
        }
    }

    /**
     * @notice Get models registered by a specific author
     * @param author The address of the model author
     * @return modelIds Array of model IDs belonging to the author
     */
    function getModelsByAuthor(
        address author
    ) external view returns (uint256[] memory) {
        return s_authorModels[author];
    }

    /**
     * @notice Get total number of registered models
     * @return count The total count of registered models
     */
    function getTotalModels() external view returns (uint256) {
        return s_modelCounter;
    }

    /**
     * @notice Set a new verifier contract (only owner)
     * @param newVerifier The new verifier contract address
     */
    function setVerifier(IVerifier newVerifier) external onlyOwner {
        if (address(newVerifier) == address(0)) revert ZKFair__InvalidInput();
        s_verifier = newVerifier;
    }
}
