import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import { BrowserProvider } from 'ethers';
import { usePrivy } from '@privy-io/react-auth';
import { arcTestnet } from './chains';

interface WalletCtx {
  address: string;
  isConnected: boolean;
  isConnecting: boolean;
  provider: BrowserProvider | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToArc: () => Promise<void>;
  getProvider: () => BrowserProvider | null;
  error: string;
  clearError: () => void;
}

const Ctx = createContext<WalletCtx>({
  address: '', isConnected: false, isConnecting: false, provider: null,
  connect: async () => {}, disconnect: () => {}, switchToArc: async () => {},
  getProvider: () => null, error: '', clearError: () => {},
});

const LS_ADDR = 'archermes_wallet_address';
const ARC_CHAIN_HEX = '0x' + arcTestnet.id.toString(16);

function getEth() {
  if (typeof window === 'undefined') return null;
  return (window as { ethereum?: unknown }).ethereum as {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  } | undefined ?? null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { logout: privyLogout } = usePrivy();

  const [address, setAddress] = useState<string>(() => {
    try { return localStorage.getItem(LS_ADDR) ?? ''; } catch { return ''; }
  });
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const isConnected = address.length > 0;

  const clearError = useCallback(() => setError(''), []);

  // Silently reconnect on mount if previously connected
  useEffect(() => {
    const eth = getEth();
    if (!eth || !address) return;
    const prov = new BrowserProvider(eth);
    setProvider(prov);
    eth.request({ method: 'eth_accounts' }).then((accounts) => {
      const accs = accounts as string[];
      const lower = address.toLowerCase();
      const match = accs.find((a) => a.toLowerCase() === lower);
      if (!match) {
        if (accs.length > 0) {
          const acc = accs[0];
          setAddress(acc);
          try { localStorage.setItem(LS_ADDR, acc); } catch { /* ignore */ }
        } else {
          setAddress('');
          try { localStorage.removeItem(LS_ADDR); } catch { /* ignore */ }
          setProvider(null);
        }
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for account/chain changes from the wallet extension
  useEffect(() => {
    const eth = getEth();
    if (!eth) return;

    const onAccounts = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        setAddress('');
        setProvider(null);
        try { localStorage.removeItem(LS_ADDR); } catch { /* ignore */ }
      } else {
        const acc = accs[0];
        setAddress(acc);
        setProvider(new BrowserProvider(eth));
        try { localStorage.setItem(LS_ADDR, acc); } catch { /* ignore */ }
      }
    };

    eth.on('accountsChanged', onAccounts);
    return () => eth.removeListener('accountsChanged', onAccounts);
  }, []);

  const switchToArc = useCallback(async () => {
    const eth = getEth();
    if (!eth) return;
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_CHAIN_HEX }],
      });
    } catch (switchErr) {
      const e = switchErr as { code?: number };
      if (e.code === 4902 || e.code === -32603) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: ARC_CHAIN_HEX,
            chainName: arcTestnet.name,
            nativeCurrency: arcTestnet.nativeCurrency,
            rpcUrls: [arcTestnet.rpcUrls.default.http[0]],
            blockExplorerUrls: [arcTestnet.blockExplorers?.default.url ?? ''],
          }],
        });
      } else {
        throw switchErr;
      }
    }
  }, []);

  const connect = useCallback(async () => {
    setError('');
    setIsConnecting(true);
    const eth = getEth();
    if (!eth) {
      setError('NO_WALLET');
      setIsConnecting(false);
      return;
    }
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[];
      if (accounts.length === 0) {
        setError('NO_ACCOUNTS');
        setIsConnecting(false);
        return;
      }
      const acc = accounts[0];
      const prov = new BrowserProvider(eth);
      setAddress(acc);
      setProvider(prov);
      try { localStorage.setItem(LS_ADDR, acc); } catch { /* ignore */ }
      // Switch/add Arc Testnet — errors here are non-fatal (user may dismiss)
      await switchToArc().catch(() => {});
    } catch (err) {
      const e = err as { code?: number; message?: string };
      if (e.code === 4001) {
        setError('CANCELLED');
      } else {
        setError(e.message ?? 'UNKNOWN');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [switchToArc]);

  const disconnect = useCallback(() => {
    // 1. Reset app state immediately — UI reacts instantly
    setAddress('');
    setProvider(null);
    setError('');
    try { localStorage.removeItem(LS_ADDR); } catch { /* ignore */ }

    // 2. Revoke wallet permissions (EIP-2255) so the next connect() prompts
    //    fresh account selection instead of auto-reconnecting the same address.
    const eth = getEth();
    if (eth) {
      eth.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] })
        .catch(() => { /* not all wallets support EIP-2255 — safe to ignore */ });
    }

    // 3. Clear the Privy session so the auth modal starts fresh on next login.
    privyLogout().catch(() => { /* ignore Privy errors */ });
  }, [privyLogout]);

  const getProvider = useCallback((): BrowserProvider | null => {
    const eth = getEth();
    if (!eth) return null;
    return provider ?? new BrowserProvider(eth);
  }, [provider]);

  return (
    <Ctx.Provider value={{
      address, isConnected, isConnecting, provider,
      connect, disconnect, switchToArc, getProvider,
      error, clearError,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWallet() {
  return useContext(Ctx);
}
