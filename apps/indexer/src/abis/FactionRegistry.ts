// FactionRegistry ABI - only events and views needed by indexer
export const FactionRegistryABI = [
  {
    type: 'event',
    name: 'FactionJoined',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'factionId', type: 'uint8', indexed: true },
      { name: 'isSwitch', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'factionOf',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isEnrolled',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'memberCount',
    inputs: [{ name: 'factionId', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
