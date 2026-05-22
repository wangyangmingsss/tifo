import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // RPC
  rpcUrl: process.env.RPC_URL || 'https://testrpc.xlayer.tech',
  chainId: parseInt(process.env.CHAIN_ID || '195', 10),

  // Contract addresses
  contracts: {
    factionRegistry: (process.env.FACTION_REGISTRY || '0x80449696e9F2DBEBC7F154805320f49ae5aA6E23') as `0x${string}`,
    territoryMap: (process.env.TERRITORY_MAP || '0x4987CFAF2CA1650887786C83746CcEC4d4941331') as `0x${string}`,
    warChest: (process.env.WAR_CHEST || '0x2E587e2E830D637B80e3a23db7001a92582f1352') as `0x${string}`,
    matchOracle: (process.env.MATCH_ORACLE || '0x57E585543940cCfAB71141d84A419C3F7872d5be') as `0x${string}`,
    mockUsdt: (process.env.MOCK_USDT || '0x212E0207999B982b2F4B8f91cA421D94dc8438e3') as `0x${string}`,
  },

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://tifo:tifo@localhost:5432/tifo',

  // Indexer settings
  confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS || '5', 10),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '3000', 10),
  startBlock: BigInt(process.env.START_BLOCK || '0'),

  // API
  port: parseInt(process.env.PORT || '4000', 10),
};
