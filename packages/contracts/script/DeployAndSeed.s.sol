// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/ZKFair.sol";
import {TrainingVerifier} from "../src/TrainingVerifier.sol";
import {FairnessVerifier} from "../src/FairnessVerifier.sol";

contract DeployAndSeed is Script {
    function run() external {
        vm.startBroadcast();

        TrainingVerifier trainingVerifier = new TrainingVerifier();
        console.log("Training Verifier deployed at:", address(trainingVerifier));

        FairnessVerifier fairnessVerifier = new FairnessVerifier();
        console.log("Fairness Verifier deployed at:", address(fairnessVerifier));

        ZKFair zkfair = new ZKFair(address(trainingVerifier), address(fairnessVerifier));
        console.log("ZKFair deployed at:", address(zkfair));

        uint256 stake = zkfair.PROVIDER_STAKE();
        console.log("Required stake per model:", stake);

        zkfair.registerModel{value: stake}(
            "Adult Income Prediction Model",
            "Logistic regression model predicting income >50K from census data",
            0x1f75fb2aff513736500541e7504a3a6e651badbd0238c25babf0df981f799c9c,
            0xe6c2624756b634074c90eacb7950f6950fb7b4f41db5898b24ccd35e8b698a73,
            10
        );
        console.log("Model 1 registered");

        console.log("Seeded sample models successfully");

        vm.stopBroadcast();
    }
}