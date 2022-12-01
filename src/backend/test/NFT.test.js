const { expect } = require("chai")
const keccak256 = require("keccak256")
const { MerkleTree } = require("merkletreejs")

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)

describe("NFT", async function() {
    let deployer, addr1, addr2, addr3, nft
    let URI = "ipfs://Qmbx9io6LppmpvavX3EqZY8igQxPZh7koUzW3mPRLkLQir/"
    let UnkownURI = "unkownURI"
    let teamWallet = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    let whitelist = []
    let whitelistRoot = "0x343750465941b29921f50a28e0e43050e5e1c2611a3ea8d7fe1001090d5e1436"
    let amountMintPerAccount = 1

    const getWhitelistProof = (acc) => {
        const accHashed = keccak256(acc)
        const leafNodes = whitelist.map(addr => keccak256(addr));
        const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true});
        const hexProof = merkleTree.getHexProof(accHashed);
        return hexProof
    }

    beforeEach(async function() {
        // Get contract factories
        const NFT = await ethers.getContractFactory("NFT");

        // Get signers
        [deployer, addr1, addr2, addr3] = await ethers.getSigners();
        whitelist = [addr1.address, addr2.address]

        // Deploy contracts
        nft = await NFT.deploy(teamWallet, whitelistRoot);
        await nft.setMintEnabled(true);
    });

    describe("Deployment", function() {
        it("Should track name and symbol of the nft collection", async function() {
            expect(await nft.name()).to.equal("Gelatoverse Genesis")
            expect(await nft.symbol()).to.equal("GG")
        })

        it("Should have 333 NFTs minted and belonging to the team wallet", async function() {
            expect(await nft.totalSupply()).to.equal(333)
            expect(await nft.balanceOf(teamWallet)).to.equal(333)
        })
    })

    describe("Amount mint per account", function() {
        it("Should allow only 1 minting per account", async function() {
            let proof1 = getWhitelistProof(addr1.address)
            let proof2 = getWhitelistProof(addr2.address)
            let proof3 = getWhitelistProof(addr3.address)

            expect(await nft.amountMintPerAccount()).to.equals(1);

            // addr1 mints an nft
            await nft.connect(addr1).mint(1, proof1);
            expect(await nft.totalSupply()).to.equal(334);
            expect(await nft.balanceOf(addr1.address)).to.equal(1);

            // addr1 cant mint another nft
            await expect(nft.connect(addr1).mint(1, proof1)).to.be.revertedWith('Each address may only mint x NFTs!');
            expect(await nft.totalSupply()).to.equal(334);
            expect(await nft.balanceOf(addr1.address)).to.equal(1);
        })
    })

    describe("Whitelist Merkletree", function() {
        it("Should allow Whitelistes addresses", async function() {
            const proof1 = getWhitelistProof(addr1.address)
            const leaf1 = keccak256(addr1.address)
            expect(await nft.isValid(proof1, leaf1)).to.equal(true);

            const proof2 = getWhitelistProof(addr2.address)
            const leaf2 = keccak256(addr2.address)
            expect(await nft.isValid(proof2, leaf2)).to.equal(true);

            const proof3 = getWhitelistProof(addr3.address)
            const leaf3 = keccak256(addr3.address)
            expect(await nft.isValid(proof3, leaf3)).to.equal(false);
        })
    })

    describe("Minting NFTs", function() {
        it("Should track each minted NFT", async function() {
            let proof1 = getWhitelistProof(addr1.address)
            let proof2 = getWhitelistProof(addr2.address)
            let proof3 = getWhitelistProof(addr3.address)

            // addr1 mints an nft
            await nft.connect(addr1).mint(1, proof1);
            expect(await nft.totalSupply()).to.equal(334);
            expect(await nft.balanceOf(addr1.address)).to.equal(1);

            // addr2 cant mint 2 nfts
            await expect(nft.connect(addr2).mint(2, proof2)).to.be.revertedWith('Each address may only mint x NFTs!');
            expect(await nft.totalSupply()).to.equal(334);
            expect(await nft.balanceOf(addr2.address)).to.equal(0);

            // should refuse minting on non-whitelisted addresses
            await expect(nft.connect(addr3).mint(1, proof3)).to.be.revertedWith('You are not whitelisted');
            expect(await nft.totalSupply()).to.equal(334);
            expect(await nft.balanceOf(addr3.address)).to.equal(0);
        })

        it("Should not mint more NFTs than the max supply", async function() {
            let proof1 = getWhitelistProof(addr1.address)
            await expect(nft.connect(addr1).mint(10000, proof1)).to.be.revertedWith('Cannot mint more than max supply');
        })
    })

    describe("URIs", function() {
        it("Should have correct URIs", async function() {
            let proof2 = getWhitelistProof(addr2.address)
            await nft.connect(addr2).mint(1, proof2);
            expect(await nft.totalSupply()).to.equal(334);
            
            //Unknown URIs. When not revealed, it stays the base URI
            expect(await nft.tokenURI(0)).to.equal(URI + "0.json");
            expect(await nft.tokenURI(19)).to.equal(URI + "19.json");
            //Normal URIs
            expect(await nft.tokenURI(20)).to.equal(URI + "20.json");
            expect(await nft.tokenURI(333)).to.equal(URI + "333.json");
        })

        it("Should update Unkown URI", async function() {
            await nft.replaceUri(0, "UnkownUri0");
            expect(await nft.tokenURI(0)).to.equal("UnkownUri0");
            await nft.replaceUri(200, "UnkownUri200");
            expect(await nft.tokenURI(200)).to.equal("UnkownUri200");
        })
    })
})