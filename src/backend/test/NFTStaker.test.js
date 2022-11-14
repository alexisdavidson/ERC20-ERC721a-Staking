const { expect } = require("chai")
const keccak256 = require("keccak256")
const { MerkleTree } = require("merkletreejs")
const helpers = require("@nomicfoundation/hardhat-network-helpers")

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => Math.round(ethers.utils.formatEther(num))

describe("NFTStaker", async function() {
    let deployer, addr1, addr2, nft, token, nftStaker, rewardRate
    let teamWallet = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    let whitelist = []
    let whitelistRoot = "0x343750465941b29921f50a28e0e43050e5e1c2611a3ea8d7fe1001090d5e1436"

    const getWhitelistProof = (acc) => {
        const accHashed = keccak256(acc)
        const leafNodes = whitelist.map(addr => keccak256(addr));
        const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true});
        const hexProof = merkleTree.getHexProof(accHashed);
        return hexProof
    }

    const stakerTokenAmount = 73000000
    const teamTokenAmount = 149000000
        
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
        nft = await NFT.deploy(teamWallet, whitelistRoot);
        nftStaker = await NFTStaker.deploy(nft.address);
        token = await Token.deploy([nftStaker.address, teamWallet], [stakerTokenAmount, teamTokenAmount]);
        await nftStaker.setOwnerAndTokenAddress(teamWallet, token.address);
    });

    describe("Deployment", function() {
        it("Should mint tokens for staker contract and team", async function() {
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);
            expect(fromWei(await token.balanceOf(teamWallet))).to.equals(teamTokenAmount);
            expect(fromWei(await token.totalSupply())).to.equals(stakerTokenAmount + teamTokenAmount);
            
            expect((await nftStaker.rewardRate()).toString()).to.equal(rewardRate);
        })
    })

    describe("Staking and unstaking", function() {
        it("Should track staking wallets and distribute rewards on unstaking", async function() {
            const proof1 = getWhitelistProof(addr1.address)
            await nft.connect(addr1).mint(1, proof1);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);
            
            // Stake
            await nft.connect(addr1).setApprovalForAll(nftStaker.address, true);

            await expect(nftStaker.connect(addr1).stake(333)).to.be.revertedWith('There is no ongoing mission!');

            await nftStaker.startMission(24 * 15); // 15 Days mission
            await nftStaker.connect(addr1).stake(333);
            
            expect((await nftStaker.getStakedTokens(addr1.address))[0]).to.equals(333);

            expect((await nft.ownerOf(333))).to.equals(nftStaker.address);
            expect((await token.balanceOf(addr1.address))).to.equals(0);
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);

            // Unstake after 10 days
            const tenDays = 10 * 24 * 60 * 60 + 10;
            await helpers.time.increase(tenDays);

            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            const expectedReward = fromWei((rewardRate * tenDays).toString());
            expect(fromWei(await nftStaker.getRewardToClaim(addr1.address))).to.equals(expectedReward);
            await nftStaker.connect(addr1).claimReward();
            expect(await nftStaker.getRewardToClaim(addr1.address)).to.equals(0);

            // Expecting 50 units as reward
            console.log("Expected Reward: " + expectedReward)
            console.log("Staker actual new balance: " + fromWei(await token.balanceOf(addr1.address)))

            expect(fromWei(await token.balanceOf(addr1.address))).to.equals(expectedReward);
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - expectedReward);
        })

        it("Should claim 10 days rewards for a 10 days mission and 20 days staking", async function() {
            const proof1 = getWhitelistProof(addr1.address)
            await nft.connect(addr1).mint(1, proof1);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);
            
            // Stake
            await nft.connect(addr1).setApprovalForAll(nftStaker.address, true);

            await expect(nftStaker.connect(addr1).stake(333)).to.be.revertedWith('There is no ongoing mission!');

            const missionTime = 24 * 10; // 10 Days mission
            await nftStaker.startMission(missionTime); 
            await nftStaker.connect(addr1).stake(333);
            
            expect((await nftStaker.getStakedTokens(addr1.address))[0]).to.equals(333);

            expect((await nft.ownerOf(333))).to.equals(nftStaker.address);
            expect((await token.balanceOf(addr1.address))).to.equals(0);
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);

            // Unstake after 20 days
            const twentyDays = 20 * 24 * 60 * 60 + 10;
            await helpers.time.increase(twentyDays);

            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            const expectedReward = fromWei((rewardRate * missionTime * 3600).toString());
            expect(fromWei(await nftStaker.getRewardToClaim(addr1.address))).to.equals(expectedReward);
            await nftStaker.connect(addr1).claimReward();
            expect(await nftStaker.getRewardToClaim(addr1.address)).to.equals(0);

            // Expecting 50 units as reward
            console.log("Expected Reward: " + expectedReward)
            console.log("Staker actual new balance: " + fromWei(await token.balanceOf(addr1.address)))

            expect(fromWei(await token.balanceOf(addr1.address))).to.equals(expectedReward);
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - expectedReward);
        })

        it("Should not win more reward if a new mission starts before unstake was done", async function() {
            const proof1 = getWhitelistProof(addr1.address)
            await nft.connect(addr1).mint(1, proof1);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);
            
            // Stake
            await nft.connect(addr1).setApprovalForAll(nftStaker.address, true);

            await expect(nftStaker.connect(addr1).stake(333)).to.be.revertedWith('There is no ongoing mission!');

            const missionTime = 24 * 10; // 10 Days mission
            await nftStaker.startMission(missionTime); 
            await nftStaker.connect(addr1).stake(333);
            
            expect((await nftStaker.getStakedTokens(addr1.address))[0]).to.equals(333);

            expect((await nft.ownerOf(333))).to.equals(nftStaker.address);
            expect((await token.balanceOf(addr1.address))).to.equals(0);
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);

            const tenDays = 10 * 24 * 60 * 60 + 10;
            await helpers.time.increase(tenDays);

            await nftStaker.startMission(missionTime); 

            await helpers.time.increase(tenDays);

            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            const expectedReward = fromWei((rewardRate * missionTime * 3600).toString());
            expect(fromWei(await nftStaker.getRewardToClaim(addr1.address))).to.equals(expectedReward);
            await nftStaker.connect(addr1).claimReward();
            expect(await nftStaker.getRewardToClaim(addr1.address)).to.equals(0);

            // Expecting 50 units as reward
            console.log("Expected Reward: " + expectedReward)
            console.log("Staker actual new balance: " + fromWei(await token.balanceOf(addr1.address)))

            expect(fromWei(await token.balanceOf(addr1.address))).to.equals(expectedReward);
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - expectedReward);
        })

        it("Slightly more complex scenario: Unstake too late and join a mission in the middle. Dont claim reward between the two missions", async function() {
            const proof1 = getWhitelistProof(addr1.address)
            await nft.connect(addr1).mint(1, proof1);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);
            
            // Stake
            await nft.connect(addr1).setApprovalForAll(nftStaker.address, true);

            await expect(nftStaker.connect(addr1).stake(333)).to.be.revertedWith('There is no ongoing mission!');

            const missionTime = 24 * 10; // 10 Days mission
            await nftStaker.startMission(missionTime); 
            await nftStaker.connect(addr1).stake(333);
            
            expect((await nftStaker.getStakedTokens(addr1.address))[0]).to.equals(333);

            expect((await nft.ownerOf(333))).to.equals(nftStaker.address);
            expect((await token.balanceOf(addr1.address))).to.equals(0);
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);

            const tenDays = 10 * 24 * 60 * 60 + 10;
            await helpers.time.increase(tenDays);

            await nftStaker.startMission(missionTime); 

            const fiveDays = 5 * 24 * 60 * 60 + 10;
            await helpers.time.increase(fiveDays);
            
            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            let expectedReward = fromWei((rewardRate * missionTime * 3600).toString());

            // Expecting 50 units as reward
            console.log("Expected Reward: " + expectedReward)
            console.log("Staker actual new balance: " + fromWei(await token.balanceOf(addr1.address)))

            expect(fromWei(await token.balanceOf(addr1.address))).to.equals(0);
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);

            // Now restake
            await nftStaker.connect(addr1).stake(333);

            await helpers.time.increase(tenDays);
            
            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            expectedReward = fromWei((rewardRate * (missionTime * 3600 + fiveDays)).toString());
            expect(fromWei(await nftStaker.getRewardToClaim(addr1.address))).to.equals(expectedReward);
            await nftStaker.connect(addr1).claimReward();
            expect(await nftStaker.getRewardToClaim(addr1.address)).to.equals(0);

            // Expecting 25 units as reward
            console.log("Expected Reward: " + fromWei((rewardRate * fiveDays).toString()))
            console.log("Staker actual new balance: " + fromWei(await token.balanceOf(addr1.address)))

            expect(fromWei(await token.balanceOf(addr1.address))).to.equals(expectedReward);
            expect(fromWei(await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - expectedReward);
        })
    })
})


/*
todo:
- [ ]  sendAllInactiveToMission
- [ ]  getRewardForTokenIndexStaker
- [ ]  findIndexForTokenStaker
*/