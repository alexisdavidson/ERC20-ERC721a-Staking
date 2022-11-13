// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {DefaultOperatorFilterer} from "./DefaultOperatorFilterer.sol";

contract NFT is ERC721A, Ownable, DefaultOperatorFilterer {
    string public constant uriSuffix = '.json';

    uint256 public immutable max_supply = 9941;

    uint public amountMintPerAccount = 10;

    bytes32 public whitelistRoot;
    bool public publicSaleEnabled;

    string private constant unkownNotRevealedUri = "Not revealed yet";
    string[20] private unknownUris; // 20 unkown to be revealed one by one as the story progresses.

    uint256 public price;
    
    event MintSuccessful(
        address user
    );

    constructor(address teamAddress, bytes32 _whitelistRoot) ERC721A("Gelatoverse Genesis", "GG")
    {
        whitelistRoot = _whitelistRoot;

        // Mint 333 NFTs for the team
        _mint(teamAddress, 333);

        // Set unkownUris
        uint256 unknownUrisLength = unknownUris.length;
        for (uint256 i = 0; i < unknownUrisLength;) {
            unknownUris[i] = unkownNotRevealedUri;
            unchecked { ++i; }
        }

        // Transfer ownership
        _transferOwnership(teamAddress);
    }

    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), 'ERC721Metadata: URI query for nonexistent token ');

        if (_tokenId < 20 && isUnkownRevealed(_tokenId)) { // 20 first tokens are Unkowns
            return unknownUris[_tokenId];
        }

        string memory currentBaseURI = _baseURI();
        return bytes(currentBaseURI).length > 0
            ? string(abi.encodePacked(currentBaseURI, Strings.toString(_tokenId), uriSuffix))
            : '';
    }

    function mint(uint256 quantity, bytes32[] memory _proof) external payable {
        require(totalSupply() + quantity < max_supply, 'Cannot mint more than max supply');
        require(publicSaleEnabled || isValid(_proof, keccak256(abi.encodePacked(msg.sender))), 'You are not whitelisted');
        require(balanceOf(msg.sender) < amountMintPerAccount, 'Each address may only mint x NFTs!');
        require(msg.value >= getPrice(), "Not enough ETH sent; check price!");
        _mint(msg.sender, quantity);
        
        emit MintSuccessful(msg.sender);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://Qmbx9io6LppmpvavX3EqZY8igQxPZh7koUzW3mPRLkLQir/";
    }
    
    function baseTokenURI() public pure returns (string memory) {
        return _baseURI();
    }

    function contractURI() public pure returns (string memory) {
        return "ipfs://QmWBjrx4QnwwLWzu1GosaLw1wv3ikvC5Tq7sJUcqEzr3So/";
    }

    function setPublicSaleEnabled(bool _state) public onlyOwner {
        publicSaleEnabled = _state;
    }

    function setWhitelistRoot(bytes32 _whitelistRoot) public onlyOwner {
        whitelistRoot = _whitelistRoot;
    }

    function isValid(bytes32[] memory _proof, bytes32 _leaf) public view returns (bool) {
        return MerkleProof.verify(_proof, whitelistRoot, _leaf);
    }

    function revealUnkown(uint256 _tokenId, string calldata tokenUri) public onlyOwner {
        require(_tokenId < 20, "tokenId must be between 0 and 20");
        require(!isUnkownRevealed(_tokenId), "unkown has already been revealed");

        unknownUris[_tokenId] = tokenUri;
    }

    function isUnkownRevealed(uint256 _tokenId) public view returns(bool) {
        return keccak256(abi.encodePacked((unknownUris[_tokenId]))) != keccak256(abi.encodePacked((unkownNotRevealedUri)));
    }

    function getPrice() view public returns(uint) {
        return price;
    }

    function setPrice(uint _price) public onlyOwner {
        price = _price;
    }

    function setAmountMintPerAccount(uint _amountMintPerAccount) public onlyOwner {
        amountMintPerAccount = _amountMintPerAccount;
    }

    function transferFrom(address from, address to, uint256 tokenId) public override onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
        public
        override
        onlyAllowedOperator(from)
    {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function withdraw() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }
}