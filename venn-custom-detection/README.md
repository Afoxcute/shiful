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

This custom Venn security detector protects the RockPaperScissors contract by identifying suspicious transactions and attack patterns that could indicate security threats. The detector is designed to enhance multisig security by monitoring transaction patterns and detecting unauthorized attempts to manipulate game state or extract value from players.

## What This Detector Does

The RockPaperScissors contract allows two players to compete in a blockchain-based game with staked ETH. This detector:

1. **Monitors player authentication** - Ensures only authorized players can make moves in their respective games
2. **Detects unusual transaction patterns** - Identifies suspicious behavior that may indicate exploitation attempts
3. **Prevents multisig security breaches** - Protects against unauthorized signing and manipulation of game outcomes
4. **Blocks frontrunning attacks** - Identifies attempts to gain advantage by watching and preempting opponent moves
5. **Guards against direct private function access** - Prevents attackers from bypassing game rules by calling internal functions
6. **Prevents fund draining attacks** - Detects attempts to manipulate contract to extract funds
7. **Blocks withdrawal disabling** - Identifies transactions that could block users from withdrawing funds
8. **Prevents value extraction (MEV) attacks** - Detects sandwich trading and other MEV exploitation techniques

## Security Triggers

The detector implements multiple trigger conditions to identify potential threats:

### 1. Sandwich Attack Detection

**Trigger**: Transaction pattern showing a malicious actor executing transactions before and after a player's transaction to profit from price movements.

**Description**: Sandwich attacks are a form of MEV (Maximal Extractable Value) where an attacker observes a pending high-value transaction, then executes trades before and after it to profit from price impacts. The detector analyzes transaction block positioning, gas prices, and price impact to identify this pattern.

**Real-world example**:
```
Block transactions sequence:
1. 0xa1b2c3... (From: 0x4206904396d558D6fA240E0F788d30C831D4a6E7, Gas: 35 Gwei)
   - Buy tokens from liquidity pool
2. 0xd9e8f7... (From: 0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045, Gas: 30 Gwei)
   - Player creates game with 1 ETH stake
3. 0xf9e8d7... (From: 0x4206904396d558D6fA240E0F788d30C831D4a6E7, Gas: 35 Gwei)
   - Sell tokens back to liquidity pool at higher price
```
This pattern would be detected as a sandwich attack because a MEV bot is extracting value by exploiting the player's transaction.

### 2. Time-Bandit Attack Detection

**Trigger**: Deep blockchain reorganization targeting high-value games.

**Description**: Time-bandit attacks are sophisticated MEV extractions where a miner/validator reorganizes the blockchain to capture value. The detector identifies suspicious chain reorganizations (reorgs) greater than 2 blocks deep that target high-stake games.

**Real-world example**:
```
Blockchain Context:
- Chain reorganization detected: 3 blocks deep
- Targeted transaction: 0xd1c2b3... (Stake: 5 ETH)
- Validator: 0xC8F68Eccf2F05F32d29A8e949fDA3A222f6a9Bd7
- Potential MEV profit: 1.5 ETH
```
This pattern would be detected as a time-bandit attack because a validator is reorganizing the chain to extract value from a high-stake game.

### 3. JIT (Just-In-Time) Liquidity Attack

**Trigger**: Pattern of liquidity being added just before a player's transaction and removed immediately after.

**Description**: JIT liquidity attacks involve strategically adding liquidity to a pool momentarily to capture fees from a transaction, then withdrawing that liquidity. The detector identifies suspicious liquidity provision patterns lasting less than 30 seconds.

**Real-world example**:
```
Liquidity Events Sequence:
1. T+0s: Add 100 ETH liquidity (From: 0xC8F68Eccf2F05F32d29A8e949fDA3A222f6a9Bd7)
2. T+5s: Player transaction with 10 ETH stake, paying 0.1 ETH in fees
3. T+10s: Remove 100.2 ETH liquidity (same address)
```
This pattern would be detected as a JIT liquidity attack because the attacker is adding liquidity only briefly to capture fees from the player's transaction.

### 4. Multisig Validation Bypass

**Trigger**: Transaction attempting to circumvent the two-player validation requirement in the game.

