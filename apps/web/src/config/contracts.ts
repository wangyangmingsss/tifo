export const XLAYER_TESTNET = {
  id: 195,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer-test' },
  },
  testnet: true,
} as const;

// Deployed on X Layer Testnet — all contracts source-verified on OKLink
export const CONTRACTS = {
  MockUSDT: '0x212E0207999B982b2F4B8f91cA421D94dc8438e3',
  WarChest: '0x2E587e2E830D637B80e3a23db7001a92582f1352',
  FactionRegistry: '0x80449696e9F2DBEBC7F154805320f49ae5aA6E23',
  TerritoryMap: '0x4987CFAF2CA1650887786C83746CcEC4d4941331',
  MatchOracle: '0x57E585543940cCfAB71141d84A419C3F7872d5be',
} as const;

export const OKLINK_BASE = 'https://www.oklink.com/xlayer-test';
export const oklinkTx = (hash: string) => `${OKLINK_BASE}/tx/${hash}`;
export const oklinkAddress = (addr: string) => `${OKLINK_BASE}/address/${addr}`;
