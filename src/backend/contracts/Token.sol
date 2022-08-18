// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // Mint 222'000'000 tokens to msg.sender
        _mint(msg.sender, 222000000 * 10**uint(decimals()));
    }
}