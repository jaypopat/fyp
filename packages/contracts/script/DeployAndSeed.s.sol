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
            "Adult Income Prediction Model",
            "Logistic regression model predicting income >50K from census data",
            0x1f75fb2aff513736500541e7504a3a6e651badbd0238c25babf0df981f799c9c, // weightsHash
            0xe6c2624756b634074c90eacb7950f6950fb7b4f41db5898b24ccd35e8b698a73, // datasetMerkleRoot
            10  // fairnessThreshold (10%)
        );
        console.log("Model 1 registered");

        // // Model 2: Hiring Recommendation Model
        // zkfair.registerModel{value: stake}(
        //     "Hiring Recommendation System",
        //     "A model to recommend candidates for hiring",
        //     0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1,
        //     0xbcdef12345678901bcdef12345678901bcdef12345678901bcdef12345678901,
        //     10
        // );
        // console.log("Model 2 registered");

        // // Model 3: Credit Scoring Model
        // zkfair.registerModel{value: stake}(
        //     "Credit Risk Assessment",
        //     "A model to assess credit risk of individuals",
        //     0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef12,
        //     0xcdef123456789012cdef123456789012cdef123456789012cdef123456789012,
        //     10
        // );
        // console.log("Model 3 registered");

        console.log("Seeded sample models successfully");

        vm.stopBroadcast();
    }
}
