const { expect } = require("chai")

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)

describe("NFTStaker", async function() {
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
        it("Should the token initial claim on the staker contract", async function() {
            // Nft Staker contract claims the initial supply
            expect((await token.balanceOf(nftStaker.address)).toString()).to.equals("222000000000000000000000000");
            expect((await token.totalSupply()).toString()).to.equals("222000000000000000000000000");
            expect((await token.initialSupplyClaimed())).to.equals(true);
            await expect((token.claimInitialSupply())).to.be.revertedWith('Initial supply has already been claimed');
            
            // expect(await token.rewardRate()).to.equal(5 * 10**uint(rewardsToken.decimals()) / 1 days);
        })
    })

    describe("Staking and unstaking", function() {
        it("Should track staking wallets and distribute rewards on unstaking", async function() {
            await nft.connect(addr1).mint(1);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);
            
            // Stake
            await nft.connect(addr1).setApprovalForAll(nftStaker.address, true);
            await nftStaker.connect(addr1).stake(333);
            expect((await nft.ownerOf(333))).to.equals(nftStaker.address);
            expect((await token.balanceOf(addr1.address))).to.equals(0);
            expect((await token.balanceOf(nftStaker.address)).toString()).to.equals("222000000000000000000000000");

            // Unstake
            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            const sevenDays = 7 * 24 * 60 * 60;
            await ethers.provider.send('evm_increaseTime', [sevenDays]);

            // todo: predict correct reward amount 
            // expect((await token.balanceOf(addr1.address)).toString()).to.equals((await nftStaker.rewardRate() * sevenDays).toString());
            // expect((await token.balanceOf(nftStaker.address)).toString()).to.equals("222000000000000000000000000");
        })
    })
})