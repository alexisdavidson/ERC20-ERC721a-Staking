import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button } from 'react-bootstrap'
import {useLocation} from 'react-router-dom';

const ViewItem = ({ marketplace, nft, account }) => {
    const location = useLocation();

    const [loading, setLoading] = useState(true)
    const [item, setItem] = useState([])
    const [hasBought, setHasBought] = useState(false)
    const [buyers, setBuyers] = useState([])

    function reverseArr(input) {
        var ret = new Array;
        for(var i = input.length - 1; i >= 0; i--) {
            ret.push(input[i]);
        }
        return ret;
    }
    
    const loadMarketplaceItem = async () => {
        console.log("Looking for item " + location.state.itemId)

        // Load all unsold items
        const itemCount = await marketplace.itemCount()
        for (let i = 1; i <= itemCount; i++) {
            const item = await marketplace.items(i)
            console.log("item " + item.tokenId)
            if (item.tokenId == location.state.itemId) {
                // get uri url from nft contract
                const uri = await nft.tokenURI(item.tokenId)
                const hiddenUri = await nft.getTokenUriForUser(account, item.tokenId)
                // use uri to fetch the nft metadata stored on ipfs 
                const response = await fetch(uri)
                const metadata = await response.json()
                // get total price of item (item price + fee)
                const totalPrice = await marketplace.getTotalPrice(item.itemId)
                setItem({
                    totalPrice,
                    itemId: item.itemId,
                    seller: item.seller,
                    name: metadata.name,
                    description: metadata.description,
                    image: metadata.image,
                    sold: parseInt(item.sold),
                    mediaFile: hiddenUri
                })

                let itemBuyers = await nft.getBuyers(location.state.itemId)
                if (itemBuyers != null && itemBuyers.length > 0)
                    setBuyers(reverseArr(itemBuyers));

                if (await nft.userHasBoughtToken(account, location.state.itemId)) {
                    setHasBought(true);
                }
                setLoading(false)
            }
        }
    }

    const buyMarketItem = async (item) => {
        await (await marketplace.purchaseItem(item.itemId, { value: item.totalPrice })).wait()
        loadMarketplaceItem()
    }

    useEffect(() => {
        loadMarketplaceItem()
    }, [])

    if (loading) return (
        <main style={{ padding: "1rem 0" }}>
        <h2>Loading item...</h2>
        </main>
    )

    return (
        <div className="flex justify-center">
            {item != null ?
                <div className="px-5 container">
                    <Row className="g-4 py-5">
                        <Col className="col-lg-4 overflow-hidden">
                            <Card>
                                {/* <Card.Img variant="top" src={item.image} /> */}
                                <Card.Text className="py-3">
                                    <h4>Hidden Metadata</h4>
                                    {item.mediaFile}
                                </Card.Text>
                                <Card.Text className="py-3">
                                    <h4>Description</h4>
                                    {item.description}
                                </Card.Text>
                            </Card>
                        </Col>
                        <Col className="col-lg-8 px-5 overflow-hidden">
                            <h2>{item.name}</h2>
                            <Row className="g-4 pt-5 pb-1">
                                Sold {item.sold} times<br/>
                            </Row>
                            <Row className="g-4 pt-1 pb-4">
                                {!hasBought ?
                                    <Button onClick={() => buyMarketItem(item)} variant="primary" size="lg">
                                        Buy for {ethers.utils.formatEther(item.totalPrice)} Matic
                                    </Button>
                                : (
                                    <Button variant="primary" size="lg">
                                        Play
                                    </Button>
                                )}
                            </Row>
                            <Row className="g-4 pt-1 pb-4">
                                <h4>History</h4>
                                {buyers.length > 0 ?
                                    <table className="table table-bordered table-striped table-light">
                                        <thead>
                                            <tr>
                                                <th scope="col">Latest Buyers</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {buyers.map((buyer, idx) => (
                                                <tr>
                                                    <td>
                                                        {buyer}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                : (
                                    <div>No purchase yet.</div>
                                )}
                            </Row>
                        </Col>
                    </Row>
                </div>
            : (
                <main style={{ padding: "1rem 0" }}>
                    <h2>Asset not found</h2>
                </main>
            )}
        </div>
    );
}
export default ViewItem