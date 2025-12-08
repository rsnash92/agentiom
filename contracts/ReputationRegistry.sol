// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReputationRegistry
 * @notice ERC-8004 compliant Reputation Registry for AI Trading Agents
 * @dev Tracks agent performance metrics and reputation scores
 */
contract ReputationRegistry is Ownable {
    // Reputation data for each agent
    struct ReputationData {
        int256 totalPnL;              // Total PnL in basis points (1 bp = 0.01%)
        uint256 totalTrades;          // Number of trades executed
        uint256 winningTrades;        // Number of profitable trades
        uint256 totalVolume;          // Total trading volume in USD (scaled by 1e6)
        uint256 maxDrawdown;          // Maximum drawdown in basis points
        uint256 sharpeRatio;          // Sharpe ratio (scaled by 1e4)
        uint256 lastUpdateTime;       // Last update timestamp
        uint256 ratingCount;          // Number of user ratings
        uint256 totalRating;          // Sum of all ratings (1-5 stars)
    }

    // Mapping from agent token ID to reputation
    mapping(uint256 => ReputationData) public reputations;

    // Authorized reporters (oracles/validators)
    mapping(address => bool) public authorizedReporters;

    // Agent registry contract address
    address public agentRegistry;

    // Events
    event PerformanceUpdated(
        uint256 indexed agentId,
        int256 pnlDelta,
        uint256 tradesCount,
        uint256 winCount
    );
    event RatingSubmitted(uint256 indexed agentId, address indexed rater, uint8 rating);
    event ReporterAuthorized(address indexed reporter);
    event ReporterRevoked(address indexed reporter);

    modifier onlyAuthorizedReporter() {
        require(authorizedReporters[msg.sender], "Not authorized reporter");
        _;
    }

    constructor(address _agentRegistry) Ownable(msg.sender) {
        agentRegistry = _agentRegistry;
    }

    /**
     * @notice Authorize an address to report performance data
     * @param reporter Address to authorize
     */
    function authorizeReporter(address reporter) external onlyOwner {
        authorizedReporters[reporter] = true;
        emit ReporterAuthorized(reporter);
    }

    /**
     * @notice Revoke reporter authorization
     * @param reporter Address to revoke
     */
    function revokeReporter(address reporter) external onlyOwner {
        authorizedReporters[reporter] = false;
        emit ReporterRevoked(reporter);
    }

    /**
     * @notice Update agent performance metrics
     * @param agentId The agent's token ID
     * @param pnlDelta Change in PnL (basis points)
     * @param tradesExecuted Number of new trades
     * @param tradesWon Number of winning trades
     * @param volumeTraded Volume traded in this period
     */
    function updatePerformance(
        uint256 agentId,
        int256 pnlDelta,
        uint256 tradesExecuted,
        uint256 tradesWon,
        uint256 volumeTraded
    ) external onlyAuthorizedReporter {
        ReputationData storage rep = reputations[agentId];

        rep.totalPnL += pnlDelta;
        rep.totalTrades += tradesExecuted;
        rep.winningTrades += tradesWon;
        rep.totalVolume += volumeTraded;
        rep.lastUpdateTime = block.timestamp;

        emit PerformanceUpdated(agentId, pnlDelta, tradesExecuted, tradesWon);
    }

    /**
     * @notice Update advanced metrics (sharpe ratio, drawdown)
     * @param agentId The agent's token ID
     * @param sharpeRatio New sharpe ratio (scaled by 1e4)
     * @param maxDrawdown Maximum drawdown (basis points)
     */
    function updateAdvancedMetrics(
        uint256 agentId,
        uint256 sharpeRatio,
        uint256 maxDrawdown
    ) external onlyAuthorizedReporter {
        ReputationData storage rep = reputations[agentId];
        rep.sharpeRatio = sharpeRatio;
        rep.maxDrawdown = maxDrawdown;
        rep.lastUpdateTime = block.timestamp;
    }

    /**
     * @notice Submit a user rating for an agent
     * @param agentId The agent's token ID
     * @param rating Rating from 1-5
     */
    function submitRating(uint256 agentId, uint8 rating) external {
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");

        ReputationData storage rep = reputations[agentId];
        rep.ratingCount += 1;
        rep.totalRating += rating;

        emit RatingSubmitted(agentId, msg.sender, rating);
    }

    /**
     * @notice Get full reputation data for an agent
     * @param agentId The agent's token ID
     */
    function getReputation(uint256 agentId) external view returns (ReputationData memory) {
        return reputations[agentId];
    }

    /**
     * @notice Calculate win rate for an agent
     * @param agentId The agent's token ID
     * @return Win rate in basis points (10000 = 100%)
     */
    function getWinRate(uint256 agentId) external view returns (uint256) {
        ReputationData storage rep = reputations[agentId];
        if (rep.totalTrades == 0) return 0;
        return (rep.winningTrades * 10000) / rep.totalTrades;
    }

    /**
     * @notice Get average user rating for an agent
     * @param agentId The agent's token ID
     * @return Average rating (scaled by 100, so 450 = 4.5 stars)
     */
    function getAverageRating(uint256 agentId) external view returns (uint256) {
        ReputationData storage rep = reputations[agentId];
        if (rep.ratingCount == 0) return 0;
        return (rep.totalRating * 100) / rep.ratingCount;
    }

    /**
     * @notice Calculate a composite reputation score
     * @param agentId The agent's token ID
     * @return Reputation score (0-1000)
     */
    function getReputationScore(uint256 agentId) external view returns (uint256) {
        ReputationData storage rep = reputations[agentId];

        if (rep.totalTrades == 0) return 0;

        // Components:
        // 1. Win rate (0-250 points)
        uint256 winRateScore = (rep.winningTrades * 250) / rep.totalTrades;

        // 2. PnL score (0-300 points) - capped at +50% PnL for max score
        uint256 pnlScore = 0;
        if (rep.totalPnL > 0) {
            pnlScore = uint256(rep.totalPnL) > 5000 ? 300 : (uint256(rep.totalPnL) * 300) / 5000;
        }

        // 3. Volume score (0-150 points) - more volume = more trust
        uint256 volumeScore = rep.totalVolume > 1000000e6 ? 150 : (rep.totalVolume * 150) / 1000000e6;

        // 4. Sharpe ratio score (0-200 points)
        uint256 sharpeScore = rep.sharpeRatio > 30000 ? 200 : (rep.sharpeRatio * 200) / 30000;

        // 5. User rating score (0-100 points)
        uint256 ratingScore = 0;
        if (rep.ratingCount > 0) {
            uint256 avgRating = (rep.totalRating * 100) / rep.ratingCount;
            ratingScore = (avgRating * 100) / 500; // 5 stars = 100 points
        }

        return winRateScore + pnlScore + volumeScore + sharpeScore + ratingScore;
    }
}
