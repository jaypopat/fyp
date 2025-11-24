// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/ZKFair.sol";

contract DeployAndSeed is Script {
    function run() external {
        vm.startBroadcast();

        ZKFair zkfair = new ZKFair(
            address(0xa0Ee7A142d267C1f36714E4a8F75612F20a79720)
        );
        console.log("ZKFair deployed at:", address(zkfair));

        uint256 stake = zkfair.PROVIDER_STAKE();
        console.log("Required stake per model:", stake);

        // Seed a demo model with inference URL
        zkfair.registerModel{value: stake}(
            "Adult Income Prediction Model",
            "Logistic regression model predicting income >50K from census data",
            "https://provider-api.fyp.jaypopat.me", // Inference URL
            0x1371d09ac9cd9cea9637e46bead0cda0e0c804c133876b2cf7aa6c28a549f8cb, // weightsHash
            0x0eceed11cf3d5b91da339bbddde4b538053b7cbe446b93b1b77780bd89ba0e62, // datasetMerkleRoot
            10 // fairnessThreshold (10%)
        );
        console.log("Model 1 registered with inference URL");

        console.log("Seeded sample models successfully");

        vm.stopBroadcast();
    }
}
