require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "london"
    }
  },
  networks: {
    coreDAO: {
      url: "https://core-testnet.drpc.org",
      accounts: [process.env.YOUR_PRIVATE_KEY],
      // chainId: 5000
      gasPrice: 1000000000, // 1 gwei
      gas: 2100000,
      timeout: 60000
    }
  },
};
