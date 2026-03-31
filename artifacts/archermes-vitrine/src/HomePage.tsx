import { useState, useEffect, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import { BrowserProvider, Contract, Interface, JsonRpcProvider, parseUnits, formatUnits } from 'ethers';
import { useWallet } from './walletContext';
import { useLang } from './i18n';
import { arcTestnet } from './chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';
import {
  STABLECOIN_ADDRESSES, STABLECOIN_META,
  transferERC20, toTokenAmount,
  formatStablecoinPrice, type StablecoinSymbol,
} from './stablecoins';
import StoreDashboard from './StoreDashboard';
import AffiliateDashboard from './AffiliateDashboard';
import StoreView, { type StoreItem } from './StoreView';
import { getStoreRegistry, getBoostedProducts, getNeonShadow, saveStoreToRegistry, fetchRegistryFromServer, mergeServerRegistry, LS_STORE_REGISTRY, type RegistryStore, type BoostedProduct as BoostedProductEntry } from './registry';
import { extractContractError } from './contractUtils';
import { uploadImages, resolveImgUrl, saveImageMap, syncImageMapToStorage } from './imageUploader';
import { useVitrineSync, broadcastVitrineEvent } from './vitrineSync';
import './Home.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** Treasury / contract owner — mirrors the on-chain `owner()` return value. */
const TREASURY_WALLET = '0x434189487484F20B9Bf0e0c28C1559B0c961274B';
/** Must stay in sync with on-chain platformFeePercent (currently 3). */
const PLATFORM_FEE_PERCENT = 3n;
/** Must stay in sync with on-chain referralFeePercent — v3 contract uses 2. */
const REFERRAL_FEE_PERCENT = 2n;

const CATEGORIAS = ['Moda', 'Eletrônicos', 'Perfumes e Beleza', 'Games', 'Casa', 'NFT', 'Criança', 'Outros'];

type Moeda = 'ETH' | StablecoinSymbol;

interface ItemBlockchain {
  id: number;
  itemName: string;
  priceEth: string;
  category: string;
  seller: string;
  images?: string[];
  currency?: Moeda;
  stock?: bigint;
}

interface OrderCompra {
  orderId: number;
  itemId: number;
  itemName: string;
  amountEth: string;
  seller: string;
  status: number; // 0=Pending 1=Shipped 2=Completed 3=Refunded
  trackingCode: string;
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
type Pagina = 'home' | 'minha-loja' | 'afiliado' | 'loja-view';

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

function lerItemDaUrl(): number | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const item = params.get('item');
    if (item) {
      const n = parseInt(item, 10);
      if (!isNaN(n) && n > 0) return n;
    }
  } catch { /* ignore */ }
  return null;
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
  const { connect, disconnect, isConnected, isConnecting, address: walletAddress, switchToArc, getProvider, error: walletError, clearError: clearWalletError } = useWallet();
  const { t, lang, toggleLang } = useLang();

  const [pagina, setPagina] = useState<Pagina>('home');
  const [lojaAtiva, setLojaAtiva] = useState<string>('');

  function verLoja(address: string) {
    setLojaAtiva(address);
    setPagina('loja-view');
  }

  const [modalAberto, setModalAberto] = useState(false);
  const [estado, setEstado] = useState<Estado>('idle');
  // Tracks the brief background reload after a successful listing so the
  // success modal can show a "updating…" spinner that resolves automatically.
  const [postListReloading, setPostListReloading] = useState(false);

  // ── TOAST ──
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => { setToast(''); clearWalletError(); }, 4000);
  }

  useEffect(() => {
    if (!walletError) return;
    const msgMap: Record<string, string> = {
      CANCELLED: t('wallet.cancelled'),
      NO_WALLET: t('wallet.noWallet'),
      NO_ACCOUNTS: t('wallet.noAccounts'),
    };
    showToast(msgMap[walletError] ?? t('wallet.error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletError]);

  const [txHash, setTxHash] = useState('');
  const [erroMsg, setErroMsg] = useState('');
  const [form, setForm] = useState<FormData>({ nomeItem: '', preco: '', categoria: CATEGORIAS[0] });

  // Dados dinâmicos do localStorage
  const [lojasReais, setLojasReais] = useState<RegistryStore[]>([]);
  const [produtosImpulsionados, setProdutosImpulsionados] = useState<BoostedProductEntry[]>([]);

  function carregarDadosLocais() {
    setLojasReais(getStoreRegistry());
    setProdutosImpulsionados(getBoostedProducts());
  }

  useEffect(() => {
    // 1. Load immediately from localStorage (fast)
    carregarDadosLocais();
    // 2. Fetch from server and merge (so cross-browser customizations appear)
    fetchRegistryFromServer().then((serverEntries) => {
      if (serverEntries.length > 0) {
        mergeServerRegistry(serverEntries);
        setLojasReais(getStoreRegistry());
      }
    }).catch(() => { /* ignore */ });
    const onFocus = () => carregarDadosLocais();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando o usuário conecta, carrega a loja dele na blockchain e registra
  useEffect(() => {
    if (!walletAddress) return;
    const addr = walletAddress.toLowerCase();
    async function carregarLojaConectado() {
      try {
        const provider = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
        const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const s = await contrato.stores(addr);
        if (!s?.storeName) return;
        let customizacao = { avatarUrl: '', bannerUrl: '', neonColor: '#00e5ff' };
        try {
          const raw = localStorage.getItem(`archermes_customizacao_${addr}`);
          if (raw) customizacao = JSON.parse(raw);
        } catch { /* ignore */ }
        const entry: RegistryStore = {
          address: addr,
          storeName: s.storeName,
          avatarUrl: customizacao.avatarUrl,
          bannerUrl: customizacao.bannerUrl,
          neonColor: customizacao.neonColor,
          tier: Number(s.tier),
          productCount: Number(s.productCount),
        };
        saveStoreToRegistry(entry);
        setLojasReais(getStoreRegistry());
      } catch { /* ignore */ }
    }
    void carregarLojaConectado();
  }, [walletAddress]);

  // Vitrine
  const [vitrine, setVitrine] = useState<ItemBlockchain[]>([]);
  const [lojasVip, setLojasVip] = useState<LojaVip[]>([]);
  const [sellersPro, setSellersPro] = useState<Set<string>>(new Set());
  const [carregandoVitrine, setCarregandoVitrine] = useState(true);
  const [erroVitrine, setErroVitrine] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const carrosselRef = useRef<HTMLDivElement>(null);

  const [selectedImages, setSelectedImages] = useState<Record<number, number>>({});
  const [itemImageErrors, setItemImageErrors] = useState<Record<number, boolean>>({});
  const [copiedAffId, setCopiedAffId] = useState<number | null>(null);
  const itemDaUrl = lerItemDaUrl();

  // Upload de imagens no modal
  const [formImages, setFormImages] = useState<File[]>([]);
  const [formImagesBase64, setFormImagesBase64] = useState<string[]>([]);
  const [convertingImages, setConvertingImages] = useState(false);
  const [formEstoque, setFormEstoque] = useState<number>(1);
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
      const urls = await uploadImages(base64s);
      setFormImages((prev) => [...prev, ...newFiles]);
      setFormImagesBase64((prev) => [...prev, ...urls]);
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
  const [enderecoEntrega, setEnderecoEntrega] = useState('');

  // Escrow / Compra Segura
  const [escrowAtivo, setEscrowAtivo] = useState(true);

  // ── LEADERBOARD ──
  type LeaderboardSeller = { address: string; storeName: string; avatarUrl?: string; salesCount: number; avgX100?: number; reviewCount?: number };
  type LeaderboardBuyer  = { address: string; buyCount: number };
  const [leaderboardSellers, setLeaderboardSellers] = useState<LeaderboardSeller[]>([]);
  const [leaderboardBuyers,  setLeaderboardBuyers]  = useState<LeaderboardBuyer[]>([]);
  const [showLeaderboard,    setShowLeaderboard]    = useState(false);

  // Minhas Compras (histórico do comprador — Order system)
  const [showMinhasCompras, setShowMinhasCompras] = useState(false);
  const [minhasCompras, setMinhasCompras] = useState<OrderCompra[]>([]);
  const [carregandoCompras, setCarregandoCompras] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [confirmErro, setConfirmErro] = useState<Record<number, string>>({});
  const [homeRatingModal, setHomeRatingModal] = useState<{ orderId: number; hover: number; selected: number } | null>(null);

  const carregarVitrine = useCallback(async () => {
    setCarregandoVitrine(true);
    setErroVitrine('');
    setItemImageErrors({});

    const TIMEOUT_MS = 15_000;
    function withTimeout<T>(p: Promise<T>): Promise<T> {
      return Promise.race([
        p,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
        ),
      ]);
    }

    // Start image-map sync in parallel with blockchain fetch so neither blocks the other.
    // Give it at most 5 s — missing images is non-fatal.
    const imageSyncDone = Promise.race([
      syncImageMapToStorage(),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
    ]);

    try {
      const rpcProvider = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);

      // Fetch total count AND wait for image-map sync together so localStorage is
      // ready by the time we map the items array.
      const [total] = await withTimeout(
        Promise.all([
          (contrato.totalItems() as Promise<bigint>).then(Number),
          imageSyncDone,
        ])
      ) as [number, boolean];

      // Fetch all items in parallel (not sequentially) — much faster
      const ids = Array.from({ length: total }, (_, i) => i + 1);
      const rawItems = await withTimeout(
        Promise.all(ids.map((i) => (contrato.items(i) as Promise<unknown>).catch(() => null)))
      );

      const itens: ItemBlockchain[] = rawItems
        .filter((item): item is NonNullable<typeof item> => {
          if (!item) return false;
          const it = item as { isActive?: boolean; stock?: bigint };
          // v4: item is active when isActive=true and stock>0 (contract sets isActive=false on sell-out)
          if (!it.isActive) return false;
          if (it.stock !== undefined && it.stock <= 0n) return false;
          return true;
        })
        .map((item) => {
          const it = item as { id: bigint; itemName: string; price: bigint; category: string; seller: string; stock?: bigint };
          const id = Number(it.id);
          let images: string[] | undefined = MOCK_ITEM_IMAGES[id];
          try {
            const saved = localStorage.getItem(`archermes_item_images_${id}`);
            if (saved) {
              const parsed = JSON.parse(saved) as string[];
              images = parsed.map(resolveImgUrl).filter(Boolean);
              if (images.length === 0) images = undefined;
            }
          } catch { /* ignore */ }
          return {
            id,
            itemName: it.itemName,
            priceEth: formatUnits(it.price, 18),
            category: it.category,
            seller: it.seller,
            images,
            currency: MOCK_ITEM_CURRENCY[id] ?? 'ETH',
            stock: it.stock,
          };
        });

      setVitrine(itens);

      // Fetch store info for all unique sellers in parallel
      const uniqueSellers = [...new Set(itens.map((i) => i.seller.toLowerCase()))];
      if (uniqueSellers.length > 0) {
        const storeResults = await withTimeout(
          Promise.all(uniqueSellers.map((addr) => (contrato.stores(addr) as Promise<unknown>).catch(() => null)))
        );
        const proSet = new Set<string>();
        const vipList: LojaVip[] = [];
        const registryEntries: RegistryStore[] = [];
        storeResults.forEach((s, idx) => {
          if (!s || !(s as { storeName?: string }).storeName) return;
          const st = s as { storeName: string; tier: bigint; productCount: bigint };
          const addr = uniqueSellers[idx];
          const tier = Number(st.tier);
          if (tier === 1) {
            proSet.add(addr.toLowerCase());
            vipList.push({ address: addr, storeName: st.storeName, productCount: Number(st.productCount), tier });
          }
          // Priority: local owner key → server registry (already merged) → defaults
          const serverReg = getStoreRegistry();
          const serverEntry = serverReg.find((s) => s.address.toLowerCase() === addr);
          let customizacao = {
            avatarUrl: serverEntry?.avatarUrl ?? '',
            bannerUrl: serverEntry?.bannerUrl ?? '',
            neonColor: serverEntry?.neonColor ?? '#00e5ff',
          };
          try {
            const raw = localStorage.getItem(`archermes_customizacao_${addr}`);
            if (raw) {
              const local = JSON.parse(raw) as typeof customizacao;
              // Local owner key takes precedence when it has actual content
              if (local.avatarUrl || local.bannerUrl) customizacao = local;
            }
          } catch { /* ignore */ }
          const entry: RegistryStore = {
            address: addr,
            storeName: st.storeName,
            avatarUrl: customizacao.avatarUrl,
            bannerUrl: customizacao.bannerUrl,
            neonColor: customizacao.neonColor,
            tier,
            productCount: Number(st.productCount),
          };
          registryEntries.push(entry);
          // Only sync to server when we have actual customization to avoid overwriting with empty data
          if (customizacao.avatarUrl || customizacao.bannerUrl || customizacao.neonColor !== '#00e5ff') {
            saveStoreToRegistry(entry);
          } else {
            // Still update locally but don't POST empty data to server
            const localReg = getStoreRegistry();
            const li = localReg.findIndex((s) => s.address.toLowerCase() === addr);
            if (li >= 0) {
              localReg[li] = { ...localReg[li], storeName: st.storeName, tier, productCount: Number(st.productCount) };
            } else {
              localReg.unshift(entry);
            }
            try { localStorage.setItem(LS_STORE_REGISTRY, JSON.stringify(localReg)); } catch { /* ignore */ }
          }
        });
        setSellersPro(proSet);
        setLojasVip(vipList);
        if (registryEntries.length > 0) setLojasReais(getStoreRegistry());
      }
    } catch (err) {
      const e = err as Error;
      console.error('Erro ao carregar vitrine:', e);
      if (e.message === 'TIMEOUT') {
        setErroVitrine('TIMEOUT');
      } else {
        setErroVitrine('ERROR');
      }
    } finally {
      setCarregandoVitrine(false);
    }
  }, []);

  useEffect(() => { carregarVitrine(); }, [carregarVitrine]);

  // Sync em tempo real: blockchain events + BroadcastChannel entre abas
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useVitrineSync((event) => {
    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    syncDebounceRef.current = setTimeout(() => {
      carregarDadosLocais();
      if (event.type !== 'profile:updated') {
        // product:cancelled — remove immediately from local state, then reload from chain
        if (event.type === 'product:cancelled') {
          setVitrine((prev) => prev.filter((i) => i.id !== event.id));
        }
        void carregarVitrine();
      }
    }, 800);
  });

  // ── LEADERBOARD: carrega eventos ItemBought + ItemListed para calcular top vendedores e compradores ──
  useEffect(() => {
    async function carregarLeaderboard() {
      try {
        const rpcProvider = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
        const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);

        // Arc testnet limits eth_getLogs to 10,000 blocks per query.
        // Use the last 9,000 blocks as window (safe margin under the 10k cap).
        const latestBlock = await rpcProvider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - 9000);

        const eventsOrders = await (
          contrato.queryFilter(contrato.filters.OrderCreated(), fromBlock, latestBlock) as Promise<import('ethers').EventLog[]>
        );

        const buyerCount  = new Map<string, number>();
        const sellerCount = new Map<string, number>();
        for (const ev of eventsOrders) {
          // OrderCreated(orderId, itemId, buyer indexed, seller, amount)
          const buyer: string = (ev.args[2] as string).toLowerCase();
          const seller: string = (ev.args[3] as string).toLowerCase();
          buyerCount.set(buyer, (buyerCount.get(buyer) ?? 0) + 1);
          sellerCount.set(seller, (sellerCount.get(seller) ?? 0) + 1);
        }

        const topBuyers: LeaderboardBuyer[] = Array.from(buyerCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([address, buyCount]) => ({ address, buyCount }));

        const registry = getStoreRegistry();
        const top3Sellers = Array.from(sellerCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        // Fetch star ratings for each top seller
        const ratingsSettled = await Promise.allSettled(
          top3Sellers.map(([addr]) =>
            (contrato.getStoreRating(addr) as Promise<[bigint, bigint, bigint]>).catch(() => null)
          )
        );

        const topSellers: LeaderboardSeller[] = top3Sellers.map(([address, salesCount], idx) => {
          const store = registry.find((s) => s.address.toLowerCase() === address);
          const ratingResult = ratingsSettled[idx].status === 'fulfilled' ? ratingsSettled[idx].value : null;
          let avgX100: number | undefined;
          let reviewCount: number | undefined;
          if (ratingResult) {
            avgX100 = Number(ratingResult[2]);
            reviewCount = Number(ratingResult[1]);
          }
          return { address, storeName: store?.storeName ?? abreviarEndereco(address), avatarUrl: store?.avatarUrl, salesCount, avgX100, reviewCount };
        });

        setLeaderboardSellers(topSellers);
        setLeaderboardBuyers(topBuyers);
      } catch {
        // silently fail — leaderboard is non-critical
      }
    }
    void carregarLeaderboard();
  }, []);

  // ── MINHAS COMPRAS (Order system v4) ──
  const carregarMinhasCompras = useCallback(async () => {
    if (!walletAddress) return;
    setCarregandoCompras(true);
    try {
      const provider = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const orderIds: bigint[] = await contrato.getOrdersByBuyer(walletAddress);
      const compras = await Promise.all(
        orderIds.map(async (oid) => {
          const o = await contrato.orders(Number(oid));
          const it = await contrato.items(Number(o.itemId));
          return {
            orderId: Number(o.orderId),
            itemId:  Number(o.itemId),
            itemName: it.itemName as string,
            amountEth: formatUnits(o.amount as bigint, 18),
            seller: o.seller as string,
            status: Number(o.status),
            trackingCode: o.trackingCode as string,
          } satisfies OrderCompra;
        })
      );
      // Most recent orders first
      compras.sort((a, b) => b.orderId - a.orderId);
      setMinhasCompras(compras);
    } catch { /* ignore */ }
    setCarregandoCompras(false);
  }, [walletAddress]);

  async function handleConfirmarRecebimento(orderId: number, rating: number) {
    if (!isConnected) return;
    setHomeRatingModal(null);
    setConfirmandoId(orderId);
    setConfirmErro((p) => ({ ...p, [orderId]: '' }));
    try {
      await switchToArc();
      const provider = getProvider();
      if (!provider) throw new Error('No provider');
      const signer = await provider.getSigner();
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contrato.releaseFunds(orderId, rating);
      await tx.wait();
      await carregarMinhasCompras();
    } catch (err: unknown) {
      const msg = extractContractError(err);
      setConfirmErro((p) => ({ ...p, [orderId]: msg }));
    }
    setConfirmandoId(null);
  }

  // Auto-abrir modal de compra quando URL contém ?item=ID
  useEffect(() => {
    if (!itemDaUrl || vitrine.length === 0) return;
    const item = vitrine.find((i) => i.id === itemDaUrl);
    if (item) abrirCompra(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vitrine, itemDaUrl]);

  function abrirModal() {
    setEstado('idle'); setTxHash(''); setErroMsg('');
    setForm({ nomeItem: '', preco: '', categoria: CATEGORIAS[0] });
    setFormImages([]); setFormImagesBase64([]);
    setFormEstoque(1);
    setFormEstoque(1);
    setModalAberto(true);
  }
  function fecharModal() { setModalAberto(false); setEstado('idle'); setFormImages([]); setFormImagesBase64([]); setFormEstoque(1); setPostListReloading(false); }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Auto-clear error so the user can retry without closing the modal
    if (estado === 'erro') { setEstado('idle'); setErroMsg(''); }
  }

  async function handlePublicar(e: React.FormEvent) {
    e.preventDefault();
    setEstado('enviando'); setErroMsg('');

    // ── Sanitização e validação de inputs ──────────────────────────────────
    const nomeItem = form.nomeItem.trim();
    // Normaliza separador decimal: vírgula → ponto
    const precoStr = form.preco.replace(',', '.').replace(/\s/g, '');
    const precoNum = parseFloat(precoStr);

    if (!nomeItem) {
      setErroMsg('Nome do item é obrigatório.');
      setEstado('erro'); return;
    }
    if (isNaN(precoNum) || precoNum <= 0) {
      setErroMsg('Preço inválido. Use um número maior que zero (ex: 0.05).');
      setEstado('erro'); return;
    }


    // Admin wallet bypasses all tier/product-count restrictions
    const ADMIN_ADDR = '0x434189487484F20B9Bf0e0c28C1559B0c961274B';
    const isAdminWallet = walletAddress?.toLowerCase() === ADMIN_ADDR.toLowerCase();

    // Verificar limite do plano grátis (10 produtos) — ignorado para admin
    if (!isAdminWallet) {
      const minhaLojaReg = lojasReais.find((s) => s.address.toLowerCase() === walletAddress?.toLowerCase());
      if (minhaLojaReg && minhaLojaReg.tier < 1 && minhaLojaReg.productCount >= 10) {
        setErroMsg(t('pro.limitReached'));
        setEstado('erro');
        return;
      }
    }
    if (!isConnected) { setEstado('sem-carteira'); return; }

    // ── Step 1: switch to Arc Testnet (non-fatal for admin) ────────────────
    try {
      await switchToArc();
    } catch (switchErr) {
      console.warn('[ARCHERMES] switchToArc failed in handlePublicar:', switchErr);
      if (!isAdminWallet) {
        setErroMsg('Falha ao mudar para Arc Testnet. ' + extractContractError(switchErr));
        setEstado('erro');
        return;
      }
    }

    const provider = getProvider();
    if (!provider) { setEstado('sem-carteira'); return; }

    const precoWei = parseUnits(precoStr.replace(',', '.'), 18);


    try {
      let finalTxHash = '';

      if (isAdminWallet) {
        // ── GOD MODE: raw eth_sendTransaction bypasses Rabby gas estimation ──
        // listItem is nonpayable — value: '0x0', gas: 500000 hardcoded
        const eth = (window as unknown as {
          ethereum: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
        }).ethereum;
        if (!eth) throw new Error('window.ethereum not available');

        const rpc = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
        const iface = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpc);
        const data = iface.interface.encodeFunctionData('listItem', [
          nomeItem, precoWei, form.categoria,
        ]);

        console.log('[ARCHERMES] GOD MODE listItem (raw tx):', {
          from: walletAddress, to: CONTRACT_ADDRESS, nomeItem,
          preco: precoStr, categoria: form.categoria, gas: '0x7A120',
        });

        const txHash = await eth.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: CONTRACT_ADDRESS,
            data,
            value: '0x0',
            gas: '0x7A120', // 500000 — hardcoded, bypasses estimation
          }],
        }) as string;

        console.log('[ARCHERMES] GOD MODE listItem tx sent:', txHash);
        finalTxHash = txHash;

        // Wait for confirmation via polling
        await new Promise<void>((resolve, reject) => {
          const interval = setInterval(() => {
            rpc.getTransactionReceipt(txHash).then((receipt) => {
              if (receipt) {
                clearInterval(interval);
                if (receipt.status === 1) resolve();
                else reject(new Error('Transaction reverted on-chain'));
              }
            }).catch(() => {});
          }, 2000);
          setTimeout(() => { clearInterval(interval); reject(new Error('Timeout waiting for tx')); }, 60000);
        });

        // Get the new item ID after confirmation
        try {
          const newTotal: bigint = await rpc.call({
            to: CONTRACT_ADDRESS,
            data: iface.interface.encodeFunctionData('totalItems'),
          }).then((r) => BigInt(r));
          const newId = Number(newTotal);
          const hostedUrls = formImagesBase64.filter((u) => u.startsWith('https://'));
          if (hostedUrls.length > 0) {
            localStorage.setItem(`archermes_item_images_${newId}`, JSON.stringify(hostedUrls));
            void saveImageMap(newId, hostedUrls, formEstoque);
          }
        } catch { /* ignore image persistence errors */ }

      } else {
        // ── Normal user flow ─────────────────────────────────────────────────
        const signer = await provider.getSigner();
        const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        console.log('[ARCHERMES] listItem (user):', { nomeItem, precoStr, categoria: form.categoria });
        const tx = await contrato.listItem(nomeItem, precoWei, form.categoria);
        await tx.wait();
        finalTxHash = tx.hash;

        if (formImagesBase64.length > 0) {
          try {
            const rpc = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
            const c2 = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpc);
            const newTotal: bigint = await c2.totalItems();
            const newId = Number(newTotal);
            const hostedUrls = formImagesBase64.filter((u) => u.startsWith('https://'));
            if (hostedUrls.length > 0) {
              localStorage.setItem(`archermes_item_images_${newId}`, JSON.stringify(hostedUrls));
              void saveImageMap(newId, hostedUrls, formEstoque);
            }
          } catch { /* ignore */ }
        }
      }

      setTxHash(finalTxHash);
      setEstado('sucesso');
      setPostListReloading(true);
      setTimeout(() => {
        carregarVitrine();
        broadcastVitrineEvent({ type: 'product:listed', id: 0 });
      }, 2000);
      setTimeout(() => {
        void carregarVitrine().finally(() => setPostListReloading(false));
      }, 6000);
    } catch (err: unknown) {
      console.error('[ARCHERMES] handlePublicar error:', err);
      const msg = extractContractError(err);
      const raw = err instanceof Error ? err.message : String(err);
      setErroMsg(msg + (msg === raw ? '' : '\n[debug: ' + raw.slice(0, 120) + ']'));
      setEstado('erro');
    }
  }

  // ── COMPRA ──
  // Shipping fee in ETH — matches contract's shippingFee (0.001 ETH default)
  const SHIPPING_FEE_ETH = '0.001';

  function abrirCompra(item: ItemBlockchain) {
    if (!isConnected) { void connect(); return; }
    setItemParaComprar(item);
    setBuyEstado('idle');
    setBuyErro('');
    setBuyTx('');
    setEnderecoEntrega('');
  }

  async function confirmarCompra() {
    if (!itemParaComprar) return;
    if (!isConnected) { setBuyEstado('erro'); setBuyErro('Conecte uma carteira para comprar.'); return; }
    setBuyEstado('confirmando');
    const currency = itemParaComprar.currency ?? 'ETH';
    try {
      await switchToArc();
      const provider = getProvider();
      if (!provider) { setBuyEstado('erro'); setBuyErro('Provedor de carteira não encontrado.'); return; }
      const signer = await provider.getSigner();

      const referrer = refAddress !== ZERO_ADDRESS ? refAddress : ZERO_ADDRESS;

      if (currency === 'ETH') {
        const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        const priceWei    = parseUnits(itemParaComprar.priceEth, 18);
        const shippingWei = parseUnits(SHIPPING_FEE_ETH, 18);
        const totalWei    = priceWei + shippingWei;
        // v10: buyItem(id, referrer) — shipping included in value
        const tx = await contrato.buyItem(itemParaComprar.id, referrer, { value: totalWei });
        await tx.wait();
        setBuyTx(tx.hash);
      } else {
        // ── ERC-20 flow (USDC / EURC) ──────────────────────────────────────────
        // For stablecoin purchases the on-chain contract only handles ETH.
        // We distribute fees client-side and record the delivery address off-chain.
        const tokenAddress = STABLECOIN_ADDRESSES[currency];
        const totalAmount = toTokenAmount(itemParaComprar.priceEth, currency);
        const platformFeeAmount = totalAmount * PLATFORM_FEE_PERCENT / 100n;
        const referralFeeAmount = referrer !== ZERO_ADDRESS ? totalAmount * REFERRAL_FEE_PERCENT / 100n : 0n;
        const sellerAmount = totalAmount - platformFeeAmount - referralFeeAmount;

        const feeTx = await transferERC20(signer, tokenAddress, TREASURY_WALLET, platformFeeAmount);
        await feeTx.wait();

        if (referrer !== ZERO_ADDRESS && referralFeeAmount > 0n) {
          const refTx = await transferERC20(signer, tokenAddress, referrer, referralFeeAmount);
          await refTx.wait();
        }

        const transferTx = await transferERC20(signer, tokenAddress, itemParaComprar.seller, sellerAmount);
        await transferTx.wait();
        setBuyTx(transferTx.hash);
      }

      setBuyEstado('sucesso');
      carregarVitrine();
    } catch (err: unknown) {
      setBuyErro(extractContractError(err));
      setBuyEstado('erro');
    }
  }

  const vitrineVisivel = filtroCategoria === 'Todos'
    ? vitrine : vitrine.filter((i) => i.category === filtroCategoria);

  // ── PÁGINA SECUNDÁRIA ──
  if (pagina === 'loja-view') {
    return (
      <>
        <StoreView
          storeAddress={lojaAtiva}
          storeInfo={lojasReais.find((s) => s.address.toLowerCase() === lojaAtiva.toLowerCase())}
          allItems={vitrine as StoreItem[]}
          sellersPro={sellersPro}
          isConnected={isConnected}
          walletAddress={walletAddress}
          onVoltar={() => setPagina('home')}
          onAbrirCompra={(item) => abrirCompra(item as ItemBlockchain)}
          t={t}
          lang={lang}
        />
        {/* Buy modal available from StoreView too */}
        {itemParaComprar && (
          <div className="modal-overlay" onClick={() => { setItemParaComprar(null); setBuyEstado('idle'); }}>
            <div className="modal-compra-box" onClick={(e) => e.stopPropagation()}>
              <button className="modal-fechar" onClick={() => { setItemParaComprar(null); setBuyEstado('idle'); }}>✕</button>
              {buyEstado === 'sucesso' && (
                <div className="modal-sucesso">
                  <div className="sucesso-icone">✓</div>
                  <h2>{lang === 'en' ? 'Purchase confirmed!' : 'Compra confirmada!'}</h2>
                  {buyTx && <p className="text-white/40 text-xs font-mono break-all mt-2">Tx: {buyTx}</p>}
                  <button className="btn-publicar mt-4" onClick={() => { setItemParaComprar(null); setBuyEstado('idle'); }}>
                    {lang === 'en' ? 'Close' : 'Fechar'}
                  </button>
                </div>
              )}
              {buyEstado === 'erro' && (
                <div className="modal-sucesso">
                  <div className="sucesso-icone" style={{ color: '#f87171' }}>✕</div>
                  <h2>{lang === 'en' ? 'Purchase error' : 'Erro na compra'}</h2>
                  {buyErro && <p className="text-white/40 text-xs mt-2">{buyErro}</p>}
                  <button className="btn-publicar mt-4" onClick={() => setBuyEstado('idle')}>
                    {lang === 'en' ? 'Try again' : 'Tentar novamente'}
                  </button>
                </div>
              )}
              {(buyEstado === 'idle' || buyEstado === 'confirmando') && itemParaComprar && (
                <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem', letterSpacing: '0.08em', color: '#00e5ff' }}>
                    {lang === 'en' ? 'Confirm Purchase' : 'Confirmar Compra'}
                  </h2>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.15rem' }}>{itemParaComprar.itemName}</p>
                  <p className="text-white/30 text-xs font-mono">{t('vitrine.seller')} {abreviarEndereco(itemParaComprar.seller)}</p>

                  {/* Endereço de entrega */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-white/50 tracking-widest uppercase" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                      📦 {lang === 'en' ? 'Delivery Address' : 'Endereço de Entrega'} <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={enderecoEntrega}
                      onChange={(e) => setEnderecoEntrega(e.target.value)}
                      placeholder={lang === 'en' ? 'Street, number, city, state, ZIP…' : 'Rua, número, bairro, cidade, estado, CEP…'}
                      disabled={buyEstado === 'confirmando'}
                      style={{
                        width: '100%', borderRadius: '0.5rem', resize: 'none', outline: 'none',
                        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,229,255,0.2)',
                        color: '#fff', fontSize: '0.78rem', padding: '0.5rem 0.75rem', fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Resumo de preços */}
                  <div style={{ padding: '0.6rem 0.75rem', background: 'rgba(0,229,255,0.06)', borderRadius: '0.5rem', border: '1px solid rgba(0,229,255,0.15)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>{lang === 'en' ? 'Product' : 'Produto'}</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                        {parseFloat(itemParaComprar.priceEth).toFixed(4)} ETH
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>{lang === 'en' ? 'Shipping' : 'Entrega'}</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{SHIPPING_FEE_ETH} ETH</span>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(0,229,255,0.15)', paddingTop: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(0,229,255,0.6)', fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.08em' }}>TOTAL</span>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.1rem', fontWeight: 900, color: '#00e5ff' }}>
                        {(parseFloat(itemParaComprar.priceEth) + parseFloat(SHIPPING_FEE_ETH)).toFixed(4)} ETH
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn-neon btn-neon-full btn-neon-cyan"
                    disabled={buyEstado === 'confirmando'}
                    onClick={buyEstado === 'idle' ? () => void confirmarCompra() : undefined}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {buyEstado === 'confirmando' ? (
                      <>
                        <span className="btn-spinner" />
                        {lang === 'en' ? 'Confirm in wallet…' : 'Confirme na carteira…'}
                      </>
                    ) : t('vitrine.buyNow')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

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
            {isConnected && <button onClick={disconnect} className="btn-sair">Sair</button>}
          </div>
        </header>
        {pagina === 'minha-loja' && <StoreDashboard onVoltar={() => { setPagina('home'); carregarDadosLocais(); }} onAnunciar={() => { setPagina('home'); setTimeout(abrirModal, 80); }} />}
        {pagina === 'afiliado' && <AffiliateDashboard onVoltar={() => setPagina('home')} />}
      </div>
    );
  }

  return (
    <div className="container-principal">

      {/* ── TOAST ── */}
      {toast && (
        <div
          role="alert"
          onClick={() => { setToast(''); clearWalletError(); }}
          style={{
            position: 'fixed', top: '1.25rem', left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, cursor: 'pointer', maxWidth: '90vw',
            background: 'rgba(10,10,18,0.96)',
            border: '1px solid rgba(255,80,80,0.45)',
            borderRadius: '0.5rem', padding: '0.65rem 1.1rem',
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            boxShadow: '0 0 18px rgba(255,80,80,0.2)',
            fontFamily: "'Orbitron', sans-serif", fontSize: '0.72rem',
            letterSpacing: '0.05em', color: '#ff8080',
            animation: 'fadeIn 0.2s ease',
          }}>
          <span style={{ fontSize: '1rem' }}>⚠</span>
          <span>{toast}</span>
          <span style={{ marginLeft: '0.4rem', opacity: 0.4, fontSize: '0.65rem' }}>✕</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="cabecalho">
        <div className="logo-wrapper">
          <img src="/images/logo-ahs.png" alt="ARCHERMES" className="logo-img" />
          <span className="logo-texto">ARCHERMES</span>
        </div>
        {!isConnected ? (
          <div className="acoes-header">
            <button
              onClick={toggleLang}
              className="btn-entrar"
              style={{ fontSize: '0.72rem', letterSpacing: '0.08em', minWidth: 0, padding: '0.35rem 0.65rem',
                borderColor: 'rgba(0,229,255,0.35)', color: 'rgba(0,229,255,0.7)' }}>
              🌐 {t('lang.toggle')}
            </button>
            <button onClick={() => setPagina('afiliado')} className="btn-entrar"
              style={{ borderColor: 'rgba(74,222,128,0.5)', color: '#4ade80' }}>
              {t('nav.affiliate')}
            </button>
            <button onClick={() => setPagina('minha-loja')} className="btn-entrar">{t('nav.myStore')}</button>
            <button
              onClick={() => { if (!isConnecting) void connect(); }}
              disabled={isConnecting}
              className="btn-entrar"
              style={{ opacity: isConnecting ? 0.6 : 1 }}>
              {isConnecting ? t('wallet.connecting') : t('nav.connect')}
            </button>
            <button
              onClick={() => { if (!isConnecting) void connect(); }}
              disabled={isConnecting}
              className="btn-login"
              style={{ opacity: isConnecting ? 0.6 : 1 }}>
              {isConnecting ? t('wallet.connecting') : t('nav.createStore')}
            </button>
          </div>
        ) : (
          <div className="painel-usuario">
            <button
              onClick={toggleLang}
              className="btn-entrar"
              style={{ fontSize: '0.72rem', letterSpacing: '0.08em', minWidth: 0, padding: '0.35rem 0.65rem',
                borderColor: 'rgba(0,229,255,0.35)', color: 'rgba(0,229,255,0.7)' }}>
              🌐 {t('lang.toggle')}
            </button>
            <span style={{ fontSize: '0.82rem' }}>
              {abreviarEndereco(walletAddress || '0x...')}
            </span>
            <button onClick={() => setPagina('afiliado')} className="btn-entrar"
              style={{ borderColor: 'rgba(74,222,128,0.5)', color: '#4ade80', fontSize: '0.7rem' }}>
              {t('nav.affiliate')}
            </button>
            <button onClick={() => setPagina('minha-loja')} className="btn-entrar">{t('nav.myStoreIcon')}</button>
            <button onClick={disconnect} className="btn-sair">{t('nav.disconnect')}</button>
          </div>
        )}
      </header>

      {/* Banner de ref ativo */}
      {refAddress !== ZERO_ADDRESS && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 text-xs"
          style={{ background: 'rgba(74,222,128,0.08)', borderBottom: '1px solid rgba(74,222,128,0.15)',
            color: '#4ade80', fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.05em' }}>
          <span>🔗</span>
          <span>{t('ref.active')} {abreviarEndereco(refAddress)}</span>
          <span className="text-white/20">{t('ref.commission')}</span>
        </div>
      )}

      {/* ── PRODUTOS IMPULSIONADOS ── */}
      <section className="vitrine-container" style={{ paddingTop: '2.5rem', paddingBottom: '0' }}>
        <div className="flex items-center gap-3 mb-6">
          <span style={{ fontSize: '1.1rem', filter: 'drop-shadow(0 0 8px #fbbf24)' }}>⚡</span>
          <div>
            <h2 className="text-xl font-black tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif", color: '#fbbf24',
                textShadow: '0 0 20px rgba(251,191,36,0.5)' }}>
              {t('section.boosted')}
            </h2>
            <p className="text-white/30 text-xs tracking-wide mt-0.5">
              {t('section.boostedDesc')}
            </p>
          </div>
        </div>
        {produtosImpulsionados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 mb-8"
            style={{ border: '1px dashed rgba(251,191,36,0.15)', borderRadius: '1rem', background: 'rgba(251,191,36,0.03)' }}>
            <span className="text-4xl opacity-30">🚀</span>
            <p className="text-white/40 text-sm font-bold tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif" }}>{t('boost.emptyState')}</p>
            <p className="text-white/20 text-xs text-center max-w-xs">{t('boost.emptyStateDesc')}</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {produtosImpulsionados.map((item) => {
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
                  {t('section.boostedBadge')}
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
                    onClick={() => void connect()}>
                    {t('vitrine.connectToBuyBtn')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* ── FEATURED VIP STORES ── */}
      {lojasVip.length > 0 && (
        <section className="vitrine-container" style={{ paddingTop: '2.5rem', paddingBottom: '0.5rem' }}>
          <div className="flex items-center gap-3 mb-6">
            <span style={{ fontSize: '1.1rem', filter: 'drop-shadow(0 0 10px #c084fc)' }}>👑</span>
            <div>
              <h2 className="text-xl font-black tracking-widest uppercase"
                style={{ fontFamily: "'Orbitron', sans-serif", color: '#c084fc',
                  textShadow: '0 0 20px rgba(192,132,252,0.5)' }}>
                {t('section.featured')}
              </h2>
              <p className="text-white/30 text-xs tracking-wide mt-0.5">VIP PRO MEMBERS</p>
            </div>
          </div>
          <div ref={carrosselRef} className="flex gap-5 overflow-x-auto pb-4 scroll-oculto">
            {lojasVip.map((loja) => {
              const reg = lojasReais.find((s) => s.address.toLowerCase() === loja.address.toLowerCase());
              const bannerUrl = reg?.bannerUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=200&fit=crop';
              const avatarUrl = reg?.avatarUrl;
              return (
                <div
                  key={loja.address}
                  className="flex-shrink-0 rounded-2xl overflow-hidden relative cursor-pointer"
                  style={{
                    width: '200px',
                    background: 'linear-gradient(145deg, rgba(192,132,252,0.12), rgba(10,13,26,0.96))',
                    border: '1.5px solid rgba(192,132,252,0.35)',
                    boxShadow: '0 0 28px rgba(192,132,252,0.18)',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => verLoja(loja.address)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') verLoja(loja.address); }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 40px rgba(192,132,252,0.35), 0 8px 20px rgba(0,0,0,0.5)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 28px rgba(192,132,252,0.18)';
                    (e.currentTarget as HTMLDivElement).style.transform = '';
                  }}>
                  {/* Banner */}
                  <div className="relative h-20 overflow-hidden">
                    <img src={bannerUrl} alt="" className="w-full h-full object-cover" loading="lazy"
                      style={{ filter: 'brightness(0.6) saturate(1.2)' }} />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(10,13,26,0.9))' }} />
                  </div>
                  {/* Avatar overlapping banner */}
                  <div className="relative -mt-8 flex flex-col items-center px-3 pb-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ border: '2.5px solid rgba(192,132,252,0.7)', boxShadow: '0 0 16px rgba(192,132,252,0.4)', background: 'rgba(16,20,40,0.9)' }}>
                      {avatarUrl
                        ? <img src={avatarUrl} alt={loja.storeName} className="w-full h-full object-cover" loading="lazy" />
                        : <span style={{ fontSize: '1.4rem', color: '#c084fc' }}>⬡</span>}
                    </div>
                    <span className="text-[11px] font-black tracking-widest mt-2 text-center leading-tight"
                      style={{ fontFamily: "'Orbitron', sans-serif", color: '#c084fc', textShadow: '0 0 10px rgba(192,132,252,0.4)' }}>
                      {loja.storeName}
                    </span>
                    <span className="text-[8px] font-bold tracking-widest px-2 py-0.5 rounded-full mt-1.5"
                      style={{ fontFamily: "'Orbitron', sans-serif",
                        background: 'rgba(192,132,252,0.15)', color: '#c084fc',
                        border: '1px solid rgba(192,132,252,0.35)' }}>
                      ⚡ VIP PRO
                    </span>
                    <span className="text-[9px] text-white/30 mt-1.5">
                      {loja.productCount} {lang === 'en'
                        ? `product${loja.productCount !== 1 ? 's' : ''}`
                        : `produto${loja.productCount !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-6" />
        </section>
      )}

      {/* ── 🏆 TOP ARCHITECTS LEADERBOARD ── */}
      <section id="leaderboard" className="vitrine-container leaderboard-section">
        {/* ── Botão compacto "Campeões do Mercado" ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setShowLeaderboard(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.65rem 1.5rem',
              borderRadius: '999px',
              border: '1.5px solid rgba(251,191,36,0.4)',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(0,229,255,0.06))',
              backdropFilter: 'blur(12px)',
              cursor: 'pointer',
              color: '#fbbf24',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              boxShadow: showLeaderboard
                ? '0 0 24px rgba(251,191,36,0.25), 0 0 48px rgba(0,229,255,0.1)'
                : '0 0 12px rgba(251,191,36,0.1)',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 28px rgba(251,191,36,0.3), 0 0 56px rgba(0,229,255,0.12)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(251,191,36,0.7)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = showLeaderboard ? '0 0 24px rgba(251,191,36,0.25), 0 0 48px rgba(0,229,255,0.1)' : '0 0 12px rgba(251,191,36,0.1)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(251,191,36,0.4)';
            }}>
            <span style={{ fontSize: '1rem', filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.6))' }}>🏆</span>
            <span>{lang === 'en' ? 'Market Champions' : 'Campeões do Mercado'}</span>
            <span style={{
              marginLeft: '0.2rem', fontSize: '0.6rem', opacity: 0.7,
              transform: showLeaderboard ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s ease',
              display: 'inline-block',
            }}>▼</span>
          </button>
        </div>

        {/* ── Dados do Leaderboard (collapsível) ── */}
        <div id="leaderboard-data" style={{
          overflow: 'hidden',
          maxHeight: showLeaderboard ? '800px' : '0px',
          opacity: showLeaderboard ? 1 : 0,
          transition: 'max-height 0.4s ease, opacity 0.3s ease',
        }}>
          {(leaderboardSellers.length > 0 || leaderboardBuyers.length > 0) ? (
          <div className="leaderboard-panel">
            <div className="leaderboard-grid">
              {/* ── Top Vendedores ── */}
              {leaderboardSellers.length > 0 && (
                <div>
                  <p className="leaderboard-col-title" style={{ color: '#fbbf24' }}>
                    {lang === 'en' ? '🏪 Top Stores' : '🏪 Top Lojas'}
                  </p>
                  {leaderboardSellers.map((seller, i) => (
                    <div key={seller.address} className={`leaderboard-row leaderboard-row-${i + 1}`}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                        {i === 0 ? '👑' : i === 1 ? '🥈' : '🥉'}
                      </span>
                      <div className="leaderboard-avatar">
                        {seller.avatarUrl ? (
                          <img src={seller.avatarUrl} alt={seller.storeName} />
                        ) : (
                          <span style={{ fontSize: '1rem' }}>⬡</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className="font-bold text-white text-xs truncate leading-tight"
                          style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', letterSpacing: '0.05em',
                            ...(i === 0 ? { color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,0.4)' } :
                               i === 1 ? { color: '#c8d4e8' } : { color: '#cd7f32' }) }}>
                          {seller.storeName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/30 text-[10px] font-mono truncate">
                            {abreviarEndereco(seller.address)}
                          </span>
                          {seller.reviewCount !== undefined && seller.reviewCount > 0 && (
                            <span className="text-[9px] font-bold flex-shrink-0"
                              style={{ color: '#fbbf24', textShadow: '0 0 6px rgba(251,191,36,0.5)' }}>
                              ★ {((seller.avgX100 ?? 0) / 100).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-black flex-shrink-0 tabular-nums"
                        style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem',
                          ...(i === 0 ? { color: '#fbbf24' } : i === 1 ? { color: '#c8d4e8' } : { color: '#cd7f32' }) }}>
                        {seller.salesCount} {lang === 'en' ? 'sales' : 'vendas'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Top Compradores ── */}
              {leaderboardBuyers.length > 0 && (
                <div>
                  <p className="leaderboard-col-title" style={{ color: '#00e5ff' }}>
                    {lang === 'en' ? '💎 Top Buyers' : '💎 Top Compradores'}
                  </p>
                  {leaderboardBuyers.map((buyer, i) => (
                    <div key={buyer.address} className={`leaderboard-row leaderboard-row-${i + 1}`}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                        {i === 0 ? '👑' : i === 1 ? '🥈' : '🥉'}
                      </span>
                      <div className="leaderboard-avatar"
                        style={{ background: 'rgba(0,229,255,0.08)', borderColor: 'rgba(0,229,255,0.2)' }}>
                        <span style={{ fontSize: '0.9rem' }}>🧑‍💻</span>
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className="font-bold text-white text-xs truncate leading-tight"
                          style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', letterSpacing: '0.05em',
                            ...(i === 0 ? { color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,0.4)' } :
                               i === 1 ? { color: '#c8d4e8' } : { color: '#cd7f32' }) }}>
                          {abreviarEndereco(buyer.address)}
                        </span>
                        <span className="text-white/20 text-[9px]">
                          {lang === 'en' ? 'Verified buyer' : 'Comprador verificado'}
                        </span>
                      </div>
                      <span className="text-xs font-black flex-shrink-0 tabular-nums"
                        style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem',
                          ...(i === 0 ? { color: '#fbbf24' } : i === 1 ? { color: '#c8d4e8' } : { color: '#cd7f32' }) }}>
                        {buyer.buyCount} {lang === 'en' ? 'buys' : 'compras'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          ) : (
            /* Placeholder: ainda sem dados on-chain */
            <div className="leaderboard-panel" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.4))' }}>🏆</div>
              <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.72rem', letterSpacing: '0.14em',
                color: '#fbbf24', fontWeight: 700, marginBottom: '0.5rem' }}>
                {lang === 'en' ? 'NO CHAMPIONS YET' : 'NENHUM CAMPEÃO AINDA'}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, maxWidth: '28rem', margin: '0 auto' }}>
                {lang === 'en'
                  ? 'The first to buy or sell on ARCHERMES will claim the throne. The leaderboard updates live from the blockchain.'
                  : 'Os primeiros a comprar ou vender na ARCHERMES reivindicarão o trono. O placar atualiza em tempo real na blockchain.'}
              </p>
            </div>
          )}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-6" />
      </section>

      {/* ── LOJAS PARCEIRAS (compact circles) ── */}
      {lojasReais.length > 0 && (
        <section className="vitrine-container" style={{ paddingTop: '2rem', paddingBottom: '0' }}>
          <div className="flex items-center gap-3 mb-4">
            <span style={{ fontSize: '1rem', filter: 'drop-shadow(0 0 8px #00e5ff)' }}>⬡</span>
            <h2 className="text-sm font-black tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif", color: '#00e5ff',
                textShadow: '0 0 14px rgba(0,229,255,0.4)' }}>
              {t('section.partners')}
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 scroll-oculto flex-wrap">
            {lojasReais.map((store) => (
              <button
                key={store.address}
                onClick={() => verLoja(store.address)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={{
                    border: `2px solid ${store.neonColor}44`,
                    boxShadow: `0 0 0 rgba(0,0,0,0)`,
                    background: 'rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 16px ${store.neonColor}66`;
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${store.neonColor}99`;
                    (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 rgba(0,0,0,0)';
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${store.neonColor}44`;
                    (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                  }}>
                  {store.avatarUrl
                    ? <img src={store.avatarUrl} alt={store.storeName} className="w-full h-full object-cover" loading="lazy" />
                    : <span style={{ fontSize: '1.2rem', color: store.neonColor }}>⬡</span>}
                </div>
                <span className="text-[9px] font-bold tracking-wide text-center max-w-[56px] leading-tight truncate"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: store.neonColor, opacity: 0.8 }}>
                  {store.storeName}
                </span>
              </button>
            ))}
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-6" />
        </section>
      )}

      {/* ── MINHAS COMPRAS ── */}
      {isConnected && walletAddress && (
        <section className="mb-8 px-4 sm:px-0">
          <div className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <button
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
              onClick={() => {
                setShowMinhasCompras((v) => {
                  if (!v) void carregarMinhasCompras();
                  return !v;
                });
              }}>
              <span className="text-sm font-black tracking-widest uppercase"
                style={{ fontFamily: "'Orbitron', sans-serif", color: '#c084fc' }}>
                {t('purchases.show')}
              </span>
              <span className="text-white/30 text-xs tracking-widest">
                {showMinhasCompras ? t('purchases.hide') : '▼'}
              </span>
            </button>

            {showMinhasCompras && (
              <div className="border-t border-white/5 px-5 pb-5">
                {carregandoCompras ? (
                  <div className="flex items-center gap-3 py-8 text-white/30">
                    <div className="w-5 h-5 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                    <span className="text-xs tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                      {t('purchases.loading')}
                    </span>
                  </div>
                ) : minhasCompras.length === 0 ? (
                  <p className="text-white/20 text-xs py-8 text-center tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    {t('purchases.empty')}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3 mt-4">
                    {minhasCompras.map((compra) => {
                      const statusInfo =
                        compra.status === 0 ? { label: t('purchases.pending'),   cls: 'bg-yellow-500/10 border-yellow-400/30 text-yellow-400' }
                        : compra.status === 1 ? { label: t('purchases.shipped'),   cls: 'bg-cyan-500/10 border-cyan-400/30 text-cyan-400' }
                        : compra.status === 2 ? { label: t('purchases.delivered'), cls: 'bg-green-500/10 border-green-400/30 text-green-400' }
                        : { label: t('purchases.refunded'), cls: 'bg-white/5 border-white/10 text-white/40' };

                      return (
                        <div key={compra.orderId} className="rounded-xl border border-white/10 p-4 flex flex-col gap-3"
                          style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono text-white/20">Order #{compra.orderId}</span>
                                <span className={`text-[9px] border px-1.5 py-0.5 rounded-full font-bold tracking-widest ${statusInfo.cls}`}
                                  style={{ fontFamily: "'Orbitron', sans-serif" }}>
                                  {statusInfo.label}
                                </span>
                              </div>
                              <p className="text-sm font-bold text-white truncate" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                                {compra.itemName}
                              </p>
                              <p className="text-white/30 text-[10px] font-mono mt-0.5">
                                {t('vitrine.seller')} {abreviarEndereco(compra.seller)}
                              </p>
                            </div>
                            <span className="text-cyan-400 font-black text-sm flex-shrink-0" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                              {parseFloat(compra.amountEth).toFixed(6)} ETH
                            </span>
                          </div>

                          {/* Shipped: mostrar código de rastreio */}
                          {compra.status === 1 && compra.trackingCode && (
                            <div className="rounded-lg px-3 py-2 border border-cyan-400/20"
                              style={{ background: 'rgba(0,229,255,0.04)' }}>
                              <p className="text-[9px] text-cyan-400/60 tracking-widest uppercase mb-0.5" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                                {t('purchases.trackingCode')}
                              </p>
                              <p className="text-sm font-mono text-cyan-300">{compra.trackingCode}</p>
                            </div>
                          )}

                          {/* Pending: aguardando envio */}
                          {compra.status === 0 && (
                            <p className="text-yellow-400/70 text-[10px] tracking-wide" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                              ⏳ {t('purchases.waitingShipment')}
                            </p>
                          )}

                          {/* Shipped: botão de confirmar entrega — abre modal de avaliação */}
                          {compra.status === 1 && (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => setHomeRatingModal({ orderId: compra.orderId, hover: 0, selected: 0 })}
                                disabled={confirmandoId === compra.orderId}
                                className="btn-neon btn-neon-full"
                                style={{ borderColor: '#4ade80', color: confirmandoId === compra.orderId ? '#ffffff50' : '#4ade80', background: 'rgba(74,222,128,0.05)', fontSize: '0.7rem' }}>
                                {confirmandoId === compra.orderId ? t('purchases.confirming') : t('purchases.confirmBtn')}
                              </button>
                              {confirmErro[compra.orderId] && (
                                <p className="text-red-400 text-[10px]">{confirmErro[compra.orderId]}</p>
                              )}
                            </div>
                          )}

                          {/* Completed */}
                          {compra.status === 2 && (
                            <p className="text-green-400 text-[10px] font-bold tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                              ✓ {t('purchases.paymentReleased')}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {/* Suporte / Disputa */}
                    <div className="rounded-xl border border-white/5 p-4 flex flex-col gap-1 mt-2"
                      style={{ background: 'rgba(255,255,255,0.015)' }}>
                      <p className="text-white/30 text-[10px] tracking-wide">{t('purchases.dispute')}</p>
                      <a href="mailto:leosoares482@gmail.com" className="text-purple-400 text-[11px] font-bold hover:text-purple-300 transition-colors">
                        leosoares482@gmail.com
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── VITRINE ── */}
      <section className="vitrine-container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif", color: '#00e5ff',
                textShadow: '0 0 20px rgba(0,229,255,0.5)' }}>
              {t('section.vitrine')}
            </h2>
            <p className="text-white/40 text-sm mt-1 tracking-wide">
              {t('section.vitrineDesc')}
            </p>
          </div>
          <button onClick={carregarVitrine}
            className="text-xs text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-md
              hover:bg-cyan-400/10 transition-all duration-200 tracking-widest uppercase"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            {t('vitrine.refresh')}
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
                {cat === 'Todos' ? t('vitrine.all') : cat}
              </button>
            ))}
          </div>
        )}

        {carregandoVitrine && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <p className="text-cyan-400/60 text-sm tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {t('vitrine.loading')}
            </p>
          </div>
        )}

        {!carregandoVitrine && erroVitrine && (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-3xl">⚠️</span>
            <p className="text-red-400 text-sm">
              {erroVitrine === 'TIMEOUT' ? t('vitrine.timeout') : t('vitrine.error')}
            </p>
            <button onClick={() => void carregarVitrine()} className="text-xs text-cyan-400 underline mt-1">{t('vitrine.retry')}</button>
          </div>
        )}

        {!carregandoVitrine && !erroVitrine && vitrineVisivel.length === 0 && (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="text-5xl opacity-30">⬡</div>
            <p className="text-white/30 text-sm tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {t('vitrine.empty')}
            </p>
            {isConnected && (
              <button onClick={abrirModal}
                className="mt-2 text-xs text-cyan-400 border border-cyan-400/30 px-4 py-2 rounded-lg
                  hover:bg-cyan-400/10 transition-all duration-200">
                {t('vitrine.addFirst')}
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
                  {item.images && item.images.length > 0 && !itemImageErrors[item.id] ? (
                    <div className="card-gallery">
                      <div className="card-gallery-main-wrap">
                        <img
                          src={item.images[selectedImages[item.id] ?? 0]}
                          alt={item.itemName}
                          className="card-gallery-main"
                          loading="lazy"
                          onError={() => setItemImageErrors((prev) => ({ ...prev, [item.id]: true }))}
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
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white/30 text-[11px] tracking-wide font-mono">
                        {abreviarEndereco(item.seller)}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); verLoja(item.seller); }}
                        style={{
                          fontSize: '0.58rem', fontFamily: "'Orbitron', sans-serif",
                          letterSpacing: '0.08em', color: isPro ? '#fbbf24' : '#00e5ff',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          padding: '0', opacity: 0.7, whiteSpace: 'nowrap',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'}
                      >
                        {lang === 'en' ? 'Visit Store →' : 'Ver Loja →'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-white/30 tracking-widest uppercase mb-0.5">{t('vitrine.price')}</p>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      const base = `${window.location.origin}${window.location.pathname}`;
                      const refPart = isConnected && walletAddress ? `ref=${walletAddress}&` : '';
                      const url = `${base}?${refPart}item=${item.id}`;
                      void navigator.clipboard.writeText(url).then(() => {
                        setCopiedAffId(item.id);
                        setTimeout(() => setCopiedAffId(null), 2000);
                      });
                    }}
                    className="w-full py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-1.5"
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      background: copiedAffId === item.id
                        ? 'rgba(74,222,128,0.12)'
                        : 'rgba(255,255,255,0.04)',
                      border: copiedAffId === item.id
                        ? '1px solid rgba(74,222,128,0.4)'
                        : '1px solid rgba(255,255,255,0.08)',
                      color: copiedAffId === item.id ? '#4ade80' : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {copiedAffId === item.id ? (
                      <>{lang === 'en' ? '✓ Link copied!' : '✓ Link copiado!'}</>
                    ) : (
                      <>{lang === 'en' ? '🔗 Affiliate Link' : '🔗 Link de Afiliado'}</>
                    )}
                  </button>
                  {item.stock !== undefined && item.stock <= 0n ? (
                    <button
                      className="btn-neon btn-neon-full"
                      disabled
                      style={{ opacity: 0.45, cursor: 'not-allowed', letterSpacing: '0.12em' }}
                    >
                      {lang === 'en' ? '⛔ OUT OF STOCK' : '⛔ ESGOTADO'}
                    </button>
                  ) : walletAddress?.toLowerCase() === item.seller.toLowerCase() ? (
                    <button
                      className="btn-neon btn-neon-full"
                      style={{ borderColor: '#facc15', color: '#facc15', background: 'rgba(250,204,21,0.05)' }}
                      onClick={(e) => { e.stopPropagation(); alert(lang === 'en' ? 'Edit feature coming soon!' : 'Editar produto em breve!'); }}
                    >
                      <span>✏️ {lang === 'en' ? 'Edit Product' : 'Editar Produto'}</span>
                    </button>
                  ) : (
                    <button
                      className={`btn-neon btn-neon-full ${isPro ? 'btn-neon-gold' : 'btn-neon-cyan'}`}
                      onClick={() => abrirCompra(item)}
                    >
                      {isConnected ? t('vitrine.buyNow') : t('vitrine.connectToBuy')}
                    </button>
                  )}
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
        <h2>{t('section.categories')}</h2>
        <div className="grid-categorias">
          {([['👕', lang === 'en' ? 'Fashion' : 'Moda', 'Moda'],
             ['📱', lang === 'en' ? 'Electronics' : 'Eletrônicos', 'Eletrônicos'],
             ['💧', lang === 'en' ? 'Perfumes & Beauty' : 'Perfumes e Beleza', 'Perfumes e Beleza'],
             ['🎮', 'Games', 'Games']] as [string, string, string][]).map(([icone, label, filtroVal]) => (
            <button key={filtroVal} className="btn-nicho" onClick={() => setFiltroCategoria(filtroVal)}>
              <span className="icone">{icone}</span> {label}
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
                <h2>{t('modal.list.noWallet')}</h2>
                <p>{t('modal.list.noWalletDesc')}</p>
                <button className="btn-publicar" onClick={() => { void connect(); setEstado('idle'); }}>{t('modal.list.connectWallet')}</button>
                <button className="btn-sair" style={{ marginTop: '0.5rem', width: '100%' }} onClick={() => setEstado('idle')}>{t('modal.list.back')}</button>
              </div>
            )}

            {(estado === 'idle' || estado === 'erro') && (
              <>
                <div className="modal-topo">
                  <span className="modal-icone">⬡</span>
                  <h2>{t('modal.list.title')}</h2>
                  <p>{t('modal.list.subtitle')}</p>
                </div>
                <form className="modal-form" onSubmit={handlePublicar}>
                  <div className="campo">
                    <label>{t('modal.list.itemName')}</label>
                    <input name="nomeItem" type="text" placeholder={t('modal.list.itemNamePlaceholder')}
                      value={form.nomeItem} onChange={handleChange} required autoComplete="off" />
                  </div>
                  <div className="campo">
                    <label>{t('modal.list.price')}</label>
                    <input name="preco" type="number" placeholder={t('modal.list.pricePlaceholder')}
                      step="0.000000000000000001" min="0" value={form.preco} onChange={handleChange} required />
                  </div>
                  <div className="campo">
                    <label>{t('modal.list.category')}</label>
                    <select name="categoria" value={form.categoria} onChange={handleChange}
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#fff',
                        border: '1px solid rgba(0,229,255,0.18)', borderRadius: '8px',
                        padding: '0.65rem 1rem', width: '100%', fontSize: '0.9rem', outline: 'none' }}>
                      {CATEGORIAS.map((c) => <option key={c} value={c} style={{ background: '#0c1022' }}>{c}</option>)}
                    </select>
                  </div>

                  {/* Estoque (off-chain) */}
                  <div className="campo">
                    <label>{lang === 'en' ? 'Stock Quantity' : 'Quantidade em Estoque'}</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formEstoque}
                      onChange={(e) => setFormEstoque(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      placeholder={lang === 'en' ? 'Quantity available' : 'Qtd. disponível'}
                    />
                  </div>
                  <div className="campo">
                    <label>{t('modal.list.images')}</label>
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
                          <span className="upload-dropzone-text" style={{ color: '#00e5ff' }}>{t('modal.list.uploadLoading')}</span>
                          <span className="upload-dropzone-sub">{t('modal.list.uploadConverting')}</span>
                        </>
                      ) : (
                        <>
                          <span className="upload-dropzone-icon">📷</span>
                          <span className="upload-dropzone-text">{t('modal.list.uploadClick')}</span>
                          <span className="upload-dropzone-sub">{t('modal.list.uploadFormats')}</span>
                        </>
                      )}
                    </div>
                    {formImages.length > 0 && (
                      <div className="upload-thumb-list">
                        {formImages.map((file, idx) => (
                          <div key={idx} className="upload-thumb">
                            <img src={URL.createObjectURL(file)} alt={file.name} loading="lazy" />
                            {formImagesBase64[idx]
                              ? (
                                <span className="upload-thumb-saved" title={lang === 'en' ? 'Hosted on ImgBB' : 'Hospedado no ImgBB'}>☁︎</span>
                              ) : convertingImages ? (
                                <span className="upload-thumb-saved" style={{ color: '#facc15' }}>⟳</span>
                              ) : null
                            }
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

                  {estado === 'erro' && (
                    <div className="modal-erro" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span>⚠️ {erroMsg}</span>
                      <button
                        type="button"
                        onClick={() => { setEstado('idle'); setErroMsg(''); }}
                        style={{ background: 'none', border: 'none', color: '#00e5ff', cursor: 'pointer',
                          fontSize: '0.75rem', textDecoration: 'underline', textAlign: 'center',
                          fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.06em' }}
                      >
                        {lang === 'en' ? '← Try Again' : '← Tentar Novamente'}
                      </button>
                    </div>
                  )}
                  <button type="submit" className="btn-publicar">{t('modal.list.publish')}</button>
                </form>
              </>
            )}

            {estado === 'enviando' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone spinner">⟳</div>
                <h2>{t('modal.list.waiting')}</h2>
                <p>{t('modal.list.waitingDesc')}</p>
              </div>
            )}

            {estado === 'sucesso' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone">✓</div>
                <h2>{t('modal.list.success')}</h2>
                <p><strong>{form.nomeItem}</strong> {t('modal.list.successDesc')}</p>
                {txHash && <p className="contrato-info">TX: <code>{txHash.slice(0,12)}…{txHash.slice(-6)}</code></p>}
                {postListReloading ? (
                  <div className="flex items-center justify-center gap-2 mt-1 mb-1"
                    style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.08em' }}>
                    <div className="w-3 h-3 rounded-full border border-cyan-400 border-t-transparent animate-spin" />
                    {lang === 'en' ? 'Updating vitrine…' : 'Atualizando vitrine…'}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1 mt-1 mb-1"
                    style={{ color: 'rgba(74,222,128,0.75)', fontSize: '0.7rem', fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.08em' }}>
                    <span style={{ fontSize: '0.85rem' }}>✓</span>
                    {lang === 'en' ? 'Vitrine updated!' : 'Vitrine atualizada!'}
                  </div>
                )}
                <button onClick={fecharModal} className="btn-publicar">{t('modal.list.close')}</button>
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

            {(buyEstado === 'idle' || buyEstado === 'confirmando') && (
              <>
                <div className="modal-topo">
                  <span className="modal-icone">⚡</span>
                  <h2>{t('modal.buy.title')}</h2>
                  <p>{t('modal.buy.subtitle')}</p>
                </div>
                <div className="flex flex-col gap-4 mt-2">
                  <div className="rounded-xl border border-white/10 p-4 flex flex-col gap-2"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-xs text-white/40 tracking-widest uppercase"
                      style={{ fontFamily: "'Orbitron', sans-serif" }}>{t('modal.buy.product')}</p>
                    <p className="font-bold text-white text-sm"
                      style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.05em' }}>
                      {itemParaComprar.itemName}
                    </p>
                    <p className="text-white/30 text-xs font-mono">{t('vitrine.seller')} {abreviarEndereco(itemParaComprar.seller)}</p>
                    {itemParaComprar.category && (
                      <p className="text-white/30 text-xs">{t('vitrine.category')} {itemParaComprar.category}</p>
                    )}
                  </div>



                  {/* ── Resumo de preços ── */}
                  {(() => {
                    const cur = itemParaComprar.currency ?? 'ETH';
                    const meta = cur !== 'ETH' ? STABLECOIN_META[cur as StablecoinSymbol] : null;
                    const priceNum = parseFloat(itemParaComprar.priceEth);
                    const shippingNum = parseFloat(SHIPPING_FEE_ETH);
                    const totalNum = priceNum + shippingNum;
                    const priceDisplay = meta
                      ? formatStablecoinPrice(itemParaComprar.priceEth, cur as StablecoinSymbol)
                      : priceNum.toFixed(4);
                    const totalDisplay = meta
                      ? formatStablecoinPrice(totalNum.toFixed(6), cur as StablecoinSymbol)
                      : totalNum.toFixed(4);
                    const cor = meta?.cor ?? '#00e5ff';
                    const fundo = meta?.corFundo ?? 'rgba(0,229,255,0.04)';
                    const borda = meta ? meta.cor + '33' : 'rgba(0,229,255,0.2)';
                    return (
                      <div className="rounded-xl border p-4 flex flex-col gap-2"
                        style={{ background: fundo, borderColor: borda }}>
                        {/* Preço do produto */}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/50">{lang === 'en' ? 'Product' : 'Produto'}</span>
                          <span className="text-white/80 font-mono">
                            {priceDisplay}{cur === 'ETH' && <span className="text-white/40 ml-1 text-xs">ETH</span>}
                          </span>
                        </div>
                        {/* Taxa de entrega */}
                        {cur === 'ETH' && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-white/50">{lang === 'en' ? 'Shipping fee' : 'Taxa de entrega'}</span>
                            <span className="text-white/80 font-mono">
                              {SHIPPING_FEE_ETH}<span className="text-white/40 ml-1 text-xs">ETH</span>
                            </span>
                          </div>
                        )}
                        <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-white/50 tracking-widest uppercase"
                              style={{ fontFamily: "'Orbitron', sans-serif" }}>{t('modal.buy.total')}</span>
                            {meta && (
                              <span className="currency-badge" style={{
                                color: meta.cor, background: meta.corFundo, borderColor: meta.cor + '55',
                              }}>{cur}</span>
                            )}
                          </div>
                          <span className="text-2xl font-black"
                            style={{ fontFamily: "'Orbitron', sans-serif", color: cor,
                              textShadow: `0 0 12px ${cor}66` }}>
                            {totalDisplay}
                            {cur === 'ETH' && <span className="text-sm text-white/40 ml-1 font-normal">ETH</span>}
                          </span>
                        </div>
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
                          {t('modal.buy.affiliateActive')}
                        </p>
                        <p className="text-white/30 text-[10px] font-mono">{abreviarEndereco(refAddress)}</p>
                      </div>
                      <span className="ml-auto text-green-400/60 text-[10px]">{t('modal.buy.affiliateCommission')}</span>
                    </div>
                  )}

                  {/* Compra Segura toggle */}
                  {(() => {
                    const cur = itemParaComprar.currency ?? 'ETH';
                    const isEth = cur === 'ETH';
                    return (
                      <div className={`rounded-xl border p-3 flex items-start gap-3 ${isEth ? 'border-cyan-400/25' : 'border-white/10'}`}
                        style={{ background: isEth ? 'rgba(0,229,255,0.04)' : 'rgba(255,255,255,0.02)' }}>
                        <span className="text-lg mt-0.5">🔒</span>
                        <div className="flex-1">
                          <p className="text-[11px] font-bold tracking-widest mb-0.5"
                            style={{ fontFamily: "'Orbitron', sans-serif", color: isEth ? '#00e5ff' : '#ffffff60' }}>
                            {t('escrow.toggle')}
                          </p>
                          <p className="text-white/30 text-[10px] leading-relaxed">
                            {isEth ? t('escrow.desc') : t('escrow.usdc')}
                          </p>
                        </div>
                        {isEth && (
                          <button
                            onClick={() => setEscrowAtivo((v) => !v)}
                            className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors ${escrowAtivo ? 'bg-cyan-400' : 'bg-white/15'}`}
                            aria-label="Toggle escrow">
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${escrowAtivo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  <button
                    onClick={buyEstado === 'idle' ? confirmarCompra : undefined}
                    className="btn-publicar"
                    disabled={buyEstado === 'confirmando'}
                    style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {buyEstado === 'confirmando' ? (
                      <>
                        <span className="btn-spinner" />
                        {(itemParaComprar?.currency === 'USDC' || itemParaComprar?.currency === 'EURC')
                          ? (lang === 'en' ? 'Confirm 2 txs in wallet…' : 'Confirme 2 txs na carteira…')
                          : (lang === 'en' ? 'Confirm in wallet…' : 'Confirme na carteira…')}
                      </>
                    ) : t('modal.buy.confirm')}
                  </button>
                </div>
              </>
            )}

            {buyEstado === 'sucesso' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone" style={{ borderColor: '#4ade80', color: '#4ade80',
                  boxShadow: '0 0 24px rgba(74,222,128,0.35)' }}>✓</div>
                <h2 style={{ color: '#4ade80' }}>{t('modal.buy.success')}</h2>
                <p><strong>{itemParaComprar?.itemName}</strong> {lang === 'en' ? 'is yours!' : 'é seu!'}</p>
                {buyTx && <p className="contrato-info">TX: <code>{buyTx.slice(0,12)}…{buyTx.slice(-6)}</code></p>}
                <button onClick={() => { setItemParaComprar(null); setBuyEstado('idle'); }} className="btn-publicar">
                  {t('modal.list.close')}
                </button>
              </div>
            )}

            {buyEstado === 'erro' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone" style={{ borderColor: '#f87171', color: '#f87171' }}>✕</div>
                <h2>{t('modal.buy.error')}</h2>
                <div className="modal-erro" style={{ maxWidth: '100%', wordBreak: 'break-word' }}>
                  {buyErro}
                </div>
                <button onClick={() => setBuyEstado('idle')} className="btn-publicar" style={{ marginTop: '0.5rem' }}>
                  {t('modal.buy.retry')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HOME RATING MODAL (7 estrelas — Minhas Compras) ── */}
      {homeRatingModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
          onClick={() => setHomeRatingModal(null)}>
          <div
            className="relative rounded-2xl p-7 flex flex-col gap-5 items-center"
            style={{
              background: 'linear-gradient(145deg, rgba(10,13,26,0.98), rgba(16,20,40,0.98))',
              border: '1.5px solid rgba(74,222,128,0.3)',
              boxShadow: '0 0 60px rgba(74,222,128,0.15), 0 0 120px rgba(0,229,255,0.08)',
              maxWidth: '380px', width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setHomeRatingModal(null)}
              className="absolute top-3 right-4 text-white/30 hover:text-white/60 text-lg transition-colors">
              ✕
            </button>
            <div className="text-center">
              <p className="text-xs font-black tracking-widest uppercase mb-1"
                style={{ fontFamily: "'Orbitron', sans-serif", color: '#4ade80', textShadow: '0 0 12px rgba(74,222,128,0.4)' }}>
                {lang === 'en' ? '⭐ RATE THIS SELLER' : '⭐ AVALIAR VENDEDOR'}
              </p>
              <p className="text-white/40 text-[11px]">
                {lang === 'en'
                  ? 'Select a rating before releasing payment'
                  : 'Escolha uma nota antes de liberar o pagamento'}
              </p>
            </div>
            <div className="flex gap-2">
              {[1,2,3,4,5,6,7].map((star) => {
                const active = star <= (homeRatingModal.hover || homeRatingModal.selected);
                return (
                  <button
                    key={star}
                    onMouseEnter={() => setHomeRatingModal((m) => m ? { ...m, hover: star } : m)}
                    onMouseLeave={() => setHomeRatingModal((m) => m ? { ...m, hover: 0 } : m)}
                    onClick={() => setHomeRatingModal((m) => m ? { ...m, selected: star } : m)}
                    style={{
                      fontSize: '1.8rem',
                      filter: active ? 'drop-shadow(0 0 6px rgba(251,191,36,0.7))' : 'none',
                      opacity: active ? 1 : 0.25,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      transform: active ? 'scale(1.15)' : 'scale(1)',
                      background: 'none', border: 'none', padding: '0.1rem',
                    }}>
                    ★
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] font-bold tracking-widest text-center"
              style={{ fontFamily: "'Orbitron', sans-serif", color: homeRatingModal.selected > 0 ? '#fbbf24' : 'rgba(255,255,255,0.2)', minHeight: '1.2rem' }}>
              {homeRatingModal.selected > 0
                ? `${homeRatingModal.selected}/7 ${lang === 'en' ? 'stars' : 'estrelas'}`
                : lang === 'en' ? 'Tap a star to rate' : 'Toque em uma estrela'}
            </p>
            <button
              onClick={() => {
                if (homeRatingModal.selected < 1) return;
                void handleConfirmarRecebimento(homeRatingModal.orderId, homeRatingModal.selected);
              }}
              disabled={homeRatingModal.selected < 1}
              className="w-full py-3 rounded-xl font-black tracking-widest uppercase text-sm transition-all"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                background: homeRatingModal.selected > 0 ? 'rgba(74,222,128,0.18)' : 'rgba(74,222,128,0.05)',
                border: homeRatingModal.selected > 0 ? '1.5px solid rgba(74,222,128,0.6)' : '1.5px solid rgba(74,222,128,0.15)',
                color: homeRatingModal.selected > 0 ? '#4ade80' : 'rgba(74,222,128,0.3)',
                boxShadow: homeRatingModal.selected > 0 ? '0 0 20px rgba(74,222,128,0.2)' : 'none',
                cursor: homeRatingModal.selected > 0 ? 'pointer' : 'not-allowed',
              }}>
              {lang === 'en' ? '✅ CONFIRM & RELEASE PAYMENT' : '✅ CONFIRMAR & LIBERAR PAGAMENTO'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
