import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Form, InputGroup } from 'react-bootstrap'
import configContract from './configContract';

const Home = ({ account, nft, token, staker }) => {
    const [loading, setLoading] = useState(true)
    const [mintQuantity, setMintQuantity] = useState(1)
    const [stakeId, setStakeId] = useState(null)
    const [unstakeId, setUnstakeId] = useState(null)
    const [balance, setBalance] = useState("0")
    const [nftBalance, setNftBalance] = useState("0")
    const [isWhitelisted, setIsWhitelisted] = useState(false)
    const [items, setItems] = useState([])

    const loadOpenSeaItems = async () => {
        let url = `${configContract.OPENSEA_API}/assets?owner=${account}&asset_contract_address=${nft.address}&format=json`
        // console.log("Fetching openSea Items for url: " + url)

        let items = await fetch(url)
        .then((res) => res.json())
        .then((res) => {
          return res.assets
        })
        .catch((e) => {
          console.error(e)
          console.error('Could not talk to OpenSea')
          return null
        })

        console.log("Current user account: " + account)
        setBalance((await token.balanceOf(account)).toString())
        setNftBalance((await nft.balanceOf(account)).toString())
        setIsWhitelisted((await nft.isWhitelisted(account)).toString())
        setItems(items)
        setLoading(false)
    }

    const handleChangeMintQuantity = event => {
        setMintQuantity(event.target.value);
        console.log('setMintQuantity ', event.target.value);
    };

    const mint = async () => {
        if (mintQuantity >= 1 && mintQuantity < 1000) {
            console.log("Mint " + mintQuantity + " nfts...")
            await(await nft.mint(mintQuantity)).wait()
            window.location.reload();
        }
        else {
            console.log("Incorrect quantity to mint " + mintQuantity)
        }
      }

    const handleChangeStakeId = event => {
        setStakeId(event.target.value);
        console.log('setStakeId ', event.target.value);
    };
    const stake = async () => {
        if (stakeId != null) {
            console.log("Set approval for all");
            await nft.setApprovalForAll(staker.address, true);
            console.log("Staking " + stakeId + " nft...")
            await(await staker.stake(stakeId)).wait()
            window.location.reload();
        }
    }
    const handleChangeUnstakeId = event => {
        setUnstakeId(event.target.value);
        console.log('setUnstakeId ', event.target.value);
    };
    const unstake = async () => {
        if (unstakeId != null) {
            console.log("Unstaking " + unstakeId + " nft...")
            await(await staker.unstake(unstakeId)).wait()
            window.location.reload();
        }
    }

    const handleOwnerOf = async event => {
        let tokenId = event.target.value;
        console.log('ownerOf Nft ' + tokenId + ' is: ' + (await nft.ownerOf(tokenId)));
        console.log('balanceOf Token is: ' + (await token.balanceOf(staker.address)));
    };

    useEffect(() => {
        loadOpenSeaItems()
    }, [])

    if (loading) return (
        <main style={{ padding: "1rem 0" }}>
        <h2>Loading...</h2>
        </main>
    )

    return (
        <div className="flex justify-center">
            <div className="px-5 container">
                <p>Token Balance: {balance != null ? balance : "null"}</p>
                <p>NFT Balance: {nftBalance != null ? nftBalance : "null"}</p>
                <p>Whitelisted: {isWhitelisted != null ? isWhitelisted : "null"}</p>
            </div>

            <div className="px-5 container">
                <Col className="px-5">
                    <Row className="pt-2">
                        <InputGroup className="mb-3" style={{width: "50%", margin:"auto"}}>
                            <Button onClick={() => mint()} variant="primary">Mint</Button>
                            <Form.Control aria-label="Amount" onChange={handleChangeMintQuantity}/>
                            <InputGroup.Text>Quantity</InputGroup.Text>
                        </InputGroup>
                    </Row>
                    
                    <Row className="pt-2">
                        <InputGroup className="mb-3" style={{width: "50%", margin:"auto"}}>
                            <Button onClick={() => stake()} variant="primary">Stake</Button>
                            <Form.Control aria-label="Amount" onChange={handleChangeStakeId}/>
                            <InputGroup.Text>Token Id</InputGroup.Text>
                        </InputGroup>
                    </Row>

                    <Row className="pt-2">
                        <InputGroup className="mb-3" style={{width: "50%", margin:"auto"}}>
                            <Button onClick={() => unstake()} variant="primary">Unstake</Button>
                            <Form.Control aria-label="Amount" onChange={handleChangeUnstakeId}/>
                            <InputGroup.Text>Token Id</InputGroup.Text>
                        </InputGroup>
                    </Row>

                    <Row className="pt-2">
                        <InputGroup className="mb-3" style={{width: "50%", margin:"auto"}}>
                            <Form.Control aria-label="Amount" onChange={handleOwnerOf}/>
                            <InputGroup.Text>Owner Of</InputGroup.Text>
                        </InputGroup>
                    </Row>
                </Col>

            </div>


            {items.length > 0 ?
                <div className="px-5 container">
                    <Row xs={1} md={2} lg={4} className="g-4 py-5">
                        {items.map((item, idx) => (
                            <Col key={idx} className="overflow-hidden">
                                <Card>
                                    {/* <Card.Img variant="top" src={item.image} /> */}
                                    <Card.Body color="secondary">
                                    <Card.Title>{item.name}</Card.Title>
                                    <Card.Text>
                                        {item.description}
                                    </Card.Text>
                                    </Card.Body>
                                    <Card.Footer>
                                        <div className='d-grid'>
                                            <Button onClick={() => stake(item)} variant="primary" size="lg">
                                                Stake
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