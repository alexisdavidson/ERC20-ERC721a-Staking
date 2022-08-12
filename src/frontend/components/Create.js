import { useState } from 'react'
import { ethers } from "ethers"
import { Row, Form, Button } from 'react-bootstrap'
import { create as ipfsHttpClient } from 'ipfs-http-client'

const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')
const ipfsGateWay = "https://ipfs.infura.io"

const Create = ({ marketplace, nft }) => {
    const [mediaFile, setMediaFile] = useState('')
    const [price, setPrice] = useState(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [mediaType, setMediaType] = useState('')
    
    const uploadMediaFileToIPFS = async (event) => {
      console.log("Uploading for media type " + mediaType)

      event.preventDefault()
      const file = event.target.files[0]
      if (typeof file !== 'undefined') {
        try {
          const result = await client.add(file)
          console.log(result)
          setMediaFile(ipfsGateWay + "/ipfs/" + result.path)
        } catch (error){
          console.log("ipfs image upload error: ", error)
        }
      }
    }

    const createNFT = async () => {
      console.log("Create nft...")
      if (!mediaFile || !price || !name || !description || !mediaType) { 
        console.log("Input data incorrect!")
        return
      }
      try{
        console.log("Waiting client...")
        const resultMetadata = await client.add(JSON.stringify({price, name, description, mediaType}))
        const resultHiddenMetadata = await client.add(JSON.stringify({image: mediaFile}))
        mintThenList(resultMetadata, resultHiddenMetadata)
      } catch(error) {
        console.log("ipfs uri upload error: ", error)
      }
    }

    const mintThenList = async (resultMetadata, resultHiddenMetadata) => {
      const uri = ipfsGateWay + "/ipfs/" + resultMetadata.path
      const hiddenUri = ipfsGateWay + "/ipfs/" + resultHiddenMetadata.path
      
      console.log("mintThenList... " + resultMetadata.path)
      console.log("hidden uri: " + resultHiddenMetadata.path)

      // mint nft 
      await(await nft.mint(uri, hiddenUri)).wait()
      console.log("1...")
      // get tokenId of new nft 
      const id = await nft.tokenCount()
      console.log("2...")
      // approve marketplace to spend nft
      await(await nft.setApprovalForAll(marketplace.address, true)).wait()
      console.log("3...")
      // add nft to marketplace
      const listingPrice = ethers.utils.parseEther(price.toString())
      console.log("4...")
      await(await marketplace.makeItem(nft.address, id, listingPrice)).wait()
      console.log("5...")
    }
    return (
      <div className="container-fluid mt-5">
        <div className="row">
          <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1000px' }}>
            <div className="content mx-auto">
              <Row className="g-4">

                <Form.Select onChange={(e) => setMediaType(e.target.value)} size="lg" aria-label="Media type">
                  <option>Select media type</option>
                  <option value="Video">Video</option>
                  <option value="Music">Music</option>
                  <option value="Image">Image</option>
                </Form.Select>
                
                <Form.Control
                  type="file"
                  required
                  name="file"
                  onChange={uploadMediaFileToIPFS}
                />
                
                <Form.Control onChange={(e) => setName(e.target.value)} size="lg" required type="text" placeholder="Name" />
                <Form.Control onChange={(e) => setDescription(e.target.value)} size="lg" required as="textarea" placeholder="Description" />
                <Form.Control onChange={(e) => setPrice(e.target.value)} size="lg" required type="number" placeholder="Price in Matic" />
                <div className="d-grid px-0">
                  <Button onClick={createNFT} variant="primary" size="lg">
                    Create & List NFT!
                  </Button>
                </div>
              </Row>
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  export default Create