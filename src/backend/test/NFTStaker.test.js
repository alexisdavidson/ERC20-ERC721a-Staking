const { expect } = require("chai")
const keccak256 = require("keccak256")
const { MerkleTree } = require("merkletreejs")
const helpers = require("@nomicfoundation/hardhat-network-helpers")

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => Math.round(ethers.utils.formatEther(num))

describe("NFTStaker", async function() {
    let deployer, addr1, addr2, nft, token, nftStaker, hoursForUnitReward
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
    hoursForUnitReward = 4

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
        await nft.setMintEnabled(true);
        nftStaker = await NFTStaker.deploy(nft.address);
        token = await Token.deploy([nftStaker.address, teamWallet], [stakerTokenAmount, teamTokenAmount]);
        await nftStaker.setOwnerAndTokenAddress(teamWallet, token.address);
    });

    describe("Deployment", function() {
        it("Should mint tokens for staker contract and team", async function() {
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);
            expect((await token.balanceOf(teamWallet))).to.equals(teamTokenAmount);
            expect((await token.totalSupply())).to.equals(stakerTokenAmount + teamTokenAmount);
            
            expect((await nftStaker.hoursForUnitReward())).to.equal(hoursForUnitReward);
        })
    })

    describe("Staking and unstaking", function() {
        it("Should claim reward for not unstaked finished missions", async function() {
            const proof1 = getWhitelistProof(addr1.address)
            await nft.connect(addr1).mint(1, proof1);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);
            
            // Stake
            await nft.connect(addr1).setApprovalForAll(nftStaker.address, true);

            await expect(nftStaker.connect(addr1).stake(333)).to.be.revertedWith('There is no ongoing mission!');

            await nftStaker.startMission(24 * 10 + 1); // 10 Days mission
            await nftStaker.connect(addr1).stake(333);
            
            expect((await nftStaker.getStakedTokens(addr1.address))[0]).to.equals(333);

            expect((await nft.ownerOf(333))).to.equals(nftStaker.address);
            expect((await token.balanceOf(addr1.address))).to.equals(0);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);

            // Unstake after 11 days
            const elevenDays = 11 * 24 * 60 * 60 + 10;
            await helpers.time.increase(elevenDays);

            // await nftStaker.connect(addr1).unstake(333);

            const expectedReward = 10 * (24 / hoursForUnitReward);
            expect((await nftStaker.getRewardToClaim(addr1.address))).to.equals(expectedReward);
            await nftStaker.connect(addr1).claimReward();
            expect((await nft.ownerOf(333))).to.equals(nftStaker.address);

            // Expecting 50 units as reward
            console.log("Expected Reward: " + expectedReward)
            console.log("Staker actual new balance: " + fromWei(await token.balanceOf(addr1.address)))

            expect((await token.balanceOf(addr1.address))).to.equals(expectedReward);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - expectedReward);
            
            expect((await nftStaker.getRewardToClaim(addr1.address))).to.equals(0);
            await expect(nftStaker.connect(addr1).claimReward()).to.be.revertedWith('No tokens to claim.');
            
            await nftStaker.connect(addr1).unstake(333);

            expect((await token.balanceOf(addr1.address))).to.equals(expectedReward);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - expectedReward);
            
            await expect(nftStaker.connect(addr1).claimReward()).to.be.revertedWith('No tokens to claim.');

            expect((await token.balanceOf(addr1.address))).to.equals(expectedReward);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - expectedReward);
        })

        it("Should track staking wallets and distribute rewards on unstaking", async function() {
            const proof1 = getWhitelistProof(addr1.address)
            await nft.connect(addr1).mint(1, proof1);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);
            
            // Stake
            await nft.connect(addr1).setApprovalForAll(nftStaker.address, true);

            await expect(nftStaker.connect(addr1).stake(333)).to.be.revertedWith('There is no ongoing mission!');

            await nftStaker.startMission(24 * 10 + 1); // 10 Days mission
            await nftStaker.connect(addr1).stake(333);
            
            expect((await nftStaker.getStakedTokens(addr1.address))[0]).to.equals(333);

            expect((await nft.ownerOf(333))).to.equals(nftStaker.address);
            expect((await token.balanceOf(addr1.address))).to.equals(0);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);

            // Unstake after 11 days
            const elevenDays = 11 * 24 * 60 * 60 + 10;
            await helpers.time.increase(elevenDays);

            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            const expectedReward = 10 * (24 / hoursForUnitReward);
            expect((await nftStaker.getRewardToClaim(addr1.address))).to.equals(expectedReward);
            await nftStaker.connect(addr1).claimReward();

            // Expecting 50 units as reward
            console.log("Expected Reward: " + expectedReward)
            console.log("Staker actual new balance: " + fromWei(await token.balanceOf(addr1.address)))

            expect((await token.balanceOf(addr1.address))).to.equals(expectedReward);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - expectedReward);
        })

        it("Should not reward when mission was not over", async function() {
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
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);

            // Unstake after 10 days
            const tenDays = 10 * 24 * 60 * 60 + 10;
            await helpers.time.increase(tenDays);

            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            const expectedReward = 0;
            expect((await nftStaker.getRewardToClaim(addr1.address))).to.equals(expectedReward);
            await expect(nftStaker.connect(addr1).claimReward()).to.be.revertedWith('No tokens to claim.');

            // Expecting 50 units as reward
            console.log("Expected Reward: " + expectedReward)
            console.log("Staker actual new balance: " + fromWei(await token.balanceOf(addr1.address)))

            expect((await token.balanceOf(addr1.address))).to.equals(expectedReward);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - expectedReward);
        })

        it("Should claim 10 days rewards for a 10 days mission and 20 days staking", async function() {
            const proof1 = getWhitelistProof(addr1.address)
            await nft.connect(addr1).mint(1, proof1);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);
            
            // Stake
            await nft.connect(addr1).setApprovalForAll(nftStaker.address, true);

            await expect(nftStaker.connect(addr1).stake(333)).to.be.revertedWith('There is no ongoing mission!');

            const missionTime = 24 * 10 + 1; // 10 Days mission
            await nftStaker.startMission(missionTime); 
            await nftStaker.connect(addr1).stake(333);
            
            expect((await nftStaker.getStakedTokens(addr1.address))[0]).to.equals(333);

            expect((await nft.ownerOf(333))).to.equals(nftStaker.address);
            expect((await token.balanceOf(addr1.address))).to.equals(0);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);

            // Unstake after 20 days
            const twentyDays = 20 * 24 * 60 * 60 + 10;
            await helpers.time.increase(twentyDays);

            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            const expectedReward = 10 * (24 / hoursForUnitReward);
            expect((await nftStaker.getRewardToClaim(addr1.address))).to.equals(expectedReward);
            await nftStaker.connect(addr1).claimReward();
            expect(await nftStaker.getRewardToClaim(addr1.address)).to.equals(0);
            expect((await token.balanceOf(addr1.address))).to.equals(expectedReward);

            // Expecting 50 units as reward
            console.log("Expected Reward: " + expectedReward)
            console.log("Staker actual new balance: " + (await token.balanceOf(addr1.address)))

            expect((await token.balanceOf(addr1.address))).to.equals(expectedReward);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - expectedReward);
        })

        it("Should not win more reward if a new mission starts before unstake was done", async function() {
            const proof1 = getWhitelistProof(addr1.address)
            await nft.connect(addr1).mint(1, proof1);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);
            
            // Stake
            await nft.connect(addr1).setApprovalForAll(nftStaker.address, true);

            await expect(nftStaker.connect(addr1).stake(333)).to.be.revertedWith('There is no ongoing mission!');

            const missionTime = 24 * 10 + 1; // 10 Days mission
            await nftStaker.startMission(missionTime); 
            await nftStaker.connect(addr1).stake(333);
            
            expect((await nftStaker.getStakedTokens(addr1.address))[0]).to.equals(333);

            expect((await nft.ownerOf(333))).to.equals(nftStaker.address);
            expect((await token.balanceOf(addr1.address))).to.equals(0);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);

            const tenDays = 10 * 24 * 60 * 60 + 10;
            await helpers.time.increase(tenDays);

            await nftStaker.startMission(missionTime); 

            await helpers.time.increase(tenDays);

            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            const expectedReward = 10 * (24 / hoursForUnitReward);
            expect((await nftStaker.getRewardToClaim(addr1.address))).to.equals(expectedReward);
            await nftStaker.connect(addr1).claimReward();
            expect(await nftStaker.getRewardToClaim(addr1.address)).to.equals(0);
            expect((await token.balanceOf(addr1.address))).to.equals(expectedReward);

            // Expecting 50 units as reward
            console.log("Expected Reward: " + expectedReward)
            console.log("Staker actual new balance: " + fromWei(await token.balanceOf(addr1.address)))

            expect((await token.balanceOf(addr1.address))).to.equals(expectedReward);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - expectedReward);
        })

        it("Slightly more complex scenario: Unstake too late and join a mission in the middle. Dont claim reward between the two missions", async function() {
            const proof1 = getWhitelistProof(addr1.address)
            await nft.connect(addr1).mint(1, proof1);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);
            
            // Stake
            await nft.connect(addr1).setApprovalForAll(nftStaker.address, true);

            await expect(nftStaker.connect(addr1).stake(333)).to.be.revertedWith('There is no ongoing mission!');

            const missionTime = 24 * 10 + 1; // 10 Days mission
            await nftStaker.startMission(missionTime); 
            await nftStaker.connect(addr1).stake(333);
            
            expect((await nftStaker.getStakedTokens(addr1.address))[0]).to.equals(333);

            expect((await nft.ownerOf(333))).to.equals(nftStaker.address);
            expect((await token.balanceOf(addr1.address))).to.equals(0);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);

            const tenDays = 10 * 24 * 60 * 60 + 10;
            await helpers.time.increase(tenDays + 3600);

            await nftStaker.startMission(missionTime); 

            const fiveDays = 5 * 24 * 60 * 60 + 10;
            await helpers.time.increase(fiveDays);
            
            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            let expectedReward = 10 * (24 / hoursForUnitReward);

            // Expecting 50 units as reward
            console.log("Expected Reward: " + expectedReward)
            console.log("Staker actual new balance: " + (await token.balanceOf(addr1.address)))

            expect((await token.balanceOf(addr1.address))).to.equals(0);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);
            expect((await nftStaker.getRewardToClaim(addr1.address))).to.equals(expectedReward);

            // Now restake
            await nftStaker.connect(addr1).stake(333);
            console.log("Mission: " + await nftStaker.getStakedMissions(addr1.address))

            await helpers.time.increase(tenDays);
            
            await nftStaker.connect(addr1).unstake(333);
            expect((await nft.ownerOf(333))).to.equals(addr1.address);

            expectedReward = (10 + 5) * (24 / hoursForUnitReward);
            expect((await nftStaker.getRewardToClaim(addr1.address))).to.equals(expectedReward);
            await nftStaker.connect(addr1).claimReward();
            expect(await nftStaker.getRewardToClaim(addr1.address)).to.equals(0);
            expect((await token.balanceOf(addr1.address))).to.equals(expectedReward);

            // Expecting 25 units as reward
            console.log("Expected Reward: " + expectedReward)
            console.log("Staker actual new balance: " + (await token.balanceOf(addr1.address)))

            expect((await token.balanceOf(addr1.address))).to.equals(expectedReward);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - expectedReward);
        })

        it("Stake 2 Gelatos, finish a mission, then call sendAllInactiveMission", async function() {
            // Stake
            await nft.connect(deployer).setApprovalForAll(nftStaker.address, true);

            await expect(nftStaker.connect(deployer).stake(331)).to.be.revertedWith('There is no ongoing mission!');

            const missionTime = 24 * 5 + 1; // 5 Days mission
            await nftStaker.startMission(missionTime); 
            await nftStaker.connect(deployer).stake(331);
            await nftStaker.connect(deployer).stake(332);
            
            expect((await nftStaker.getStakedTokens(deployer.address))[0]).to.equals(331);
            expect((await nftStaker.getStakedTokens(deployer.address))[1]).to.equals(332);

            expect((await nft.ownerOf(331))).to.equals(nftStaker.address);
            expect((await nft.ownerOf(332))).to.equals(nftStaker.address);
            expect((await token.balanceOf(deployer.address))).to.equals(teamTokenAmount);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount);

            const fiveDays = 5 * 24 * 60 * 60 + 10;
            const tenDays = 10 * 24 * 60 * 60 + 10;
            await helpers.time.increase(tenDays);

            await nftStaker.startMission(missionTime);

            await nftStaker.connect(deployer).sendAllInactiveToMission([331, 332]);

            const expectedReward1 = 2 * 5 * (24 / hoursForUnitReward);
            expect((await nftStaker.getRewardToClaim(deployer.address))).to.equals(expectedReward1);
            await nftStaker.connect(deployer).claimReward();
            expect(await nftStaker.getRewardToClaim(deployer.address)).to.equals(0);
            expect((await token.balanceOf(deployer.address))).to.equals(teamTokenAmount + expectedReward1);

            // Expecting 2 * 50 units as reward
            console.log("1.Expected Reward: " + expectedReward1)
            console.log("1.Staker actual new balance: " + (await token.balanceOf(deployer.address)))

            await helpers.time.increase(tenDays);
            
            await nftStaker.connect(deployer).unstake(331);
            expect((await nft.ownerOf(331))).to.equals(deployer.address);
            await nftStaker.connect(deployer).unstake(332);
            expect((await nft.ownerOf(332))).to.equals(deployer.address);

            const expectedReward2 = 2 * 5 * (24 / hoursForUnitReward);
            expect((await nftStaker.getRewardToClaim(deployer.address))).to.equals(expectedReward2);
            await nftStaker.connect(deployer).claimReward();
            expect(await nftStaker.getRewardToClaim(deployer.address)).to.equals(0);

            // Expecting 2 * 25 units as reward
            console.log("2.Expected Reward: " + expectedReward2)
            console.log("2.Staker actual new balance: " + (await token.balanceOf(deployer.address)))

            expect((await token.balanceOf(deployer.address))).to.equals(teamTokenAmount + expectedReward1 + expectedReward2);
            expect((await token.balanceOf(nftStaker.address))).to.equals(stakerTokenAmount - (expectedReward2 + expectedReward2));
        })
    })
})