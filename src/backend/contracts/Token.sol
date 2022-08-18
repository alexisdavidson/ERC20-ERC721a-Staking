// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor() ERC20("GelatoTokenName", "GelatoTokenSymbol") {
        // Mint 222'000'000 tokens to msg.sender
        _mint(msg.sender, 222000000 * 10**uint(decimals()));
    }
}