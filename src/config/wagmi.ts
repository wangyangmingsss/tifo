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

// WalletConnect Cloud Project ID — required for WalletConnect & Coinbase connectors.
// Get yours at https://cloud.walletconnect.com (free tier is sufficient).
// Falls back to empty string if not set; OKX Wallet (injected) works without it.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

if (!projectId && typeof window !== 'undefined') {
  console.warn(
    '[TIFO] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. ' +
    'WalletConnect and Coinbase Wallet connections will not work. ' +
    'OKX Wallet and MetaMask (injected) are unaffected. ' +
    'Get a free project ID at https://cloud.walletconnect.com',
  )
}

// OKX Wallet is the first-class connector — placed at the top of the list
// so it appears as the primary recommended wallet in the connect modal.
// WalletConnect-dependent wallets are only included when a valid projectId exists.
const otherWallets = projectId
  ? [metaMaskWallet, walletConnectWallet, coinbaseWallet]
  : [metaMaskWallet] // MetaMask uses injected provider, no WC needed

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [okxWallet],
    },
    {
      groupName: 'Other Wallets',
      wallets: otherWallets,
    },
  ],
  {
    appName: 'TIFO',
    projectId: projectId || 'placeholder', // RainbowKit requires non-empty string
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
