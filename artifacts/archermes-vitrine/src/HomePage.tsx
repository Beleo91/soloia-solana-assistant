import { useState, useEffect, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import { usePrivy, useWallets, useConnectWallet } from '@privy-io/react-auth';
import { BrowserProvider, Contract, JsonRpcProvider, parseUnits, formatUnits } from 'ethers';
import { arcTestnet } from './chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';
import {
  STABLECOIN_ADDRESSES, STABLECOIN_META,
  approveERC20, transferERC20, toTokenAmount,
  formatStablecoinPrice, type StablecoinSymbol,
} from './stablecoins';
import StoreDashboard from './StoreDashboard';
import AffiliateDashboard from './AffiliateDashboard';
import './Home.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const CATEGORIAS = ['Moda', 'Eletrônicos', 'Perfumes e Beleza', 'Games', 'Casa', 'Outros'];

type Moeda = 'ETH' | StablecoinSymbol;

interface ItemBlockchain {
  id: number;
  itemName: string;
  priceEth: string;
  category: string;
  seller: string;
  images?: string[];
  currency?: Moeda;
}

const MOCK_ITEM_CURRENCY: Record<number, StablecoinSymbol> = {
  1: 'USDC',
  2: 'EURC',
};

const MOCK_ITEM_IMAGES: Record<number, string[]> = {
  1: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop',
  ],
};

interface LojaParceiraMock {
  id: string;
  nome: string;
  cor: string;
  corSombra: string;
  banner: string;
  logo: string;
  produtos: string[];
}

interface ProdutoImpulsionado {
  id: number;
  itemName: string;
  priceEth: string;
  category: string;
  currency: Moeda;
  image: string;
  destaque: 'ouro' | 'roxo';
}

const MOCK_LOJAS_PARCEIRAS: LojaParceiraMock[] = [
  {
    id: 'nike-drop',
    nome: 'Nike Drop Zone',
    cor: '#00e5ff',
    corSombra: 'rgba(0,229,255,0.4)',
    banner: 'https://images.unsplash.com/photo-1556906781-9a9bf1b3a9cc?w=400&h=100&fit=crop',
    logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop&crop=center',
    produtos: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1579338559194-a162d19bf842?w=120&h=120&fit=crop',
    ],
  },
  {
    id: 'techvault',
    nome: 'TechVault',
    cor: '#c084fc',
    corSombra: 'rgba(192,132,252,0.4)',
    banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=100&fit=crop',
    logo: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=80&h=80&fit=crop&crop=center',
    produtos: [
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1526406915894-7bcd65f60845?w=120&h=120&fit=crop',
    ],
  },
  {
    id: 'neonfit',
    nome: 'NeonFit',
    cor: '#4ade80',
    corSombra: 'rgba(74,222,128,0.4)',
    banner: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=100&fit=crop',
    logo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=80&h=80&fit=crop&crop=center',
    produtos: [
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=120&h=120&fit=crop',
    ],
  },
  {
    id: 'galaxy-games',
    nome: 'Galaxy Games',
    cor: '#fb923c',
    corSombra: 'rgba(251,146,60,0.4)',
    banner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=100&fit=crop',
    logo: 'https://images.unsplash.com/photo-1486572788966-cfd3df1f5b42?w=80&h=80&fit=crop&crop=center',
    produtos: [
      'https://images.unsplash.com/photo-1486572788966-cfd3df1f5b42?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1563396983906-b3795482a59a?w=120&h=120&fit=crop',
    ],
  },
  {
    id: 'cyber-beauty',
    nome: 'Cyber Beauty',
    cor: '#f472b6',
    corSombra: 'rgba(244,114,182,0.4)',
    banner: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=100&fit=crop',
    logo: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=80&h=80&fit=crop&crop=center',
    produtos: [
      'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=120&h=120&fit=crop',
      'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=120&h=120&fit=crop',
    ],
  },
];

