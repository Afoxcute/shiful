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

### 5. Unusual Stake Pattern Detection

**Trigger**: Automated creation of multiple games with identical stake amounts in rapid succession.

**Description**: The detector identifies patterns that suggest bot-driven or automated exploitation, such as creating many games with identical stakes at regular intervals.

**Real-world example**:
```
Multiple Transactions from 0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045:
- 12:00:05 - createGame(BestOfFive) with 0.0001 ETH
- 12:00:15 - createGame(BestOfFive) with 0.0001 ETH
- 12:00:25 - createGame(BestOfFive) with 0.0001 ETH
- 12:00:35 - createGame(BestOfFive) with 0.0001 ETH
- 12:00:45 - createGame(BestOfFive) with 0.0001 ETH
- 12:00:55 - createGame(BestOfFive) with 0.0001 ETH
```
This pattern would be detected because the stake amounts are identical and the timing is suspiciously consistent.

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

#### 3. Testing Premature Game Ending

```bash
yarn test -t "should detect attempt to end game prematurely"
```

#### 4. Testing Frontrunning Detection

```bash
yarn test -t "should detect potential frontrunning attack"
```

#### 5. Testing Unusual Stake Patterns

```bash
yarn test -t "should detect unusual stake patterns"
```

### Manual Testing with API Calls

You can manually test the detection service using tools like curl or Postman:

#### Example API Call

```bash
curl -X POST http://localhost:3000/detect \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-detection-1",
    "detectorName": "rps-multisig-detector",
    "chainId": 17000,
    "hash": "0x9c8b2276f4ed4a199d7fa4b6e13f72c7b74b810bfc8b4af133b9c1e9184aef57",
    "protocolName": "RockPaperScissors",
    "protocolAddress": "0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1",
    "trace": {
      "blockNumber": 12345,
      "from": "0x4206904396d558D6fA240E0F788d30C831D4a6E7",
      "to": "0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1",
      "input": "0x57a33a7c0000000000000000000000000000000000000000000000000000000000000001",
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
      "gameState": {
        "gameId": 1,
        "players": ["0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990"],
        "isActive": true
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

- [RockPaperScissors Contract Documentation](https://scan.test.btcs.network/address/0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1)
- [Venn Firewall Documentation](https://docs.venn.build/)
- [Multisig Security Best Practices](https://ethereum.org/en/developers/docs/smart-contracts/security/)

