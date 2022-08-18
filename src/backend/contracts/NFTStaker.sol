// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract NFTStaker is ERC721Holder {
    ERC721A public parentNFT;
    ERC20 public rewardsToken;

    // Reward to be paid out per second
    uint256 public rewardRate;

    // map staker address to stake details (stakes[address][tokenId] = timestamp)
    mapping(address => mapping(uint256 => uint256)) public stakes;

    constructor(address nftAddress, address rewardsTokenAddress) {
        parentNFT = ERC721A(nftAddress);
        rewardsToken = ERC20(rewardsTokenAddress);
        rewardRate = 5 * 10**uint(rewardsToken.decimals()) / 1 days; // 5 per day
    }

    function stake(uint256 _tokenId) public {
        stakes[msg.sender][_tokenId] = block.timestamp; 
        parentNFT.safeTransferFrom(msg.sender, address(this), _tokenId);
    } 

    function unstake(uint256 _tokenId) public {
        // Unstake NFT from this smart contract
        parentNFT.safeTransferFrom(address(this), msg.sender, _tokenId);

        // Handout reward depending on the stakingTime
        uint256 stakingTime = block.timestamp - stakes[msg.sender][_tokenId];
        uint256 reward = stakingTime * rewardRate;
        rewardsToken.transfer(msg.sender, reward);

        delete stakes[msg.sender][_tokenId];
    }
}