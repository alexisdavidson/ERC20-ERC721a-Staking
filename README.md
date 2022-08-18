# Gelato (Hardhat-Solidity-React)
This app lets you connect your MetaMask wallet and allows you to mint and stake Gelato NFTs

## Technology Stack
The smart contracts are developed using solidity and following [OpenZeppelin ERC721a](https://github.com/chiru-labs/ERC721A).

The front-end part is developed using React.js.

The front-end communicates with the blockchain using ethers and Web3.

The tests are written supported by Waffle Hardhat and using chai assertion library.

## Dependencies
Install the dependencies with:
```
npm install
npm install react-router-dom@6
npm install ipfs-http-client@56.0.1
npm i @openzeppelin/contracts@4.5.0
```

## Run the app
```
npm run start
```

## Deploy smart contracts
```
npx hardhat run src/backend/scripts/deploy.js --network localhost
```

## Run tests
```
npx hardhat test
```

## Connect MetaMask
Into metamask, click on the top network tab, scroll down and click custom RPC. The RPC url in our case is http://localhost:8545 and the chain ID is 31337.
