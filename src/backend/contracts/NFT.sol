// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "erc721a/contracts/ERC721A.sol";

contract NFT is ERC721A, Ownable {
    string public constant uriSuffix = '.json';

    uint256 public immutable max_supply = 9999;

    bool public whitelistEnabled = true;
    address[] private whitelistedAddresses;

    bool private revealed = false;
    string private constant revealUri = "ipfs://QmTfq5RWpX3k6dqbu2nGNc533YV1NhrB93imRh1WDnUhWB";

    string private constant unkownUri = "unkownURI"; // todo: Metadata with unkown image
    string[20] private unknownUris; // 20 unkown to be revealed one by one as the story progresses.

    constructor(address teamAddress, address[] memory _usersToWhitelist) ERC721A("Gelato NFT", "GLN")
    {
        // Set whitelist
        delete whitelistedAddresses;
        whitelistedAddresses = _usersToWhitelist;

        // Mint 333 NFTs for the team
        _mint(teamAddress, 333);

        // Set unkownUris
        uint256 unknownUrisLength = unknownUris.length;
        for (uint256 i = 0; i < unknownUrisLength;) {
            unknownUris[i] = unkownUri;
            unchecked { ++i; }
        }
        
        // safeTransferFrom(msg.sender, address(this), 0);
    }

    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), 'ERC721Metadata: URI query for nonexistent token ');

        if (revealed == false) {
            return revealUri;
        }

        if (_tokenId < 20) { // 20 first tokens are Unkowns
            return unknownUris[_tokenId];
        }

        string memory currentBaseURI = _baseURI();
        return bytes(currentBaseURI).length > 0
            ? string(abi.encodePacked(currentBaseURI, Strings.toString(_tokenId), uriSuffix))
            : '';
    }

    function mint(uint256 quantity) external payable {
        require(totalSupply() + quantity < max_supply, 'Cannot mint more than max supply');
        _mint(msg.sender, quantity);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://QmNmBHVHMHt8kvT2VtPDjZ6sjGjyjJ5LBsr1DhnLvzTZss/";
    }
    
    function baseTokenURI() public pure returns (string memory) {
        return _baseURI();
    }

    function revealCollection() public {
        revealed = true;
    }

    function contractURI() public pure returns (string memory) {
        return "ipfs://QmTA41cxgi62ik86g3e1m8sbgvPus7SLZwoNjFrCDUGvxq/";
    }

    function setWhitelistEnabled(bool _state) public onlyOwner {
        whitelistEnabled = _state;
    }

    function whitelistUsers(address[] calldata _users) public onlyOwner {
        delete whitelistedAddresses;
        whitelistedAddresses = _users;
    }

    function isWhitelisted(address _user) public view returns (bool) {
        uint256 whitelistedAddressesLength = whitelistedAddresses.length;
        for (uint256 i = 0; i < whitelistedAddressesLength;) {
            if (whitelistedAddresses[i] == _user) {
                return true;
            }
            unchecked { ++i; }
        }
        return false;
    }

    function revealUnkown(uint256 _tokenId, string calldata tokenUri) public onlyOwner {
        require(_tokenId < 20, "tokenId must be between 0 and 20");
        require(keccak256(abi.encodePacked((unknownUris[_tokenId]))) == keccak256(abi.encodePacked((unkownUri))), "unkown has already been revealed");

        unknownUris[_tokenId] = tokenUri;
    }
}