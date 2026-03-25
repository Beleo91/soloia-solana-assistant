import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import { BrowserProvider } from 'ethers';
import { arcTestnet } from './chains';

interface WalletCtx {
  address: string;
  isConnected: boolean;
  provider: BrowserProvider | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToArc: () => Promise<void>;
  getProvider: () => BrowserProvider | null;
  error: string;
}

const Ctx = createContext<WalletCtx>({
  address: '', isConnected: false, provider: null,
  connect: async () => {}, disconnect: () => {}, switchToArc: async () => {},
  getProvider: () => null, error: '',
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
  const [address, setAddress] = useState<string>(() => {
    try { return localStorage.getItem(LS_ADDR) ?? ''; } catch { return ''; }
  });
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [error, setError] = useState('');

  const isConnected = address.length > 0;

  // Silently reconnect on mount if previously connected
  useEffect(() => {
    const eth = getEth();
    if (!eth || !address) return;
    const prov = new BrowserProvider(eth);
    setProvider(prov);
    // Verify account is still accessible
    eth.request({ method: 'eth_accounts' }).then((accounts) => {
      const accs = accounts as string[];
      if (!accs.includes(address.toLowerCase()) && !accs.map(a => a.toLowerCase()).includes(address.toLowerCase())) {
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
  }, []);

  // Listen for account/chain changes
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
    const eth = getEth();
    if (!eth) {
      setError('Nenhuma carteira Web3 detectada. Instale MetaMask ou Rabby.');
      return;
    }
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[];
      if (accounts.length === 0) { setError('Nenhuma conta autorizada.'); return; }
      const acc = accounts[0];
      const prov = new BrowserProvider(eth);
      setAddress(acc);
      setProvider(prov);
      try { localStorage.setItem(LS_ADDR, acc); } catch { /* ignore */ }
      await switchToArc().catch(() => {});
    } catch (err) {
      const e = err as { code?: number; message?: string };
      if (e.code === 4001) {
        setError('Conexão recusada pelo usuário.');
      } else {
        setError(e.message ?? 'Erro ao conectar carteira.');
      }
    }
  }, [switchToArc]);

  const disconnect = useCallback(() => {
    setAddress('');
    setProvider(null);
    try { localStorage.removeItem(LS_ADDR); } catch { /* ignore */ }
  }, []);

  const getProvider = useCallback((): BrowserProvider | null => {
    const eth = getEth();
    if (!eth) return null;
    return provider ?? new BrowserProvider(eth);
  }, [provider]);

  return (
    <Ctx.Provider value={{ address, isConnected, provider, connect, disconnect, switchToArc, getProvider, error }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWallet() {
  return useContext(Ctx);
}
