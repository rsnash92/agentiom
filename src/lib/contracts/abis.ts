// ERC-8004 Agent Registry ABI
export const AgentRegistryABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      { internalType: 'address', name: 'walletAddress', type: 'address' },
      { internalType: 'string', name: 'metadataURI', type: 'string' },
      { internalType: 'string', name: 'strategyType', type: 'string' },
    ],
    name: 'registerAgent',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'activateAgent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'deactivateAgent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'address', name: 'newWallet', type: 'address' },
    ],
    name: 'updateAgentWallet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getAgent',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'walletAddress', type: 'address' },
          { internalType: 'address', name: 'creator', type: 'address' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
          { internalType: 'bool', name: 'isActive', type: 'bool' },
          { internalType: 'string', name: 'strategyType', type: 'string' },
        ],
        internalType: 'struct AgentRegistry.AgentInfo',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'wallet', type: 'address' }],
    name: 'getAgentByWallet',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalAgents',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'wallet', type: 'address' }],
    name: 'isWalletRegistered',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'address', name: 'walletAddress', type: 'address' },
      { indexed: false, internalType: 'string', name: 'strategyType', type: 'string' },
    ],
    name: 'AgentCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'AgentActivated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'AgentDeactivated',
    type: 'event',
  },
] as const;

// Reputation Registry ABI
export const ReputationRegistryABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'agentId', type: 'uint256' }],
    name: 'getReputation',
    outputs: [
      {
        components: [
          { internalType: 'int256', name: 'totalPnL', type: 'int256' },
          { internalType: 'uint256', name: 'totalTrades', type: 'uint256' },
          { internalType: 'uint256', name: 'winningTrades', type: 'uint256' },
          { internalType: 'uint256', name: 'totalVolume', type: 'uint256' },
          { internalType: 'uint256', name: 'maxDrawdown', type: 'uint256' },
          { internalType: 'uint256', name: 'sharpeRatio', type: 'uint256' },
          { internalType: 'uint256', name: 'lastUpdateTime', type: 'uint256' },
          { internalType: 'uint256', name: 'ratingCount', type: 'uint256' },
          { internalType: 'uint256', name: 'totalRating', type: 'uint256' },
        ],
        internalType: 'struct ReputationRegistry.ReputationData',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'agentId', type: 'uint256' }],
    name: 'getWinRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'agentId', type: 'uint256' }],
    name: 'getAverageRating',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'agentId', type: 'uint256' }],
    name: 'getReputationScore',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'agentId', type: 'uint256' },
      { internalType: 'uint8', name: 'rating', type: 'uint8' },
    ],
    name: 'submitRating',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Contract addresses (to be deployed on Arbitrum)
export const CONTRACT_ADDRESSES = {
  agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as `0x${string}` | undefined,
  reputationRegistry: process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS as `0x${string}` | undefined,
} as const;

// Arbitrum One chain config
export const ARBITRUM_CHAIN = {
  id: 42161,
  name: 'Arbitrum One',
  network: 'arbitrum',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://arb1.arbitrum.io/rpc'] },
    public: { http: ['https://arb1.arbitrum.io/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Arbiscan', url: 'https://arbiscan.io' },
  },
} as const;
