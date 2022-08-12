// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract NFT is ERC721URIStorage {
    uint public tokenCount;

    mapping(uint => address[]) public buyers;
    mapping(uint => string) private hiddentokenURIs;

    constructor() ERC721("Artist Marketplace NFT", "AMN") {}

    function mint(string memory _tokenURI, string memory _hiddenTokenURI) external returns(uint) {
        tokenCount += 1;
        _safeMint(msg.sender, tokenCount);
        _setTokenURI(tokenCount, _tokenURI);

        addHiddenTokenUri(tokenCount, _hiddenTokenURI);

        return(tokenCount);
    }

    function addHiddenTokenUri(uint256 _tokenId, string memory _hiddenTokenURI) private {
        hiddentokenURIs[_tokenId] = _hiddenTokenURI;
    }

    function addBuyer(address _user, uint256 _tokenId) public {
        buyers[_tokenId].push(_user);
    }

    function getTokenUriForUser(address _user, uint256 _tokenId) public view returns(string memory) {
        if (userHasBoughtToken(_user, _tokenId)) {
            return hiddentokenURIs[_tokenId];
        }
        return "User has no access for this token";
    }

    function getBuyersCount(uint256 _tokenId) public view returns(uint) {
        return buyers[_tokenId].length;
    }

    function getBuyers(uint256 _tokenId) public view returns(address[] memory) {
        return buyers[_tokenId];
    }

    function userHasBoughtToken(address _user, uint256 _tokenId) public view returns(bool) {
        for (uint i = 0; i < buyers[_tokenId].length; i++) {
            if (buyers[_tokenId][i] == _user) {
                return true;
            }
        }
        return false;
    }
}