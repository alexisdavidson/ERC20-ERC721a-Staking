// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./NFTStaker.sol";

contract Token is ERC20 {
    constructor(address _stakerAddress) ERC20("Beach Coin", "BC") {
        _mint(_stakerAddress, 222000000 * 10**uint(decimals()));
    }
}