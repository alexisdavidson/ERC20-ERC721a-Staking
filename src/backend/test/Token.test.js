const { expect } = require("chai")

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)

describe("Token", async function() {
    let deployer, addr1, addr2, nft, token, nftStaker
    let teamWallet = "0x90f79bf6eb2c4f870365e785982e1f101e93b906"
    let whitelist = ["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"]

    beforeEach(async function() {
        // Get contract factories
        const NFT = await ethers.getContractFactory("NFT");
        const Token = await ethers.getContractFactory("Token");
        const NFTStaker = await ethers.getContractFactory("NFTStaker");

        // Get signers
        [deployer, addr1, addr2] = await ethers.getSigners();

        // Deploy contracts
        nft = await NFT.deploy(teamWallet, whitelist);
        token = await Token.deploy();
        nftStaker = await NFTStaker.deploy(nft.address, token.address);
    });

    describe("Deployment", function() {
        it("Should track name and symbol of the token", async function() {
            expect(await token.name()).to.equal("GelatoTokenName")
            expect(await token.symbol()).to.equal("GelatoTokenSymbol")

            // Nft Staker contract claims the initial supply
            expect((await token.balanceOf(nftStaker.address)).toString()).to.equals("222000000000000000000000000");
            expect((await token.totalSupply()).toString()).to.equals("222000000000000000000000000");
            expect((await token.initialSupplyClaimed())).to.equals(true);
            await expect((token.claimInitialSupply())).to.be.revertedWith('Initial supply has already been claimed');
        })
    })
})