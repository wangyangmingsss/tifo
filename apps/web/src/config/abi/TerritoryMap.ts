export const TerritoryMapABI = [
  {
    type: 'function',
    name: 'rally',
    inputs: [
      { name: 'regionId', type: 'uint16', internalType: 'uint16' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'defect',
    inputs: [
      { name: 'regionId', type: 'uint16', internalType: 'uint16' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getMapState',
    inputs: [],
    outputs: [
      { name: '', type: 'uint8[]', internalType: 'uint8[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'effectivePower',
    inputs: [
      { name: 'regionId', type: 'uint16', internalType: 'uint16' },
      { name: 'faction', type: 'uint8', internalType: 'uint8' },
    ],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'territoryCounts',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256[]', internalType: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'regions',
    inputs: [
      { name: '', type: 'uint16', internalType: 'uint16' },
    ],
    outputs: [
      { name: 'ownerFaction', type: 'uint8', internalType: 'uint8' },
      { name: 'lastUpdate', type: 'uint64', internalType: 'uint64' },
      { name: 'captureCount', type: 'uint16', internalType: 'uint16' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'contribution',
    inputs: [
      { name: 'regionId', type: 'uint16', internalType: 'uint16' },
      { name: 'faction', type: 'uint8', internalType: 'uint8' },
      { name: 'user', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'regionCount',
    inputs: [],
    outputs: [
      { name: '', type: 'uint16', internalType: 'uint16' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'RallyPlaced',
    inputs: [
      { name: 'regionId', type: 'uint16', indexed: true, internalType: 'uint16' },
      { name: 'faction', type: 'uint8', indexed: true, internalType: 'uint8' },
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TerritoryCaptured',
    inputs: [
      { name: 'regionId', type: 'uint16', indexed: true, internalType: 'uint16' },
      { name: 'oldFaction', type: 'uint8', indexed: false, internalType: 'uint8' },
      { name: 'newFaction', type: 'uint8', indexed: true, internalType: 'uint8' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Defected',
    inputs: [
      { name: 'regionId', type: 'uint16', indexed: true, internalType: 'uint16' },
      { name: 'faction', type: 'uint8', indexed: true, internalType: 'uint8' },
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RegionsAdded',
    inputs: [
      { name: 'newCount', type: 'uint16', indexed: false, internalType: 'uint16' },
    ],
    anonymous: false,
  },
] as const;
