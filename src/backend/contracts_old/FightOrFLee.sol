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
        uint256 callbackFunction; // 0 = spawn; 1 = redeem; 2 = explore; 3 = fight
        
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
        uint256 class;
        uint256 targetNumber;
        uint256 backpack;
        bool wandering;
    }

    //Events ********************************************************************************
    event Result(uint256 indexed _uid, bool winner, uint256 _amount);
    event Random(uint256 indexed _uid, uint256 _rand);
    event State(uint256 indexed _uid, uint256 _level, uint256 _stash, uint256 _class, uint256 _targetNumber, uint256 backpack, bool wandering);
    event RandomNumberRequestComplete(address sender, uint256 callbackFunction, uint256 param1, uint256 param2);


    //Idle    ********************************************************************************
    function spawn() public payable nonReentrant(){
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

        // Call VRF. Callback will trigger setCharacterRandomType()
        requestRandomNumber(RandomNumberRequest(msg.sender, 0, tokenId, 0));
    }

    function setCharacterRandomType(uint256 _randomType, uint256 _tokenId) internal {
        Characters[_tokenId] = Character(0, 0, _randomType, _splitCounter._value, 0, false);
        _tokenIdCounter.increment(); 
    }

    function topup(uint256 _uid, uint256 _amount) public payable nonReentrant(){
        require(active == true, "Halted");
        require(msg.sender == ownerOf(_uid), "NFT# not yours");
        require(Characters[_uid].level == _splitCounter._value, "Please split your tokens");
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

    function Redeem(uint256 _uid, uint256 _amount) public nonReentrant() {
        require(msg.sender == ownerOf(_uid), "NFT# not yours");
        require(_amount <= Characters[_uid].stash, "Not enough supplies");
        require(Characters[_uid].wandering == false, "Fight or Flee first");
        require(Characters[_uid].level == _splitCounter._value, "Please split your tokens");

        // Call VRF. Callback will trigger RedeemRandom()
        requestRandomNumber(RandomNumberRequest(msg.sender, 2, _uid, _amount));
    }

    function RedeemRandom(address _sender, uint256 _randNoMod, uint256 _uid, uint256 _amount) internal {
        //Remove shares from Characters[_uid].stash, decrease total supply of shares. 
        //If randNoMod is zero (1 in a trillion chance), shares destroyed without value refund else give value of shares to _uid owner
        uint256 price = (address(this).balance) / _totalSupplies._value;
        uint256 redeem = price * _amount;
        Characters[_uid].stash -= _amount;
        _totalSupplies._value -= _amount;

        if (_randNoMod != 0){
            (bool success, ) = payable(_sender).call{value: redeem}("");
            require(success, "Failed");
        }
    }

    function transferSupplies(uint256 _uid, uint256 _recipient, uint256 _amount) public {
        require(active == true, "Halted");
        require(msg.sender == ownerOf(_uid), "NFT# not yours");
        require(_recipient <= _tokenIdCounter._value, "NFT# does not exist");
        require(_uid != _recipient, "You can not trade to yourself.");
        require(_amount <= Characters[_uid].stash, "Not enough supplies");
        require(Characters[_uid].wandering == false, "Fight or Flee first");
        require(Characters[_uid].level == _splitCounter._value, "Please split your tokens");
        //Transfer shares to friend, probably should not be used ever...
        Characters[_uid].stash -= _amount;
        Characters[_recipient].stash += _amount;
    }

    function split(uint256 _uid) public {
        require(msg.sender == ownerOf(_uid), "NFT# not yours");
        require(Characters[_uid].level < _splitCounter._value, "Already split");
        //As share price grows the Modrator has the option to "Split" all shares which doubles the total supply and keeps the price managable
        //That is accounted for in the total supply, but not in the Characters[_uid].stash until the player splits the _uid
        //This should allow an idle player to "catch up" after a long time away by splitting shares several times in a row. 
        //Players should not be able to split more than everybody else
        Characters[_uid].level ++;
        Characters[_uid].stash += Characters[_uid].stash;
        Characters[_uid].backpack += Characters[_uid].backpack;
    }

    // Action *************************************************************
    function explore(uint256 _uid, uint256 _amount) public payable {
        require(active == true, "Halted");
        require(msg.sender == ownerOf(_uid), "NFT# not yours");
        require(Characters[_uid].level == _splitCounter._value, "Split required :)");
        require(_amount != 0, "Must be greater than 0");
        require(_amount <= maximum, "Greater than maximum");
        require(_amount % 10 == 0, "Please use multiples of 10");
        require(_amount <= Characters[_uid].stash, "Not enough supplies");
        require(Characters[_uid].wandering == false, "Fight or Flee first");

        // Call VRF. Callback will trigger exploreRandom()
        requestRandomNumber(RandomNumberRequest(msg.sender, 2, _uid, _amount));
    }

    function exploreRandom(uint256 _randomType, uint256 _random100, uint256 _uid, uint256 _amount) public {
        //Get random enemy type and compare against player type like rock paper scissors
        //If player beats enemy give advantage to player of +10 on targetnumber
        //If enemy beats player give advantage to enemy of -10 on targetnumber
        //If there is an advantage and that makes the target < 0 or greater > 99 end game and distribute rewards
        //Else apply any modifier to target number, set Characters[_uid] stash, target, backpack, and wandering
        //Backpack represents the amount of supplies risked during this exploration and should be seperated from stash until exploration resolved (fight or flee)
        uint256 enemyType = _randomType;
        uint256 _target = _random100;
        emit Random(_uid, _target);
        bool negative = isNegative(Characters[_uid].class, enemyType);
        bool positive = isPositive(Characters[_uid].class, enemyType);
        //Checks for advantage listed above 
        if (negative == true && positive == true){
            revert();
        }

        if (negative == true){
            //Instant loss
            if (_target < 10){
                Characters[_uid].stash -= _amount;
                _totalSupplies._value -= _amount;
                emit Result(_uid, false, _amount);
                return;
            }
            //Fight or flee setup
            _target -= 10;
            Characters[_uid].stash -= _amount;
            Characters[_uid].targetNumber = _target;
            Characters[_uid].wandering = true;
            Characters[_uid].backpack = _amount;
            emit State(_uid, Characters[_uid].level, Characters[_uid].stash, Characters[_uid].class, Characters[_uid].targetNumber, Characters[_uid].backpack, Characters[_uid].wandering);
            return;
        }

        if (positive == true){
            //Instant win
            if (_target > 89){
                Characters[_uid].stash += _amount;
                _totalSupplies._value += _amount;
                emit Result(_uid, true, _amount);
                return;
            }
            //Fight or flee setup
            _target += 10;
            Characters[_uid].stash -= _amount;
            Characters[_uid].targetNumber = _target;
            Characters[_uid].wandering = true;
            Characters[_uid].backpack = _amount;
            emit State(_uid, Characters[_uid].level, Characters[_uid].stash, Characters[_uid].class, Characters[_uid].targetNumber, Characters[_uid].backpack, Characters[_uid].wandering);
            return;
        }

        Characters[_uid].stash -= _amount;
        Characters[_uid].targetNumber = _target;
        Characters[_uid].wandering = true;
        Characters[_uid].backpack = _amount;
        emit State(_uid, Characters[_uid].level, Characters[_uid].stash, Characters[_uid].class, Characters[_uid].targetNumber, Characters[_uid].backpack, Characters[_uid].wandering);
        return;
        

    }

    function fight(uint256 _uid) public {
        require(msg.sender == ownerOf(_uid), "NFT# not yours");
        require(Characters[_uid].wandering == true, "Please explore first");
        require(Characters[_uid].level == _splitCounter._value, "Please split your tokens");

        // Call VRF. Callback will trigger fightRandom()
        requestRandomNumber(RandomNumberRequest(msg.sender, 3, _uid, 0));
    }
    function fightRandom(uint256 _random100, uint256 _uid) public {
        //Gets random number and compares against Characters[_uid].targetNumber;
        //If <= targetNumber player wins else player loses. The amount is equalt to back pack.
        //If loss set wandering false, reduce total supply by backpack amount, clear targetnumber, clear backpack,
        //If win set wandering false, increase total supply by backpack amount, clear targetnumber, increase players stash by backpack amount, clear backpack
        uint256 result = _random100;
        emit Random(_uid, result);
        if (result <= Characters[_uid].targetNumber){
            //Win
            emit Result(_uid, true, Characters[_uid].backpack);
            _totalSupplies._value += Characters[_uid].backpack;
            Characters[_uid].stash += Characters[_uid].backpack * 2;
            Characters[_uid].backpack = 0;
            Characters[_uid].targetNumber = 0;
            Characters[_uid].wandering = false;
        }
        else {
            //Lose
            emit Result(_uid, false, Characters[_uid].backpack);
            _totalSupplies._value -= Characters[_uid].backpack;
            Characters[_uid].backpack = 0;
            Characters[_uid].targetNumber = 0;
            Characters[_uid].wandering = false;
        }
    }

    function flee(uint256 _uid) public {
        require(msg.sender == ownerOf(_uid), "NFT# not yours");
        require(Characters[_uid].wandering == true, "Please explore first");
        require(Characters[_uid].level == _splitCounter._value, "Please split your tokens");
        //Player decided to flee, player loses 50 percent of backpack amount 
        //Return 67 percent of backpack value to players stash, decrease total supply by 33 percent of backpack value
        //clear backpack/target number/wandering
        emit Result(_uid, false, Characters[_uid].backpack * 33/100);
        uint256 _amount = Characters[_uid].backpack;
        Characters[_uid].backpack = 0;
        Characters[_uid].targetNumber = 0;
        _totalSupplies._value -= _amount * 50/100;
        Characters[_uid].stash += _amount * 50/100;
        Characters[_uid].wandering = false;
        emit State(_uid, Characters[_uid].level, Characters[_uid].stash, Characters[_uid].class, Characters[_uid].targetNumber, Characters[_uid].backpack, Characters[_uid].wandering);
    }

    //Aministrative *******************************************************
    function initiate(uint256 _uid, uint256 _amount) public payable {
        require(msg.sender == moderator, "You != moderator");
        require(_totalSupplies._value == 0, "Already initiated");
        require(msg.sender == ownerOf(_uid), "NFT# not yours");
        //Premine some supplies for contract owners
        _totalSupplies._value += _amount;
        Characters[_uid].stash += _amount;
    }

    function setmoderator() public onlyOwner {
        //Create a moderator
        //After mod created contract will be ronounced
        moderator = msg.sender;
        active = true;
        setMax(1000); 
    }

    function setMax(uint256 _new) public {
        //Moderator can change max amount of purchases and max amount that can be risked during single exploration
        require(msg.sender == moderator);
        maximum = _new;
    }

    function bigRedButton() public {
        //Moderator can kill whole game
        //After "halted" you should only be able to split and withdrawl
        require(msg.sender == moderator);
        active = false; 
    }

    function splitAll() public {
        //The price per share could become unmanageable
        //Moderator can split the tokens which doubles the total supply and subsquently halves the value of each
        //This split is not reconciled per player until they split theirs indivually but the total supply and value of players who have already split should be correct
        require(msg.sender == moderator);
        _totalSupplies._value += _totalSupplies._value;
        _splitCounter._value ++;
    }

    function isNegative(uint256 _player, uint256 _enemy) internal pure returns(bool){
        //Rock, paper, scissors function used by explore()
        if (_player == 0){
            if(_enemy == 1){
                return true;
            } 
        }
        if (_player == 1){
            if(_enemy == 2){
                return true;
            } 
        }
        if (_player == 2){
            if(_enemy == 0){
                return true;
            } 
        }
        return false;
    }

    function isPositive(uint256 _player, uint256 _enemy) internal pure returns(bool){
        //Rock, paper, scissors function used by explore()
        if (_player == 0){
            if(_enemy == 2){
                return true;
            } 
        }
        if (_player == 1){
            if(_enemy == 0){
                return true;
            } 
        }
        if (_player == 2){
            if(_enemy == 1){
                return true;
            } 
        }
        return false;
    }

    function getState(uint256 _uid) public view returns(uint256 _NFTNumber, uint256 price, uint256 count, uint256 value,
    uint256 _level, uint256 _stash, uint256 _class, uint256 _target, uint256 _backpack, bool _wandering){
        //View function for checking player values
        _NFTNumber = _uid;
        price = (address(this).balance) / _totalSupplies._value;
        count = Characters[_uid].stash;
        value = count*price;
        _level = Characters[_uid].level;
        _stash = Characters[_uid].stash;
        _class = Characters[_uid].class;
        _target = Characters[_uid].targetNumber;
        _backpack = Characters[_uid].backpack;
        _wandering = Characters[_uid].wandering;
    }

    function getValue(uint256 _uid) public view returns(uint256 price, uint256 count, uint256 value){
        price = (address(this).balance) / _totalSupplies._value;
        count = Characters[_uid].stash;
        value = count*price; 
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

        if (lastRandomNumberRequest.callbackFunction == 0) { // Spawn
            setCharacterRandomType(s_randomWords[0] % 3, lastRandomNumberRequest.param1);
        }
        else if (lastRandomNumberRequest.callbackFunction == 1) { // Redeem
            RedeemRandom(lastRandomNumberRequest.sender, s_randomWords[0], lastRandomNumberRequest.param1, lastRandomNumberRequest.param2);
        }
        else if (lastRandomNumberRequest.callbackFunction == 2) { // Explore
            exploreRandom(s_randomWords[0] % 3, s_randomWords[1] % 100, lastRandomNumberRequest.param1, lastRandomNumberRequest.param2);
        }
        else if (lastRandomNumberRequest.callbackFunction == 3) { // Fight
            fightRandom(s_randomWords[0] % 100, lastRandomNumberRequest.param1);
        }

        emit RandomNumberRequestComplete(lastRandomNumberRequest.sender, lastRandomNumberRequest.callbackFunction, lastRandomNumberRequest.param1, lastRandomNumberRequest.param2);
        randomNumberRequestsQueue.pop(); // Remove last random number request from queue
    }
}