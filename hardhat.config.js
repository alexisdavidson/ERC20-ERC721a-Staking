require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();
const { REACT_APP_API_URL, REACT_APP_PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.4",
  networks: {
     hardhat: {},
     ropsten: {
        url: REACT_APP_API_URL,
        accounts: [`0x${REACT_APP_PRIVATE_KEY}`]
     },
     rinkeby: {
       url: process.env.REACT_APP_API_URL_RINKEBY,
       accounts: ['0x' + process.env.REACT_APP_PRIVATE_KEY_RINKEBY],
       allowUnlimitedContractSize: true,
       gas: 2100000,
       gasPrice: 8000000000,
     },
     matic: {
       url: process.env.REACT_APP_API_URL_MATIC,
       accounts: ['0x' + process.env.REACT_APP_PRIVATE_KEY_MATIC]
     },
     mumbai: {
       url: process.env.REACT_APP_API_URL_MUMBAI,
       accounts: ['0x' + process.env.REACT_APP_PRIVATE_KEY_MUMBAI],
       gas: 2100000,
       gasPrice: 8000000000
     }
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
