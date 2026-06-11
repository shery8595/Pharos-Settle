// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;



contract AgentRegistry {

    address public owner;

    mapping(address => bool) public isRegistered;



    event AgentRegistered(address indexed agent);

    event AgentRemoved(address indexed agent);

    event AgentOnboardedBy(address indexed sponsor, address indexed agent);



    modifier onlyOwner() {

        require(msg.sender == owner, "not owner");

        _;

    }



    constructor() {

        owner = msg.sender;

    }



    function register(address agent) external onlyOwner {

        _register(agent);

    }



    function registerRecipient(address agent) external {

        require(isRegistered[msg.sender], "sponsor not registered");

        _register(agent);

        emit AgentOnboardedBy(msg.sender, agent);

    }



    function registerRecipients(address[] calldata agents) external {

        require(isRegistered[msg.sender], "sponsor not registered");

        for (uint256 i = 0; i < agents.length; i++) {

            address agent = agents[i];

            if (!isRegistered[agent]) {

                isRegistered[agent] = true;

                emit AgentRegistered(agent);

                emit AgentOnboardedBy(msg.sender, agent);

            }

        }

    }



    function remove(address agent) external onlyOwner {

        isRegistered[agent] = false;

        emit AgentRemoved(agent);

    }



    function requireRegistered(address agent) external view {

        require(isRegistered[agent], "agent not registered");

    }



    function _register(address agent) internal {

        require(agent != address(0), "zero address");

        if (!isRegistered[agent]) {

            isRegistered[agent] = true;

            emit AgentRegistered(agent);

        }

    }

}


