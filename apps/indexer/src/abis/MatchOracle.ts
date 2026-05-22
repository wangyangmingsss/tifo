// MatchOracle ABI - events needed by indexer
export const MatchOracleABI = [
  {
    type: 'event',
    name: 'MatchEventPushed',
    inputs: [
      { name: 'eventId', type: 'uint256', indexed: true },
      { name: 'faction', type: 'uint8', indexed: true },
      { name: 'eventType', type: 'uint8', indexed: true },
      { name: 'regions', type: 'uint16[]', indexed: false },
      { name: 'boostApplied', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'eventCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
