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

// Placeholder addresses - replace after deployment
export const CONTRACTS = {
  MockUSDT: '0x0000000000000000000000000000000000000000',
  WarChest: '0x0000000000000000000000000000000000000000',
  FactionRegistry: '0x0000000000000000000000000000000000000000',
  TerritoryMap: '0x0000000000000000000000000000000000000000',
  MatchOracle: '0x0000000000000000000000000000000000000000',
} as const;

export const OKLINK_BASE = 'https://www.oklink.com/xlayer-test';
export const oklinkTx = (hash: string) => `${OKLINK_BASE}/tx/${hash}`;
export const oklinkAddress = (addr: string) => `${OKLINK_BASE}/address/${addr}`;
