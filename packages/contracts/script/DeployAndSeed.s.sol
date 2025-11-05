// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import {HonkVerifier} from "../src/Verifier.sol";
import "../src/ZKFair.sol";

contract DeployAndSeed is Script {
    function run() external {
        // Start broadcasting transactions
        vm.startBroadcast();

        // Deploy Verifier contract
        HonkVerifier verifier = new HonkVerifier();
        console.log("Verifier deployed at:", address(verifier));

        // Deploy ZKFair contract
        ZKFair zkfair = new ZKFair(address(verifier));
        console.log("ZKFair deployed at:", address(zkfair));

        uint256 stake = zkfair.PROVIDER_STAKE();  // Get required stake (10 ether)
        console.log("Required stake per model:", stake);

        // Model 1: Loan Approval Classifier
        zkfair.registerModel{value: stake}(
            "Loan Approval Classifier",
            "A model to classify loan applications",
            0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef, // weightsHash
            0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890, // datasetMerkleRoot
            10  // fairnessThreshold (10%)
        );
        console.log("Model 1 registered");

        // Model 2: Hiring Recommendation Model
        zkfair.registerModel{value: stake}(
            "Hiring Recommendation System",
            "A model to recommend candidates for hiring",
            0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1,
            0xbcdef12345678901bcdef12345678901bcdef12345678901bcdef12345678901,
            10
        );
        console.log("Model 2 registered");

        // Model 3: Credit Scoring Model
        zkfair.registerModel{value: stake}(
            "Credit Risk Assessment",
            "A model to assess credit risk of individuals",
            0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef12,
            0xcdef123456789012cdef123456789012cdef123456789012cdef123456789012,
            10
        );
        console.log("Model 3 registered");

        console.log("Seeded 3 sample models successfully");

        vm.stopBroadcast();
    }
}
