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

3. Compile & Deploy Contract
   ```bash
   npx hardhat compile
   npx hardhat run ./scripts/deploy.js
   ```