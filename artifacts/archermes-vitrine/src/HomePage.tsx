import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy, useWallets, useConnectWallet } from '@privy-io/react-auth';
import { BrowserProvider, Contract, JsonRpcProvider, parseUnits, formatUnits } from 'ethers';
import { arcTestnet } from './chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';
import StoreDashboard from './StoreDashboard';
import './Home.css';

const CATEGORIAS = ['Moda', 'Eletrônicos', 'Perfumes e Beleza', 'Games', 'Casa', 'Outros'];

interface ItemBlockchain {
  id: number;
  itemName: string;
  priceEth: string;
  category: string;
  seller: string;
}

interface LojaVip {
  address: string;
  storeName: string;
  productCount: number;
  tier: number;
}

interface FormData {
  nomeItem: string;
  preco: string;
  categoria: string;
}

type Estado = 'idle' | 'enviando' | 'sucesso' | 'erro' | 'sem-carteira';
type Pagina = 'home' | 'minha-loja';

function abreviarEndereco(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function handleTilt(e: React.MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const rX = (y - 0.5) * -18;
  const rY = (x - 0.5) * 18;
  const sX = rY * -0.6;
  const sY = Math.abs(rX) * 0.3;
  el.style.transform = `perspective(700px) rotateX(${rX}deg) rotateY(${rY}deg) translateY(-6px)`;
  el.style.boxShadow = `${sX}px ${sY}px 28px rgba(0,229,255,0.22), 0 0 20px rgba(0,229,255,0.08)`;
}

function resetTilt(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.transform = '';
  e.currentTarget.style.boxShadow = '';
}

function handleTiltPro(e: React.MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const rX = (y - 0.5) * -18;
  const rY = (x - 0.5) * 18;
  const sX = rY * -0.6;
  const sY = Math.abs(rX) * 0.3;
  el.style.transform = `perspective(700px) rotateX(${rX}deg) rotateY(${rY}deg) translateY(-6px)`;
  el.style.boxShadow = `${sX}px ${sY}px 28px rgba(251,191,36,0.3), 0 0 30px rgba(192,132,252,0.2)`;
}

export default function HomePage() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { connectWallet } = useConnectWallet();

  const [pagina, setPagina] = useState<Pagina>('home');
  const [modalAberto, setModalAberto] = useState(false);
  const [estado, setEstado] = useState<Estado>('idle');
  const [txHash, setTxHash] = useState('');
  const [erroMsg, setErroMsg] = useState('');
  const [form, setForm] = useState<FormData>({ nomeItem: '', preco: '', categoria: CATEGORIAS[0] });

  const [vitrine, setVitrine] = useState<ItemBlockchain[]>([]);
  const [lojasVip, setLojasVip] = useState<LojaVip[]>([]);
  const [sellersPro, setSellersPro] = useState<Set<string>>(new Set());
  const [carregandoVitrine, setCarregandoVitrine] = useState(true);
  const [erroVitrine, setErroVitrine] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const carrosselRef = useRef<HTMLDivElement>(null);

  const carregarVitrine = useCallback(async () => {
    setCarregandoVitrine(true);
    setErroVitrine('');
    try {
      const provider = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const total: bigint = await contrato.totalItems();
      const itens: ItemBlockchain[] = [];
      for (let i = 1; i <= Number(total); i++) {
        const item = await contrato.items(i);
        if (!item.isSold && item.isActive) {
          itens.push({
            id: Number(item.id),
            itemName: item.itemName,
            priceEth: formatUnits(item.price, 18),
            category: item.category,
            seller: item.seller,
          });
        }
      }
      setVitrine(itens);

      // Buscar lojas dos vendedores únicos
      const uniqueSellers = [...new Set(itens.map((i) => i.seller.toLowerCase()))];
      if (uniqueSellers.length > 0) {
        const storeResults = await Promise.all(
          uniqueSellers.map((addr) => contrato.stores(addr).catch(() => null))
        );
        const proSet = new Set<string>();
        const vipList: LojaVip[] = [];
        storeResults.forEach((s, idx) => {
          if (!s) return;
          const tier = Number(s.tier);
          if (tier === 1 && s.storeName) {
            proSet.add(uniqueSellers[idx].toLowerCase());
            vipList.push({
              address: uniqueSellers[idx],
              storeName: s.storeName,
              productCount: Number(s.productCount),
              tier,
            });
          }
        });
        setSellersPro(proSet);
        setLojasVip(vipList);
      }
    } catch (err) {
      console.error('Erro ao carregar vitrine:', err);
      setErroVitrine('Não foi possível carregar os produtos.');
    } finally {
      setCarregandoVitrine(false);
    }
  }, []);

  useEffect(() => { carregarVitrine(); }, [carregarVitrine]);

  function abrirModal() {
    setEstado('idle'); setTxHash(''); setErroMsg('');
    setForm({ nomeItem: '', preco: '', categoria: CATEGORIAS[0] });
    setModalAberto(true);
  }
  function fecharModal() { setModalAberto(false); setEstado('idle'); }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handlePublicar(e: React.FormEvent) {
    e.preventDefault();
    setEstado('enviando'); setErroMsg('');
    try {
      const wallet = wallets[0];
      if (!wallet) { setEstado('sem-carteira'); return; }
      await wallet.switchChain(arcTestnet.id);
      const eip1193 = await wallet.getEthereumProvider();
      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const precoWei = parseUnits(form.preco, 18);
      const tx = await contrato.listItem(form.nomeItem, precoWei, form.categoria);
      await tx.wait();
      setTxHash(tx.hash);
      setEstado('sucesso');
      carregarVitrine();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErroMsg(msg.length > 140 ? msg.slice(0, 140) + '…' : msg);
      setEstado('erro');
    }
  }

  const vitrineVisivel = filtroCategoria === 'Todos'
    ? vitrine : vitrine.filter((i) => i.category === filtroCategoria);

  if (pagina === 'minha-loja') {
    return (
      <div className="container-principal">
        <header className="cabecalho">
          <div className="logo-wrapper">
            <img src="/images/logo-ahs.png" alt="ARCHERMES" className="logo-img" />
            <span className="logo-texto">ARCHERMES</span>
          </div>
          <div className="acoes-header">
            <button onClick={() => setPagina('home')} className="btn-entrar">← Início</button>
            {authenticated && <button onClick={() => logout()} className="btn-sair">Sair</button>}
          </div>
        </header>
        <StoreDashboard onVoltar={() => setPagina('home')} />
      </div>
    );
  }

  return (
    <div className="container-principal">
      {/* ── HEADER ── */}
      <header className="cabecalho">
        <div className="logo-wrapper">
          <img src="/images/logo-ahs.png" alt="ARCHERMES" className="logo-img" />
          <span className="logo-texto">ARCHERMES</span>
        </div>
        {!authenticated ? (
          <div className="acoes-header">
            <button onClick={() => setPagina('minha-loja')} className="btn-entrar">Minha Loja</button>
            <button onClick={login} className="btn-entrar">Entrar</button>
            <button onClick={login} className="btn-login">Criar Minha Loja</button>
          </div>
        ) : (
          <div className="painel-usuario">
            <span style={{ fontSize: '0.82rem' }}>
              {user?.email ? user.email.address : abreviarEndereco(wallets[0]?.address ?? '0x...')}
            </span>
            <button onClick={() => setPagina('minha-loja')} className="btn-entrar">⬡ Minha Loja</button>
            <button onClick={abrirModal} className="btn-anunciar">+ Anunciar</button>
            <button onClick={() => logout()} className="btn-sair">Sair</button>
          </div>
        )}
      </header>

      {/* ── LOJAS VIP EM DESTAQUE ── */}
      {lojasVip.length > 0 && (
        <section className="px-6 pt-8 pb-2 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-lg" style={{ filter: 'drop-shadow(0 0 8px #fbbf24)' }}>⚡</span>
            <h2 className="text-base font-black tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif", color: '#fbbf24',
                textShadow: '0 0 16px rgba(251,191,36,0.5)' }}>
              Lojas em Destaque
            </h2>
            <span className="text-[10px] text-white/30 tracking-widest font-mono ml-1">
              VIP PRO MEMBERS
            </span>
          </div>
          <div
            ref={carrosselRef}
            className="flex gap-4 overflow-x-auto pb-3 scroll-oculto"
            style={{ scrollBehavior: 'smooth' }}
          >
            {lojasVip.map((loja) => (
              <div key={loja.address} className="loja-vip-card">
                <div className="loja-vip-avatar">⬡</div>
                <div className="flex flex-col items-center gap-1">
                  <span className="loja-vip-nome">{loja.storeName}</span>
                  <span className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(192,132,252,0.15)', color: '#c084fc',
                      fontFamily: "'Orbitron', sans-serif", border: '1px solid rgba(192,132,252,0.3)' }}>
                    ⚡ VIP PRO
                  </span>
                  <span className="text-[10px] text-white/30 mt-0.5">
                    {loja.productCount} produto{loja.productCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-6" />
        </section>
      )}

      {/* ── VITRINE DINÂMICA ── */}
      <section className="px-6 py-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif", color: '#00e5ff',
                textShadow: '0 0 20px rgba(0,229,255,0.5)' }}>
              ⬡ Vitrine On-Chain
            </h2>
            <p className="text-white/40 text-sm mt-1 tracking-wide">
              Produtos registrados na Arc Testnet em tempo real
            </p>
          </div>
          <button onClick={carregarVitrine}
            className="text-xs text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-md
              hover:bg-cyan-400/10 transition-all duration-200 tracking-widest uppercase"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            ↻ Atualizar
          </button>
        </div>

        {/* Filtro */}
        {vitrine.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {['Todos', ...CATEGORIAS].map((cat) => (
              <button key={cat} onClick={() => setFiltroCategoria(cat)}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition-all duration-200
                  tracking-widest uppercase ${filtroCategoria === cat
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                    : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'}`}
                style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {carregandoVitrine && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <p className="text-cyan-400/60 text-sm tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif" }}>
              Sincronizando com a blockchain...
            </p>
          </div>
        )}

        {!carregandoVitrine && erroVitrine && (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-3xl">⚠️</span>
            <p className="text-red-400 text-sm">{erroVitrine}</p>
            <button onClick={carregarVitrine} className="text-xs text-cyan-400 underline mt-1">
              Tentar novamente
            </button>
          </div>
        )}

        {!carregandoVitrine && !erroVitrine && vitrineVisivel.length === 0 && (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="text-5xl opacity-30">⬡</div>
            <p className="text-white/30 text-sm tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif" }}>
              Nenhum produto encontrado
            </p>
            {authenticated && (
              <button onClick={abrirModal}
                className="mt-2 text-xs text-cyan-400 border border-cyan-400/30 px-4 py-2 rounded-lg
                  hover:bg-cyan-400/10 transition-all duration-200">
                + Anunciar o primeiro produto
              </button>
            )}
          </div>
        )}

        {!carregandoVitrine && vitrineVisivel.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {vitrineVisivel.map((item) => {
              const isPro = sellersPro.has(item.seller.toLowerCase());
              const cardInner = (
                <div
                  key={isPro ? undefined : item.id}
                  className="card-produto group relative rounded-2xl border p-5 flex flex-col gap-4 cursor-default"
                  style={{
                    background: isPro
                      ? 'linear-gradient(145deg,rgba(124,58,237,0.12),rgba(10,13,26,0.96))'
                      : 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: isPro ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '1rem',
                  }}
                  onMouseMove={isPro ? handleTiltPro : handleTilt}
                  onMouseLeave={resetTilt}
                >
                  {/* Categoria */}
                  {item.category && (
                    <span className="absolute top-3 left-3 text-[9px] font-bold tracking-widest
                      bg-white/5 border border-white/10 text-white/40 px-2 py-0.5 rounded-full"
                      style={{ fontFamily: "'Orbitron', sans-serif" }}>
                      {item.category}
                    </span>
                  )}

                  {/* Badge PRO */}
                  {isPro && (
                    <span className="absolute top-3 right-3 text-[9px] font-bold tracking-widest
                      px-2 py-0.5 rounded-full"
                      style={{ fontFamily: "'Orbitron', sans-serif",
                        background: 'rgba(251,191,36,0.15)',
                        border: '1px solid rgba(251,191,36,0.4)',
                        color: '#fbbf24',
                        textShadow: '0 0 8px rgba(251,191,36,0.5)' }}>
                      ⚡ VIP
                    </span>
                  )}

                  {/* Imagem placeholder */}
                  <div className={`w-full h-32 rounded-xl flex items-center justify-center
                    border border-white/5 transition-all duration-300
                    ${isPro
                      ? 'bg-gradient-to-br from-yellow-500/10 to-purple-600/15 group-hover:from-yellow-500/20'
                      : 'bg-gradient-to-br from-cyan-500/10 to-purple-600/10 group-hover:from-cyan-500/20'}`}>
                    <span className="text-4xl opacity-40">⬡</span>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-1 flex-1">
                    <h3 className="font-bold text-white leading-tight line-clamp-2"
                      style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem',
                        letterSpacing: '0.05em',
                        textShadow: isPro ? '0 0 10px rgba(251,191,36,0.3)' : 'none' }}>
                      {item.itemName}
                    </h3>
                    <p className="text-white/30 text-[11px] tracking-wide font-mono">
                      {abreviarEndereco(item.seller)}
                    </p>
                  </div>

                  {/* Preço */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-white/30 tracking-widest uppercase mb-0.5">Preço</p>
                      <p className="text-lg font-black"
                        style={{
                          color: isPro ? '#fbbf24' : '#00e5ff',
                          fontFamily: "'Orbitron', sans-serif",
                          textShadow: isPro
                            ? '0 0 12px rgba(251,191,36,0.5)'
                            : '0 0 12px rgba(0,229,255,0.4)',
                        }}>
                        {parseFloat(item.priceEth).toFixed(4)}
                        <span className="text-xs text-white/40 ml-1 font-normal">ETH</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-white/20 font-mono">#{item.id}</span>
                  </div>

                  {/* Botão */}
                  <button
                    className="w-full py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase
                      transition-all duration-300 active:scale-95"
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      background: isPro
                        ? 'linear-gradient(135deg,rgba(251,191,36,0.15),rgba(192,132,252,0.2))'
                        : 'linear-gradient(135deg,#00e5ff22,#7c3aed44)',
                      border: isPro
                        ? '1px solid rgba(251,191,36,0.35)'
                        : '1px solid rgba(0,229,255,0.3)',
                      color: isPro ? '#fbbf24' : '#00e5ff',
                    }}
                    onClick={() => !authenticated && login()}
                  >
                    {authenticated ? '⚡ Comprar Agora' : '🔒 Entrar para Comprar'}
                  </button>
                </div>
              );

              if (isPro) {
                return (
                  <div key={item.id} className="pro-card-wrapper">
                    {cardInner}
                  </div>
                );
              }
              return cardInner;
            })}
          </div>
        )}
      </section>

      {/* ── CATEGORIAS ── */}
      <section className="area-nichos">
        <h2>Explore por Categorias</h2>
        <div className="grid-categorias">
          {[['👕','Moda'],['📱','Eletrônicos'],['💧','Perfumes e Beleza'],['🎮','Games']].map(([icone, nome]) => (
            <button key={nome} className="btn-nicho" onClick={() => setFiltroCategoria(nome)}>
              <span className="icone">{icone}</span> {nome}
            </button>
          ))}
        </div>
      </section>

      {/* ── MODAL ── */}
      {modalAberto && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-fechar" onClick={fecharModal} aria-label="Fechar">✕</button>

            {estado === 'sem-carteira' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone" style={{ color: '#f59e0b' }}>⚠</div>
                <h2>Carteira não encontrada</h2>
                <p>Conecte uma carteira para publicar na blockchain.</p>
                <button className="btn-publicar" onClick={() => { connectWallet(); setEstado('idle'); }}>
                  Conectar Carteira
                </button>
                <button className="btn-sair" style={{ marginTop: '0.5rem', width: '100%' }}
                  onClick={() => setEstado('idle')}>Voltar</button>
              </div>
            )}

            {(estado === 'idle' || estado === 'erro') && (
              <>
                <div className="modal-topo">
                  <span className="modal-icone">⬡</span>
                  <h2>Anunciar Produto</h2>
                  <p>Preencha os dados do item para publicar no marketplace</p>
                </div>
                <form className="modal-form" onSubmit={handlePublicar}>
                  <div className="campo">
                    <label htmlFor="nomeItem">Nome do Item</label>
                    <input id="nomeItem" name="nomeItem" type="text"
                      placeholder="Ex: Tênis Air Max Limited"
                      value={form.nomeItem} onChange={handleChange} required autoComplete="off" />
                  </div>
                  <div className="campo">
                    <label htmlFor="preco">Preço (ETH)</label>
                    <input id="preco" name="preco" type="number" placeholder="Ex: 0.05"
                      step="0.000000000000000001" min="0"
                      value={form.preco} onChange={handleChange} required />
                  </div>
                  <div className="campo">
                    <label htmlFor="categoria">Categoria</label>
                    <select id="categoria" name="categoria" value={form.categoria} onChange={handleChange}
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#fff',
                        border: '1px solid rgba(0,229,255,0.18)', borderRadius: '8px',
                        padding: '0.65rem 1rem', width: '100%', fontSize: '0.9rem', outline: 'none' }}>
                      {CATEGORIAS.map((c) => <option key={c} value={c} style={{ background: '#0c1022' }}>{c}</option>)}
                    </select>
                  </div>
                  {estado === 'erro' && <div className="modal-erro">⚠️ {erroMsg}</div>}
                  <button type="submit" className="btn-publicar">🚀 Publicar no Marketplace</button>
                </form>
              </>
            )}

            {estado === 'enviando' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone spinner">⟳</div>
                <h2>Aguardando confirmação...</h2>
                <p>A carteira vai pedir sua autorização.<br />Confirme a transação para continuar.</p>
              </div>
            )}

            {estado === 'sucesso' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone">✓</div>
                <h2>Produto postado na Blockchain!</h2>
                <p><strong>{form.nomeItem}</strong> foi listado com sucesso.</p>
                {txHash && (
                  <p className="contrato-info">
                    TX: <code title={txHash}>{txHash.slice(0, 12)}…{txHash.slice(-6)}</code>
                  </p>
                )}
                <button onClick={fecharModal} className="btn-publicar">Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
