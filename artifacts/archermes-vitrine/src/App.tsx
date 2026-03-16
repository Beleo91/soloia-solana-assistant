import { PrivyProvider } from '@privy-io/react-auth';
import HomePage from './HomePage';

function App() {
  return (
    <PrivyProvider
      appId="cmmttjv0y01n10dk0bt0hr1py"
      config={{
        loginMethods: ['email', 'google', 'sms'],
        appearance: {
          theme: 'light',
          logo: 'https://seusite.com/logo-archermes.png',
        },
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
