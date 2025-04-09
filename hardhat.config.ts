require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");

// Reading vennURL from the VENN_NODE_URL env variable
// allows you to easily switch between the real endpoint
// and the mock-rejection endpoint, without making changes
// to your DApp's code
const vennURL = process.env.VENN_NODE_URL || "https://signer2.testnet.venn.build/api/17000/sign";

module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "london",
      optimizer: {
        enabled: true,
        runs: 200  // Lower value prioritizes smaller contract size over execution gas cost
      }
    }
  },
  networks: {
    shiful: {
      url: "https://core-testnet.drpc.org",
      accounts: [process.env.YOUR_PRIVATE_KEY],
      // chainId: 5000
      gasPrice: 1000000000, // 1 gwei
      gas: 2100000,
      timeout: 60000
    },
    vennHolesky: {
      url: vennURL,
      accounts: [process.env.YOUR_PRIVATE_KEY],
      chainId: 17000,
      gasPrice: 1000000000, // 1 gwei
      timeout: 60000
    }
  },
};
