const { expect } = require("chai")

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)

describe("Token", async function() {
    let deployer, addr1, addr2, nft, token, nftStaker
    let teamWallet = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    let whitelist = []

    beforeEach(async function() {
        // Get contract factories
        const NFT = await ethers.getContractFactory("NFT");
        const Token = await ethers.getContractFactory("Token");
        const NFTStaker = await ethers.getContractFactory("NFTStaker");

        // Get signers
        [deployer, addr1, addr2] = await ethers.getSigners();
        whitelist = [addr1.address, addr2.address]

        // Deploy contracts
        nft = await NFT.deploy(teamWallet, whitelist);
        nftStaker = await NFTStaker.deploy(nft.address);
        await expect(Token.deploy([nftStaker.address], [])).to.be.revertedWith('Minter Addresses and Token Amount arrays need to have the same size.');
        token = await Token.deploy([nftStaker.address, teamWallet], [73000000, 149000000]);
        await nftStaker.setOwnerAndTokenAddress(teamWallet, token.address);
    });

    describe("Deployment", function() {
        it("Should track name and symbol of the token", async function() {
            expect(await token.name()).to.equal("Beach Coin")
            expect(await token.symbol()).to.equal("BC")
        })
    })
})