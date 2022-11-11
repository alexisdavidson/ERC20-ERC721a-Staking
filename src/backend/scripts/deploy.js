// Before deploy:
// -Fill whitelist addresses with correct data!
// -Team Wallet mainnet: 0x61603b8A09C2Aa8f663B43c22C9ceBeC00FC6FeC
// -Team Wallet rinkeby: 0xA8095a8AB93D7cad255248D1D685D4a9F9eF2621

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Fill with correct data and uncomment the correct network before deploy!
  // const teamWallet = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"; // localhost
  const teamWallet = "0xD71E736a7eF7a9564528D41c5c656c46c18a2AEd"; // goerli
  // const teamWallet = "0x61603b8A09C2Aa8f663B43c22C9ceBeC00FC6FeC"; // mainnet
  
  // Fill with correct data and uncomment the correct network before deploy!
  // const whitelistAddresses = [teamWallet, "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"] // localhost
  const whitelistAddresses = [teamWallet] // goerli
  // const whitelistAddresses = [teamWallet] // mainnet
  
  const NFT = await ethers.getContractFactory("NFT");
  const Token = await ethers.getContractFactory("Token");
  const NFTStaker = await ethers.getContractFactory("NFTStaker");
  const nft = await NFT.deploy(teamWallet, whitelistAddresses);
  console.log("NFT contract address", nft.address)
  const nftStaker = await NFTStaker.deploy(nft.address);
  console.log("NFTStaker contract address", nftStaker.address)
  const token = await Token.deploy([nftStaker.address, teamWallet], [73000000, 149000000]);
  console.log("Token contract address", token.address)
  await nftStaker.setOwnerAndTokenAddress(teamWallet, token.address);
  console.log("setOwnerAndTokenAddress call done")
  
  saveFrontendFiles(nft, "NFT");
  saveFrontendFiles(token, "Token");
  saveFrontendFiles(nftStaker, "NFTStaker");

  console.log("Frontend files saved")
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
