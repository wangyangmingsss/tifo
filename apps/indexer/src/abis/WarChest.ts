// WarChest ABI - events needed by indexer
export const WarChestABI = [
  {
    type: 'event',
    name: 'RewardClaimed',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'regionId', type: 'uint16', indexed: true },
      { name: 'faction', type: 'uint8', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SeasonSettled',
    inputs: [
      { name: 'totalScore', type: 'uint256', indexed: false },
      { name: 'totalPool', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'faction', type: 'uint8', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'from', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'PassiveAccrued',
    inputs: [
      { name: 'regionId', type: 'uint16', indexed: true },
      { name: 'faction', type: 'uint8', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'factionPrizePool',
    inputs: [{ name: 'faction', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'settled',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;
