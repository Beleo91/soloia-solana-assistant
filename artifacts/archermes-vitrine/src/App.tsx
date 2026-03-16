import { PrivyProvider } from '@privy-io/react-auth';
import HomePage from './HomePage';

function App() {
  return (
    <PrivyProvider
      appId="SEU_ID_DO_PRIVY_AQUI"
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
