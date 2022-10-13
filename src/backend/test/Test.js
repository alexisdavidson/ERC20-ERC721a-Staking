const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

const { keccak256 } = require("@ethersproject/keccak256");
const { MerkleTree } = require('merkletreejs')

describe("Before sale, misc", function () {

    let contract;

    this.beforeEach(async function () {
        const Contract = await hre.ethers.getContractFactory("AKAThailand");
        contract = await Contract.deploy();

        await contract.deployed();
    })

    it("Max supply should be 555", async function () {
        expect(await contract.maxTokens()).to.equal(555);
    });
    
    it("Should fail to mint before starting the sale", async function () {

        // State 0 = NOT_ACTIVE
        expect(await contract.saleState()).to.equal(0);

        // Test public sale
        const price = await contract.price();
        await expect(contract.mint(1, { value: price })).to.be.revertedWith("Public sale is not active");

        // Test presale
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        const whitelistAddresses = [
            owner.address,
            addr1.address
        ]
        const leafNodes = whitelistAddresses.map(addr => keccak256(ethers.utils.solidityPack(["address", "string"], [addr, "5"])));
        const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
        const merkleRoot = merkleTree.getRoot();
        await contract.setMerkleRoot(merkleRoot);
        const merkleProof = merkleTree.getHexProof(keccak256(ethers.utils.solidityPack(["address", "string"], [owner.address, "5"])));
        const presalePrice = await contract.presalePrice();
        await expect(contract.whitelistMint(1, 5, merkleProof, { value: presalePrice })).to.be.revertedWith("Presale is not active");
    })
});


describe("Presale", function () {

    async function getMerkleTree() {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        const whitelistAddresses = [
            owner.address,
            addr1.address
        ]

        const leafNodes = whitelistAddresses.map(addr => keccak256(ethers.utils.solidityPack(["address", "string"], [addr, "5"])));
        return new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    }
    this.beforeEach(async function () {
        const Contract = await hre.ethers.getContractFactory("AKAThailand");
        contract = await Contract.deploy();
        await contract.deployed();
        const merkleTree = await getMerkleTree();
        const merkleRoot = merkleTree.getRoot();
        await contract.setMerkleRoot(merkleRoot);
        await contract.startPresale();
        // saleState 1 = PRESALE
        expect(await contract.saleState()).to.equal(1);
    })

    it("Should be able to mint for presale price, but not over 5", async function () {
        const presalePrice = await contract.presalePrice();
        const merkleTree = await getMerkleTree();
        const merkleProof = merkleTree.getHexProof(keccak256(ethers.utils.solidityPack(["address", "string"], [owner.address, "5"])));

        // Should fail with lower price than presalePrice
        await expect(contract.whitelistMint(1, 5, merkleProof, { value: presalePrice.sub(1) })).to.be.revertedWith("Not enough ETH")
        // Up to 5 should work
        await contract.whitelistMint(1, 5, merkleProof, { value: presalePrice })
        await contract.whitelistMint(2, 5, merkleProof, { value: presalePrice.mul(2) })
        await contract.whitelistMint(1, 5, merkleProof, { value: presalePrice })
        await contract.whitelistMint(1, 5, merkleProof, { value: presalePrice })
        // any more should fail
        await expect(contract.whitelistMint(1, 5, merkleProof, { value: presalePrice })).to.be.revertedWith("Too many tokens per wallet");
        await expect(contract.whitelistMint(2, 5, merkleProof, { value: presalePrice.mul(2) })).to.be.revertedWith("Too many tokens per wallet");
        // Should have 5 tokens now
        expect(await contract.balanceOf(owner.address)).to.equal(5);
    })

    it("Should not be able to mint over maximum available tokens (555)", async function () {
        [owner] = await ethers.getSigners();
        const presalePrice = await contract.presalePrice();
        const merkleTree = await getMerkleTree();
        const merkleProof = merkleTree.getHexProof(keccak256(ethers.utils.solidityPack(["address", "string"], [owner.address, "5"])));
        const price = await contract.presalePrice();

        await contract.airdrop(554, owner.address)
        await contract.whitelistMint(1, 5, merkleProof, { value: price });
        await expect(contract.whitelistMint(1, 5, merkleProof, { value: price })).to.be.revertedWith("Not enough tokens left")
    })
})

