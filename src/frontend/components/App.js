import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom"
import logo from './logo.png';
import './App.css';
import Navigation from './Navbar';
import Home from './Home';
import ViewItem from './ViewItem';
import Create from './Create';
import MyPurchases from './MyPurchases';
import MyListedItems from './MyListedItems';

import { useState } from 'react'
import { ethers } from 'ethers'
import { Spinner } from 'react-bootstrap'

import MarketplaceAbi from '../contractsData/Marketplace.json'
import MarketplaceAddress from '../contractsData/Marketplace-address.json'
import NFTAbi from '../contractsData/NFT.json'
import NFTAddress from '../contractsData/NFT-address.json'

function App() {
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState(null)
  const [nft, setNFT] = useState({})
  const [marketplace, setMarketplace] = useState({})

  // MetaMask Login/Connect
  const web3Handler = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[0])

    const provider = new ethers.providers.Web3Provider(window.ethereum)

    const signer = provider.getSigner()

    loadContracts(signer)
  }

  const loadContracts = async (signer) => {
    console.log("loading Contract " + MarketplaceAddress.address)

    const marketplace = new ethers.Contract(MarketplaceAddress.address, MarketplaceAbi.abi, signer)
    setMarketplace(marketplace)
    const nft = new ethers.Contract(NFTAddress.address, NFTAbi.abi, signer)
    setNFT(nft)
    setLoading(false)
  }
  return (
    <BrowserRouter>
      <div className="App">
        <Navigation web3Handler={web3Handler} account={account} />
        { loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
            <Spinner animation="border" style={{ display: 'flex' }} />
            <p className='mx-3 my-0'>Awaiting MetaMask Connection...</p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={
              <Home marketplace={marketplace} nft={nft}/>
            } />
            <Route path="/create" element={
              <Create marketplace={marketplace} nft={nft}/>
            } />
            <Route path="/my-listed-items" element={
              <MyListedItems marketplace={marketplace} nft={nft} account={account}/>
            } />
            <Route path="/my-purchases" element={
              <MyPurchases marketplace={marketplace} nft={nft} account={account}/>
            } />
            <Route path="/view-item" element={
              <ViewItem marketplace={marketplace} nft={nft} account={account}/>
            } />
          </Routes>
        ) }
      </div>
    </BrowserRouter>
  );
}

export default App;
