require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();
const { REACT_APP_API_URL, REACT_APP_PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.13",
  networks: {
     hardhat: {},
     goerli: {
       url: process.env.REACT_APP_API_URL_GOERLI_INFURA,
       accounts: ['0x' + process.env.REACT_APP_PRIVATE_KEY_GOERLI],
       allowUnlimitedContractSize: true,
       gas: 2000000,//20
       gasPrice: 8000000000,//800
     },
    //  sepolia: {
    //    url: process.env.REACT_APP_API_URL_SEPOLIA_INFURA,
    //    accounts: ['0x' + process.env.REACT_APP_PRIVATE_KEY_SEPOLIA],
    //    allowUnlimitedContractSize: true,
    //    gas: 2100000,//21
    //    gasPrice: 8000000000,//80
    //  },
    //  mainnet: {
    //    url: process.env.REACT_APP_API_URL_MAINNET,
    //    accounts: [process.env.REACT_APP_PRIVATE_KEY_MAINNET],
    //    gas: 1600000,
    //    gasPrice: 16000000000
    //  }
  },
  paths: {
    artifacts: "./src/backend/artifacts",
    sources: "./src/backend/contracts",
    cache: "./src/backend/cache",
    tests: "./src/backend/test"
  },
  etherscan: {
    apiKey: process.env.REACT_APP_ETHERSCAN_API_KEY
    // apiKey: process.env.REACT_APP_POLYGONSCAN_API_KEY
  }
};
