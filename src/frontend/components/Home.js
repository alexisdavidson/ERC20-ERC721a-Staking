import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button } from 'react-bootstrap'
import { useNavigate } from "react-router-dom";

const Home = ({ marketplace, nft }) => {
    let navigate = useNavigate(); 

    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState([])

    const routeChangeViewItem = (item) => { 
        let path = "/view-item" 
        console.log("Navigate to view-item " + item.itemId)
        navigate(path, {
            state: {
                itemId: parseInt(item.itemId)
            }
        })
    }

    const loadMarketplaceItems = async () => {
        // Load all unsold items
        const itemCount = await marketplace.itemCount()
        let items = []
        for (let i = 1; i <= itemCount; i++) {
            const item = await marketplace.items(i)
            // get uri url from nft contract
            const uri = await nft.tokenURI(item.tokenId)
            // use uri to fetch the nft metadata stored on ipfs 
            const response = await fetch(uri)
            const metadata = await response.json()
            // get total price of item (item price + fee)
            const totalPrice = await marketplace.getTotalPrice(item.itemId)
            // Add item to items array
            items.push({
                totalPrice,
                itemId: item.itemId,
                seller: item.seller,
                name: metadata.name,
                description: metadata.description,
                mediaType: metadata.mediaType
            })
        }
        setLoading(false)
        setItems(items)
    }

    const buyMarketItem = async (item) => {
        await (await marketplace.purchaseItem(item.itemId, { value: item.totalPrice })).wait()
        loadMarketplaceItems()
    }

    useEffect(() => {
        loadMarketplaceItems()
    }, [])

    if (loading) return (
        <main style={{ padding: "1rem 0" }}>
        <h2>Loading...</h2>
        </main>
    )

    return (
        <div className="flex justify-center">
            {items.length > 0 ?
                <div className="px-5 container">
                    <Row xs={1} md={2} lg={4} className="g-4 py-5">
                        {items.map((item, idx) => (
                            <Col key={idx} className="overflow-hidden">
                                <Card>
                                    {/* <Card.Img variant="top" src={item.image} /> */}
                                    <Card.Body color="secondary">
                                    <Card.Title>{item.mediaType} {item.name}</Card.Title>
                                    <Card.Text>
                                        {item.description}
                                    </Card.Text>
                                    </Card.Body>
                                    <Card.Footer>
                                    <div className='d-grid'>
                                    {ethers.utils.formatEther(item.totalPrice)} Matic <br/>
                                        <Button onClick={() => routeChangeViewItem(item)} variant="primary" size="lg">
                                            View
                                        </Button>
                                    </div>
                                    </Card.Footer>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
            : (
                <main style={{ padding: "1rem 0" }}>
                    <h2>No listed assets</h2>
                </main>
            )}
        </div>
    );
}
export default Home