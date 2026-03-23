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

type DashEstado = 'idle' | 'checando' | 'criando' | 'sucesso' | 'erro';

export default function StoreDashboard({ onVoltar }: { onVoltar: () => void }) {
  const { authenticated, login, user } = usePrivy();
  const { wallets } = useWallets();

  const [loja, setLoja] = useState<StoreInfo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [nomeLoja, setNomeLoja] = useState('');
  const [planoPro, setPlanoPro] = useState(false);
  const [estado, setEstado] = useState<DashEstado>('idle');
  const [erroMsg, setErroMsg] = useState('');
  const [basicFee, setBasicFee] = useState('0.01');
  const [proFee, setProFee] = useState('0.05');

  const enderecoUsuario = wallets[0]?.address;

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
        setLoja({
          storeName: store.storeName,
          expiresAt: store.expiresAt,
          tier: Number(store.tier),
          productCount: store.productCount,
        });
      } catch (err) {
        console.error('Erro ao checar loja:', err);
      } finally {
        setCarregando(false);
      }
    }
    checarLoja();
  }, [enderecoUsuario]);

  async function handleCriarLoja(isPro: boolean) {
    if (!nomeLoja.trim()) { setErroMsg('Digite o nome da sua loja.'); return; }
    const wallet = wallets[0];
    if (!wallet) return;
    setEstado('criando');
    setErroMsg('');
    try {
      await wallet.switchChain(arcTestnet.id);
      const eip1193 = await wallet.getEthereumProvider();
      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const rpcProvider = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
      const contratoLeitura = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);
      const taxa = isPro ? await contratoLeitura.proStoreFee() : await contratoLeitura.basicStoreFee();
      const tx = await contrato.createStore(nomeLoja.trim(), isPro, { value: taxa });
      await tx.wait();
      setEstado('sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErroMsg(msg.length > 160 ? msg.slice(0, 160) + '…' : msg);
      setEstado('erro');
    }
  }

  const lojaAtiva = loja && loja.storeName && loja.storeName.length > 0;
  const expirou = loja && Number(loja.expiresAt) < Date.now() / 1000;

  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto w-full">
      {/* Voltar */}
      <button
        onClick={onVoltar}
        className="mb-8 text-xs text-white/40 hover:text-cyan-400 transition-colors flex items-center gap-2 tracking-widest uppercase"
        style={{ fontFamily: "'Orbitron', sans-serif" }}
      >
        ← Voltar
      </button>

      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-widest uppercase mb-2"
          style={{ fontFamily: "'Orbitron', sans-serif", color: '#00e5ff',
            textShadow: '0 0 30px rgba(0,229,255,0.5)' }}>
          Minha Loja
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
          <button onClick={login}
            className="mt-2 px-6 py-2 rounded-lg text-sm font-bold tracking-widest uppercase
              transition-all hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#00e5ff,#7c3aed)',
              fontFamily: "'Orbitron', sans-serif", color: '#fff', border: 'none' }}>
            Entrar
          </button>
        </div>
      )}

      {/* Carregando */}
      {authenticated && carregando && (
        <div className="flex flex-col items-center py-20 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <p className="text-cyan-400/60 text-sm tracking-widest uppercase"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            Consultando blockchain...
          </p>
        </div>
      )}

      {/* Sucesso */}
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
            className="mt-2 px-6 py-2 rounded-lg text-xs font-bold tracking-widest uppercase border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 transition-all"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            Ver Minha Loja
          </button>
        </div>
      )}

      {/* Loja existente */}
      {authenticated && !carregando && lojaAtiva && estado !== 'sucesso' && (
        <div className="rounded-2xl border border-white/10 p-8 flex flex-col gap-6"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-black tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: '#fff' }}>
                  {loja!.storeName}
                </h2>
                {loja!.tier === 1 && (
                  <span className="text-[10px] font-bold tracking-widest bg-purple-500/20 border border-purple-400/40
                    text-purple-300 px-2 py-0.5 rounded-full"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    ⚡ PRO
                  </span>
                )}
                {loja!.tier === 0 && (
                  <span className="text-[10px] font-bold tracking-widest bg-cyan-500/10 border border-cyan-400/30
                    text-cyan-400 px-2 py-0.5 rounded-full"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    BÁSICO
                  </span>
                )}
              </div>
              <p className="text-white/30 text-xs font-mono">{wallets[0]?.address}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/5 p-4"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-[10px] text-white/30 tracking-widest uppercase mb-1">Produtos</p>
              <p className="text-2xl font-black" style={{ color: '#00e5ff', fontFamily: "'Orbitron', sans-serif" }}>
                {Number(loja!.productCount)}
              </p>
            </div>
            <div className="rounded-xl border border-white/5 p-4"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-[10px] text-white/30 tracking-widest uppercase mb-1">Expira em</p>
              <p className="text-sm font-bold" style={{ color: expirou ? '#f87171' : '#00e5ff',
                fontFamily: "'Orbitron', sans-serif" }}>
                {expirou ? '⚠ Expirado' :
                  new Date(Number(loja!.expiresAt) * 1000).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-3">
            {loja!.tier === 0 && (
              <button
                onClick={async () => {
                  const wallet = wallets[0];
                  if (!wallet) return;
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
                }}
                className="w-full py-3 rounded-xl text-xs font-bold tracking-widest uppercase
                  transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5"
                style={{ fontFamily: "'Orbitron', sans-serif",
                  background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                  color: '#fff', border: 'none' }}>
                ⚡ Fazer Upgrade para PRO — {proFee} ETH
              </button>
            )}
            <button
              onClick={async () => {
                const wallet = wallets[0];
                if (!wallet) return;
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
              }}
              className="w-full py-3 rounded-xl text-xs font-bold tracking-widest uppercase
                transition-all border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10"
              style={{ fontFamily: "'Orbitron', sans-serif" }}>
              ↻ Renovar Assinatura
            </button>
          </div>
        </div>
      )}

      {/* Escolha de Plano — sem loja */}
      {authenticated && !carregando && !lojaAtiva && estado !== 'sucesso' && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-black tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif", color: '#fff' }}>
              Escolha seu Plano
            </h2>
            <p className="text-white/40 text-sm">Crie sua loja on-chain e comece a vender na Arc Testnet.</p>
          </div>

          {/* Nome da loja */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-white/50 tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif" }}>
              Nome da sua loja
            </label>
            <input
              type="text"
              placeholder="Ex: Sneakers Store"
              value={nomeLoja}
              onChange={(e) => setNomeLoja(e.target.value)}
              className="w-full max-w-md px-4 py-3 rounded-xl text-sm text-white outline-none
                border border-white/10 focus:border-cyan-400/50 transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', fontFamily: 'inherit' }}
            />
            {erroMsg && (
              <p className="text-red-400 text-xs mt-1">{erroMsg}</p>
            )}
          </div>

          {/* Cards de plano */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Básico */}
            <div className={`rounded-2xl border p-6 flex flex-col gap-5 transition-all duration-300 cursor-pointer
              ${!planoPro ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.2)]' : 'border-white/10 hover:border-white/20'}`}
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)' }}
              onClick={() => setPlanoPro(false)}>
              <div>
                <p className="text-[10px] text-cyan-400 tracking-widest uppercase mb-1"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}>Plano</p>
                <h3 className="text-xl font-black tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: '#fff' }}>Básico</h3>
              </div>
              <div>
                <p className="text-3xl font-black" style={{ color: '#00e5ff', fontFamily: "'Orbitron', sans-serif" }}>
                  {basicFee}
                  <span className="text-base text-white/40 ml-1 font-normal">ETH</span>
                </p>
                <p className="text-xs text-white/30 mt-0.5">por período</p>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-white/60">
                <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Até 10 produtos</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Vitrine on-chain</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Pagamentos Web3</li>
              </ul>
              <button
                disabled={estado === 'criando'}
                onClick={(e) => { e.stopPropagation(); setPlanoPro(false); handleCriarLoja(false); }}
                className="w-full py-3 rounded-xl text-xs font-bold tracking-widest uppercase
                  transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Orbitron', sans-serif",
                  background: 'linear-gradient(135deg,#00e5ff22,#00e5ff44)',
                  border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff' }}>
                {estado === 'criando' && !planoPro ? '⟳ Processando...' : `Abrir por ${basicFee} ETH`}
              </button>
            </div>

            {/* PRO */}
            <div className={`rounded-2xl border p-6 flex flex-col gap-5 transition-all duration-300 cursor-pointer relative overflow-hidden
              ${planoPro ? 'border-purple-400 shadow-[0_0_25px_rgba(124,58,237,0.3)]' : 'border-white/10 hover:border-white/20'}`}
              style={{ background: 'rgba(124,58,237,0.08)', backdropFilter: 'blur(16px)' }}
              onClick={() => setPlanoPro(true)}>
              <span className="absolute top-3 right-3 text-[10px] font-bold tracking-widest
                bg-purple-500/30 border border-purple-400/50 text-purple-300 px-2 py-0.5 rounded-full"
                style={{ fontFamily: "'Orbitron', sans-serif" }}>
                ⚡ RECOMENDADO
              </span>
              <div>
                <p className="text-[10px] text-purple-400 tracking-widest uppercase mb-1"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}>Plano</p>
                <h3 className="text-xl font-black tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: '#fff' }}>PRO</h3>
              </div>
              <div>
                <p className="text-3xl font-black" style={{ color: '#c084fc', fontFamily: "'Orbitron', sans-serif" }}>
                  {proFee}
                  <span className="text-base text-white/40 ml-1 font-normal">ETH</span>
                </p>
                <p className="text-xs text-white/30 mt-0.5">por período</p>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-white/60">
                <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Produtos ilimitados</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Selo VIP ⚡</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Vitrine on-chain</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Pagamentos Web3</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Rastreamento de entregas</li>
              </ul>
              <button
                disabled={estado === 'criando'}
                onClick={(e) => { e.stopPropagation(); setPlanoPro(true); handleCriarLoja(true); }}
                className="w-full py-3 rounded-xl text-xs font-bold tracking-widest uppercase
                  transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Orbitron', sans-serif",
                  background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                  color: '#fff', border: 'none' }}>
                {estado === 'criando' && planoPro ? '⟳ Processando...' : `Abrir PRO por ${proFee} ETH`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