const MOCK_IMPULSIONADOS: ProdutoImpulsionado[] = [
  {
    id: 201,
    itemName: 'Air Boost X Pro',
    priceEth: '0.08',
    category: 'Moda',
    currency: 'USDC',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=260&fit=crop',
    destaque: 'ouro',
  },
  {
    id: 202,
    itemName: 'HyperPod XS Elite',
    priceEth: '0.12',
    category: 'Eletrônicos',
    currency: 'ETH',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=260&fit=crop',
    destaque: 'roxo',
  },
  {
    id: 203,
    itemName: 'Cyber Perfume N°7',
    priceEth: '45.00',
    category: 'Perfumes e Beleza',
    currency: 'EURC',
    image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&h=260&fit=crop',
    destaque: 'ouro',
  },
  {
    id: 204,
    itemName: 'Neo Jacket Stealth',
    priceEth: '0.15',
    category: 'Moda',
    currency: 'ETH',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=260&fit=crop',
    destaque: 'roxo',
  },
];

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
type BuyEstado = 'idle' | 'confirmando' | 'sucesso' | 'erro';
type Pagina = 'home' | 'minha-loja' | 'afiliado';

function abreviarEndereco(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function lerRefDaUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') ?? '';
    if (ref.startsWith('0x') && ref.length === 42) return ref;
  } catch { /* ignore */ }
  return ZERO_ADDRESS;
}

function handleTilt(e: React.MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const rX = (y - 0.5) * -18;
  const rY = (x - 0.5) * 18;
  el.style.transform = `perspective(700px) rotateX(${rX}deg) rotateY(${rY}deg) translateY(-6px)`;
  el.style.boxShadow = `${rY * -0.6}px ${Math.abs(rX) * 0.3}px 28px rgba(0,229,255,0.22)`;
}

function handleTiltPro(e: React.MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const rX = (y - 0.5) * -18;
  const rY = (x - 0.5) * 18;
  el.style.transform = `perspective(700px) rotateX(${rX}deg) rotateY(${rY}deg) translateY(-6px)`;
  el.style.boxShadow = `${rY * -0.6}px ${Math.abs(rX) * 0.3}px 28px rgba(251,191,36,0.3)`;
}

