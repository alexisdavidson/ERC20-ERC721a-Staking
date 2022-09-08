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

    struct Staker { 
        uint256[] tokenIds;
        uint256[] timestamps;
        uint256[] missionDurations;
    }

    struct Mission {
        uint256 startTimestamp;
        uint256 duration; // In hours
    }

    uint256 public rewardRate; // Reward to be paid out per second
    Mission currentMission;
    mapping(address => Staker) private stakers;

    constructor(address nftAddress) {
        parentNFT = ERC721A(nftAddress);
        rewardRate = 5 * 10**uint(18) / 1 days; // 5 per day
    }

    function setTokenAddress(address _tokenAddress) external onlyOwner {
        rewardsToken = ERC20(_tokenAddress);
    }

    function startMission(uint256 _duration) external onlyOwner {
        currentMission.startTimestamp = block.timestamp;
        currentMission.duration = _duration;
    }

    function isMissionOngoing() view public returns(bool) {
        return currentMission.startTimestamp > 0 && (block.timestamp - currentMission.startTimestamp < currentMission.duration);
    }

    function maximumReward(uint256 _duration) view internal returns(uint256){
        return _duration * 60 * 60 * rewardRate;
    }

    function stake(uint256 _tokenId) public {
        require(isMissionOngoing(), "There is no ongoing mission!");
        stakers[msg.sender].tokenIds.push(_tokenId);
        stakers[msg.sender].timestamps.push(block.timestamp);
        stakers[msg.sender].missionDurations.push(currentMission.duration);
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
        uint256 maximumRewardForMission = maximumReward(stakers[msg.sender].missionDurations[tokenIndex]);
        reward = reward >= maximumRewardForMission ? maximumRewardForMission : reward;

        rewardsToken.transfer(msg.sender, reward);
        removeStakerElement(tokenIndex, tokensLength - 1);
    }

    function removeStakerElement(uint256 _tokenIndex, uint256 _lastIndex) internal {
        stakers[msg.sender].timestamps[_tokenIndex] = stakers[msg.sender].timestamps[_lastIndex];
        stakers[msg.sender].timestamps.pop();

        stakers[msg.sender].tokenIds[_tokenIndex] = stakers[msg.sender].tokenIds[_lastIndex];
        stakers[msg.sender].tokenIds.pop();

        stakers[msg.sender].missionDurations[_tokenIndex] = stakers[msg.sender].missionDurations[_lastIndex];
        stakers[msg.sender].missionDurations.pop();
    }

    function isTokenStaked(uint256 _tokenId) public view returns(bool) {
        uint256 tokensLength = stakers[msg.sender].tokenIds.length;
        for(uint256 i = 0; i < tokensLength; i ++) {
            if (stakers[msg.sender].tokenIds[i] == _tokenId) {
                return true;
            }
        }
        return false;
    }
    
    function getStakedTokens(address _user) public view returns (uint256[] memory tokenIds) {
        return stakers[_user].tokenIds;
    }
}