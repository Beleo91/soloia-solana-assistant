import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { BrowserProvider, Contract, JsonRpcProvider, formatUnits } from 'ethers';
import { arcTestnet } from './chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';

interface StoreInfo {
  storeName: string;
  expiresAt: bigint;
  tier: number;
  productCount: bigint;
}

interface MeuProduto {
  id: number;
  itemName: string;
  priceEth: string;
  category: string;
  isActive: boolean;
  isSold: boolean;
}

interface Customizacao {
  avatarUrl: string;
  bannerUrl: string;
  neonColor: string;
}

const NEON_OPTIONS = [
  { label: 'Ciano', value: '#00e5ff', shadow: 'rgba(0,229,255,0.4)' },
  { label: 'Roxo', value: '#c084fc', shadow: 'rgba(192,132,252,0.4)' },
  { label: 'Verde', value: '#4ade80', shadow: 'rgba(74,222,128,0.4)' },
  { label: 'Laranja', value: '#fb923c', shadow: 'rgba(251,146,60,0.4)' },
];

const LS_KEY = 'archermes_customizacao';

type DashEstado = 'idle' | 'criando' | 'sucesso' | 'erro';

export default function StoreDashboard({ onVoltar }: { onVoltar: () => void }) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const [loja, setLoja] = useState<StoreInfo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [nomeLoja, setNomeLoja] = useState('');
  const [planoPro, setPlanoPro] = useState(false);
  const [estado, setEstado] = useState<DashEstado>('idle');
  const [erroMsg, setErroMsg] = useState('');
  const [basicFee, setBasicFee] = useState('0.01');
  const [proFee, setProFee] = useState('0.05');

  const [meusProdutos, setMeusProdutos] = useState<MeuProduto[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);

  const [abaAtiva, setAbaAtiva] = useState<'loja' | 'produtos' | 'visual'>('loja');

  const [customizacao, setCustomizacao] = useState<Customizacao>({ avatarUrl: '', bannerUrl: '', neonColor: '#00e5ff' });

  const [rastreioId, setRastreioId] = useState<number | null>(null);
  const [rastreioCode, setRastreioCode] = useState('');
  const [txStatus, setTxStatus] = useState<Record<number, string>>({});

  const enderecoUsuario = wallets[0]?.address ?? '';

  // Carregar customização do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${LS_KEY}_${enderecoUsuario}`);
      if (saved) setCustomizacao(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [enderecoUsuario]);

  function salvarCustomizacao(next: Customizacao) {
    setCustomizacao(next);
    try { localStorage.setItem(`${LS_KEY}_${enderecoUsuario}`, JSON.stringify(next)); } catch { /* ignore */ }
  }

  // Checar loja
  useEffect(() => {
    async function checarLoja() {
      if (!enderecoUsuario) { setCarregando(false); return; }
      setCarregando(true);
      try {
        const provider = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
        const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const [bFee, pFee, store] = await Promise.all([
          contrato.basicStoreFee(),
          contrato.proStoreFee(),
          contrato.stores(enderecoUsuario),
        ]);
        setBasicFee(formatUnits(bFee, 18));
        setProFee(formatUnits(pFee, 18));
        setLoja({ storeName: store.storeName, expiresAt: store.expiresAt, tier: Number(store.tier), productCount: store.productCount });
      } catch (err) { console.error(err); } finally { setCarregando(false); }
    }
    checarLoja();
  }, [enderecoUsuario]);

  // Carregar meus produtos
  const carregarMeusProdutos = async () => {
    if (!enderecoUsuario) return;
    setCarregandoProdutos(true);
    try {
      const provider = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const total: bigint = await contrato.totalItems();
      const lista: MeuProduto[] = [];
      for (let i = 1; i <= Number(total); i++) {
        const item = await contrato.items(i);
        if (item.seller.toLowerCase() === enderecoUsuario.toLowerCase()) {
          lista.push({
            id: Number(item.id),
            itemName: item.itemName,
            priceEth: formatUnits(item.price, 18),
            category: item.category,
            isActive: item.isActive,
            isSold: item.isSold,
          });
        }
      }
      setMeusProdutos(lista);
    } catch (err) { console.error(err); } finally { setCarregandoProdutos(false); }
  };

  useEffect(() => {
    if (abaAtiva === 'produtos' && authenticated) carregarMeusProdutos();
  }, [abaAtiva, authenticated, enderecoUsuario]);

  async function handleCriarLoja(isPro: boolean) {
    if (!nomeLoja.trim()) { setErroMsg('Digite o nome da sua loja.'); return; }
    const wallet = wallets[0];
    if (!wallet) return;
    setEstado('criando'); setErroMsg('');
    try {
      await wallet.switchChain(arcTestnet.id);
      const eip1193 = await wallet.getEthereumProvider();
      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const rpc = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
      const c2 = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpc);
      const taxa = isPro ? await c2.proStoreFee() : await c2.basicStoreFee();
      const tx = await contrato.createStore(nomeLoja.trim(), isPro, { value: taxa });
      await tx.wait();
      setEstado('sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErroMsg(msg.length > 160 ? msg.slice(0, 160) + '…' : msg);
      setEstado('erro');
    }
  }

  async function handleCancelarItem(id: number) {
    const wallet = wallets[0]; if (!wallet) return;
    setTxStatus((p) => ({ ...p, [id]: 'cancelando' }));
    try {
      await wallet.switchChain(arcTestnet.id);
      const eip1193 = await wallet.getEthereumProvider();
      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contrato.cancelItem(id);
      await tx.wait();
      setTxStatus((p) => ({ ...p, [id]: 'cancelado' }));
      carregarMeusProdutos();
    } catch { setTxStatus((p) => ({ ...p, [id]: 'erro' })); }
  }

  async function handleSetRastreio(id: number, code: string) {
    if (!code.trim()) return;
    const wallet = wallets[0]; if (!wallet) return;
    setTxStatus((p) => ({ ...p, [id]: 'rastreando' }));
    try {
      await wallet.switchChain(arcTestnet.id);
      const eip1193 = await wallet.getEthereumProvider();
      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contrato.setTrackingCode(id, code.trim());
      await tx.wait();
      setTxStatus((p) => ({ ...p, [id]: 'rastreado' }));
      setRastreioId(null); setRastreioCode('');
    } catch { setTxStatus((p) => ({ ...p, [id]: 'erro' })); }
  }

  async function handleUpgradePro() {
    const wallet = wallets[0]; if (!wallet) return;
    try {
      await wallet.switchChain(arcTestnet.id);
      const eip1193 = await wallet.getEthereumProvider();
      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const rpc = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
      const c2 = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpc);
      const taxa = await c2.proStoreFee();
      const tx = await contrato.upgradeToPro({ value: taxa });
      await tx.wait();
      setCarregando(true);
    } catch (err) { console.error(err); }
  }

  async function handleRenovar() {
    const wallet = wallets[0]; if (!wallet) return;
    try {
      await wallet.switchChain(arcTestnet.id);
      const eip1193 = await wallet.getEthereumProvider();
      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const rpc = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
      const c2 = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpc);
      const taxa = loja!.tier === 1 ? await c2.proStoreFee() : await c2.basicStoreFee();
      const tx = await contrato.renewStore({ value: taxa });
      await tx.wait();
      setCarregando(true);
    } catch (err) { console.error(err); }
  }

  const lojaAtiva = loja && loja.storeName && loja.storeName.length > 0;
  const expirou = loja && Number(loja.expiresAt) < Date.now() / 1000;
  const neonAtual = NEON_OPTIONS.find((n) => n.value === customizacao.neonColor) ?? NEON_OPTIONS[0];

  const abas = [
    { id: 'loja', label: '⬡ Minha Loja' },
    { id: 'produtos', label: '📦 Produtos' },
    { id: 'visual', label: '🎨 Visual' },
  ] as const;

  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto w-full">
      {/* Voltar */}
      <button onClick={onVoltar}
        className="mb-8 text-xs text-white/40 hover:text-cyan-400 transition-colors flex items-center gap-2 tracking-widest uppercase"
        style={{ fontFamily: "'Orbitron', sans-serif" }}>
        ← Voltar
      </button>

      {/* Título */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-widest uppercase mb-2"
          style={{ fontFamily: "'Orbitron', sans-serif", color: customizacao.neonColor,
            textShadow: `0 0 30px ${neonAtual.shadow}` }}>
          Painel do Lojista
        </h1>
        <p className="text-white/40 text-sm tracking-wide">
          Gerencie sua loja no marketplace descentralizado ARCHERMES
        </p>
      </div>

      {/* Não autenticado */}
      {!authenticated && (
        <div className="flex flex-col items-center py-20 gap-4">
          <div className="text-5xl opacity-30">🔒</div>
          <p className="text-white/40 text-sm tracking-widest uppercase"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            Faça login para acessar sua loja
          </p>
          <button onClick={login} className="btn-neon btn-neon-filled btn-neon-lg">
            Entrar
          </button>
        </div>
      )}

      {authenticated && carregando && (
        <div className="flex flex-col items-center py-20 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <p className="text-cyan-400/60 text-sm tracking-widest uppercase"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            Consultando blockchain...
          </p>
        </div>
      )}

      {/* Sucesso criação */}
      {estado === 'sucesso' && (
        <div className="flex flex-col items-center py-16 gap-4 rounded-2xl border border-cyan-400/20"
          style={{ background: 'rgba(0,229,255,0.04)', backdropFilter: 'blur(16px)' }}>
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-black tracking-widest uppercase"
            style={{ fontFamily: "'Orbitron', sans-serif", color: '#00e5ff' }}>
            Loja Criada com Sucesso!
          </h2>
          <p className="text-white/60 text-sm">Sua loja está ativa na Arc Testnet.</p>
          <button onClick={() => { setEstado('idle'); setCarregando(true); }}
            className="btn-neon btn-neon-cyan">
            Ver Minha Loja
          </button>
        </div>
      )}

      {/* Escolha de plano - sem loja */}
      {authenticated && !carregando && !lojaAtiva && estado !== 'sucesso' && (
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-lg font-black tracking-widest uppercase mb-1"
              style={{ fontFamily: "'Orbitron', sans-serif", color: '#fff' }}>
              Escolha seu Plano
            </h2>
            <p className="text-white/40 text-sm">Crie sua loja on-chain e comece a vender na Arc Testnet.</p>
          </div>

          <div className="flex flex-col gap-2 max-w-md">
            <label className="text-xs text-white/50 tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif" }}>
              Nome da sua loja
            </label>
            <input type="text" placeholder="Ex: Sneakers Store" value={nomeLoja}
              onChange={(e) => setNomeLoja(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none
                border border-white/10 focus:border-cyan-400/50 transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', fontFamily: 'inherit' }} />
            {erroMsg && <p className="text-red-400 text-xs mt-1">{erroMsg}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Básico */}
            <div className={`rounded-2xl border p-6 flex flex-col gap-5 cursor-pointer transition-all duration-300
              ${!planoPro ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.15)]' : 'border-white/10 hover:border-white/20'}`}
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)' }}
              onClick={() => setPlanoPro(false)}>
              <div>
                <p className="text-[10px] text-cyan-400 tracking-widest uppercase mb-1"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}>Plano</p>
                <h3 className="text-xl font-black tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: '#fff' }}>Básico</h3>
              </div>
              <p className="text-3xl font-black" style={{ color: '#00e5ff', fontFamily: "'Orbitron', sans-serif" }}>
                {basicFee}<span className="text-base text-white/40 ml-1 font-normal">ETH</span>
              </p>
              <ul className="flex flex-col gap-2 text-sm text-white/60">
                <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Até 10 produtos</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Vitrine on-chain</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Pagamentos Web3</li>
              </ul>
              <button disabled={estado === 'criando'}
                onClick={(e) => { e.stopPropagation(); setPlanoPro(false); handleCriarLoja(false); }}
                className="btn-neon btn-neon-cyan btn-neon-full btn-neon-lg">
                {estado === 'criando' && !planoPro ? '⟳ Processando...' : `Abrir por ${basicFee} ETH`}
              </button>
            </div>

            {/* PRO */}
            <div className={`rounded-2xl border p-6 flex flex-col gap-5 cursor-pointer relative overflow-hidden transition-all duration-300
              ${planoPro ? 'border-purple-400 shadow-[0_0_25px_rgba(124,58,237,0.25)]' : 'border-white/10 hover:border-white/20'}`}
              style={{ background: 'rgba(124,58,237,0.08)', backdropFilter: 'blur(16px)' }}
              onClick={() => setPlanoPro(true)}>
              <span className="absolute top-3 right-3 text-[10px] font-bold tracking-widest
                bg-purple-500/30 border border-purple-400/50 text-purple-300 px-2 py-0.5 rounded-full"
                style={{ fontFamily: "'Orbitron', sans-serif" }}>⚡ RECOMENDADO</span>
              <div>
                <p className="text-[10px] text-purple-400 tracking-widest uppercase mb-1"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}>Plano</p>
                <h3 className="text-xl font-black tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: '#fff' }}>PRO</h3>
              </div>
              <p className="text-3xl font-black" style={{ color: '#c084fc', fontFamily: "'Orbitron', sans-serif" }}>
                {proFee}<span className="text-base text-white/40 ml-1 font-normal">ETH</span>
              </p>
              <ul className="flex flex-col gap-2 text-sm text-white/60">
                <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Produtos ilimitados</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Selo VIP ⚡</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Destaque na vitrine</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Rastreamento de entregas</li>
              </ul>
              <button disabled={estado === 'criando'}
                onClick={(e) => { e.stopPropagation(); setPlanoPro(true); handleCriarLoja(true); }}
                className="btn-neon btn-neon-purple btn-neon-full btn-neon-lg">
                {estado === 'criando' && planoPro ? '⟳ Processando...' : `PRO por ${proFee} ETH`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loja ativa */}
      {authenticated && !carregando && lojaAtiva && estado !== 'sucesso' && (
        <>
          {/* Abas */}
          <div className="flex gap-1 mb-8 rounded-xl p-1"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {abas.map((aba) => (
              <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold tracking-widest uppercase transition-all duration-200"
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  background: abaAtiva === aba.id ? customizacao.neonColor + '22' : 'transparent',
                  color: abaAtiva === aba.id ? customizacao.neonColor : 'rgba(255,255,255,0.3)',
                  border: abaAtiva === aba.id ? `1px solid ${customizacao.neonColor}44` : '1px solid transparent',
                  boxShadow: abaAtiva === aba.id ? `0 0 12px ${neonAtual.shadow}` : 'none',
                }}>
                {aba.label}
              </button>
            ))}
          </div>

          {/* ABA: MINHA LOJA */}
          {abaAtiva === 'loja' && (
            <div className="flex flex-col gap-6">
              {/* Banner */}
              {customizacao.bannerUrl && (
                <div className="w-full h-32 rounded-2xl overflow-hidden border border-white/10">
                  <img src={customizacao.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Card da loja */}
              <div className="rounded-2xl border border-white/10 p-8 flex flex-col gap-6"
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-4">
                  {customizacao.avatarUrl ? (
                    <img src={customizacao.avatarUrl} alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover border-2"
                      style={{ borderColor: customizacao.neonColor + '80' }} />
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2"
                      style={{ borderColor: customizacao.neonColor + '60',
                        background: customizacao.neonColor + '15', color: customizacao.neonColor }}>
                      ⬡
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-black tracking-widest uppercase"
                        style={{ fontFamily: "'Orbitron', sans-serif", color: '#fff',
                          textShadow: `0 0 12px ${neonAtual.shadow}` }}>
                        {loja!.storeName}
                      </h2>
                      {loja!.tier === 1 && (
                        <span className="text-[10px] font-bold tracking-widest bg-yellow-500/10
                          border border-yellow-400/40 text-yellow-300 px-2 py-0.5 rounded-full"
                          style={{ fontFamily: "'Orbitron', sans-serif" }}>⚡ VIP PRO</span>
                      )}
                      {loja!.tier === 0 && (
                        <span className="text-[10px] font-bold tracking-widest bg-cyan-500/10
                          border border-cyan-400/30 text-cyan-400 px-2 py-0.5 rounded-full"
                          style={{ fontFamily: "'Orbitron', sans-serif" }}>BÁSICO</span>
                      )}
                    </div>
                    <p className="text-white/30 text-xs font-mono">{enderecoUsuario}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/5 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-[10px] text-white/30 tracking-widest uppercase mb-1">Produtos</p>
                    <p className="text-2xl font-black" style={{ color: customizacao.neonColor, fontFamily: "'Orbitron', sans-serif" }}>
                      {Number(loja!.productCount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-[10px] text-white/30 tracking-widest uppercase mb-1">Expira em</p>
                    <p className="text-sm font-bold"
                      style={{ color: expirou ? '#f87171' : customizacao.neonColor, fontFamily: "'Orbitron', sans-serif" }}>
                      {expirou ? '⚠ Expirado' : new Date(Number(loja!.expiresAt) * 1000).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-3">
                  {loja!.tier === 0 && (
                    <button onClick={handleUpgradePro}
                      className="btn-neon btn-neon-filled-gold btn-neon-full btn-neon-lg">
                      ⚡ FAZER UPGRADE PARA PRO — {proFee} ETH
                    </button>
                  )}
                  <button onClick={handleRenovar} className="btn-neon btn-neon-cyan btn-neon-full">
                    ↻ Renovar Assinatura
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA: PRODUTOS */}
          {abaAtiva === 'produtos' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: customizacao.neonColor }}>
                  Meus Anúncios
                </h3>
                <button onClick={carregarMeusProdutos}
                  className="text-xs text-white/30 hover:text-cyan-400 transition-colors tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  ↻ Atualizar
                </button>
              </div>

              {carregandoProdutos && (
                <div className="flex items-center justify-center py-12 gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <span className="text-cyan-400/60 text-xs tracking-widest"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>Carregando...</span>
                </div>
              )}

              {!carregandoProdutos && meusProdutos.length === 0 && (
                <div className="flex flex-col items-center py-16 gap-3">
                  <span className="text-4xl opacity-20">⬡</span>
                  <p className="text-white/30 text-xs tracking-widest uppercase"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>Nenhum produto anunciado</p>
                </div>
              )}

              {!carregandoProdutos && meusProdutos.map((prod) => (
                <div key={prod.id} className="rounded-xl border border-white/10 p-4 flex flex-col gap-3"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono text-white/20">#{prod.id}</span>
                        {prod.isSold && (
                          <span className="text-[9px] font-bold tracking-widest bg-green-500/10 border border-green-400/30 text-green-400 px-1.5 py-0.5 rounded-full"
                            style={{ fontFamily: "'Orbitron', sans-serif" }}>VENDIDO</span>
                        )}
                        {!prod.isActive && !prod.isSold && (
                          <span className="text-[9px] font-bold tracking-widest bg-red-500/10 border border-red-400/30 text-red-400 px-1.5 py-0.5 rounded-full"
                            style={{ fontFamily: "'Orbitron', sans-serif" }}>PAUSADO</span>
                        )}
                        {prod.isActive && !prod.isSold && (
                          <span className="text-[9px] font-bold tracking-widest bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 px-1.5 py-0.5 rounded-full"
                            style={{ fontFamily: "'Orbitron', sans-serif" }}>ATIVO</span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-white leading-tight"
                        style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.04em' }}>
                        {prod.itemName}
                      </h4>
                      <p className="text-white/30 text-xs mt-0.5">
                        {prod.category} · {parseFloat(prod.priceEth).toFixed(4)} ETH
                      </p>
                    </div>
                  </div>

                  {/* Ações do produto */}
                  {!prod.isSold && prod.isActive && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleCancelarItem(prod.id)}
                        disabled={txStatus[prod.id] === 'cancelando'}
                        className="btn-neon btn-neon-red btn-neon-sm">
                        {txStatus[prod.id] === 'cancelando' ? '⟳ Pausando...' : '⏸ Pausar Anúncio'}
                      </button>
                      <button
                        onClick={() => setRastreioId(rastreioId === prod.id ? null : prod.id)}
                        className="btn-neon btn-neon-cyan btn-neon-sm">
                        📦 Inserir Rastreio
                      </button>
                    </div>
                  )}

                  {/* Form de rastreio inline */}
                  {rastreioId === prod.id && (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="Código de rastreio (Ex: BR123456789)"
                        value={rastreioCode}
                        onChange={(e) => setRastreioCode(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-xs text-white outline-none
                          border border-white/10 focus:border-cyan-400/40 transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', fontFamily: 'inherit' }}
                      />
                      <button
                        onClick={() => handleSetRastreio(prod.id, rastreioCode)}
                        disabled={txStatus[prod.id] === 'rastreando'}
                        className="btn-neon btn-neon-filled btn-neon-sm">
                        {txStatus[prod.id] === 'rastreando' ? '⟳' : '✓ Enviar'}
                      </button>
                    </div>
                  )}

                  {txStatus[prod.id] === 'rastreado' && (
                    <p className="text-green-400 text-xs">✓ Código de rastreio salvo na blockchain!</p>
                  )}
                  {txStatus[prod.id] === 'cancelado' && (
                    <p className="text-red-400 text-xs">Anúncio pausado com sucesso.</p>
                  )}
                  {txStatus[prod.id] === 'erro' && (
                    <p className="text-red-400 text-xs">⚠ Erro na transação. Tente novamente.</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ABA: VISUAL */}
          {abaAtiva === 'visual' && (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-white/10 p-6 flex flex-col gap-5"
                style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)' }}>
                <h3 className="text-sm font-black tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: customizacao.neonColor }}>
                  Personalização da Loja
                </h3>

                {/* Avatar */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-white/50 tracking-widest uppercase"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    URL da Imagem de Perfil
                  </label>
                  <div className="flex gap-3 items-center">
                    {customizacao.avatarUrl ? (
                      <img src={customizacao.avatarUrl} alt="Avatar preview"
                        className="w-12 h-12 rounded-full object-cover border-2"
                        style={{ borderColor: customizacao.neonColor + '60' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/20">
                        ⬡
                      </div>
                    )}
                    <input type="url" placeholder="https://exemplo.com/avatar.jpg"
                      value={customizacao.avatarUrl}
                      onChange={(e) => salvarCustomizacao({ ...customizacao, avatarUrl: e.target.value })}
                      className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white outline-none
                        border border-white/10 focus:border-cyan-400/40 transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', fontFamily: 'inherit' }} />
                  </div>
                </div>

                {/* Banner */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-white/50 tracking-widest uppercase"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    URL do Banner
                  </label>
                  {customizacao.bannerUrl && (
                    <div className="w-full h-20 rounded-xl overflow-hidden border border-white/10 mb-1">
                      <img src={customizacao.bannerUrl} alt="Banner preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                  <input type="url" placeholder="https://exemplo.com/banner.jpg"
                    value={customizacao.bannerUrl}
                    onChange={(e) => salvarCustomizacao({ ...customizacao, bannerUrl: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none
                      border border-white/10 focus:border-cyan-400/40 transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', fontFamily: 'inherit' }} />
                </div>

                {/* Cor Neon */}
                <div className="flex flex-col gap-3">
                  <label className="text-xs text-white/50 tracking-widest uppercase"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    Cor do Neon
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {NEON_OPTIONS.map((op) => (
                      <button key={op.value}
                        onClick={() => salvarCustomizacao({ ...customizacao, neonColor: op.value })}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold
                          tracking-widest uppercase transition-all"
                        style={{
                          fontFamily: "'Orbitron', sans-serif",
                          borderColor: customizacao.neonColor === op.value ? op.value : 'rgba(255,255,255,0.1)',
                          color: customizacao.neonColor === op.value ? op.value : 'rgba(255,255,255,0.3)',
                          background: customizacao.neonColor === op.value ? op.value + '15' : 'rgba(255,255,255,0.03)',
                          boxShadow: customizacao.neonColor === op.value ? `0 0 12px ${op.shadow}` : 'none',
                        }}>
                        <span className="w-3 h-3 rounded-full" style={{ background: op.value, boxShadow: `0 0 6px ${op.shadow}` }} />
                        {op.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/20 text-xs">
                    A cor do neon é salva localmente e personaliza seu painel.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
