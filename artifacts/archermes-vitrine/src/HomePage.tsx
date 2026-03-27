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
import { getStoreRegistry, getBoostedProducts, getNeonShadow, saveStoreToRegistry, type RegistryStore, type BoostedProduct as BoostedProductEntry } from './registry';
import { uploadImages, resolveImgUrl, saveImageMap, syncImageMapToStorage } from './imageUploader';
import { useVitrineSync, broadcastVitrineEvent } from './vitrineSync';
import './Home.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** Treasury / contract owner — mirrors the on-chain `owner()` return value. */
const TREASURY_WALLET = '0x434189487484F20B9Bf0e0c28C1559B0c961274B';
/** Must stay in sync with on-chain platformFeePercent (currently 3). */
const PLATFORM_FEE_PERCENT = 3n;
/** Must stay in sync with on-chain referralFeePercent (currently 1). */
const REFERRAL_FEE_PERCENT = 1n;

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

interface ItemComprado {
  id: number;
  itemName: string;
  priceEth: string;
  category: string;
  seller: string;
  buyer: string;
  isSold: boolean;
  isDelivered: boolean;
  isRefunded: boolean;
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
    carregarDadosLocais();
    const onFocus = () => carregarDadosLocais();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
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

  // Escrow / Compra Segura
  const [escrowAtivo, setEscrowAtivo] = useState(true);

