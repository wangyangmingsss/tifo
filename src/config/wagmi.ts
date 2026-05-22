import { defineChain } from 'viem'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  okxWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http } from 'wagmi'

export const xLayerTestnet = defineChain({
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
})

const projectId = 'tifo-2026'

// OKX Wallet is the first-class connector — placed at the top of the list
// so it appears as the primary recommended wallet in the connect modal.
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [okxWallet],
    },
    {
      groupName: 'Other Wallets',
      wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet],
    },
  ],
  {
    appName: 'TIFO',
    projectId,
  },
)

export const config = createConfig({
  connectors,
  chains: [xLayerTestnet],
  transports: {
    [xLayerTestnet.id]: http(),
  },
  ssr: true,
})
