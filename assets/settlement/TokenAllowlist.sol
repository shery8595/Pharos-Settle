// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TokenAllowlist {
    address public owner;
    mapping(address => bool) public isAllowed;

    event TokenAllowed(address indexed token);
    event TokenDisallowed(address indexed token);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function allow(address token) external onlyOwner {
        isAllowed[token] = true;
        emit TokenAllowed(token);
    }

    function disallow(address token) external onlyOwner {
        isAllowed[token] = false;
        emit TokenDisallowed(token);
    }

    function requireAllowed(address token) external view {
        require(isAllowed[token], "token not allowed");
    }
}
