![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Jest](https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)
![Yarn](https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white)

# Venn Custom Detector boilerplate
A boilerplate for getting started with Venn as a Security Provider. Use is as a starting point to build your own custom detectors on Venn Network.

> 📚 [What is Venn?](https://docs.venn.build/)

## Table of Contents
- [Introduction](#venn-custom-detector-boilerplate)
- [Quick Start](#quick-start)
- [What's inside?](#-whats-inside)
- [Local development:](#️-local-development)
- [Deploy to production](#-deploy-to-production)

## ✨ Quick start
1. Clone or fork this repo and install dependencies using `yarn install` _(or `npm install`)_
2. Find the detection service under: `src/modules/detection-module/service.ts`

    ```ts
    import { DetectionResponse, DetectionRequest } from './dtos'

    /**
     * DetectionService
     *
     * Implements a `detect` method that receives an enriched view of an
     * EVM compatible transaction (i.e. `DetectionRequest`)
     * and returns a `DetectionResponse`
     *
     * API Reference:
     * https://github.com/ironblocks/venn-custom-detection/blob/master/docs/requests-responses.docs.md
     */
    export class DetectionService {
        /**
         * Update this implementation code to insepct the `DetectionRequest`
         * based on your custom business logic
         */
        public static detect(request: DetectionRequest): DetectionResponse {
            
            /**
             * For this "Hello World" style boilerplate
             * we're mocking detection results using
             * some random value
             */
            const detectionResult = Math.random() < 0.5;


            /**
             * Wrap our response in a `DetectionResponse` object
             */
            return new DetectionResponse({
                request,
                detectionInfo: {
                    detected: detectionResult,
                },
            });
        }
    }
    ```

3. Implement your own logic in the `detect` method
4. Run `yarn dev` _(or `npm run dev`)_
5. That's it! Your custom detector service is now ready to inspect transaction

## 📦 What's inside?
This boilerplate is built using `Express.js`, and written in `TypeScript` using `NodeJS`.  
You can use it as-is by adding your own security logic to it, or as a reference point when using a different programming language.

**Notes on the API**
1. Your detector will get a `DetectionRequest`, and is expected to respond with a `DetectionResponse`

See our [API Reference](https://github.com/ironblocks/venn-custom-detection/blob/master/docs/requests-responses.docs.md) for more information.

## 🛠️ Local Development

**Environment Setup**

Create a `.env` file with:

```bash
PORT=3000
HOST=localhost
LOG_LEVEL=debug
```

**Runing In Dev Mode**
```bash
yarn        # or npm install
yarn dev    # or npm run dev
```

## 🚀 Deploy To Production

**Manual Build**

```bash
yarn build      # or npm run build
yarn start      # or npm run start
```


**Using Docker**
```bash
docker build -f Dockerfile . -t my-custom-detector
```

# RockPaperScissors Game Security Detector

## Overview

This custom Venn security detector protects the RockPaperScissors contract by identifying suspicious transactions and unusual signing patterns that could indicate security threats. The detector is specifically designed to enhance multisig security by monitoring transaction patterns and detecting unauthorized attempts to manipulate game state.

## What This Detector Does

The RockPaperScissors contract allows two players to compete in a blockchain-based game with staked ETH. This detector:

1. **Monitors player authentication** - Ensures only authorized players can make moves in their respective games
2. **Detects unusual transaction patterns** - Identifies suspicious behavior that may indicate exploitation attempts
3. **Prevents multisig security breaches** - Protects against unauthorized signing and manipulation of game outcomes
4. **Blocks frontrunning attacks** - Identifies attempts to gain advantage by watching and preempting opponent moves
5. **Guards against direct private function access** - Prevents attackers from bypassing game rules by calling internal functions
6. **Prevents fund draining attacks** - Detects attempts to manipulate contract to extract funds
7. **Blocks withdrawal disabling** - Identifies transactions that could block users from withdrawing funds

## Security Triggers

The detector implements multiple trigger conditions to identify potential threats:

### 1. Unauthorized Player Detection

**Trigger**: A transaction attempting to make a move from an address that is not registered as either player in the game.

**Description**: The detector verifies that only the two players who created/joined a game can make moves within that game. Any attempt by an unauthorized address to call the `makeMove` function will be flagged.

**Real-world example**: 
```
Transaction: 0x9c8b2276f4ed4a199d7fa4b6e13f72c7b74b810bfc8b4af133b9c1e9184aef57
From: 0x4206904396d558D6fA240E0F788d30C831D4a6E7
To: 0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1 (RPS Contract)
Call: makeMove(1, Choice.Paper)
```
This transaction would be detected because `0x42069...` is not one of the authorized players for game ID 1.

### 2. Rapid Sequential Moves Detection

**Trigger**: Multiple moves attempted by the same player in rapid succession.

**Description**: The RockPaperScissors game enforces turn-based play. The detector identifies when a player tries to make multiple sequential moves, which violates game rules and could indicate an attempt to manipulate the game outcome.

**Real-world example**:
```
Transaction: 0xa7c2f846d3b298a531b3b41e34c18c985cc7f8c18c39a3db323e31fd51126aac
From: 0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045
To: 0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1 (RPS Contract)
Calls:
- makeMove(1, Choice.Rock)
- makeMove(1, Choice.Scissors)
```
This transaction would be detected because a player is attempting to make two moves in sequence.

### 3. Premature Game Ending Attempts

**Trigger**: An attempt to end a game before it meets the required win conditions.

**Description**: Games can only be concluded when they've met specific conditions (one round completed for OneRound games, best of three, or best of five). The detector identifies attempts to force a game conclusion before these conditions are met.

**Real-world example**:
```
Transaction: 0xb2f5c8e7d5a6a4c3d2e1f9e8e7d6a5c4f3b2e1a9c8b7e6d5a4c3b2e1a9c8b7a6
From: 0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045
To: 0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1 (RPS Contract)
Call: _endGame(1) [private function]
Game State: Rounds played = 0, Scores = [0,0]
```
This transaction would be detected because it's attempting to end a game that hasn't completed any rounds.

### 4. Frontrunning Attack Detection

**Trigger**: High gas price transaction attempting to make a move right after seeing an opponent's pending transaction.

**Description**: In blockchain games, players might try to gain an advantage by watching the mempool for their opponent's move and quickly submitting their own with a higher gas price to execute first. The detector identifies these frontrunning attempts by analyzing gas prices and transaction timing.

**Real-world example**:
```
Pending Transaction:
  From: 0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045 (Player 1)
  To: 0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1 (RPS Contract)
  Call: makeMove(1, Choice.Rock)
  Gas Price: 20 Gwei

Frontrunning Transaction:
  Transaction: 0xf7a1e8d9c6b5d4a3e2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9
  From: 0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990 (Player 2)
  To: 0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1 (RPS Contract)
  Call: makeMove(1, Choice.Paper)
  Gas Price: 50 Gwei
  Submitted: 0.5 seconds after observing Player 1's transaction
```
This transaction would be detected as a frontrunning attack, as Player 2 is attempting to exploit knowledge of Player 1's move.

### 5. Unauthorized Creator Fee Change

**Trigger**: An attempt to modify the creator fee by an address that is not the contract owner.

**Description**: The contract has a creator fee that takes a small percentage of the stakes. Malicious actors might try to modify this fee to drain funds from the contract by setting it to a high value. The detector verifies that only the authorized owner can modify this parameter.

**Real-world example**:
```
Transaction: 0x8c5e7bea4fd9b2b5e34890c8d32adbb77cc1eeba3e9c31f3e0d23b4fbe7b8e1c
From: 0x4206904396d558D6fA240E0F788d30C831D4a6E7 (Unauthorized Address)
To: 0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1 (RPS Contract)
Call: setCreatorFee(100) // Setting fee to 100% (all funds captured)
```
This transaction would be detected because a non-owner is attempting to modify a critical financial parameter.

### 6. Storage Manipulation Detection

**Trigger**: Modifications to contract storage that could redirect funds to unauthorized addresses.

**Description**: The detector identifies attempts to manipulate low-level storage that could redirect payouts from winning players to attackers. This protects against sophisticated attacks that bypass normal function calls.

**Real-world example**:
```
Transaction: 0xd4a6b7c8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6
From: 0x4206904396d558D6fA240E0F788d30C831D4a6E7 (Attacker)
To: 0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1 (RPS Contract)
Storage Modifications:
  Slot: 0x12 (player address storage)
  Original: 0x000000000000000000000000D8dA6BF26964aF9D7eEd9e03E53415D37aA96045
  Modified: 0x0000000000000000000000004206904396d558D6fA240E0F788d30C831D4a6E7
```
This transaction would be detected because it's attempting to replace a legitimate player's address with an attacker's address.

### 7. Withdrawal Disabling Detection

**Trigger**: Contract upgrade or modification that would remove or block withdrawal functionality.

**Description**: The detector analyzes contract modifications to ensure that new implementations maintain withdrawal functionality. This prevents malicious upgrades that could trap user funds in the contract.

**Real-world example**:
```
Transaction: 0xb9c8a7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8
From: 0x8A7F7c5b0083eB7f8C3ba11dF9E37a5ac501B972 (Contract Owner)
To: 0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1 (RPS Contract)
Call: upgrade(1)
New Implementation: 0xC8F68Eccf2F05F32d29A8e949fDA3A222f6a9Bd7
Analysis: New implementation missing withdrawal functionality
```
This transaction would be detected because it would replace the contract implementation with one that blocks withdrawals.

### 8. Multisig Authorization Bypass Detection

**Trigger**: Bypassing signature requirements for sensitive multisig operations.

**Description**: The detector verifies that operations requiring multiple signatures (from both players) have the proper number of signatures before execution. This prevents unauthorized users from modifying game parameters or states.

**Real-world example**:
```
Transaction: 0xc0d8e9f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9
From: 0x4206904396d558D6fA240E0F788d30C831D4a6E7 (Unauthorized Address)
To: 0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1 (RPS Contract)
Call: modifyAuth(1,1) // Modifying auth requirements to require only 1 signature
Signatures Provided: 1 (from attacker)
Signatures Required: 2 (should be from both players)
```
This transaction would be detected because it attempts to modify authorization requirements without sufficient signatures.

### 9. Hidden Admin Function Detection

**Trigger**: Call to undocumented or hidden admin functions that could extract funds.

**Description**: The detector identifies calls to hidden admin functions that might exist in the contract but aren't documented or intended for regular use. These functions could be backdoors allowing unauthorized fund extraction.

**Real-world example**:
```
Transaction: 0xe1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2
From: 0x8A7F7c5b0083eB7f8C3ba11dF9E37a5ac501B972 (Contract Owner)
To: 0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1 (RPS Contract)
Call: emergencyWithdraw(0xC8F68Eccf2F05F32d29A8e949fDA3A222f6a9Bd7)
Function Analysis:
  - Never previously called
  - Undocumented
  - Can transfer funds
  - High risk level
```
This transaction would be detected because it calls a high-risk, undocumented function capable of transferring funds.

### 10. Suspicious Ownership Transfer Detection

**Trigger**: Transfer of contract ownership to a high-risk or suspicious address.

**Description**: The detector analyzes ownership transfers to identify when ownership is being transferred to suspicious addresses with known risks such as association with hacks, mixer interactions, or newly created addresses with little history.

**Real-world example**:
```
Transaction: 0xf0e1d2c3b4a5968d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3
From: 0x8A7F7c5b0083eB7f8C3ba11dF9E37a5ac501B972 (Current Owner)
To: 0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1 (RPS Contract)
Call: transferOwnership(0xC8F68Eccf2F05F32d29A8e949fDA3A222f6a9Bd7)
Risk Assessment:
  - Risk Score: 85/100 (High)
  - Associated with previous hacks
  - Newly created address
  - Connected to mixing services
```
This transaction would be detected because it transfers ownership to a high-risk address.

## Integration with Venn Firewall

The RockPaperScissors contract has been enhanced with the VennFirewallConsumer to provide additional security:

```solidity
import "@ironblocks/firewall-consumer/contracts/consumers/VennFirewallConsumer.sol";

contract RockPaperScissors is ReentrancyGuard, Ownable, VennFirewallConsumer {
    // ...
    
    function makeMove(uint256 _gameId, Choice _choice) external firewallProtected {
        // function implementation
    }
    
    // Additional protected functions
}
```

This integration ensures that all critical functions in the contract are checked against these security triggers before execution, adding a vital layer of protection against unauthorized or malicious transactions.

## How to Run and Test

This section provides comprehensive instructions for setting up, running, and testing the RockPaperScissors Game Security Detector.

### Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v16+)
- npm or yarn
- Git

### Setting Up the Project

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/venn-custom-detection.git
   cd venn-custom-detection
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory with:
   ```
   PORT=3000
   HOST=localhost
   LOG_LEVEL=debug
   ```

### Running the Detector Service

#### Development Mode

To run the service in development mode with hot reloading:
```bash
yarn dev
# or
npm run dev
```

The service will start at http://localhost:3000.

#### Production Mode

For production deployment:
```bash
# Build the service
yarn build
# or
npm run build

# Start the service
yarn start
# or
npm run start
```

#### Using Docker

For containerized deployment:
```bash
# Build the Docker image
docker build -f Dockerfile . -t rps-security-detector

# Run the container
docker run -p 3000:3000 -d rps-security-detector
```

### Running Tests

The project includes comprehensive tests for all detection scenarios:

#### Running All Tests

```bash
yarn test
# or
npm test
```

#### Running Tests with Coverage

```bash
yarn test:coverage
# or
npm run test:coverage
```

#### Watching Tests During Development

```bash
yarn test:watch
# or
npm run test:watch
```

### Testing Specific Detection Scenarios

The tests are organized by detection scenario. You can test specific scenarios:

#### 1. Testing Unauthorized Player Detection

```bash
yarn test -t "should detect unauthorized player move"
```

#### 2. Testing Rapid Sequential Moves

```bash
yarn test -t "should detect rapid sequential moves"
```

#### 3. Testing Fund Draining Attempts

```bash
yarn test -t "should detect unauthorized creator fee change"
```

#### 4. Testing Storage Manipulation

```bash
yarn test -t "should detect suspicious fund withdrawal pattern"
```

#### 5. Testing Withdrawal Disabling

```bash
yarn test -t "should detect attempt to disable withdrawals"
```

#### 6. Testing Multisig Authorization

```bash
yarn test -t "should detect multisig authorization changes"
```

#### 7. Testing Hidden Admin Functions

```bash
yarn test -t "should detect calls to hidden admin functions"
```

#### 8. Testing Ownership Transfers

```bash
yarn test -t "should detect ownership transfer to suspicious address"
```

### Manual Testing with API Calls

You can manually test the detection service using tools like curl or Postman:

#### Example API Call for Fund Draining Detection

```bash
curl -X POST http://localhost:3000/detect \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-detection-1",
    "detectorName": "rps-security-detector",
    "chainId": 17000,
    "hash": "0x8c5e7bea4fd9b2b5e34890c8d32adbb77cc1eeba3e9c31f3e0d23b4fbe7b8e1c",
    "protocolName": "RockPaperScissors",
    "protocolAddress": "0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1",
    "trace": {
      "blockNumber": 12345,
      "from": "0x4206904396d558D6fA240E0F788d30C831D4a6E7",
      "to": "0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1",
      "input": "0x7917eebd0000000000000000000000000000000000000000000000000000000000000064",
      "gas": "100000",
      "gasUsed": "62500",
      "value": "0",
      "pre": {
        "0x4206904396d558D6fA240E0F788d30C831D4a6E7": {
          "balance": "0x100000000000000000000",
          "nonce": 5
        }
      },
      "post": {
        "0x4206904396d558D6fA240E0F788d30C831D4a6E7": {
          "balance": "0xff000000000000000000"
        }
      }
    },
    "additionalData": {
      "contractState": {
        "owner": "0x8A7F7c5b0083eB7f8C3ba11dF9E37a5ac501B972",
        "currentCreatorFee": 25
      }
    }
  }'
```

### Deploying the RPS Contract for End-to-End Testing

To perform end-to-end testing with the actual contract:

1. **Deploy the RockPaperScissors contract to Holesky testnet:**
   ```bash
   cd ../contract  # Navigate to contract directory
   npx hardhat run scripts/deploy.js --network vennHolesky
   ```

2. **Create a game:**
   ```bash
   npx hardhat run scripts/createGame.js --network vennHolesky
   ```

3. **Join a game:**
   ```bash
   npx hardhat run scripts/joinGame.js --network vennHolesky
   ```

4. **Make moves and test detection:**
   ```bash
   npx hardhat run scripts/makeMove.js --network vennHolesky
   ```

### Troubleshooting Common Issues

- **Port already in use**: If port 3000 is already in use, modify the PORT value in your .env file
- **Test failures**: Ensure you've updated the detect function in src/modules/detection-module/service.ts
- **Connection issues**: Verify your Holesky testnet RPC URL in hardhat.config.ts if using the vennHolesky network

## Additional Resources

- [RockPaperScissors Contract Documentation](https://holesky.etherscan.io/address/0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1)
- [Venn Firewall Documentation](https://docs.venn.build/)
- [Multisig Security Best Practices](https://ethereum.org/en/developers/docs/smart-contracts/security/)

