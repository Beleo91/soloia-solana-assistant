import { PrivyProvider } from '@privy-io/react-auth';
import { defineChain } from 'viem';
import HomePage from './HomePage';

// ──────────────────────────────────────────────────────────
// Arc Testnet — rede principal do marketplace
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});
// ──────────────────────────────────────────────────────────

function App() {
  return (
    <PrivyProvider
      appId="cmmttjv0y01n10dk0bt0hr1py"
      config={{
        loginMethods: ['email', 'google', 'sms', 'wallet'],
        appearance: {
          theme: 'dark',
          logo: 'https://seusite.com/logo-archermes.png',
          walletChainType: 'ethereum-only',
        },
        defaultChain: arcTestnet,
        supportedChains: [arcTestnet],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <HomePage />
    </PrivyProvider>
  );
}

export default App;
