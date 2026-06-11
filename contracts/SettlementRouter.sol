// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentRegistry.sol";
import "./TokenAllowlist.sol";
import "./DealEscrow.sol";

contract SettlementRouter {
    AgentRegistry public registry;
    TokenAllowlist public allowlist;
    DealEscrow public escrow;

    mapping(uint256 => bytes32) public settlementTxHash;

    event SettlementInitiated(
        uint256 indexed dealId,
        address indexed payer,
        address indexed payee,
        address token,
        uint256 amount,
        bytes32 preflightHash
    );

    constructor(address registry_, address allowlist_, address escrow_) {
        registry = AgentRegistry(registry_);
        allowlist = TokenAllowlist(allowlist_);
        escrow = DealEscrow(escrow_);
    }

    function settle(
        address payer,
        address payee,
        address token,
        uint256 amount,
        uint256 ttlSeconds,
        bytes32 workHash,
        bytes32 preflightHash,
        bytes32 proofHash
    ) external returns (uint256 dealId) {
        registry.requireRegistered(payer);
        registry.requireRegistered(payee);
        allowlist.requireAllowed(token);

        dealId = escrow.createDeal(payer, payee, token, amount, ttlSeconds, workHash, preflightHash, false, 0);
        emit SettlementInitiated(dealId, payer, payee, token, amount, preflightHash);

        escrow.fund(dealId);
        escrow.accept(dealId);
        escrow.claim(dealId, proofHash);

        settlementTxHash[dealId] = keccak256(abi.encodePacked(block.number, dealId, proofHash));
    }

    function fundAndAccept(
        address payer,
        address payee,
        address token,
        uint256 amount,
        uint256 ttlSeconds,
        bytes32 workHash,
        bytes32 preflightHash
    ) external returns (uint256 dealId) {
        return fundAndAcceptHybrid(payer, payee, token, amount, ttlSeconds, workHash, preflightHash, false, 0);
    }

    function fundAndAcceptHybrid(
        address payer,
        address payee,
        address token,
        uint256 amount,
        uint256 ttlSeconds,
        bytes32 workHash,
        bytes32 preflightHash,
        bool requiresHybridRelease,
        uint64 disputeWindow
    ) public returns (uint256 dealId) {
        registry.requireRegistered(payer);
        registry.requireRegistered(payee);
        allowlist.requireAllowed(token);

        dealId = escrow.createDeal(
            payer,
            payee,
            token,
            amount,
            ttlSeconds,
            workHash,
            preflightHash,
            requiresHybridRelease,
            disputeWindow
        );
        emit SettlementInitiated(dealId, payer, payee, token, amount, preflightHash);
        escrow.fund(dealId);
        escrow.accept(dealId);
    }

    function submitDelivery(uint256 dealId, bytes32 resultHash) external {
        DealEscrow.Deal memory deal = escrow.getDeal(dealId);
        require(msg.sender == deal.payee, "only payee");
        escrow.submitDelivery(dealId, resultHash);
    }

    function attestRelease(uint256 dealId, bytes32 resultHash) external {
        DealEscrow.Deal memory deal = escrow.getDeal(dealId);
        require(msg.sender == deal.payer, "only payer");
        escrow.attestRelease(dealId, resultHash);
    }

    function claim(uint256 dealId, bytes32 proofHash) external {
        escrow.claim(dealId, proofHash);
        settlementTxHash[dealId] = keccak256(abi.encodePacked(block.number, dealId, proofHash));
    }

    function reclaim(uint256 dealId) external {
        escrow.reclaim(dealId);
    }

    function canClaim(uint256 dealId) external view returns (bool) {
        return escrow.canClaim(dealId);
    }

    function getDeal(uint256 dealId) external view returns (DealEscrow.Deal memory) {
        return escrow.getDeal(dealId);
    }

    function isSettled(uint256 dealId) external view returns (bool) {
        DealEscrow.Deal memory deal = escrow.getDeal(dealId);
        return deal.state == DealEscrow.DealState.Released;
    }
}
