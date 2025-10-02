// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import {HonkVerifier} from "../src/Verifier.sol";
import "../src/ZKFair.sol";

contract DeployAndSeed is Script {
    function run() external {
        // Start broadcasting transactions on Anvil or specified RPC
        vm.startBroadcast();

        // Deploy Verifier contract
        HonkVerifier verifier = new HonkVerifier();

        console.log("Verifier deployed at:", address(verifier));

        ZKFair zkfair = new ZKFair((verifier));
        console.log("ZKFair deployed at:", address(zkfair));

        zkfair.registerModel(
            "Loan Approval Classifier",
            "ML model for predicting loan approvals with fairness constraints",
            0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef, // dataset merkle root
            0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890 // weights hash
        );

        // Model 2: Hiring Recommendation Model
        zkfair.registerModel(
            "Hiring Recommendation System",
            "AI system for candidate screening with bias mitigation",
            0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1, // dataset merkle root
            0xbcdef12345678901bcdef12345678901bcdef12345678901bcdef12345678901 // weights hash
        );

        // Model 3: Credit Scoring Model
        zkfair.registerModel(
            "Credit Risk Assessment",
            "Neural network for credit risk evaluation ensuring demographic parity",
            0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef12, // dataset merkle root
            0xcdef123456789012cdef123456789012cdef123456789012cdef123456789012 // weights hash
        );

        console.log("Seeded 3 sample models successfully");

        vm.stopBroadcast();
    }
}
