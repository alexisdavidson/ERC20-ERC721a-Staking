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

    // Staker must be structured this way because of the important function getStakedTokens() below that returns the tokenIds array directly.
    struct Staker { 
        uint256[] tokenIds;
        uint256[] timestamps;
        Mission[] missions;
        uint256 tokensToClaim;
    }

    struct Mission {
        uint256 startTimestamp;
        uint256 duration; // In hours
    }

    uint256 public rewardRate; // Reward to be paid out per second
    Mission currentMission;
    mapping(address => Staker) private stakers;
    
    event StakeSuccessful(
        uint256 tokenId,
        uint256 timestamp
    );
    
    event UnstakeSuccessful(
        uint256 tokenId,
        uint256 reward
    );

    constructor(address nftAddress) {
        parentNFT = ERC721A(nftAddress);
        rewardRate = 5 * 10**uint(18) / 1 days; // 5 per day
    }

    function setOwnerAndTokenAddress(address _newOwner, address _tokenAddress) external onlyOwner {
        rewardsToken = ERC20(_tokenAddress);
        _transferOwnership(_newOwner);
    }

    function startMission(uint256 _duration) external onlyOwner {
        currentMission.startTimestamp = block.timestamp;
        currentMission.duration = _duration * 3600; // hours to seconds
    }

    function isMissionOngoing() view public returns(bool) {
        return currentMission.startTimestamp > 0 && (block.timestamp - currentMission.startTimestamp < currentMission.duration);
    }

    function stake(uint256 _tokenId) public nonReentrant {
        require(isMissionOngoing(), "There is no ongoing mission!");
        stakers[msg.sender].tokenIds.push(_tokenId);
        stakers[msg.sender].timestamps.push(block.timestamp);
        stakers[msg.sender].missions.push(currentMission);
        parentNFT.safeTransferFrom(msg.sender, address(this), _tokenId);

        emit StakeSuccessful(_tokenId, block.timestamp);
    }

    function stakeBatch(uint256[] memory _tokenIds) public nonReentrant {
        require(isMissionOngoing(), "There is no ongoing mission!");
        
        uint256 _tokensIdsLength = _tokenIds.length;
        for (uint256 i = 0; i < _tokensIdsLength;) {
            stake(_tokenIds[i]);
            unchecked { ++i; }
        }
    }

    function findIndexForTokenStaker(uint256 _tokenId, address _stakerAddress) private view returns(uint256, bool) {
        Staker memory _staker = stakers[_stakerAddress];

        uint256 _tokenIndex = 0;
        bool _foundIndex = false;
        
        uint256 _tokensLength = _staker.tokenIds.length;
        for(uint256 i = 0; i < _tokensLength; i ++) {
            if (_staker.tokenIds[i] == _tokenId) {
                _tokenIndex = i;
                _foundIndex = true;
                break;
            }
        }

        return (_tokenIndex, _foundIndex);
    }

    function getRewardForTokenIndexStaker(uint256 _tokenIndex, address _stakerAddress) private view returns(uint256) {
        Staker memory _staker = stakers[_stakerAddress];

        // If the player unstakes later than the end of the mission, don't count the time after that
        uint256 _missionEndTimestamp = _staker.missions[_tokenIndex].startTimestamp + _staker.missions[_tokenIndex].duration;
        uint256 _leaveMissionTimestamp = block.timestamp > _missionEndTimestamp ? _missionEndTimestamp : block.timestamp;
        // Handout reward depending on the stakingTime
        uint256 _stakingTime = _leaveMissionTimestamp - _staker.timestamps[_tokenIndex];
        uint256 _reward = _stakingTime * rewardRate;

        return _reward;
    }

    function unstake(uint256 _tokenId) public nonReentrant {
        Staker memory _staker = stakers[msg.sender];
        (uint256 _tokenIndex, bool _foundIndex) = findIndexForTokenStaker(_tokenId, msg.sender);
        require(_foundIndex, "Index not found for this staker.");

        uint256 _reward = getRewardForTokenIndexStaker(_tokenIndex, msg.sender);

        // Unstake NFT from this smart contract
        parentNFT.safeTransferFrom(address(this), msg.sender, _tokenId);
        removeStakerElement(_tokenIndex, _staker.tokenIds.length - 1);

        stakers[msg.sender].tokensToClaim += _reward;

        emit UnstakeSuccessful(_tokenId, _reward);
    }

    function sendAllInactiveToMission(uint256[] memory _tokenIds) public nonReentrant {
        require(isMissionOngoing(), "There is no ongoing mission!");
        
        uint256 _tokensIdsLength = _tokenIds.length;
        uint256 _currentTimestamp = block.timestamp;
        for (uint256 i = 0; i < _tokensIdsLength;) {
            
            (uint256 _tokenIndex, bool _foundIndex) = findIndexForTokenStaker(_tokenIds[i], msg.sender);
            require(_foundIndex, "Index not found for this staker.");
            require(stakers[msg.sender].timestamps[_tokenIndex] + stakers[msg.sender].missions[_tokenIndex].duration > _currentTimestamp, 
                "This Gelato is still on an ongoing mission!");
            
            uint256 _reward = getRewardForTokenIndexStaker(_tokenIndex, msg.sender);
            
            // Send to next mission
            stakers[msg.sender].timestamps[_tokenIndex] = _currentTimestamp;
            stakers[msg.sender].missions[_tokenIndex] = currentMission;
            
            // Add reward from last mission
            stakers[msg.sender].tokensToClaim += _reward;
            unchecked { ++i; }
        }
    }

    function claimReward() external {
        uint256 _reward = stakers[msg.sender].tokensToClaim;
        require(_reward > 0, "No tokens to claim.");

        if (rewardsToken.transfer(msg.sender, _reward) == true) {
            stakers[msg.sender].tokensToClaim = 0;
        }
        else revert();
    }

    function removeStakerElement(uint256 _tokenIndex, uint256 _lastIndex) internal {
        stakers[msg.sender].timestamps[_tokenIndex] = stakers[msg.sender].timestamps[_lastIndex];
        stakers[msg.sender].timestamps.pop();

        stakers[msg.sender].tokenIds[_tokenIndex] = stakers[msg.sender].tokenIds[_lastIndex];
        stakers[msg.sender].tokenIds.pop();

        stakers[msg.sender].missions[_tokenIndex] = stakers[msg.sender].missions[_lastIndex];
        stakers[msg.sender].missions.pop();
    }

    function isTokenStaked(uint256 _tokenId) public view returns(bool) {
        uint256 _tokensLength = stakers[msg.sender].tokenIds.length;
        for(uint256 i = 0; i < _tokensLength; i ++) {
            if (stakers[msg.sender].tokenIds[i] == _tokenId) {
                return true;
            }
        }
        return false;
    }
    
    function getStakedTokens(address _user) public view returns (uint256[] memory tokenIds) {
        return stakers[_user].tokenIds;
    }
    
    function getStakedTimestamps(address _user) public view returns (uint256[] memory timestamps) {
        return stakers[_user].timestamps;
    }
    
    function getStakedMissions(address _user) public view returns (Mission[] memory missions) {
        return stakers[_user].missions;
    }
    
    function getRewardToClaim(address _user) public view returns (uint256) {
        return stakers[_user].tokensToClaim;
    }
}