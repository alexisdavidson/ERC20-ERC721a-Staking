// Before deploy:
// transfer ownership to? (add code)
// -Wallet address of the team for the 333 NFTs? mainnet: 0x61603b8A09C2Aa8f663B43c22C9ceBeC00FC6FeC
// team rinkeby test account: 0xCdb34512BD8123110D20852ebEF947275f7fD1Ce
// -Whitelist addresses?
// -gelato token name and symbol
// -gelato nft symbol

async function main() {

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy contracts
  const NFT = await ethers.getContractFactory("NFT");
  const Token = await ethers.getContractFactory("Token");
  const NFTStaker = await ethers.getContractFactory("NFTStaker");
  // const nft = await NFT.deploy("0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", ["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"]); // (localhost) Fill with correct input before deploy!
  const nft = await NFT.deploy("0xCdb34512BD8123110D20852ebEF947275f7fD1Ce", ["0xCdb34512BD8123110D20852ebEF947275f7fD1Ce", "0x1e85F8DAd89e993A2c290B846F48B62B151da8af", "0xA8095a8AB93D7cad255248D1D685D4a9F9eF2621", "0x1354075Cd28774e7D952F3Bb786F17959d8C6B61"]); // (rinkeby) Fill with correct input before deploy!
  console.log("NFT contract address", nft.address)
  const nftStaker = await NFTStaker.deploy(nft.address);
  console.log("NFTStaker contract address", nftStaker.address)
  const token = await Token.deploy([nftStaker.address], [222000000]);
  console.log("Token contract address", token.address)
  await nftStaker.setTokenAddress(token.address);
  console.log("setTokenAddress")
  
  // For each contract, pass the deployed contract and name to this function to save a copy of the contract ABI and address to the front end.
  saveFrontendFiles(nft, "NFT");
  saveFrontendFiles(token, "Token");
  saveFrontendFiles(nftStaker, "NFTStaker");
}

function saveFrontendFiles(contract, name) {
  const fs = require("fs");
  const contractsDir = __dirname + "/../../frontend/contractsData";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + `/${name}-address.json`,
    JSON.stringify({ address: contract.address }, undefined, 2)
  );

  const contractArtifact = artifacts.readArtifactSync(name);

  fs.writeFileSync(
    contractsDir + `/${name}.json`,
    JSON.stringify(contractArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
