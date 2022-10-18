// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract NewTokenExample is ERC721, Ownable, ReentrancyGuard, VRFConsumerBaseV2 {
    using Counters for Counters.Counter;
    
    //Globals    ****************************************************************************
    Counters.Counter public _totalSupplies;
    Counters.Counter public _tokenIdCounter;
    Counters.Counter public _splitCounter;
    mapping(uint256 => Character) public Characters;
    address public moderator;
    bool public active;
    uint256 public maximum;
    
    //VRF Chainlink **************************************************************************************
    uint64 s_subscriptionId;
    VRFCoordinatorV2Interface COORDINATOR;
    address vrfCoordinator = 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D; // goerli - Change this depending current blockchain!
    bytes32 keyHash = 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15; // goerli - Change this depending current blockchain!
    uint32 callbackGasLimit = 200000;
    uint16 requestConfirmations = 3;
    uint32 numWords =  2;
    uint256[] public s_randomWords;
    uint256 public s_requestId;

    struct RandomNumberRequest {
        address sender;
        uint256 callbackFunction; // 0 = redeem; 1 = explore; 2 = fight
        
        // optional parameters for callback functions
        uint256 param1;
        uint256 param2;
    }

    RandomNumberRequest[] randomNumberRequestsQueue;

    //Constructor **************************************************************************************
    constructor(uint64 subscriptionId) ERC721("NewTokenExample", "MTK") VRFConsumerBaseV2(vrfCoordinator) {
        // Initialize Chainlink Coordinator
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
    }

    //Structs ************************************************************************************
    struct Character{
        uint256 level;
        uint256 stash;
        uint256 targetX;
        uint256 targetY;
        uint256 backpack;
        bool wandering;
    }

    //Events ********************************************************************************
    event Result(uint256 indexed _uid, bool loser, bool coward, bool instant, bool critical, uint256 targetX, uint256 targetY, uint256 actual, uint256 amount);
    event Debug(uint256 indexed _uid, uint256 stash, uint256 backpack, uint256 total);
    event RandomNumberRequestComplete(address sender, uint256 callbackFunction, uint256 param1, uint256 param2);


    //Idle    ********************************************************************************
    function GameSpawn() public payable nonReentrant(){
        require(moderator != 0x0000000000000000000000000000000000000000, "No Moderator");
        require(active == true, "Halted");
        require(msg.value >= 10 ether, "Not enough MATIC");
        //Refund excess over 10 eth
        //Send 10 eth to moderator address
        //Mint new NFT and set the Characters[_uid] to proper struct values
        if (msg.value > 10 ether){
            uint256 excess = msg.value - 10 ether;
            (bool refunded, ) = payable(msg.sender).call{value: excess}("");
            require(refunded, "Failed");
        }
        (bool success, ) = payable(moderator).call{value: 10 ether}("");
        require(success, "Failed");
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(msg.sender, tokenId);
        Characters[tokenId] = Character(_splitCounter._value,0,0,0,0,false);
        _tokenIdCounter.increment(); 
    }

    //AUDITOR 
	//Forbidden() is several common requires() that should revert. Is this more risky than having all requires inline?

    function GameReload(uint256 _uid, uint256 _amount) public payable nonReentrant(){
        forbidden(_uid);
        require(active == true, "Halted");
        require(address(this).balance > msg.value, "Try a smaller amount");
        require(_amount <= maximum * 10, "Greater than maximum");
        require(_amount != 0, "Must be greater than 0");
        require(_amount % 10 == 0, "Please use multiples of 10");
        require(Characters[_uid].wandering == false, "Fight or Flee first");
        
        //Calculate share price, purchase shares with a 20% markup, add purchased shares to Characters[_uid], increase total supply of shares, return overpayment
        uint256 price = (address(this).balance - msg.value) / _totalSupplies._value;
        uint256 tax = (price * 20/100) * _amount;
        uint256 fees = price * _amount + tax; 
        require(msg.value >= fees, "Not enough MATIC");
        if (msg.value > fees){
            uint256 excess = msg.value - fees;
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "Failed");
        }
        Characters[_uid].stash += _amount;
        _totalSupplies._value += _amount;
    }

    //AUDITOR 
	//You mentioned something about "locking" funds in previous version comments?

    function GameRedeem(uint256 _uid, uint256 _amount) public nonReentrant() {
        forbidden(_uid);
        require(_amount > 0, "Zero Amount?");
        require(_amount <= Characters[_uid].stash, "Not enough supplies");
        require(Characters[_uid].wandering == false, "Fight or Flee first");

        // Call VRF. Callback will trigger RedeemRandom()
        requestRandomNumber(RandomNumberRequest(msg.sender, 0, _uid, _amount));
    }

    function RedeemRandom(uint256 _randomNumber, uint256 _uid, uint256 _amount) internal {
        //Remove shares from Characters[_uid].stash, decrease total supply of shares. 
        //If randNoMod is zero (1 in a trillion chance), shares destroyed without value refund else give value of shares to _uid owner
        uint256 price = (address(this).balance) / _totalSupplies._value;
        uint256 redeem = price * _amount;
        Characters[_uid].stash -= _amount;
        _totalSupplies._value -= _amount;

        if (_randomNumber != 0){
            (bool success, ) = payable(ownerOf(_uid)).call{value: redeem}("");
            require(success, "Failed");
        }
    }

    function GameTransfer(uint256 _uid, uint256 _recipient, uint256 _amount) public {
        forbidden(_uid);
        require(active == true, "Halted");
        require(_amount > 0, "Zero Amount?");
        require(_recipient <= _tokenIdCounter._value, "Recipient does not exist");
        require(_uid != _recipient, "You can not trade to yourself.");
        require(_amount <= Characters[_uid].stash, "Not enough supplies");
        require(Characters[_uid].wandering == false, "Fight or Flee first");
        //Transfer shares to friend, probably should not be used ever...
        Characters[_uid].stash -= _amount;
        Characters[_recipient].stash += _amount;
    }

    function GameSplit(uint256 _uid) public {
        require(moderator != 0x0000000000000000000000000000000000000000, "No Moderator");
        require(_uid < _tokenIdCounter._value, "NFT# does not exist");
        require(msg.sender == ownerOf(_uid), "NFT# not yours");
        //As share price grows the Modrator has the option to "Split" all shares which doubles the total supply and keeps the price managable
        //That is accounted for in the total supply, but not in the Characters[_uid].stash or Characters[_uid].backpack until the player splits the _uid
        //This should allow an idle player to "catch up" after a long time away by splitting shares several times in a row. 
        //Players should not be able to split more than everybody else
        Characters[_uid].level ++;
        Characters[_uid].stash += Characters[_uid].stash;
        Characters[_uid].backpack += Characters[_uid].backpack;
    }

    // Action *************************************************************

	//AUDITOR 
	//Is sending the win/loss through secondary function an issue?
	//Frontrunning a losing transaction? Miner manipulation?
    
    
    //AUDITOR 
    //Explore generates a "target range" of target.X  and target.Y 
    //If x == y || x is sequential to y the player loses 10% and the Exploration is finished
    //If x == 0 || y == 0 player loses entire bet.
    //Else x-y is the target range for fight function.

    function GameExplore(uint256 _uid, uint256 _amount) public {
        forbidden(_uid);
        require(active == true, "Halted");
        require(_amount != 0, "Must be greater than 0");
        require(_amount <= maximum, "Greater than maximum");
        require(_amount % 10 == 0, "Please use multiples of 10");
        require(_amount <= Characters[_uid].stash, "Not enough supplies");
        require(Characters[_uid].wandering == false, "Fight or Flee first");

        // Call VRF. Callback will trigger ExploreRandom()
        requestRandomNumber(RandomNumberRequest(msg.sender, 1, _uid, _amount));
    }
    
    function ExploreRandom(uint256 _randomNumber, uint256 _uid, uint256 _amount) internal {
        Characters[_uid].stash -= _amount;
        Characters[_uid].backpack += _amount;
        
        uint256 _rand = _randomNumber;
        Characters[_uid].targetX = _rand % 13;
        _rand = uint256(keccak256(abi.encodePacked(msg.sender, _rand)));
        Characters[_uid].targetY = _rand % 13;

        if (Characters[_uid].targetX == 0 || Characters[_uid].targetY == 0){
            //Critical Loss
            emit Result(_uid, true, false, true, false, Characters[_uid].targetX, Characters[_uid].targetY, 99, _amount);
            loser(_uid, _amount);
            return;
        }

        if (Characters[_uid].targetX == Characters[_uid].targetY){
            //Lose
            emit Result(_uid, true, false, true, false, Characters[_uid].targetX, Characters[_uid].targetY, 99, _amount * 10/100);
            loser(_uid, _amount * 10/100);
            return;
        }

        if (Characters[_uid].targetX == Characters[_uid].targetY + 1){
            //Lose
            emit Result(_uid, true, false, true, false, Characters[_uid].targetX, Characters[_uid].targetY, 99, _amount * 10/100);
            loser(_uid, _amount * 10/100);
            return;
        }

        if (Characters[_uid].targetY == Characters[_uid].targetX + 1){
            //Lose
            emit Result(_uid, true, false, true, false, Characters[_uid].targetX, Characters[_uid].targetY, 99, _amount * 10/100);
            loser(_uid, _amount * 10/100);
            return;
        }

        Characters[_uid].wandering = true;
    }

    //AUDITOR 
	//Fight generates a result number, if result is within target range, player wins. %50
    //If the result is outside target range player loses 50%
    //If result is equal to X or Y player loses 100%
    //If result is equal to 0 player wins double the total risked

    function GameFight(uint256 _uid) public {
        forbidden(_uid);
        require(Characters[_uid].wandering == true, "Please explore first");
        require(Characters[_uid].level == _splitCounter._value, "Please split your tokens");

        // Call VRF. Callback will trigger FightRandom()
        requestRandomNumber(RandomNumberRequest(msg.sender, 2, _uid, 0));
    }

    function FightRandom(uint256 _randomNumber, uint256 _uid) internal {

        uint256 _rand = _randomNumber%13;

        if (_rand == 0){
            //Critical win
            emit Result(_uid, false, false, false, true, Characters[_uid].targetX, Characters[_uid].targetY, _rand, Characters[_uid].backpack * 2);
            winner(_uid, Characters[_uid].backpack * 2);
            return;
        }

        if (_rand == Characters[_uid].targetX || _rand == Characters[_uid].targetY ){
            //Critical loss
            emit Result(_uid, true, false, false, true, Characters[_uid].targetX, Characters[_uid].targetY, _rand, Characters[_uid].backpack);
            loser(_uid, Characters[_uid].backpack);
            return;
        }

        if (_rand > Characters[_uid].targetX){
            if(_rand < Characters[_uid].targetY){
                //Win
                emit Result(_uid, false, false, false, false, Characters[_uid].targetX, Characters[_uid].targetY, _rand, Characters[_uid].backpack * 50/100);
                winner(_uid, Characters[_uid].backpack * 50/100);
                return;
            }
        }

        if (_rand < Characters[_uid].targetX){
            if(_rand > Characters[_uid].targetY){
                //Win
                emit Result(_uid, false, false, false, false, Characters[_uid].targetX, Characters[_uid].targetY, _rand, Characters[_uid].backpack * 50/100);
                winner(_uid, Characters[_uid].backpack * 50/100);
                return;
            }
        }

        //lose
        emit Result(_uid, true, false, false, false, Characters[_uid].targetX, Characters[_uid].targetY, _rand, Characters[_uid].backpack * 50/100); 
        loser(_uid, Characters[_uid].backpack * 50/100);
    }

    function GameFlee(uint256 _uid) public {
        forbidden(_uid);
        require(Characters[_uid].wandering == true, "Please explore first");
        require(Characters[_uid].level == _splitCounter._value, "Please split your tokens");
        //lose
        emit Result(_uid, true, true, false, false, Characters[_uid].targetX, Characters[_uid].targetY, 99, Characters[_uid].backpack * 20/100);
        loser(_uid, Characters[_uid].backpack * 20/100);
    }

    //Aministrative *******************************************************
    function winner(uint256 _uid, uint256 _amount) private {
        DebugCall(_uid);
        _totalSupplies._value += _amount;
        uint _total = Characters[_uid].backpack + _amount;
        Characters[_uid].stash += _total;
        Characters[_uid].backpack = 0;
        Characters[_uid].wandering = false;
        DebugCall(_uid);
    }

    function loser(uint256 _uid, uint256 _amount) private {
        DebugCall(_uid);
        _totalSupplies._value -= _amount;
        uint _total = Characters[_uid].backpack - _amount;
        Characters[_uid].stash += _total;
        Characters[_uid].backpack = 0;
        Characters[_uid].wandering = false;
        DebugCall(_uid);
    }
    
    function forbidden(uint256 _uid) private view {
        require(moderator != 0x0000000000000000000000000000000000000000, "No Moderator");
        require(_uid < _tokenIdCounter._value, "NFT# does not exist");
        require(msg.sender == ownerOf(_uid), "NFT# not yours");
        require(Characters[_uid].level == _splitCounter._value, "Split required :)");
    }
    
    function ModInitiate(uint256 _uid, uint256 _amount) public payable {
        require(msg.sender == moderator, "You != moderator");
        require(_totalSupplies._value == 0, "Already initiated");
        require(msg.sender == ownerOf(_uid), "NFT# not yours");
        //Premine some supplies for contract owners
        _totalSupplies._value += _amount;
        Characters[_uid].stash += _amount;
    }

    function ModSetModerator() public onlyOwner {
        //Create a moderator
        //After mod created contract can be renounced
        moderator = msg.sender;
        active = true;
        ModSetMax(1000); 
    }

    function ModSetMax(uint256 _new) public {
        //Moderator can change max amount of purchases and max amount that can be risked during single exploration
        require(msg.sender == moderator, "You != moderator");
        maximum = _new;
    }

    function ModBigRedButton() public {
        //Moderator can kill whole game
        //After "halted" you should only be able to split and withdrawl
        require(msg.sender == moderator, "You != moderator");
        active = false; 
    }

    function ModSplitAll() public {
        //The price per share could become unmanageable
        //Moderator can split the tokens which doubles the total supply and subsquently halves the value of each
        //This split is not reconciled per player until they split theirs indivually but the total supply and value of players who have already split should be correct
        require(msg.sender == moderator,"You != moderator");
        _totalSupplies._value += _totalSupplies._value;
        _splitCounter._value ++;
    }


    function GetGameState(uint256 _uid) public view returns(uint256 _NFTNumber, uint256 _level, uint256 _stash, uint256 _targetX, uint256 _targetY, uint256 _backpack, bool _wandering){
        //View function for checking player values
        _NFTNumber = _uid;
        _level = Characters[_uid].level;
        _stash = Characters[_uid].stash;
        _targetX = Characters[_uid].targetX;
        _targetY = Characters[_uid].targetY;
        _backpack = Characters[_uid].backpack;
        _wandering = Characters[_uid].wandering;
    }

    function GetGameValue(uint256 _uid) public view returns(uint256 price, uint256 count, uint256 value){
        price = (address(this).balance) / _totalSupplies._value;
        count = Characters[_uid].stash;
        value = count*price; 
    }


    //Random **************************************************************

    function GetGameRandXXL() public view returns(uint256 _rand) { 
        _rand = uint256(uint256(keccak256(abi.encodePacked(block.number, block.coinbase, msg.sender,address(this).balance ))));
    }

    function DebugCall(uint256 _uid) private {
        emit Debug(_uid, Characters[_uid].stash, Characters[_uid].backpack, _totalSupplies._value);
    }

    //VRF Chainlink **************************************************************
    // Request random number from Chainlink
    function requestRandomNumber(RandomNumberRequest memory _randomNumberRequest) public {
        requestRandomNumber();
        randomNumberRequestsQueue.push(_randomNumberRequest);
    }
    
    function requestRandomNumber() public {
        s_requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
    }

    // Callback function when random number from Chainlink is generated
    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        s_randomWords = randomWords;
        
        uint256 randomNumberRequestsQueueLength = randomNumberRequestsQueue.length;
        require(randomNumberRequestsQueueLength > 0, "No random number requests in queue");

        // Here we take the last random number request in queue and handle it
        RandomNumberRequest memory lastRandomNumberRequest = randomNumberRequestsQueue[randomNumberRequestsQueueLength - 1];

        if (lastRandomNumberRequest.callbackFunction == 0) { // Redeem
            RedeemRandom(s_randomWords[0], lastRandomNumberRequest.param1, lastRandomNumberRequest.param2);
        }
        else if (lastRandomNumberRequest.callbackFunction == 1) { // Explore
            ExploreRandom(s_randomWords[0], lastRandomNumberRequest.param1, lastRandomNumberRequest.param2);
        }
        else if (lastRandomNumberRequest.callbackFunction == 2) { // Fight
            FightRandom(s_randomWords[0], lastRandomNumberRequest.param1);
        }

        emit RandomNumberRequestComplete(lastRandomNumberRequest.sender, lastRandomNumberRequest.callbackFunction, lastRandomNumberRequest.param1, lastRandomNumberRequest.param2);
        randomNumberRequestsQueue.pop(); // Remove last random number request from queue
    }
}