describe("Public sale", function () {

    this.beforeEach(async function () {
        const Contract = await hre.ethers.getContractFactory("AKAThailand");
        contract = await Contract.deploy();
        await contract.deployed();
        await contract.startPublicSale();
        // saleState 2 = PUBLIC_SALE
        expect(await contract.saleState()).to.equal(2);
    })

    it("Should be able to mint for public sale price, but not over 5", async function () {
        [owner] = await ethers.getSigners();
        const price = await contract.price();
        await contract.mint(1, { value: price });
        expect(await contract.balanceOf(owner.address)).to.equal(1);
        await contract.mint(4, { value: price.mul(4) });
        expect(await contract.balanceOf(owner.address)).to.equal(5);
        await expect(contract.mint(1, { value: price })).to.be.revertedWith("Too many tokens per wallet");
    })

    it("Should not be able to mint over maximum available tokens (555)", async function () {
        [owner] = await ethers.getSigners();
        await contract.airdrop(554, owner.address)
        const price = await contract.price();
        await contract.mint(1, { value: price });
        await expect(contract.mint(1, { value: price })).to.be.revertedWith("Not enough tokens left")
    })
})

describe("Owner functionalities", function () {
    this.beforeEach(async function () {
        const Contract = await hre.ethers.getContractFactory("AKAThailand");
        contract = await Contract.deploy();
        await contract.deployed();
    })

    it("Should be able to switch between sale states", async function () {
        expect(await contract.saleState()).to.equal(0);
        await contract.startPresale();
        expect(await contract.saleState()).to.equal(1);
        await contract.startPublicSale();
        expect(await contract.saleState()).to.equal(2);
        await contract.stopSale();
        expect(await contract.saleState()).to.equal(0);
    })

    it("Should be able to airdrop", async function () {
        [owner, addr1] = await ethers.getSigners();
        await contract.airdrop(5, owner.address)
        await contract.airdrop(2, addr1.address)
        expect(await contract.balanceOf(owner.address)).to.equal(5);
        expect(await contract.balanceOf(addr1.address)).to.equal(2);

        // Should not be able to go over maxTokens
        const maxTokens = await contract.maxTokens();
        const remainingTokens = maxTokens.sub(await contract.totalSupply());
        await contract.airdrop(remainingTokens, owner.address);
        expect(await contract.totalSupply()).to.equal(await contract.maxTokens());
        await expect(contract.airdrop(1, owner.address)).to.be.revertedWith("Not enough tokens left");
    })

    it("Should be able to withdraw", async function () {
        [owner] = await ethers.getSigners();
        // Send some ether first to the contract for testing:
        let tx = {
            to: contract.address,
            value: ethers.utils.parseEther("1")
        }
        await owner.sendTransaction(tx);
        const contractBalance = await ethers.provider.getBalance(contract.address);
        const ownerBalance = await ethers.provider.getBalance(owner.address);
        await contract.withdrawBalance();
        expect(contractBalance === BigNumber.from("0"));
        expect(ownerBalance > BigNumber.from("1000"))
    })

    it("Should be able to change prices", async function () {
        await contract.setPrice(ethers.utils.parseEther("0.2"), ethers.utils.parseEther("0.1"));
        expect(await contract.price()).to.equal(ethers.utils.parseEther("0.2"));
        expect(await contract.presalePrice()).to.equal(ethers.utils.parseEther("0.1"));
    })

    it("Reveal mechanism", async function () {
        await contract.airdrop(1, owner.address)
        // Before reveal
        expect(await contract.rarityRevealed()).to.be.false;
        expect(await contract.revealed()).to.be.false;
        expect(await contract.tokenURI(1)).to.equal("ipfs://bafybeif2dvyavtaklkfs6xu6f6igf6ji42d7smd6noj4emo4vpf74votdy/1.json")
        // First stage reveal
        await contract.rarityReveal("rarityRevealCID");
        expect(await contract.tokenURI(1)).to.equal("ipfs://rarityRevealCID/1.json")
        expect(await contract.rarityRevealed()).to.be.true;
        expect(await contract.revealed()).to.be.false;
        // Final reveal
        await contract.reveal("fullReveal");
        expect(await contract.tokenURI(1)).to.equal("ipfs://fullReveal/1.json")
        expect(await contract.rarityRevealed()).to.be.true;
        expect(await contract.revealed()).to.be.true;

        // Should not be able to use reveal again
        await expect(contract.reveal("fullRevealx2")).to.be.revertedWith("Tokens already revealed");
        await expect(contract.rarityReveal("fullRevealx2")).to.be.revertedWith("Tokens already revealed");

    })
})
