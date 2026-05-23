export const FactionRegistryABI = [
  {
    type: 'function',
    name: 'joinFaction',
    inputs: [
      { name: 'factionId', type: 'uint8', internalType: 'uint8' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'factionOf',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'uint8', internalType: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isEnrolled',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'memberCount',
    inputs: [
      { name: '', type: 'uint8', internalType: 'uint8' },
    ],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'switchFee',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'enrolledAt',
    inputs: [
      { name: 'user', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'uint64', internalType: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'FactionJoined',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'factionId', type: 'uint8', indexed: true, internalType: 'uint8' },
    ],
    anonymous: false,
  },
] as const;
