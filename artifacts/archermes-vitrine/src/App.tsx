import { PrivyProvider } from '@privy-io/react-auth';
import { arcTestnet } from './chains';
import HomePage from './HomePage';

const walletConnectOptions = {
  projectId: 'e010a30b621481546e30064f227bda07',
};

function App() {
  return (
    <PrivyProvider
      appId="cmmttjv0y01n10dk0bt0hr1py"
      config={{
        loginMethods: ['email', 'wallet', 'google', 'apple', 'twitter', 'discord', 'github', 'linkedin', 'tiktok', 'sms'],
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
          createOnLogin: 'all-users',
        },
        walletConnectOptions,
      }}
    >
      <HomePage />
    </PrivyProvider>
  );
}

export default App;
