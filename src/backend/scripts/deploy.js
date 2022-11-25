async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Fill with correct data and uncomment the correct network before deploy!
  // const teamWallet = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"; // localhost
  let teamWallet = "0xCdb34512BD8123110D20852ebEF947275f7fD1Ce"; // goerli
  teamWallet = "0xD71E736a7eF7a9564528D41c5c656c46c18a2AEd" // my team wallet for testing purposes
  // const teamWallet = "0x61603b8A09C2Aa8f663B43c22C9ceBeC00FC6FeC"; // mainnet
  
  // Fill with correct data and uncomment the correct network before deploy!
  const whitelistRoot = "0xed939e2a170a445cc0494ffda5aa1df52a6c50a393e6bdd0be9bc5f3dd99eaf3" // goerli
  // const whitelistRoot = "" // mainnet

  // const whitelistAddresses = [teamWallet] // mainnet
  
  const NFT = await ethers.getContractFactory("NFT");
  const Token = await ethers.getContractFactory("Token");
  const NFTStaker = await ethers.getContractFactory("NFTStaker");
  const nft = await NFT.deploy(teamWallet, whitelistRoot);
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
