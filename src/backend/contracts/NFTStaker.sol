// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract NFTStaker {
    ERC721A public parentNFT;
    IERC20 public immutable rewardsToken;

    // Duration of rewards to be paid out (in seconds)
    uint public duration;
    // Timestamp of when the rewards finish
    uint public finishAt;

    // Reward to be paid out per second
    uint public rewardRate;

    // map staker address to stake details (stakes[address][tokenId] = timestamp)
    mapping(address => mapping(uint256 => uint256)) public stakes;

    constructor(address nftAddress, address rewardsTokenAddress) {
        parentNFT = ERC721A(nftAddress);
        rewardsToken = ERC20(rewardsTokenAddress);
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

     function onERC721AReceived(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4) {
        return bytes4(keccak256("onERC721AReceived(address,address,uint256,uint256,bytes)"));
    }

}