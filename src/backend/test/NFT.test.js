const { expect } = require("chai")

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)

describe("NFT", async function() {
    let deployer, addr1, addr2, nft
    let URI = "ipfs://QmNmBHVHMHt8kvT2VtPDjZ6sjGjyjJ5LBsr1DhnLvzTZss/"
    let UnkownURI = "unkownURI"
    let hiddenURI = "ipfs://QmTfq5RWpX3k6dqbu2nGNc533YV1NhrB93imRh1WDnUhWB"
    let teamWallet = "0x90f79bf6eb2c4f870365e785982e1f101e93b906"
    let whitelist = ["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"]

    beforeEach(async function() {
        // Get contract factories
        const NFT = await ethers.getContractFactory("NFT");

        // Get signers
        [deployer, addr1, addr2] = await ethers.getSigners();

        // Deploy contracts
        nft = await NFT.deploy(teamWallet, whitelist);
    });

    describe("Deployment", function() {
        it("Should track name and symbol of the nft collection", async function() {
            expect(await nft.name()).to.equal("Gelato NFT")
            expect(await nft.symbol()).to.equal("GLN")
        })

        it("Should have 333 NFTs minted and belonging to the team wallet", async function() {
            expect(await nft.totalSupply()).to.equal(333)
            expect(await nft.balanceOf(teamWallet)).to.equal(333)
        })
    })

    describe("Minting NFTs", function() {
        it("Should track each minted NFT", async function() {
            // addr1 mints an nft
            await nft.connect(addr1).mint(1);
            expect(await nft.totalSupply()).to.equal(334);
            expect(await nft.balanceOf(addr1.address)).to.equal(1);
            // addr2 mints 2 nfts
            await nft.connect(addr2).mint(2);
            expect(await nft.totalSupply()).to.equal(336);
            expect(await nft.balanceOf(addr2.address)).to.equal(2);
        })

        it("Should not mint more NFTs than the max supply", async function() {
            await expect(nft.connect(addr1).mint(10000)).to.be.revertedWith('Cannot mint more than max supply');
        })
    })

    describe("URIs", function() {
        it("Should have correct URIs", async function() {
            await nft.connect(addr2).mint(3);
            expect(await nft.totalSupply()).to.equal(336);
            
            //Unknown URIs
            expect(await nft.tokenURI(0)).to.equal(hiddenURI);
            expect(await nft.tokenURI(19)).to.equal(hiddenURI);
            //Normal URIs
            expect(await nft.tokenURI(20)).to.equal(hiddenURI);
            expect(await nft.tokenURI(334)).to.equal(hiddenURI);
        })

        it("Should change URIs upon revealing", async function() {
            await nft.connect(addr2).mint(3);
            expect(await nft.totalSupply()).to.equal(336);

            await nft.revealCollection();

            //Unknown URIs
            expect(await nft.tokenURI(0)).to.equal(UnkownURI);
            expect(await nft.tokenURI(19)).to.equal(UnkownURI);
            //Normal URIs
            expect(await nft.tokenURI(20)).to.equal(URI + "20.json");
            expect(await nft.tokenURI(334)).to.equal(URI + "334.json");
        })

        it("Should update Unkown URI", async function() {
            await nft.revealCollection();
            await nft.revealUnkown(0, "UnkownUri0");
            expect(await nft.tokenURI(0)).to.equal("UnkownUri0");
            
            await expect(nft.revealUnkown(0, "UnkownUri0")).to.be.revertedWith('unkown has already been revealed');
            await expect(nft.revealUnkown(20, "UnkownUri20")).to.be.revertedWith('tokenId must be between 0 and 20');
        })
    })

    describe("Whitelist", function() {
        it("Should update Whitelist", async function() {
            let walletAlreadyWhitelisted = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
            expect(await nft.isWhitelisted(walletAlreadyWhitelisted)).to.equal(true);

            let walletToWhitelist = "0x90f79bf6eb2c4f870365e785982e1f101e93b906"
            expect(await nft.isWhitelisted(walletToWhitelist)).to.equal(false);
            await nft.whitelistUsers([walletAlreadyWhitelisted, walletToWhitelist]);
            expect(await nft.isWhitelisted(walletToWhitelist)).to.equal(true);
        })
    })
})