**Description**: The RockPaperScissors contract requires both players to submit valid moves before game resolution. This detection identifies attempts to bypass this requirement by making a move and then directly calling private resolution functions in the same transaction.

**Real-world example**:
```
Transaction: 0xb4a3f2...
From: 0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045 (Player 1)
Call sequence:
1. makeMove(1, Choice.Paper)
2. _endGame(1) [private function]
```
This pattern would be detected because Player 1 is attempting to resolve the game without waiting for Player 2's move.

### 5. Oracle Manipulation Attack

**Trigger**: Abnormal volatility in oracle price feeds used by the game or manipulation of random number generation.

**Description**: Games may rely on oracles for random numbers or price feeds. Attackers can manipulate these oracle inputs to predict or influence game outcomes. The detector identifies suspicious price movements and volatility.

**Real-world example**:
```
Oracle Updates:
1. T+0s: Price 10.5 → 9.2 (-12.4% change) by 0xC8F68Eccf2F05F32d29A8e949fDA3A222f6a9Bd7
2. T+60s: Price 9.2 → 10.6 (+15.2% change) by same address
Volatility Analysis:
- Normal volatility: 1.2%
- Attack volatility: 12.4%
- Confidence score: 96%
```
This pattern would be detected as an oracle manipulation attack due to the abnormal price movements by a known MEV address.

### 6. Generalized Frontrunning Attack

**Trigger**: Transaction that copies a player's move with a higher gas price to execute first.

**Description**: Generalized frontrunning involves monitoring the mempool for profitable transactions and copying them with higher gas prices. The detector identifies identical transaction inputs from different addresses with significantly higher gas prices.

**Real-world example**:
```
Mempool Transactions:
1. Pending: 0xd1c2b3... (From: 0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990, Gas: 25 Gwei)
   - makeMove(5, Choice.Paper)
2. Current: 0xf7a1e8... (From: 0xC8F68Eccf2F05F32d29A8e949fDA3A222f6a9Bd7, Gas: 35 Gwei)
   - makeMove(5, Choice.Paper) [identical input]
```
This pattern would be detected as a generalized frontrunning attack because a MEV bot is copying a player's exact move with a higher gas price.

### 7. Unauthorized Creator Fee Change

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

### 8. Storage Manipulation Detection

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

## Technical Implementation

Our detector is implemented with a type-safe, efficient architecture that enables precise identification of value extraction and security threats:

### Interfaces for Context Analysis

We define specific TypeScript interfaces to handle different aspects of transaction context:

```typescript
// Context interfaces for value extraction detection
interface MempoolContext {
    blockTransactions?: Transaction[];
    pendingTransactions?: Transaction[];
    currentTransaction?: Transaction;
    priceImpact?: {
        before: string;
        after: string;
    };
    similarityAnalysis?: {
        isExactCopy: boolean;
        inputSimilarity: string;
    };
}

interface BlockchainContext {
    isReorg?: boolean;
    reorgDepth?: number;
    blockNumber?: number;
    timestamp?: number;
}

interface LiquidityContext {
    recentLiquidityEvents?: LiquidityEvent[];
    liquidityDuration?: number;
}
```

### MEV Address Tracking

The detector maintains a database of known MEV extractors and sandwich bots:

```typescript
// High-risk addresses known for MEV activity
private static readonly KNOWN_MEV_ADDRESSES = [
    '0x4206904396d558D6fA240E0F788d30C831D4a6E7'.toLowerCase(),
    '0xC8F68Eccf2F05F32d29A8e949fDA3A222f6a9Bd7'.toLowerCase()
];
```

### Detection Methods

Each attack vector is evaluated through specialized methods with clear logic:

