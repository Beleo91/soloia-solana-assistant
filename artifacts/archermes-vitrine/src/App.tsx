import { PrivyProvider } from '@privy-io/react-auth';
import { arcTestnet } from './chains';
import { WalletProvider } from './walletContext';
import HomePage from './HomePage';

function App() {
  return (
    <PrivyProvider
      appId="cmmttjv0y01n10dk0bt0hr1py"
      config={{
        loginMethods: ['wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          logo: '/images/logo-ahs.png',
          showWalletLoginFirst: true,
          walletChainType: 'ethereum-only',
        },
        defaultChain: arcTestnet,
        supportedChains: [arcTestnet],
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
      }}
    >
      <WalletProvider>
        <HomePage />
      </WalletProvider>
    </PrivyProvider>
  );
}

export default App;
