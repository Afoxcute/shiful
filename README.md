# Smart Contract for Rock-Paper-Sissors on CoreDAO testnet

This is a decentralized Rock-Paper-Scissors Smart contract deployed on the CoreDao testnet & mainnet network. The Smart Contract acts as the intermediary that allows users to create and join games, track their move history, and view past game results, all while ensuring transparency and fairness through blockchain technology.

Try running some of the following tasks:

## Getting Started

To get started with the contract, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/contract.git
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

4. Open [[Testnet Contract on-chain](https://scan.test.btcs.network/address/0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1)](https://scan.test.btcs.network/address/0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1) in your browser to see the Contract on-chain.

5. Open [[Mainnet Contract on-chain](https://scan.coredao.org/address/0xaffc6Ec028d36796bc8E7f7F520d4bF61F6E14a0)](https://scan.coredao.org/address/0xaffc6Ec028d36796bc8E7f7F520d4bF61F6E14a0) in your browser to see the Contract on-chain.
