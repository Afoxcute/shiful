# Smart Contract for Rock-Paper-Sissors on venn testnet

This is a decentralized Rock-Paper-Scissors Smart contract deployed on the shiful testnet & mainnet network. The Smart Contract acts as the intermediary that allows users to create and join games, track their move history, and view past game results, all while ensuring transparency and fairness through blockchain technology.

Try running some of the following tasks:

## Getting Started

To get started with the contract, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/shiful.git
   cd contracts
   Edit hardhat.config.ts and change the URL(which is the RPC URL) as desired.
   ```

2. Install the dependencies:
   ```bash
   npm install or yarn install
   create .env file and add YOUR_PRIVATE_KEY to it
   ```

3. Compile & Deploy Contract:
   ```bash
   npx hardhat compile
   npx hardhat run ./scripts/deploy.js
   ```

## Custom Security Detection

The project includes a custom Venn security detection module that monitors transactions for potential security threats. This detection module is designed to protect the Rock-Paper-Scissors contract by identifying various attack patterns before transactions are executed.

### Key Security Features

The detection module implements several checks, including:

1. **Sandwich Attack Detection** - Identifies transactions that are part of a sandwich attack pattern targeting high-stake games
2. **Time-Bandit Attack Detection** - Detects blockchain reorganization attacks that could manipulate game outcomes
3. **JIT Liquidity Attack Detection** - Identifies temporary liquidity provision attacks to extract fees
4. **Multisig Validation Bypass Detection** - Prevents attempts to circumvent the two-player validation requirement
5. **Oracle Manipulation Detection** - Identifies abnormal volatility in external oracles used by the game
6. **Generalized Frontrunning Detection** - Detects malicious copying of player moves with higher gas fees

### Time-Bandit Attack Implementation

The time-bandit attack detection has been enhanced with proper null checking for the reorganization depth:

```typescript
// Time-bandit attack detection with proper null check for reorgDepth
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

This implementation ensures that the `reorgDepth` value is properly checked with `!== undefined` rather than a simple truthy check. This is critical because a valid reorganization depth of `0` would incorrectly evaluate to `false` in a truthy check, but is a defined value that should be properly evaluated when comparing to the threshold of `2`.

### Using the Detection Module

The custom detection module works alongside the Venn Firewall to protect the contract from malicious transactions. The contract implements the `VennFirewallConsumer` interface and applies the `firewallProtected` modifier to critical functions:

```solidity
import "@ironblocks/firewall-consumer/contracts/consumers/VennFirewallConsumer.sol";

contract RockPaperScissors is ReentrancyGuard, Ownable, VennFirewallConsumer {
    // Contract implementation
    
    function createGame(GameType _gameType) external payable firewallProtected returns (uint256) {
        // Function implementation
    }
    
    function joinGame(uint256 _gameId) external payable firewallProtected {
        // Function implementation
    }
    
    function makeMove(uint256 _gameId, Choice _choice) external firewallProtected {
        // Function implementation
    }
}
```

For more details on the detection module, see the [custom detection README](./venn-custom-detection/README.md).