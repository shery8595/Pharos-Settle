require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ override: true });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
  },
  mocha: {
    require: ["tsx/cjs"],
    spec: ["test/contracts/**/*.test.cjs", "test/integration/**/*.test.cjs"],
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    pharos: {
      url: process.env.PHAROS_RPC_URL ?? "https://atlantic.dplabs-internal.com",
      chainId: 688689,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
