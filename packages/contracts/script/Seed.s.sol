// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ZKFair.sol";
import "../src/Verifier.sol";

contract SeedModels is Script {
    ZKFair public zkFair;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy or connect to existing contract
        address zkFairAddress = vm.envAddress("ZKFAIR_CONTRACT_ADDRESS");
        zkFair = ZKFair(zkFairAddress);

        // Seed multiple models
        seedSampleModels();

        vm.stopBroadcast();
    }

    function seedSampleModels() internal {
        // Model 1: Loan Approval Model
        zkFair.registerModel(
            "Loan Approval Classifier",
            "ML model for predicting loan approvals with fairness constraints",
            0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef, // dataset merkle root
            0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890 // weights hash
        );

        // Model 2: Hiring Recommendation Model
        zkFair.registerModel(
            "Hiring Recommendation System",
            "AI system for candidate screening with bias mitigation",
            0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1, // dataset merkle root
            0xbcdef12345678901bcdef12345678901bcdef12345678901bcdef12345678901 // weights hash
        );

        // Model 3: Credit Scoring Model
        zkFair.registerModel(
            "Credit Risk Assessment",
            "Neural network for credit risk evaluation ensuring demographic parity",
            0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef12, // dataset merkle root
            0xcdef123456789012cdef123456789012cdef123456789012cdef123456789012 // weights hash
        );

        console.log("Seeded 3 sample models successfully");
    }
}
