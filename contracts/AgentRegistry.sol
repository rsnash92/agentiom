// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AgentRegistry
 * @notice ERC-8004 compliant Identity Registry for AI Trading Agents
 * @dev Each agent is represented as an NFT with metadata URI pointing to agent config
 */
contract AgentRegistry is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Agent metadata stored on-chain
    struct AgentInfo {
        address walletAddress;      // Agent's trading wallet
        address creator;            // Original creator
        uint256 createdAt;          // Creation timestamp
        bool isActive;              // Whether agent is currently trading
        string strategyType;        // e.g., "momentum", "mean-reversion", "ai-driven"
    }

    // Mapping from token ID to agent info
    mapping(uint256 => AgentInfo) public agents;

    // Mapping from wallet address to token ID (for reverse lookup)
    mapping(address => uint256) public walletToAgent;

    // Events
    event AgentCreated(
        uint256 indexed tokenId,
        address indexed creator,
        address walletAddress,
        string strategyType
    );
    event AgentActivated(uint256 indexed tokenId);
    event AgentDeactivated(uint256 indexed tokenId);
    event AgentWalletUpdated(uint256 indexed tokenId, address newWallet);

    constructor() ERC721("Agentiom Trading Agent", "AGENT") Ownable(msg.sender) {}

    /**
     * @notice Register a new trading agent
     * @param walletAddress The wallet address the agent will use for trading
     * @param metadataURI URI pointing to agent metadata (name, description, strategy config)
     * @param strategyType Type of trading strategy
     * @return tokenId The ID of the newly minted agent NFT
     */
    function registerAgent(
        address walletAddress,
        string memory metadataURI,
        string memory strategyType
    ) external returns (uint256) {
        require(walletAddress != address(0), "Invalid wallet address");
        require(walletToAgent[walletAddress] == 0, "Wallet already registered");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        agents[newTokenId] = AgentInfo({
            walletAddress: walletAddress,
            creator: msg.sender,
            createdAt: block.timestamp,
            isActive: false,
            strategyType: strategyType
        });

        walletToAgent[walletAddress] = newTokenId;

        emit AgentCreated(newTokenId, msg.sender, walletAddress, strategyType);

        return newTokenId;
    }

    /**
     * @notice Activate an agent for trading
     * @param tokenId The agent's token ID
     */
    function activateAgent(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not agent owner");
        require(!agents[tokenId].isActive, "Agent already active");

        agents[tokenId].isActive = true;
        emit AgentActivated(tokenId);
    }

    /**
     * @notice Deactivate an agent from trading
     * @param tokenId The agent's token ID
     */
    function deactivateAgent(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not agent owner");
        require(agents[tokenId].isActive, "Agent not active");

        agents[tokenId].isActive = false;
        emit AgentDeactivated(tokenId);
    }

    /**
     * @notice Update agent's wallet address
     * @param tokenId The agent's token ID
     * @param newWallet The new wallet address
     */
    function updateAgentWallet(uint256 tokenId, address newWallet) external {
        require(ownerOf(tokenId) == msg.sender, "Not agent owner");
        require(newWallet != address(0), "Invalid wallet address");
        require(walletToAgent[newWallet] == 0, "Wallet already registered");

        address oldWallet = agents[tokenId].walletAddress;
        delete walletToAgent[oldWallet];

        agents[tokenId].walletAddress = newWallet;
        walletToAgent[newWallet] = tokenId;

        emit AgentWalletUpdated(tokenId, newWallet);
    }

    /**
     * @notice Get agent info by token ID
     * @param tokenId The agent's token ID
     */
    function getAgent(uint256 tokenId) external view returns (AgentInfo memory) {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        return agents[tokenId];
    }

    /**
     * @notice Get agent ID by wallet address
     * @param wallet The wallet address to look up
     */
    function getAgentByWallet(address wallet) external view returns (uint256) {
        return walletToAgent[wallet];
    }

    /**
     * @notice Get total number of registered agents
     */
    function totalAgents() external view returns (uint256) {
        return _tokenIds.current();
    }

    /**
     * @notice Check if a wallet is registered to any agent
     * @param wallet The wallet address to check
     */
    function isWalletRegistered(address wallet) external view returns (bool) {
        return walletToAgent[wallet] != 0;
    }
}