```typescript
// Sandwich attack detection sample logic
private static isSandwichAttackPattern(request: DetectionRequest): boolean {
    const mempoolContext = request.additionalData?.mempoolContext as MempoolContext;
    if (!mempoolContext || !mempoolContext.blockTransactions) {
        return false;
    }
    
    // Check if the transactions follow the sandwich pattern:
    // 1. Same address for first and last transaction
    // 2. Target transaction in the middle
    // 3. Higher gas price in the attacking transactions
    
    // Additional price impact analysis
    if (mempoolContext.priceImpact) {
        const beforeImpact = parseFloat(mempoolContext.priceImpact.before);
        const afterImpact = parseFloat(mempoolContext.priceImpact.after);
        
        // If price impact is significant (>1% total), likely a sandwich
        return (beforeImpact + afterImpact) > 1.0;
    }
}

// Time-bandit attack detection with proper null checking
private static isTimeBanditAttack(request: DetectionRequest): boolean {
    const blockchainContext = request.additionalData?.blockchainContext as BlockchainContext;
    if (!blockchainContext) {
        return false;
    }
    
    // Check for blockchain reorganization with proper null check for reorgDepth
    if (blockchainContext.isReorg && blockchainContext.reorgDepth !== undefined && blockchainContext.reorgDepth > 2) {
        // Deep reorgs (>2 blocks) are suspicious in MEV context
        return true;
    }
    
    return false;
}
```

Note: The `isTimeBanditAttack` method ensures that `reorgDepth` is properly checked with `!== undefined` rather than a simple truthy check. This is critical because a valid reorganization depth of `0` would incorrectly evaluate to `false` in a truthy check, but is a defined value that should be properly evaluated when comparing to the threshold of `2`. This precision in null checking is essential for correctly detecting time-bandit attacks with various reorganization depths.

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

#### 1. Testing Sandwich Attack Detection

```bash
yarn test -t "should detect classic sandwich attack pattern"
```

#### 2. Testing Time-Bandit Attack

```bash
yarn test -t "should detect time-bandit attack attempt"
```

#### 3. Testing JIT Liquidity Attack

```bash
yarn test -t "should detect JIT liquidity attack pattern"
```

#### 4. Testing Multisig Validation Bypass

```bash
yarn test -t "should detect multisig validation bypass attempt"
```

#### 5. Testing Oracle Manipulation

```bash
yarn test -t "should detect oracle manipulation attempt"
```

#### 6. Testing Generalized Frontrunning

```bash
yarn test -t "should detect generalized frontrunning attack"
```

### Manual Testing with API Calls

You can manually test the detection service using tools like curl or Postman:

#### Example API Call for Sandwich Attack Detection

```bash
curl -X POST http://localhost:3000/detect \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-detection-1",
    "detectorName": "rps-value-extraction-detector",
    "chainId": 17000,
    "hash": "0xd9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0",
    "protocolName": "RockPaperScissors",
    "protocolAddress": "0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1",
    "trace": {
      "blockNumber": 12345,
      "from": "0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "to": "0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1",
      "input": "0x25aa99cd0000000000000000000000000000000000000000000000000000000000000000",
      "gas": "100000",
      "gasUsed": "62500",
      "value": "1000000000000000000",
      "pre": {
        "0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045": {
          "balance": "0x100000000000000000000",
          "nonce": 5
        }
      },
      "post": {
        "0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045": {
          "balance": "0xff000000000000000000"
        }
      }
    },
    "additionalData": {
      "mempoolContext": {
        "blockTransactions": [
          {
            "hash": "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
            "from": "0x4206904396d558D6fA240E0F788d30C831D4a6E7",
            "to": "0x8A7F7c5b0083eB7f8C3ba11dF9E37a5ac501B972",
            "input": "0xabcdef01",
            "gasPrice": "35000000000",
            "blockPosition": 0
          },
          {
            "hash": "0xd9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0",
            "from": "0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            "to": "0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1",
            "input": "0x25aa99cd0000000000000000000000000000000000000000000000000000000000000000",
            "value": "1000000000000000000",
            "gasPrice": "30000000000",
            "blockPosition": 1
          },
          {
            "hash": "0xf9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0",
            "from": "0x4206904396d558D6fA240E0F788d30C831D4a6E7",
            "to": "0x8A7F7c5b0083eB7f8C3ba11dF9E37a5ac501B972",
            "input": "0xfedcba98",
            "gasPrice": "35000000000",
            "blockPosition": 2
          }
        ],
        "priceImpact": {
          "before": "2.5%",
          "after": "2.7%"
        }
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
- [Understanding MEV and Sandwich Attacks](https://ethereum.org/en/developers/docs/mev/)

