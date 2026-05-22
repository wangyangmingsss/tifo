// TerritoryMap ABI - events and views needed by indexer
export const TerritoryMapABI = [
  {
    type: 'event',
    name: 'RallyPlaced',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'regionId', type: 'uint16', indexed: true },
      { name: 'faction', type: 'uint8', indexed: true },
      { name: 'rawAmount', type: 'uint256', indexed: false },
      { name: 'effectivePower', type: 'uint256', indexed: false },
      { name: 'newFactionPower', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TerritoryCaptured',
    inputs: [
      { name: 'regionId', type: 'uint16', indexed: true },
      { name: 'oldFaction', type: 'uint8', indexed: true },
      { name: 'newFaction', type: 'uint8', indexed: true },
      { name: 'captureCount', type: 'uint16', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Defected',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'regionId', type: 'uint16', indexed: true },
      { name: 'fromFaction', type: 'uint8', indexed: false },
      { name: 'toFaction', type: 'uint8', indexed: true },
      { name: 'convertedPower', type: 'uint256', indexed: false },
      { name: 'finderReward', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'RegionsAdded',
    inputs: [
      { name: 'fromId', type: 'uint16', indexed: false },
      { name: 'toId', type: 'uint16', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'getMapState',
    inputs: [],
    outputs: [{ name: 'ownersArr', type: 'uint8[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'territoryCounts',
    inputs: [],
    outputs: [{ name: 'counts', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'regionCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'effectivePower',
    inputs: [
      { name: 'regionId', type: 'uint16' },
      { name: 'faction', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'regions',
    inputs: [{ name: 'regionId', type: 'uint16' }],
    outputs: [
      { name: 'ownerFaction', type: 'uint8' },
      { name: 'lastUpdate', type: 'uint64' },
      { name: 'captureCount', type: 'uint16' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'contribution',
    inputs: [
      { name: 'regionId', type: 'uint16' },
      { name: 'faction', type: 'uint8' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