  // Minhas Compras (histórico do comprador)
  const [showMinhasCompras, setShowMinhasCompras] = useState(false);
  const [minhasCompras, setMinhasCompras] = useState<ItemComprado[]>([]);
  const [carregandoCompras, setCarregandoCompras] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [confirmErro, setConfirmErro] = useState<Record<number, string>>({});

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
          const it = item as { isSold?: boolean; isActive?: boolean };
          return !it.isSold && !!it.isActive;
        })
        .map((item) => {
          const it = item as { id: bigint; itemName: string; price: bigint; category: string; seller: string };
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
          let customizacao = { avatarUrl: '', bannerUrl: '', neonColor: '#00e5ff' };
          try {
            const raw = localStorage.getItem(`archermes_customizacao_${addr}`);
            if (raw) customizacao = JSON.parse(raw) as typeof customizacao;
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
          saveStoreToRegistry(entry);
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
        void carregarVitrine();
      }
    }, 800);
  });

  // ── MINHAS COMPRAS ──
  const carregarMinhasCompras = useCallback(async () => {
    if (!walletAddress) return;
    setCarregandoCompras(true);
    try {
      const provider = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
      const iface = new Interface(CONTRACT_ABI);
      const buyerTopic = '0x' + walletAddress.slice(2).toLowerCase().padStart(64, '0');
      const eventFragment = iface.getEvent('ItemBought');
      if (!eventFragment) throw new Error('Event not found');
      const logs = await provider.getLogs({
        address: CONTRACT_ADDRESS,
        topics: [eventFragment.topicHash, null, buyerTopic],
        fromBlock: 0,
        toBlock: 'latest',
      });
      const ids = logs.map((l) => {
        const parsed = iface.parseLog({ topics: [...l.topics], data: l.data });
        return Number(parsed!.args[0] as bigint);
      });
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const compras = await Promise.all(
        ids.map(async (id) => {
          const it = await contrato.items(id);
          return {
            id,
            itemName: it.itemName as string,
            priceEth: formatUnits(it.price as bigint, 18),
            category: it.category as string,
            seller: it.seller as string,
            buyer: it.buyer as string,
            isSold: it.isSold as boolean,
            isDelivered: it.isDelivered as boolean,
            isRefunded: it.isRefunded as boolean,
          } satisfies ItemComprado;
        })
      );
      setMinhasCompras(compras.filter((c) => c.isSold));
    } catch { /* ignore */ }
    setCarregandoCompras(false);
  }, [walletAddress]);

  async function handleConfirmarRecebimento(id: number) {
    if (!isConnected) return;
    setConfirmandoId(id);
    setConfirmErro((p) => ({ ...p, [id]: '' }));
    try {
      await switchToArc();
      const provider = getProvider();
      if (!provider) throw new Error('No provider');
      const signer = await provider.getSigner();
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contrato.confirmDelivery(id);
      await tx.wait();
      await carregarMinhasCompras();
      broadcastVitrineEvent({ type: 'product:sold', id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConfirmErro((p) => ({ ...p, [id]: msg.slice(0, 100) }));
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
    setModalAberto(true);
  }
  function fecharModal() { setModalAberto(false); setEstado('idle'); setFormImages([]); setFormImagesBase64([]); }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handlePublicar(e: React.FormEvent) {
    e.preventDefault();
    setEstado('enviando'); setErroMsg('');
    // Verificar limite do plano grátis (10 produtos)
    const minhaLojaReg = lojasReais.find((s) => s.address.toLowerCase() === walletAddress?.toLowerCase());
    if (minhaLojaReg && minhaLojaReg.tier === 0 && minhaLojaReg.productCount >= 10) {
      setErroMsg(t('pro.limitReached'));
      setEstado('erro');
      return;
    }
    try {
      if (!isConnected) { setEstado('sem-carteira'); return; }
      await switchToArc();
      const provider = getProvider();
      if (!provider) { setEstado('sem-carteira'); return; }
      const signer = await provider.getSigner();
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const precoWei = parseUnits(form.preco, 18);
      const tx = await contrato.listItem(form.nomeItem, precoWei, form.categoria);
      await tx.wait();
      // Salvar imagens no localStorage E no servidor (para outros clientes verem)
      if (formImagesBase64.length > 0) {
        try {
          const newTotal: bigint = await contrato.totalItems();
          const newId = Number(newTotal);
          localStorage.setItem(`archermes_item_images_${newId}`, JSON.stringify(formImagesBase64));
          // Push hosted URLs to the API image-map so all clients can load them
          void saveImageMap(newId, formImagesBase64);
        } catch { /* ignore */ }
      }
      setTxHash(tx.hash);
      setEstado('sucesso');
      // Arc Testnet RPC nodes can take 1-3 s to propagate a new block to eth_call.
      // Fire a first reload after 2 s so the new product appears automatically,
      // and a safety retry at 6 s in case of slower nodes.
      const reloadAndBroadcast = () => {
        carregarVitrine();
        broadcastVitrineEvent({ type: 'product:listed', id: 0 });
      };
      setTimeout(reloadAndBroadcast, 2000);
      setTimeout(() => carregarVitrine(), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErroMsg(msg.length > 140 ? msg.slice(0, 140) + '…' : msg);
      setEstado('erro');
    }
  }

  // ── COMPRA ──
  function abrirCompra(item: ItemBlockchain) {
    if (!isConnected) { void connect(); return; }
    setItemParaComprar(item);
    setBuyEstado('idle');
    setBuyErro('');
    setBuyTx('');
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
        const priceWei = parseUnits(itemParaComprar.priceEth, 18);
        const tx = await contrato.buyItem(itemParaComprar.id, referrer, { value: priceWei });
        await tx.wait();
        setBuyTx(tx.hash);
      } else {
        // ── ERC-20 flow (USDC / EURC) ──────────────────────────────────────────
        // Fee distribution mirrors the on-chain logic for ETH purchases:
        //   PLATFORM_FEE_PERCENT % → TREASURY_WALLET
        //   REFERRAL_FEE_PERCENT % → referrer (if present)
        //   remainder             → seller
        const tokenAddress = STABLECOIN_ADDRESSES[currency];
        const totalAmount = toTokenAmount(itemParaComprar.priceEth, currency);
        const platformFeeAmount = totalAmount * PLATFORM_FEE_PERCENT / 100n;
        const referralFeeAmount = referrer !== ZERO_ADDRESS ? totalAmount * REFERRAL_FEE_PERCENT / 100n : 0n;
        const sellerAmount = totalAmount - platformFeeAmount - referralFeeAmount;

        // Step 1: platform fee → treasury
        const feeTx = await transferERC20(signer, tokenAddress, TREASURY_WALLET, platformFeeAmount);
        await feeTx.wait();

        // Step 2: referral fee → referrer (if present)
        if (referrer !== ZERO_ADDRESS && referralFeeAmount > 0n) {
          const refTx = await transferERC20(signer, tokenAddress, referrer, referralFeeAmount);
          await refTx.wait();
        }

        // Step 3: seller receives the remainder
        const transferTx = await transferERC20(signer, tokenAddress, itemParaComprar.seller, sellerAmount);
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
  if (pagina === 'loja-view') {
    return (
      <>
        <StoreView
          storeAddress={lojaAtiva}
          storeInfo={lojasReais.find((s) => s.address.toLowerCase() === lojaAtiva.toLowerCase())}
          allItems={vitrine as StoreItem[]}
          sellersPro={sellersPro}
          isConnected={isConnected}
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
              {buyEstado === 'confirmando' && (
                <div className="modal-sucesso">
                  <div className="sucesso-icone" style={{ color: '#00e5ff' }}>⏳</div>
                  <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.9rem', letterSpacing: '0.1em' }}>
                    {lang === 'en' ? 'Confirm in your wallet...' : 'Confirme na sua carteira...'}
                  </h2>
                </div>
              )}
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
              {buyEstado === 'idle' && itemParaComprar && (
                <div style={{ padding: '0.5rem' }}>
                  <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem', letterSpacing: '0.08em', marginBottom: '1rem', color: '#00e5ff' }}>
                    {lang === 'en' ? 'Confirm Purchase' : 'Confirmar Compra'}
                  </h2>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{itemParaComprar.itemName}</p>
                  <p className="text-white/30 text-xs font-mono">{t('vitrine.seller')} {abreviarEndereco(itemParaComprar.seller)}</p>
                  <div style={{ margin: '1.25rem 0', padding: '0.75rem', background: 'rgba(0,229,255,0.06)', borderRadius: '0.5rem', border: '1px solid rgba(0,229,255,0.15)' }}>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.2rem', fontWeight: 900, color: '#00e5ff' }}>
                      {parseFloat(itemParaComprar.priceEth).toFixed(4)} ETH
                    </span>
                  </div>
                  <button className="btn-neon btn-neon-full btn-neon-cyan" onClick={() => void confirmarCompra()}>
                    {t('vitrine.buyNow')}
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
        {pagina === 'minha-loja' && <StoreDashboard onVoltar={() => { setPagina('home'); carregarDadosLocais(); }} />}
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
            <button onClick={abrirModal} className="btn-anunciar">{t('nav.list')}</button>
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

      {/* ── LOJAS VIP ── */}
      {lojasVip.length > 0 && (
        <section className="vitrine-container" style={{ paddingTop: '2rem', paddingBottom: '0.5rem' }}>
          <div className="flex items-center gap-3 mb-5">
            <span className="text-lg" style={{ filter: 'drop-shadow(0 0 8px #fbbf24)' }}>⚡</span>
            <h2 className="text-base font-black tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif", color: '#fbbf24',
                textShadow: '0 0 16px rgba(251,191,36,0.5)' }}>
              {t('section.featured')}
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
                    {loja.productCount} {lang === 'en'
                      ? `product${loja.productCount !== 1 ? 's' : ''}`
                      : `produto${loja.productCount !== 1 ? 's' : ''}`}
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
              {t('section.partners')}
            </h2>
            <p className="text-white/30 text-xs tracking-wide mt-0.5">
              {t('section.partnersDesc')}
            </p>
          </div>
        </div>
        <div className="parceiras-scroll">
          {(lojasReais.length > 0 ? lojasReais.map((store): LojaParceiraMock => ({
            id: store.address,
            nome: store.storeName,
            cor: store.neonColor,
            corSombra: getNeonShadow(store.neonColor),
            banner: store.bannerUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=100&fit=crop',
            logo: store.avatarUrl || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=80&h=80&fit=crop',
            produtos: produtosImpulsionados
              .filter((p) => p.storeAddress.toLowerCase() === store.address.toLowerCase())
              .slice(0, 4)
              .map((p) => p.image),
          })) : MOCK_LOJAS_PARCEIRAS).map((loja) => (
            <div key={loja.id} className="parceira-card"
              role="button"
              tabIndex={0}
              style={{ borderColor: loja.cor + '30', cursor: 'pointer' }}
              onClick={() => verLoja(loja.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') verLoja(loja.id); }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 28px ${loja.corSombra}`;
                (e.currentTarget as HTMLDivElement).style.borderColor = loja.cor + '66';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                (e.currentTarget as HTMLDivElement).style.borderColor = loja.cor + '30';
                (e.currentTarget as HTMLDivElement).style.transform = '';
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
                  {loja.produtos.length > 0 ? loja.produtos.map((img, i) => (
                    <img key={i} src={img} alt="" className="parceira-thumb" loading="lazy" />
                  )) : (
                    <div className="col-span-2 flex items-center justify-center h-full opacity-20 text-xs tracking-widest"
                      style={{ fontFamily: "'Orbitron', sans-serif", color: loja.cor }}>
                      ⬡
                    </div>
                  )}
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
                    {minhasCompras.map((compra) => (
                      <div key={compra.id} className="rounded-xl border border-white/10 p-4 flex flex-col gap-3"
                        style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono text-white/20">#{compra.id}</span>
                              {compra.isRefunded && (
                                <span className="text-[9px] bg-yellow-500/10 border border-yellow-400/30 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                                  {t('purchases.refunded')}
                                </span>
                              )}
                              {compra.isDelivered && !compra.isRefunded && (
                                <span className="text-[9px] bg-green-500/10 border border-green-400/30 text-green-400 px-1.5 py-0.5 rounded-full font-bold tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                                  {t('purchases.delivered')}
                                </span>
                              )}
                              {!compra.isDelivered && !compra.isRefunded && (
                                <span className="text-[9px] bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                                  {t('purchases.pending')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-white truncate" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                              {compra.itemName}
                            </p>
                            <p className="text-white/30 text-[10px] font-mono mt-0.5">
                              {t('vitrine.seller')} {abreviarEndereco(compra.seller)}
                            </p>
                          </div>
                          <span className="text-cyan-400 font-black text-sm flex-shrink-0" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                            {parseFloat(compra.priceEth).toFixed(4)} ETH
                          </span>
                        </div>

                        {!compra.isDelivered && !compra.isRefunded && (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => void handleConfirmarRecebimento(compra.id)}
                              disabled={confirmandoId === compra.id}
                              className="btn-neon btn-neon-full"
                              style={{ borderColor: '#4ade80', color: confirmandoId === compra.id ? '#ffffff50' : '#4ade80', background: 'rgba(74,222,128,0.05)', fontSize: '0.7rem' }}>
                              {confirmandoId === compra.id ? t('purchases.confirming') : t('purchases.confirmBtn')}
                            </button>
                            {confirmErro[compra.id] && (
                              <p className="text-red-400 text-[10px]">{confirmErro[compra.id]}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

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
                  <button
                    className={`btn-neon btn-neon-full ${isPro ? 'btn-neon-gold' : 'btn-neon-cyan'}`}
                    onClick={() => abrirCompra(item)}
                  >
                    {isConnected ? t('vitrine.buyNow') : t('vitrine.connectToBuy')}
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
                  {/* Upload de imagens */}
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
                <div className="flex items-center justify-center gap-2 mt-1 mb-1"
                  style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.08em' }}>
                  <div className="w-3 h-3 rounded-full border border-cyan-400 border-t-transparent animate-spin" />
                  {lang === 'en' ? 'Updating vitrine…' : 'Atualizando vitrine…'}
                </div>
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

            {buyEstado === 'idle' && (
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
                            style={{ fontFamily: "'Orbitron', sans-serif" }}>{t('modal.buy.total')}</span>
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

                  <button onClick={confirmarCompra} className="btn-publicar" style={{ marginTop: '0.5rem' }}>
                    {t('modal.buy.confirm')}
                  </button>
                </div>
              </>
            )}

            {buyEstado === 'confirmando' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone spinner">⟳</div>
                <h2>{t('modal.buy.processing')}</h2>
                {(itemParaComprar?.currency === 'USDC' || itemParaComprar?.currency === 'EURC') ? (
                  <p>{lang === 'en'
                    ? <>Confirm the <strong>2 transactions</strong> in your wallet: <em>Approve</em> then the transfer.</>
                    : <>Confirme as <strong>2 transações</strong> na sua carteira: <em>Approve</em> e depois a transferência.</>}
                  </p>
                ) : (
                  <p>{t('modal.buy.confirmingDesc')}</p>
                )}
              </div>
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
    </div>
  );
}
