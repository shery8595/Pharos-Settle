// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DealEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_FEE_BPS = 1000;

    enum DealState {
        Created,
        Funded,
        Accepted,
        Disputed,
        Released,
        Refunded
    }

    enum DisputeOutcome {
        ReleaseToPayee,
        RefundPayer,
        Split
    }

    struct Deal {
        address payer;
        address payee;
        address token;
        uint256 amount;
        DealState state;
        uint256 deadline;
        bytes32 workHash;
        bytes32 preflightHash;
        bytes32 proofHash;
        bool requiresHybridRelease;
        bytes32 resultHash;
        uint64 deliverySubmittedAt;
        uint64 disputeWindow;
        bool payerAttested;
        address arbiter;
        bytes32 rejectionReasonHash;
    }

    uint256 public dealNonce;
    mapping(uint256 => Deal) public deals;

    uint256 public feeBps;
    address public feeRecipient;

    event DealCreated(
        uint256 indexed dealId,
        address indexed payer,
        address indexed payee,
        address token,
        uint256 amount,
        uint256 deadline,
        bytes32 workHash,
        bytes32 preflightHash,
        bool requiresHybridRelease,
        uint64 disputeWindow,
        address arbiter
    );
    event DealFunded(uint256 indexed dealId, address indexed payer, uint256 amount);
    event DealAccepted(uint256 indexed dealId, address indexed payee);
    event DeliverySubmitted(uint256 indexed dealId, address indexed payee, bytes32 resultHash);
    event ReleaseAttested(uint256 indexed dealId, address indexed payer, bytes32 resultHash);
    event SettlementReleased(uint256 indexed dealId, address indexed payee, bytes32 proofHash, uint256 payeeAmount);
    event FeeCollected(uint256 indexed dealId, address indexed recipient, uint256 feeAmount);
    event SettlementRefunded(uint256 indexed dealId, address indexed payer, uint256 amount);
    event DeliveryRejected(uint256 indexed dealId, address indexed payer, bytes32 reasonHash);
    event DisputeOpened(uint256 indexed dealId, address indexed payer, bytes32 reasonHash);
    event DisputeResolved(uint256 indexed dealId, address indexed arbiter, uint8 outcome, uint16 payeeBps);

    address public router;
    address public owner;

    modifier onlyRouter() {
        require(msg.sender == router, "only router");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setRouter(address router_) external onlyOwner {
        require(router_ != address(0), "zero router");
        router = router_;
    }

    function setFeeConfig(uint256 feeBps_, address feeRecipient_) external onlyOwner {
        require(feeBps_ <= MAX_FEE_BPS, "fee too high");
        feeBps = feeBps_;
        feeRecipient = feeRecipient_;
    }

    function createDeal(
        address payer,
        address payee,
        address token,
        uint256 amount,
        uint256 ttlSeconds,
        bytes32 workHash,
        bytes32 preflightHash,
        bool requiresHybridRelease_,
        uint64 disputeWindow_,
        address arbiter_
    ) external onlyRouter returns (uint256 dealId) {
        require(payer != address(0) && payee != address(0), "zero address");
        require(amount > 0, "zero amount");
        require(ttlSeconds > 0, "zero ttl");
        if (requiresHybridRelease_) {
            require(disputeWindow_ > 0, "zero dispute window");
        }

        dealId = ++dealNonce;
        deals[dealId] = Deal({
            payer: payer,
            payee: payee,
            token: token,
            amount: amount,
            state: DealState.Created,
            deadline: block.timestamp + ttlSeconds,
            workHash: workHash,
            preflightHash: preflightHash,
            proofHash: bytes32(0),
            requiresHybridRelease: requiresHybridRelease_,
            resultHash: bytes32(0),
            deliverySubmittedAt: 0,
            disputeWindow: disputeWindow_,
            payerAttested: false,
            arbiter: arbiter_,
            rejectionReasonHash: bytes32(0)
        });

        emit DealCreated(
            dealId,
            payer,
            payee,
            token,
            amount,
            block.timestamp + ttlSeconds,
            workHash,
            preflightHash,
            requiresHybridRelease_,
            disputeWindow_,
            arbiter_
        );
    }

    function fund(uint256 dealId) external nonReentrant onlyRouter {
        Deal storage deal = deals[dealId];
        require(deal.state == DealState.Created, "bad state");
        deal.state = DealState.Funded;
        IERC20(deal.token).safeTransferFrom(deal.payer, address(this), deal.amount);
        emit DealFunded(dealId, deal.payer, deal.amount);
    }

    function accept(uint256 dealId) external nonReentrant onlyRouter {
        Deal storage deal = deals[dealId];
        require(deal.state == DealState.Funded, "bad state");
        deal.state = DealState.Accepted;
        emit DealAccepted(dealId, deal.payee);
    }

    function submitDelivery(uint256 dealId, bytes32 resultHash) external onlyRouter {
        Deal storage deal = deals[dealId];
        require(deal.state == DealState.Accepted, "bad state");
        require(deal.requiresHybridRelease, "not hybrid");
        require(deal.deliverySubmittedAt == 0, "already delivered");
        require(block.timestamp <= deal.deadline, "expired");
        deal.deliverySubmittedAt = uint64(block.timestamp);
        deal.resultHash = resultHash;
        emit DeliverySubmitted(dealId, deal.payee, resultHash);
    }

    function attestRelease(uint256 dealId, bytes32 resultHash) external onlyRouter {
        Deal storage deal = deals[dealId];
        require(deal.state == DealState.Accepted, "bad state");
        require(deal.requiresHybridRelease, "not hybrid");
        deal.payerAttested = true;
        if (resultHash != bytes32(0)) {
            deal.resultHash = resultHash;
        }
        emit ReleaseAttested(dealId, deal.payer, deal.resultHash);
    }

    function canClaim(uint256 dealId) public view returns (bool) {
        Deal storage deal = deals[dealId];
        if (deal.state != DealState.Accepted) return false;
        if (block.timestamp > deal.deadline) return false;
        if (!deal.requiresHybridRelease) return true;
        if (deal.payerAttested) return true;
        if (deal.deliverySubmittedAt == 0) return false;
        return block.timestamp >= uint256(deal.deliverySubmittedAt) + uint256(deal.disputeWindow);
    }

    function _releaseToPayee(Deal storage deal, uint256 dealId, bytes32 proofHash, uint256 grossAmount) internal {
        deal.state = DealState.Released;
        deal.proofHash = proofHash;

        uint256 feeAmount = (grossAmount * feeBps) / 10_000;
        uint256 payeeAmount = grossAmount - feeAmount;
        IERC20(deal.token).safeTransfer(deal.payee, payeeAmount);
        if (feeAmount > 0 && feeRecipient != address(0)) {
            IERC20(deal.token).safeTransfer(feeRecipient, feeAmount);
            emit FeeCollected(dealId, feeRecipient, feeAmount);
        }
        emit SettlementReleased(dealId, deal.payee, proofHash, payeeAmount);
    }

    function claim(uint256 dealId, bytes32 proofHash) external nonReentrant onlyRouter {
        Deal storage deal = deals[dealId];
        require(deal.state == DealState.Accepted, "bad state");
        require(block.timestamp <= deal.deadline, "expired");
        if (deal.requiresHybridRelease) {
            require(canClaim(dealId), "cannot claim");
        }
        _releaseToPayee(deal, dealId, proofHash, deal.amount);
    }

    function rejectDelivery(uint256 dealId, bytes32 reasonHash) external nonReentrant onlyRouter {
        Deal storage deal = deals[dealId];
        require(deal.state == DealState.Accepted, "bad state");
        require(deal.requiresHybridRelease, "not hybrid");
        require(deal.deliverySubmittedAt > 0, "no delivery");
        require(!deal.payerAttested, "already attested");
        require(block.timestamp <= deal.deadline, "expired");
        require(reasonHash != bytes32(0), "zero reason");
        require(
            block.timestamp < uint256(deal.deliverySubmittedAt) + uint256(deal.disputeWindow),
            "dispute window elapsed"
        );

        deal.rejectionReasonHash = reasonHash;
        emit DeliveryRejected(dealId, deal.payer, reasonHash);

        if (deal.arbiter == address(0)) {
            deal.state = DealState.Refunded;
            IERC20(deal.token).safeTransfer(deal.payer, deal.amount);
            emit SettlementRefunded(dealId, deal.payer, deal.amount);
        } else {
            deal.state = DealState.Disputed;
            emit DisputeOpened(dealId, deal.payer, reasonHash);
        }
    }

    function resolveDispute(uint256 dealId, uint8 outcome, uint16 payeeBps) external nonReentrant onlyRouter {
        Deal storage deal = deals[dealId];
        require(deal.state == DealState.Disputed, "bad state");

        if (outcome == uint8(DisputeOutcome.ReleaseToPayee)) {
            _releaseToPayee(deal, dealId, bytes32(0), deal.amount);
        } else if (outcome == uint8(DisputeOutcome.RefundPayer)) {
            deal.state = DealState.Refunded;
            IERC20(deal.token).safeTransfer(deal.payer, deal.amount);
            emit SettlementRefunded(dealId, deal.payer, deal.amount);
        } else if (outcome == uint8(DisputeOutcome.Split)) {
            require(payeeBps > 0 && payeeBps < 10_000, "bad split bps");
            uint256 payeeGross = (deal.amount * uint256(payeeBps)) / 10_000;
            uint256 payerAmount = deal.amount - payeeGross;

            deal.state = DealState.Released;

            uint256 feeAmount = (payeeGross * feeBps) / 10_000;
            uint256 payeeNet = payeeGross - feeAmount;
            IERC20(deal.token).safeTransfer(deal.payee, payeeNet);
            if (feeAmount > 0 && feeRecipient != address(0)) {
                IERC20(deal.token).safeTransfer(feeRecipient, feeAmount);
                emit FeeCollected(dealId, feeRecipient, feeAmount);
            }
            IERC20(deal.token).safeTransfer(deal.payer, payerAmount);
            emit SettlementReleased(dealId, deal.payee, bytes32(0), payeeNet);
            if (payerAmount > 0) {
                emit SettlementRefunded(dealId, deal.payer, payerAmount);
            }
        } else {
            revert("bad outcome");
        }

        emit DisputeResolved(dealId, deal.arbiter, outcome, payeeBps);
    }

    function reclaim(uint256 dealId) external nonReentrant onlyRouter {
        Deal storage deal = deals[dealId];
        require(deal.state == DealState.Funded || deal.state == DealState.Accepted, "bad state");
        require(block.timestamp > deal.deadline, "not expired");
        require(deal.deliverySubmittedAt == 0, "delivery submitted");
        deal.state = DealState.Refunded;
        IERC20(deal.token).safeTransfer(deal.payer, deal.amount);
        emit SettlementRefunded(dealId, deal.payer, deal.amount);
    }

    function getDeal(uint256 dealId) external view returns (Deal memory) {
        return deals[dealId];
    }
}