function resetTilt(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.transform = '';
  e.currentTarget.style.boxShadow = '';
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

  // Vitrine
  const [vitrine, setVitrine] = useState<ItemBlockchain[]>([]);
  const [lojasVip, setLojasVip] = useState<LojaVip[]>([]);
  const [sellersPro, setSellersPro] = useState<Set<string>>(new Set());
  const [carregandoVitrine, setCarregandoVitrine] = useState(true);
  const [erroVitrine, setErroVitrine] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const carrosselRef = useRef<HTMLDivElement>(null);

  const [selectedImages, setSelectedImages] = useState<Record<number, number>>({});

  // Upload de imagens no modal
  const [formImages, setFormImages] = useState<File[]>([]);
  const [formImagesBase64, setFormImagesBase64] = useState<string[]>([]);
  const [convertingImages, setConvertingImages] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const newFiles = Array.from(incoming).filter(
      (f) => !formImages.find((e) => e.name === f.name && e.size === f.size)
    );
    if (newFiles.length === 0) return;
    setConvertingImages(true);
    try {
      const base64s = await Promise.all(newFiles.map(fileToBase64));
      setFormImages((prev) => [...prev, ...newFiles]);
      setFormImagesBase64((prev) => [...prev, ...base64s]);
    } finally {
      setConvertingImages(false);
    }
  }

  function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    void addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    void addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleRemoveFormImage(idx: number) {
    setFormImages((prev) => prev.filter((_, i) => i !== idx));
    setFormImagesBase64((prev) => prev.filter((_, i) => i !== idx));
  }

  function setCardImage(itemId: number, idx: number) {
    setSelectedImages((prev) => ({ ...prev, [itemId]: idx }));
  }

  // Afiliado / Compra
  const [refAddress] = useState<string>(() => lerRefDaUrl());
  const [itemParaComprar, setItemParaComprar] = useState<ItemBlockchain | null>(null);
  const [buyEstado, setBuyEstado] = useState<BuyEstado>('idle');
  const [buyErro, setBuyErro] = useState('');
  const [buyTx, setBuyTx] = useState('');

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
          const id = Number(item.id);
          let images: string[] | undefined = MOCK_ITEM_IMAGES[id];
          try {
            const saved = localStorage.getItem(`archermes_item_images_${id}`);
            if (saved) images = JSON.parse(saved) as string[];
          } catch { /* ignore */ }
          itens.push({
            id,
            itemName: item.itemName,
            priceEth: formatUnits(item.price, 18),
            category: item.category,
            seller: item.seller,
            images,
            currency: MOCK_ITEM_CURRENCY[id] ?? 'ETH',
          });
        }
      }
      setVitrine(itens);

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
            vipList.push({ address: uniqueSellers[idx], storeName: s.storeName, productCount: Number(s.productCount), tier });
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
    setFormImages([]); setFormImagesBase64([]);
    setModalAberto(true);
  }
  function fecharModal() { setModalAberto(false); setEstado('idle'); setFormImages([]); setFormImagesBase64([]); }

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
      // Salvar imagens no localStorage keyed pelo novo ID do item
      if (formImagesBase64.length > 0) {
        try {
          const newTotal: bigint = await contrato.totalItems();
          const newId = Number(newTotal);
          localStorage.setItem(`archermes_item_images_${newId}`, JSON.stringify(formImagesBase64));
        } catch { /* ignore */ }
      }
      setTxHash(tx.hash);
      setEstado('sucesso');
      carregarVitrine();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErroMsg(msg.length > 140 ? msg.slice(0, 140) + '…' : msg);
      setEstado('erro');
    }
  }

  // ── COMPRA ──
  function abrirCompra(item: ItemBlockchain) {
    if (!authenticated) { login(); return; }
    setItemParaComprar(item);
    setBuyEstado('idle');
    setBuyErro('');
    setBuyTx('');
  }

  async function confirmarCompra() {
    if (!itemParaComprar) return;
    const wallet = wallets[0];
    if (!wallet) { setBuyEstado('erro'); setBuyErro('Conecte uma carteira para comprar.'); return; }
    setBuyEstado('confirmando');
    const currency = itemParaComprar.currency ?? 'ETH';
    try {
      await wallet.switchChain(arcTestnet.id);
      const eip1193 = await wallet.getEthereumProvider();
      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();

      if (currency === 'ETH') {
        const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        const priceWei = parseUnits(itemParaComprar.priceEth, 18);
        const referrer = refAddress !== ZERO_ADDRESS ? refAddress : ZERO_ADDRESS;
        const tx = await contrato.buyItem(itemParaComprar.id, referrer, { value: priceWei });
        await tx.wait();
        setBuyTx(tx.hash);
      } else {
        // ── ERC-20 flow (USDC / EURC) ──────────────────────────────────────────
        const tokenAddress = STABLECOIN_ADDRESSES[currency];
        const amount = toTokenAmount(itemParaComprar.priceEth, currency);
        // Step 1: approve the marketplace contract to spend the tokens
        const approveTx = await approveERC20(signer, tokenAddress, CONTRACT_ADDRESS, amount);
        await approveTx.wait();
        // Step 2: direct transfer to seller (placeholder until contract supports ERC-20)
        const transferTx = await transferERC20(signer, tokenAddress, itemParaComprar.seller, amount);
        await transferTx.wait();
        setBuyTx(transferTx.hash);
      }

      setBuyEstado('sucesso');
      carregarVitrine();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBuyErro(msg.length > 140 ? msg.slice(0, 140) + '…' : msg);
      setBuyEstado('erro');
    }
  }

  const vitrineVisivel = filtroCategoria === 'Todos'
    ? vitrine : vitrine.filter((i) => i.category === filtroCategoria);

  // ── PÁGINA SECUNDÁRIA ──
  if (pagina !== 'home') {
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
        {pagina === 'minha-loja' && <StoreDashboard onVoltar={() => setPagina('home')} />}
        {pagina === 'afiliado' && <AffiliateDashboard onVoltar={() => setPagina('home')} />}
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
            <button onClick={() => setPagina('afiliado')} className="btn-entrar"
              style={{ borderColor: 'rgba(74,222,128,0.5)', color: '#4ade80' }}>
              🔗 Afiliar
            </button>
            <button onClick={() => setPagina('minha-loja')} className="btn-entrar">Minha Loja</button>
            <button onClick={login} className="btn-entrar">Entrar</button>
            <button onClick={login} className="btn-login">Criar Minha Loja</button>
          </div>
        ) : (
          <div className="painel-usuario">
            <span style={{ fontSize: '0.82rem' }}>
              {user?.email ? user.email.address : abreviarEndereco(wallets[0]?.address ?? '0x...')}
            </span>
            <button onClick={() => setPagina('afiliado')} className="btn-entrar"
              style={{ borderColor: 'rgba(74,222,128,0.5)', color: '#4ade80', fontSize: '0.7rem' }}>
              🔗 Afiliar
            </button>
            <button onClick={() => setPagina('minha-loja')} className="btn-entrar">⬡ Minha Loja</button>
            <button onClick={abrirModal} className="btn-anunciar">+ Anunciar</button>
            <button onClick={() => logout()} className="btn-sair">Sair</button>
          </div>
        )}
      </header>

      {/* Banner de ref ativo */}
      {refAddress !== ZERO_ADDRESS && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 text-xs"
          style={{ background: 'rgba(74,222,128,0.08)', borderBottom: '1px solid rgba(74,222,128,0.15)',
            color: '#4ade80', fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.05em' }}>
          <span>🔗</span>
          <span>Link de afiliado ativo: {abreviarEndereco(refAddress)}</span>
          <span className="text-white/20">— 1% da comissão vai para o divulgador</span>
        </div>
      )}

      {/* ── LOJAS VIP ── */}
      {lojasVip.length > 0 && (
        <section className="vitrine-container" style={{ paddingTop: '2rem', paddingBottom: '0.5rem' }}>
          <div className="flex items-center gap-3 mb-5">
            <span className="text-lg" style={{ filter: 'drop-shadow(0 0 8px #fbbf24)' }}>⚡</span>
            <h2 className="text-base font-black tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif", color: '#fbbf24',
                textShadow: '0 0 16px rgba(251,191,36,0.5)' }}>
              Lojas em Destaque
            </h2>
            <span className="text-[10px] text-white/30 tracking-widest font-mono ml-1">VIP PRO MEMBERS</span>
          </div>
          <div ref={carrosselRef} className="flex gap-4 overflow-x-auto pb-3 scroll-oculto">
            {lojasVip.map((loja) => (
              <div key={loja.address} className="loja-vip-card">
                <div className="loja-vip-avatar">⬡</div>
                <div className="flex flex-col items-center gap-1">
                  <span className="loja-vip-nome">{loja.storeName}</span>
                  <span className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full"
                    style={{ fontFamily: "'Orbitron', sans-serif",
                      background: 'rgba(192,132,252,0.15)', color: '#c084fc',
                      border: '1px solid rgba(192,132,252,0.3)' }}>
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

      {/* ── LOJAS PARCEIRAS ── */}
      <section className="vitrine-container" style={{ paddingTop: '2.5rem', paddingBottom: '0' }}>
        <div className="flex items-center gap-3 mb-6">
          <span style={{ fontSize: '1.1rem', filter: 'drop-shadow(0 0 8px #00e5ff)' }}>⬡</span>
          <div>
            <h2 className="text-xl font-black tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif", color: '#00e5ff',
                textShadow: '0 0 20px rgba(0,229,255,0.5)' }}>
              Lojas Parceiras
            </h2>
            <p className="text-white/30 text-xs tracking-wide mt-0.5">
              Marketplaces verificadas na Arc Testnet
            </p>
          </div>
        </div>
        <div className="parceiras-scroll">
          {MOCK_LOJAS_PARCEIRAS.map((loja) => (
            <div key={loja.id} className="parceira-card"
              style={{ borderColor: loja.cor + '30' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 28px ${loja.corSombra}`;
                (e.currentTarget as HTMLDivElement).style.borderColor = loja.cor + '66';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                (e.currentTarget as HTMLDivElement).style.borderColor = loja.cor + '30';
              }}>

              {/* Banner */}
              <img src={loja.banner} alt="" className="parceira-banner" loading="lazy" />

              {/* Logo overlapping banner */}
              <div className="parceira-logo-area">
                <div className="parceira-logo-wrap" style={{
                  borderColor: loja.cor,
                  boxShadow: `0 0 14px ${loja.corSombra}`,
                }}>
                  <img src={loja.logo} alt={loja.nome} className="parceira-logo-img" loading="lazy" />
                </div>
                <span className="parceira-nome" style={{ color: loja.cor }}>
                  {loja.nome}
                </span>
              </div>

              {/* Products grid */}
              <div className="parceira-body">
                <div className="parceira-mini-grid">
                  {loja.produtos.map((img, i) => (
                    <img key={i} src={img} alt="" className="parceira-thumb" loading="lazy" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-8" />
      </section>

      {/* ── PRODUTOS IMPULSIONADOS ── */}
      <section className="vitrine-container" style={{ paddingTop: '2.5rem', paddingBottom: '0' }}>
        <div className="flex items-center gap-3 mb-6">
          <span style={{ fontSize: '1.1rem', filter: 'drop-shadow(0 0 8px #fbbf24)' }}>⚡</span>
          <div>
            <h2 className="text-xl font-black tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif", color: '#fbbf24',
                textShadow: '0 0 20px rgba(251,191,36,0.5)' }}>
              Produtos Impulsionados
            </h2>
            <p className="text-white/30 text-xs tracking-wide mt-0.5">
              Destaques selecionados nesta semana
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {MOCK_IMPULSIONADOS.map((item) => {
            const isOuro = item.destaque === 'ouro';
            const corBorda = isOuro ? '#fbbf24' : '#c084fc';
            const corSombra = isOuro ? 'rgba(251,191,36,0.35)' : 'rgba(192,132,252,0.35)';
            const fundoCard = isOuro
              ? 'linear-gradient(145deg,rgba(251,191,36,0.10),rgba(10,13,26,0.96))'
              : 'linear-gradient(145deg,rgba(124,58,237,0.14),rgba(10,13,26,0.96))';
            const curMeta = item.currency !== 'ETH' ? STABLECOIN_META[item.currency as StablecoinSymbol] : null;
            const priceDisplay = curMeta
              ? formatStablecoinPrice(item.priceEth, item.currency as StablecoinSymbol)
              : parseFloat(item.priceEth).toFixed(4);
            return (
              <div key={item.id} className="card-impulsionado"
                style={{ background: fundoCard, borderColor: corBorda,
                  boxShadow: `0 0 20px ${corSombra}, 0 0 1px ${corBorda}` }}>
                <span className="badge-impulsionado"
                  style={{ color: corBorda, borderColor: corBorda + '55',
                    background: corBorda + '18',
                    boxShadow: `0 0 8px ${corSombra}` }}>
                  ⚡ IMPULSIONADO
                </span>
                <div className="impulsionado-img-wrap">
                  <img src={item.image} alt={item.itemName} className="impulsionado-img" loading="lazy" />
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  <span className="text-[9px] text-white/30 tracking-widest uppercase"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    {item.category}
                  </span>
                  <h3 className="font-black text-sm text-white leading-tight"
                    style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.04em' }}>
                    {item.itemName}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-base"
                      style={{ fontFamily: "'Orbitron', sans-serif", color: corBorda,
                        textShadow: `0 0 10px ${corSombra}` }}>
                      {priceDisplay}
                      {item.currency === 'ETH' && (
                        <span className="text-xs text-white/30 ml-1 font-normal">ETH</span>
                      )}
                    </span>
                    {curMeta && (
                      <span className="currency-badge" style={{
                        color: curMeta.cor, background: curMeta.corFundo, borderColor: curMeta.cor + '55',
                      }}>
                        {item.currency}
                      </span>
                    )}
                  </div>
                  <button className="btn-neon btn-neon-full btn-neon-sm mt-1"
                    style={{ borderColor: corBorda + '55', color: corBorda,
                      background: corBorda + '12' }}
                    onClick={() => login()}>
                    🔒 Entrar para comprar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* ── VITRINE ── */}
      <section className="vitrine-container">
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
            <button onClick={carregarVitrine} className="text-xs text-cyan-400 underline mt-1">Tentar novamente</button>
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
                  className="card-produto group relative rounded-2xl p-5 flex flex-col gap-4"
                  style={{
                    background: isPro
                      ? 'linear-gradient(145deg,rgba(124,58,237,0.12),rgba(10,13,26,0.96))'
                      : 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(16px)',
                    border: isPro ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '1rem',
                  }}
                  onMouseMove={isPro ? handleTiltPro : handleTilt}
                  onMouseLeave={resetTilt}
                >
                  {item.category && (
                    <span className="absolute top-3 left-3 text-[9px] font-bold tracking-widest
                      bg-white/5 border border-white/10 text-white/40 px-2 py-0.5 rounded-full"
                      style={{ fontFamily: "'Orbitron', sans-serif" }}>
                      {item.category}
                    </span>
                  )}
                  {isPro && (
                    <span className="absolute top-3 right-3 text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full"
                      style={{ fontFamily: "'Orbitron', sans-serif",
                        background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
                        color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,0.5)' }}>
                      ⚡ VIP
                    </span>
                  )}
                  {item.images && item.images.length > 0 ? (
                    <div className="card-gallery">
                      <div className="card-gallery-main-wrap">
                        <img
                          src={item.images[selectedImages[item.id] ?? 0]}
                          alt={item.itemName}
                          className="card-gallery-main"
                          loading="lazy"
                        />
                      </div>
                      {item.images.length > 1 && (
                        <div className="card-thumbnails">
                          {item.images.map((src, idx) => {
                            const isActive = (selectedImages[item.id] ?? 0) === idx;
                            return (
                              <button
                                key={idx}
                                className={`card-thumb ${isActive ? (isPro ? 'card-thumb-active-gold' : 'card-thumb-active') : ''}`}
                                onClick={(e) => { e.stopPropagation(); setCardImage(item.id, idx); }}
                                aria-label={`Imagem ${idx + 1}`}
                              >
                                <img src={src} alt={`Miniatura ${idx + 1}`} loading="lazy" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`card-placeholder ${isPro ? 'card-placeholder-pro' : ''}`}>
                      <span className="card-placeholder-icon" style={isPro ? { filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.5))' } : {}}>⬡</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1 flex-1">
                    <h3 className="font-bold text-white leading-tight line-clamp-2"
                      style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem', letterSpacing: '0.05em',
                        textShadow: isPro ? '0 0 10px rgba(251,191,36,0.3)' : 'none' }}>
                      {item.itemName}
                    </h3>
                    <p className="text-white/30 text-[11px] tracking-wide font-mono">
                      {abreviarEndereco(item.seller)}
                    </p>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-white/30 tracking-widest uppercase mb-0.5">Preço</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-lg font-black"
                          style={{ color: isPro ? '#fbbf24' : (item.currency === 'USDC' ? '#4ade80' : item.currency === 'EURC' ? '#60a5fa' : '#00e5ff'), fontFamily: "'Orbitron', sans-serif",
                            textShadow: isPro ? '0 0 12px rgba(251,191,36,0.5)' : '0 0 12px rgba(0,229,255,0.4)' }}>
                          {item.currency && item.currency !== 'ETH'
                            ? formatStablecoinPrice(item.priceEth, item.currency)
                            : parseFloat(item.priceEth).toFixed(4)}
                          {(!item.currency || item.currency === 'ETH') && (
                            <span className="text-xs text-white/40 ml-1 font-normal">ETH</span>
                          )}
                        </p>
                        {item.currency && item.currency !== 'ETH' && (
                          <span className="currency-badge" style={{
                            color: STABLECOIN_META[item.currency].cor,
                            background: STABLECOIN_META[item.currency].corFundo,
                            borderColor: STABLECOIN_META[item.currency].cor + '55',
                          }}>
                            {item.currency}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-white/20 font-mono">#{item.id}</span>
                  </div>
                  <button
                    className={`btn-neon btn-neon-full ${isPro ? 'btn-neon-gold' : 'btn-neon-cyan'}`}
                    onClick={() => abrirCompra(item)}
                  >
                    {authenticated ? '⚡ Comprar Agora' : '🔒 Entrar para Comprar'}
                  </button>
                </div>
              );

              return isPro ? (
                <div key={item.id} className="pro-card-wrapper">{cardInner}</div>
              ) : cardInner;
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

      {/* ── MODAL ANUNCIAR ── */}
      {modalAberto && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-fechar" onClick={fecharModal}>✕</button>

            {estado === 'sem-carteira' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone" style={{ color: '#f59e0b' }}>⚠</div>
                <h2>Carteira não encontrada</h2>
                <p>Conecte uma carteira para publicar na blockchain.</p>
                <button className="btn-publicar" onClick={() => { connectWallet(); setEstado('idle'); }}>Conectar Carteira</button>
                <button className="btn-sair" style={{ marginTop: '0.5rem', width: '100%' }} onClick={() => setEstado('idle')}>Voltar</button>
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
                    <label>Nome do Item</label>
                    <input name="nomeItem" type="text" placeholder="Ex: Tênis Air Max Limited"
                      value={form.nomeItem} onChange={handleChange} required autoComplete="off" />
                  </div>
                  <div className="campo">
                    <label>Preço (ETH)</label>
                    <input name="preco" type="number" placeholder="Ex: 0.05"
                      step="0.000000000000000001" min="0" value={form.preco} onChange={handleChange} required />
                  </div>
                  <div className="campo">
                    <label>Categoria</label>
                    <select name="categoria" value={form.categoria} onChange={handleChange}
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#fff',
                        border: '1px solid rgba(0,229,255,0.18)', borderRadius: '8px',
                        padding: '0.65rem 1rem', width: '100%', fontSize: '0.9rem', outline: 'none' }}>
                      {CATEGORIAS.map((c) => <option key={c} value={c} style={{ background: '#0c1022' }}>{c}</option>)}
                    </select>
                  </div>
                  {/* Upload de imagens */}
                  <div className="campo">
                    <label>Imagens do Produto</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFilesSelected}
                    />
                    <div
                      className={`upload-dropzone${dragOver ? ' upload-dropzone-active' : ''}${convertingImages ? ' upload-dropzone-loading' : ''}`}
                      onClick={() => !convertingImages && fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={() => setDragOver(false)}
                    >
                      {convertingImages ? (
                        <>
                          <span className="upload-dropzone-icon spinner" style={{ display: 'inline-block' }}>⟳</span>
                          <span className="upload-dropzone-text" style={{ color: '#00e5ff' }}>Carregando imagens...</span>
                          <span className="upload-dropzone-sub">Convertendo arquivos, aguarde</span>
                        </>
                      ) : (
                        <>
                          <span className="upload-dropzone-icon">📷</span>
                          <span className="upload-dropzone-text">Clique ou arraste as imagens do produto aqui</span>
                          <span className="upload-dropzone-sub">PNG, JPG, WEBP · múltiplos arquivos aceitos</span>
                        </>
                      )}
                    </div>
                    {formImages.length > 0 && (
                      <div className="upload-thumb-list">
                        {formImages.map((file, idx) => (
                          <div key={idx} className="upload-thumb">
                            <img src={URL.createObjectURL(file)} alt={file.name} loading="lazy" />
                            {formImagesBase64[idx] && (
                              <span className="upload-thumb-saved" title="Imagem salva">✓</span>
                            )}
                            <button
                              type="button"
                              className="upload-thumb-remove"
                              onClick={() => handleRemoveFormImage(idx)}
                              aria-label="Remover imagem"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    )}
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
                <p>Confirme a transação na sua carteira.</p>
              </div>
            )}

            {estado === 'sucesso' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone">✓</div>
                <h2>Produto postado na Blockchain!</h2>
                <p><strong>{form.nomeItem}</strong> foi listado com sucesso.</p>
                {txHash && <p className="contrato-info">TX: <code>{txHash.slice(0,12)}…{txHash.slice(-6)}</code></p>}
                <button onClick={fecharModal} className="btn-publicar">Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL COMPRA ── */}
      {itemParaComprar && (
        <div className="modal-overlay" onClick={() => { setItemParaComprar(null); setBuyEstado('idle'); }}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-fechar" onClick={() => { setItemParaComprar(null); setBuyEstado('idle'); }}>✕</button>

            {buyEstado === 'idle' && (
              <>
                <div className="modal-topo">
                  <span className="modal-icone">⚡</span>
                  <h2>Confirmar Compra</h2>
                  <p>Revise os detalhes antes de confirmar na blockchain</p>
                </div>
                <div className="flex flex-col gap-4 mt-2">
                  <div className="rounded-xl border border-white/10 p-4 flex flex-col gap-2"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-xs text-white/40 tracking-widest uppercase"
                      style={{ fontFamily: "'Orbitron', sans-serif" }}>Produto</p>
                    <p className="font-bold text-white text-sm"
                      style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.05em' }}>
                      {itemParaComprar.itemName}
                    </p>
                    <p className="text-white/30 text-xs font-mono">Vendedor: {abreviarEndereco(itemParaComprar.seller)}</p>
                    {itemParaComprar.category && (
                      <p className="text-white/30 text-xs">Categoria: {itemParaComprar.category}</p>
                    )}
                  </div>

                  {(() => {
                    const cur = itemParaComprar.currency ?? 'ETH';
                    const meta = cur !== 'ETH' ? STABLECOIN_META[cur as StablecoinSymbol] : null;
                    const priceDisplay = meta
                      ? formatStablecoinPrice(itemParaComprar.priceEth, cur as StablecoinSymbol)
                      : parseFloat(itemParaComprar.priceEth).toFixed(4);
                    const cor = meta?.cor ?? '#00e5ff';
                    const fundo = meta?.corFundo ?? 'rgba(0,229,255,0.04)';
                    const borda = meta ? meta.cor + '33' : 'rgba(0,229,255,0.2)';
                    return (
                      <div className="rounded-xl border p-4 flex items-center justify-between"
                        style={{ background: fundo, borderColor: borda }}>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-white/50 tracking-widest uppercase"
                            style={{ fontFamily: "'Orbitron', sans-serif" }}>Total</span>
                          {meta && (
                            <span className="currency-badge" style={{
                              color: meta.cor, background: meta.corFundo, borderColor: meta.cor + '55',
                            }}>
                              {cur}
                            </span>
                          )}
                        </div>
                        <span className="text-2xl font-black"
                          style={{ fontFamily: "'Orbitron', sans-serif", color: cor,
                            textShadow: `0 0 12px ${cor}66` }}>
                          {priceDisplay}
                          {cur === 'ETH' && <span className="text-sm text-white/40 ml-1 font-normal">ETH</span>}
                        </span>
                      </div>
                    );
                  })()}

                  {refAddress !== ZERO_ADDRESS && (
                    <div className="rounded-xl border border-green-400/20 p-3 flex items-center gap-2"
                      style={{ background: 'rgba(74,222,128,0.05)' }}>
                      <span className="text-green-400 text-sm">🔗</span>
                      <div>
                        <p className="text-green-400 text-[11px] font-bold tracking-widest"
                          style={{ fontFamily: "'Orbitron', sans-serif" }}>
                          Link de afiliado ativo
                        </p>
                        <p className="text-white/30 text-[10px] font-mono">{abreviarEndereco(refAddress)}</p>
                      </div>
                      <span className="ml-auto text-green-400/60 text-[10px]">+1% comissão</span>
                    </div>
                  )}

                  <button onClick={confirmarCompra} className="btn-publicar" style={{ marginTop: '0.5rem' }}>
                    ⚡ Confirmar Compra
                  </button>
                </div>
              </>
            )}

            {buyEstado === 'confirmando' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone spinner">⟳</div>
                <h2>Processando na blockchain...</h2>
                {(itemParaComprar?.currency === 'USDC' || itemParaComprar?.currency === 'EURC') ? (
                  <p>Confirme as <strong>2 transações</strong> na sua carteira: <em>Approve</em> e depois a transferência.</p>
                ) : (
                  <p>Confirme a transação na sua carteira e aguarde.</p>
                )}
              </div>
            )}

            {buyEstado === 'sucesso' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone" style={{ borderColor: '#4ade80', color: '#4ade80',
                  boxShadow: '0 0 24px rgba(74,222,128,0.35)' }}>✓</div>
                <h2 style={{ color: '#4ade80' }}>Compra Realizada!</h2>
                <p><strong>{itemParaComprar?.itemName}</strong> é seu!</p>
                {buyTx && <p className="contrato-info">TX: <code>{buyTx.slice(0,12)}…{buyTx.slice(-6)}</code></p>}
                <button onClick={() => { setItemParaComprar(null); setBuyEstado('idle'); }} className="btn-publicar">
                  Fechar
                </button>
              </div>
            )}

            {buyEstado === 'erro' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone" style={{ borderColor: '#f87171', color: '#f87171' }}>✕</div>
                <h2>Erro na transação</h2>
                <div className="modal-erro" style={{ maxWidth: '100%', wordBreak: 'break-word' }}>
                  {buyErro}
                </div>
                <button onClick={() => setBuyEstado('idle')} className="btn-publicar" style={{ marginTop: '0.5rem' }}>
                  Tentar Novamente
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
