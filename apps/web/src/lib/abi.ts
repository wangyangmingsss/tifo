export const FactionRegistryABI = [
  { type: "function", name: "joinFaction", stateMutability: "nonpayable", inputs: [{ name: "factionId", type: "uint8" }], outputs: [] },
  { type: "function", name: "factionOf", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint8" }] },
  { type: "function", name: "isEnrolled", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "memberCount", stateMutability: "view", inputs: [{ name: "factionId", type: "uint8" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "switchFee", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "event", name: "FactionJoined", inputs: [{ name: "user", type: "address", indexed: true }, { name: "factionId", type: "uint8", indexed: true }, { name: "isSwitch", type: "bool", indexed: false }] },
] as const;

export const TerritoryMapABI = [
  { type: "function", name: "rally", stateMutability: "nonpayable", inputs: [{ name: "regionId", type: "uint16" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "defect", stateMutability: "nonpayable", inputs: [{ name: "regionId", type: "uint16" }], outputs: [] },
  { type: "function", name: "getMapState", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8[]" }] },
  { type: "function", name: "effectivePower", stateMutability: "view", inputs: [{ name: "regionId", type: "uint16" }, { name: "faction", type: "uint8" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "territoryCounts", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256[]" }] },
  { type: "function", name: "regions", stateMutability: "view", inputs: [{ name: "regionId", type: "uint16" }], outputs: [{ name: "owner", type: "uint8" }, { name: "lastFlip", type: "uint64" }, { name: "captureCount", type: "uint16" }] },
  { type: "function", name: "contribution", stateMutability: "view", inputs: [{ name: "regionId", type: "uint16" }, { name: "faction", type: "uint8" }, { name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "regionCount", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint16" }] },
  { type: "event", name: "RallyPlaced", inputs: [{ name: "user", type: "address", indexed: true }, { name: "regionId", type: "uint16", indexed: true }, { name: "faction", type: "uint8", indexed: true }, { name: "rawAmount", type: "uint256", indexed: false }, { name: "effectivePower", type: "uint256", indexed: false }, { name: "newFactionPower", type: "uint256", indexed: false }] },
  { type: "event", name: "TerritoryCaptured", inputs: [{ name: "regionId", type: "uint16", indexed: true }, { name: "oldFaction", type: "uint8", indexed: true }, { name: "newFaction", type: "uint8", indexed: true }, { name: "captureCount", type: "uint16", indexed: false }] },
  { type: "event", name: "Defected", inputs: [{ name: "user", type: "address", indexed: true }, { name: "regionId", type: "uint16", indexed: true }, { name: "fromFaction", type: "uint8", indexed: false }, { name: "toFaction", type: "uint8", indexed: true }, { name: "convertedPower", type: "uint256", indexed: false }, { name: "finderReward", type: "uint256", indexed: false }] },
] as const;

export const MockUSDTABI = [
  { type: "function", name: "faucet", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
] as const;

export const WarChestABI = [
  { type: "function", name: "factionPrizePool", stateMutability: "view", inputs: [{ name: "factionId", type: "uint8" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "settled", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "seasonStart", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint64" }] },
] as const;

export const MatchOracleABI = [
  { type: "function", name: "eventCount", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "event", name: "MatchEventPushed", inputs: [{ name: "eventId", type: "uint256", indexed: true }, { name: "faction", type: "uint8", indexed: true }, { name: "eventType", type: "uint8", indexed: true }, { name: "regions", type: "uint16[]", indexed: false }, { name: "boostApplied", type: "uint256", indexed: false }] },
] as const;
