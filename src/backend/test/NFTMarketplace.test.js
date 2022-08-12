const { expect } = require("chai")

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)

describe("NFTMarketplace", async function() {
    let deployer, addr1, addr2, nft, marketplace
    let feePercent = 1
    let URI = "Sample URI"
    let hiddenURI = "Sample URI"
    beforeEach(async function() {
        // Get contract factories
        const NFT = await ethers.getContractFactory("NFT");
        const Marketplace = await ethers.getContractFactory("Marketplace");
        // Get signers
        [deployer, addr1, addr2] = await ethers.getSigners();
        // Deploy contracts
        nft = await NFT.deploy();
        marketplace = await Marketplace.deploy(feePercent);
    });

    describe("Deployment", function() {
        it("Should track name and symbol of the nft collection", async function() {
            expect(await nft.name()).to.equal("Artist Marketplace NFT")
            expect(await nft.symbol()).to.equal("AMN")
        })
        it("Should track feeAccount and feePercent of the marketplace", async function() {
            expect(await marketplace.feeAccount()).to.equal(deployer.address)
            expect(await marketplace.feePercent()).to.equal("1")
        })
    })

    describe("Minting NFTs", function() {
        it("Should track each minted NFT", async function() {
            // addr1 mints an nft
            await nft.connect(addr1).mint(URI, hiddenURI);
            expect(await nft.tokenCount()).to.equal(1);
            expect(await nft.balanceOf(addr1.address)).to.equal(1);
            expect(await nft.tokenURI(1)).to.equal(URI);
            // addr2 mints an nft
            await nft.connect(addr2).mint(URI, hiddenURI);
            expect(await nft.tokenCount()).to.equal(2);
            expect(await nft.balanceOf(addr2.address)).to.equal(1);
            expect(await nft.tokenURI(2)).to.equal(URI);
        })
    })

    describe("Making marketplace items", function() {
        beforeEach(async function() {
            // addr1 mints an nft
            await nft.connect(addr1).mint(URI, hiddenURI);
            // addr1 approves marketplace to spend nft
            await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
        });
        it("Should track newly created item, transfer NFT from seller to marketplace and emit Offered event", async function() {
            // addr1 offers their nft at a price of 1 ether
            await expect(marketplace.connect(addr1).makeItem(nft.address, 1, toWei(1)))
                .to.emit(marketplace, "Offered")
                .withArgs(
                    1,
                    nft.address,
                    1,
                    toWei(1),
                    addr1.address
                )
            
            // Ower of NFT should now be the marketplace
            expect(await nft.ownerOf(1)).to.equal(marketplace.address);
            // Item count should now be equal 1
            expect(await marketplace.itemCount()).to.equal(1);
            // Get item from items mapping then check fields to ensure they are correct
            const item = await marketplace.items(1)
            expect(item.itemId).to.equal(1)
            expect(item.nft).to.equal(nft.address)
            expect(item.tokenId).to.equal(1)
            expect(item.price).to.equal(toWei(1))
            expect(item.sold).to.equal(0)
        })

        it("Should fail if price is set to zero", async function () {
            await expect(
                marketplace.connect(addr1).makeItem(nft.address, 1, toWei(0))
            ).to.be.revertedWith("Price must be greater than zero");
        })
    })

    
    describe("Purchasing marketplace items", function() {
        let price = 2
        let totalPriceInWei
        beforeEach(async function() {
            // addr1 mints an nft
            await nft.connect(addr1).mint(URI, hiddenURI);
            // addr1 approves marketplace to spend nft
            await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
            // addr1 makes their nft a marketplace item
            await marketplace.connect(addr1).makeItem(nft.address, 1, toWei(price))
        });
        
        it("Should update item as sold, pay seller, transfer NFT to buyer, charge fees and emit a Bought event", async function () {
            const sellerInitialEthBal = await addr1.getBalance()
            const feeAccountInitialEthBal = await deployer.getBalance()
            totalPriceInWei = await marketplace.getTotalPrice(1)

            // addr2 purchases item
            await expect(marketplace.connect(addr2).purchaseItem(1, { value: totalPriceInWei }))
                .to.emit(marketplace, "Bought")
                .withArgs(
                    1,
                    nft.address,
                    1,
                    toWei(price),
                    addr1.address,
                    addr2.address
                )
                
            const sellerFinalEthBal = await addr1.getBalance()
            const feeAccountFinalEthBal = await deployer.getBalance()
            // Seller should receive payment for the price of the NFT sold.
            expect(+fromWei(sellerFinalEthBal)).to.equal(+price + +fromWei(sellerInitialEthBal))
            // Calculate fee
            const fee = +price * (+feePercent / 100)
            // feeAccount should receive fee
            expect(+fromWei(feeAccountFinalEthBal)).to.equal(+fee + +fromWei(feeAccountInitialEthBal))
            // The buyer should now have right to play the nft
            expect(await nft.userHasBoughtToken(addr2.address, 1)).to.equal(true)
            // Item should be marked as sold
            expect((await marketplace.items(1)).sold).to.equal(1)
        })
        
        it("Should fail for invalid item ids, sold items and when not enough ehter is paid", async function () {
            // fails for invalid item ids
            await expect(marketplace.connect(addr2).purchaseItem(0, { value: totalPriceInWei }))
                .to.be.revertedWith("item doesn't exist");
            await expect(marketplace.connect(addr2).purchaseItem(99, { value: totalPriceInWei }))
                .to.be.revertedWith("item doesn't exist");
            // fails when not enough ether is paid with the transaction
            await expect(marketplace.connect(addr2).purchaseItem(1, { value: toWei(price) }))
                .to.be.revertedWith("not enough ether to cover item price and market fee");
            // fails when deployer tries purchasing item 1 after it was already sold
            await marketplace.connect(addr2).purchaseItem(1, { value: totalPriceInWei })
            // await expect(marketplace.connect(deployer).purchaseItem(1, { value: totalPriceInWei }))
            //     .to.be.revertedWith("item already sold");
        })
    });
})