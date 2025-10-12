## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
forge script script/DeployAndSeed.s.sol:DeployAndSeed \
  --rpc-url wss://ethereum-sepolia-rpc.publicnode.com \
  --broadcast \
  --interactives 1
```
The `--interactives 1` flag will prompt you to paste your private key securely.

**Alternative: Using Alchemy/Infura with verification:**
```shell
forge script script/DeployAndSeed.s.sol:DeployAndSeed \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key YOUR_ETHERSCAN_API_KEY \
  --interactives 1
```

**Test locally first:**
```shell
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy to local node
forge script script/DeployAndSeed.s.sol:DeployAndSeed \
  --rpc-url http://localhost:8545 \
  --broadcast
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
