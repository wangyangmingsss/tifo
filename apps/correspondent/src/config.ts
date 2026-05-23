import dotenv from 'dotenv';
dotenv.config();

export const config = {
  rpcUrl: process.env.RPC_URL || 'https://testrpc.xlayer.tech',
  chainId: parseInt(process.env.CHAIN_ID || '195', 10),

  contracts: {
    territoryMap: (process.env.TERRITORY_MAP || '0x4987CFAF2CA1650887786C83746CcEC4d4941331') as `0x${string}`,
    matchOracle: (process.env.MATCH_ORACLE || '0x57E585543940cCfAB71141d84A419C3F7872d5be') as `0x${string}`,
    factionRegistry: (process.env.FACTION_REGISTRY || '0x80449696e9F2DBEBC7F154805320f49ae5aA6E23') as `0x${string}`,
  },

  // X (Twitter) API credentials — OAuth 1.0a
  twitter: {
    apiKey: process.env.X_API_KEY || '',
    apiSecret: process.env.X_API_SECRET || '',
    accessToken: process.env.X_ACCESS_TOKEN || '',
    accessSecret: process.env.X_ACCESS_SECRET || '',
    bearerToken: process.env.X_BEARER_TOKEN || '',
  },

  projectHandle: process.env.PROJECT_HANDLE || '@0xWangyangming',

  // DeepSeek V4 API for AI-enhanced tweet generation
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',

  confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS || '5', 10),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
  startBlock: BigInt(process.env.START_BLOCK || '30996200'),

  dryRun: process.env.DRY_RUN === 'true',
};
