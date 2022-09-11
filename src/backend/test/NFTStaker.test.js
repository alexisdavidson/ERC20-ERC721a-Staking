const { expect } = require("chai")
const helpers = require("@nomicfoundation/hardhat-network-helpers")

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => Math.round(ethers.utils.formatEther(num))

describe("NFTStaker", async function() {
    let deployer, addr1, addr2, nft, token, nftStaker, rewardRate
    let teamWallet = "0x90f79bf6eb2c4f870365e785982e1f101e93b906"
    let whitelist = []
        
    let secondsInDay = 86400
    rewardRate = Math.floor(toWei(5) / secondsInDay).toString()
    console.log("Reward rate is " + rewardRate.toString() + " per second")

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
        token = await Token.deploy(nftStaker.address);
        await nftStaker.setTokenAddress(token.address);
    });

    describe("Deployment", function() {
        it("Should the token initial claim on the staker contract", async function() {
            // Nft Staker contract claims the initial supply
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(222000000);
            expect(fromWei(await token.totalSupply())).to.equals(222000000);
            expect((await token.initialSupplyClaimed())).to.equals(true);
            await expect((token.claimInitialSupply())).to.be.revertedWith('Initial supply has already been claimed');
            
            expect((await nftStaker.rewardRate()).toString()).to.equal(rewardRate);
        })
    })

    describe("Staking and unstaking", function() {
        it("Should track staking wallets and distribute rewards on unstaking", async function() {
            await nft.connect(addr1).mint(1);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);
            
            // Stake
            await nft.connect(addr1).setApprovalForAll(nftStaker.address, true);

            await nftStaker.connect(addr1).stake(333);
            
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            expect(await nftStaker.stakes(addr1.address, 333)).to.equals(blockBefore.timestamp);

            expect((await nft.ownerOf(333))).to.equals(nftStaker.address);
            expect((await token.balanceOf(addr1.address))).to.equals(0);
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(222000000);

            // Unstake after 10 days
            const tenDays = 10 * 24 * 60 * 60 + 10;
            await helpers.time.increase(tenDays);

            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            // Expecting 50 units as reward
            console.log("Expected Reward: " + fromWei((rewardRate * tenDays).toString()))
            console.log("Staker actual new balance: " + fromWei(await token.balanceOf(addr1.address)))

            expect(fromWei(await token.balanceOf(addr1.address))).to.equals(fromWei((rewardRate * tenDays).toString()));
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(222000000 - fromWei((rewardRate * tenDays).toString()));
        })
    })
})
