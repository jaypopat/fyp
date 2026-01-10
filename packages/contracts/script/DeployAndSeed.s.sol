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
            "http://localhost:5000", // Provider base URL
            0x09c72f51dff5a78d0789300c09349b0ee875c6463f047b19399b1d2a81f9b91a, // weightsHash
            0x26e414c47934b725e2aade6e0b0ee15be48f8c6710c7dd0629e5d9a07fab1489, // datasetMerkleRoot
            10 // fairnessThreshold (10%)
        );
        console.log("Model 1 registered with inference URL");

        console.log("Seeded sample models successfully");

        vm.stopBroadcast();
    }
}
