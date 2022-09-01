// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract NFTStaker is ERC721Holder, ReentrancyGuard, Ownable {
    ERC721A public parentNFT;
    ERC20 public rewardsToken;

    // Reward to be paid out per second
    uint256 public rewardRate;

    struct Staker { 
        uint256[] tokenIds;
        uint256[] timestamps;
    }

    // map staker address to stake details (stakes[address][tokenId] = timestamp)
    mapping(address => Staker) private stakers;

    constructor(address nftAddress) {
        parentNFT = ERC721A(nftAddress);
        // rewardsToken = ERC20(rewardsTokenAddress);
        
        rewardRate = 5 * 10**uint(18) / 1 days; // 5 per day
    }

    function setTokenAddress(address _tokenAddress) external onlyOwner {
        rewardsToken = ERC20(_tokenAddress);
    }

    // function claimTokenInitialSupply() external onlyOwner {
    //     rewardsToken.claimInitialSupply();
    // }

    function stake(uint256 _tokenId) public {
        stakers[msg.sender].tokenIds.push(_tokenId);
        stakers[msg.sender].timestamps.push(block.timestamp); 
        parentNFT.safeTransferFrom(msg.sender, address(this), _tokenId);
    } 

    function unstake(uint256 _tokenId) public nonReentrant {
        // Unstake NFT from this smart contract
        parentNFT.safeTransferFrom(address(this), msg.sender, _tokenId);

        uint256 tokenIndex = 0;
        // Find token Index
        uint256 tokensLength = stakers[msg.sender].tokenIds.length;
        for(uint256 i = 0; i < tokensLength; i ++) {
            if (stakers[msg.sender].tokenIds[i] == _tokenId) {
                tokenIndex = i;
                break;
            }
        }

        // Handout reward depending on the stakingTime
        uint256 stakingTime = block.timestamp - stakers[msg.sender].timestamps[tokenIndex];
        uint256 reward = stakingTime * rewardRate;

        rewardsToken.transfer(msg.sender, reward);

        (stakers[msg.sender].timestamps[tokenIndex], stakers[msg.sender].timestamps[tokensLength - 1]) = (stakers[msg.sender].timestamps[tokensLength - 1], stakers[msg.sender].timestamps[tokenIndex]);
        stakers[msg.sender].timestamps.pop();

        (stakers[msg.sender].tokenIds[tokenIndex], stakers[msg.sender].tokenIds[tokensLength - 1]) = (stakers[msg.sender].tokenIds[tokensLength - 1], stakers[msg.sender].tokenIds[tokenIndex]);
        stakers[msg.sender].tokenIds.pop();
    }

    function isTokenStaked(uint256 _tokenId) public view returns(bool) {
        uint256 tokensLength = stakers[msg.sender].tokenIds.length;
        for(uint256 i = 0; i < tokensLength; i ++) {
            if (stakers[msg.sender].tokenIds[i] == _tokenId) {
                return true;
            }
        }
        return false;
        // return stakers[msg.sender][_tokenId] > 0;
    }
    
    function getStakedTokens(address _user) public view returns (uint256[] memory tokenIds)
    {
        return stakers[_user].tokenIds;
    }
}