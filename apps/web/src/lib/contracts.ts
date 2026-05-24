export const XLAYER_TESTNET = {
  id: 1952,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer-test' },
  },
} as const;

export const CONTRACTS = {
  MockUSDT: '0x212E0207999B982b2F4B8f91cA421D94dc8438e3' as `0x${string}`,
  FactionRegistry: '0x80449696e9F2DBEBC7F154805320f49ae5aA6E23' as `0x${string}`,
  TerritoryMap: '0x4987CFAF2CA1650887786C83746CcEC4d4941331' as `0x${string}`,
  WarChest: '0x2E587e2E830D637B80e3a23db7001a92582f1352' as `0x${string}`,
  MatchOracle: '0x57E585543940cCfAB71141d84A419C3F7872d5be' as `0x${string}`,
} as const;

export const INDEXER_API = '/api';

export const OKLINK_TX = (hash: string) => `https://www.oklink.com/xlayer-test/tx/${hash}`;
