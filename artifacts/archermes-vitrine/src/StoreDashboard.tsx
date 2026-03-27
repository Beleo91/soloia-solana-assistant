import { useState, useEffect, useRef, type ChangeEvent, type DragEvent } from 'react';
import { BrowserProvider, Contract, JsonRpcProvider, formatUnits } from 'ethers';
import { useWallet } from './walletContext';
import { useLang } from './i18n';
import { arcTestnet } from './chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';
import { saveStoreToRegistry, addBoostedProduct, getItemImages, getNeonShadow } from './registry';
import { uploadImage } from './imageUploader';
import { transferERC20, STABLECOIN_ADDRESSES, toTokenAmount } from './stablecoins';
import { broadcastVitrineEvent } from './vitrineSync';

const TREASURY_WALLET = '0x434189487484F20B9Bf0e0c28C1559B0c961274B';
const BOOST_PRICE_USDC = '5';

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
  imageUrl?: string;
  isBoosted?: boolean;
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
const LS_DELETED_KEY = 'archermes_deleted_items';

const PRESET_BANNERS = [
  { id: 'b1', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=160&fit=crop', label: 'Circuit' },
  { id: 'b2', url: 'https://images.unsplash.com/photo-1614680376739-414d95ff43df?w=600&h=160&fit=crop', label: 'Neon Haze' },
  { id: 'b3', url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600&h=160&fit=crop', label: 'Data Grid' },
  { id: 'b4', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=160&fit=crop', label: 'Retro Cyber' },
];

const PRESET_AVATARS = [
  { id: 'a1', url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=120&h=120&fit=crop', label: 'Robô' },
  { id: 'a2', url: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=120&h=120&fit=crop', label: 'Cyber' },
  { id: 'a3', url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=120&h=120&fit=crop', label: 'A.I.' },
  { id: 'a4', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop', label: 'Matrix' },
];

type DashEstado = 'idle' | 'criando' | 'sucesso' | 'erro';

export default function StoreDashboard({ onVoltar }: { onVoltar: () => void }) {
  const { isConnected, connect, address: walletAddress, switchToArc, getProvider } = useWallet();
  const { t, lang } = useLang();

  const [loja, setLoja] = useState<StoreInfo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [nomeLoja, setNomeLoja] = useState('');
  const [planoPro, setPlanoPro] = useState(false);
  const [estado, setEstado] = useState<DashEstado>('idle');
  const [erroMsg, setErroMsg] = useState('');
  const [basicFee, setBasicFee] = useState('0.01');
  const [proFee, setProFee] = useState('0.05');

  const [meusProdutos, setMeusProdutos] = useState<MeuProduto[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);

  const [abaAtiva, setAbaAtiva] = useState<'loja' | 'produtos' | 'visual'>('loja');

  const [customizacao, setCustomizacao] = useState<Customizacao>({ avatarUrl: '', bannerUrl: '', neonColor: '#00e5ff' });

  const [rastreioId, setRastreioId] = useState<number | null>(null);
  const [rastreioCode, setRastreioCode] = useState('');
  const [txStatus, setTxStatus] = useState<Record<number, string>>({});

  const [dragOverBanner, setDragOverBanner] = useState(false);
  const [dragOverAvatar, setDragOverAvatar] = useState(false);
  const [convertingBanner, setConvertingBanner] = useState(false);
  const [convertingAvatar, setConvertingAvatar] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [boostProd, setBoostProd] = useState<MeuProduto | null>(null);
  const [boostEstado, setBoostEstado] = useState<'idle' | 'processando' | 'sucesso' | 'erro'>('idle');
  const [boostTxHash, setBoostTxHash] = useState('');
  const [boostErro, setBoostErro] = useState('');

  const enderecoUsuario = walletAddress ?? '';

  // Carregar customização do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${LS_KEY}_${enderecoUsuario}`);
      if (saved) setCustomizacao(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [enderecoUsuario]);

  // Carregar IDs excluídos do localStorage
  useEffect(() => {
    if (!enderecoUsuario) return;
    try {
      const saved = localStorage.getItem(`${LS_DELETED_KEY}_${enderecoUsuario}`);
      if (saved) setDeletedIds(new Set(JSON.parse(saved) as number[]));
    } catch { /* ignore */ }
  }, [enderecoUsuario]);

  function salvarCustomizacao(next: Customizacao) {
    setCustomizacao(next);
    try { localStorage.setItem(`${LS_KEY}_${enderecoUsuario}`, JSON.stringify(next)); } catch { /* ignore */ }
    if (loja?.storeName && enderecoUsuario) {
      saveStoreToRegistry({
        address: enderecoUsuario,
        storeName: loja.storeName,
        avatarUrl: next.avatarUrl,
        bannerUrl: next.bannerUrl,
        neonColor: next.neonColor,
        tier: loja.tier,
        productCount: Number(loja.productCount),
      });
      broadcastVitrineEvent({ type: 'profile:updated', address: enderecoUsuario });
    }
  }

  useEffect(() => {
    if (!enderecoUsuario || !loja?.storeName) return;
    saveStoreToRegistry({
      address: enderecoUsuario,
      storeName: loja.storeName,
      avatarUrl: customizacao.avatarUrl,
      bannerUrl: customizacao.bannerUrl,
      neonColor: customizacao.neonColor,
      tier: loja.tier,
      productCount: Number(loja.productCount),
    });
  }, [loja, customizacao, enderecoUsuario]);

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleBannerFile(file: File) {
    setConvertingBanner(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadImage(base64);
      salvarCustomizacao({ ...customizacao, bannerUrl: result.url });
    } finally {
      setConvertingBanner(false);
    }
  }

  async function handleAvatarFile(file: File) {
    setConvertingAvatar(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadImage(base64);
      salvarCustomizacao({ ...customizacao, avatarUrl: result.url });
    } finally {
      setConvertingAvatar(false);
    }
  }

  function onBannerInput(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) void handleBannerFile(e.target.files[0]);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  }

  function onAvatarInput(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) void handleAvatarFile(e.target.files[0]);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }

  function onBannerDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragOverBanner(false);
    if (e.dataTransfer.files?.[0]) void handleBannerFile(e.dataTransfer.files[0]);
  }

  function onAvatarDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragOverAvatar(false);
    if (e.dataTransfer.files?.[0]) void handleAvatarFile(e.dataTransfer.files[0]);
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
          const imgs = getItemImages(Number(item.id));
          const boostedRaw = localStorage.getItem(`archermes_boosted_products`);
          const boostedList = boostedRaw ? (JSON.parse(boostedRaw) as Array<{ id: number }>) : [];
          const isBoosted = boostedList.some((b) => b.id === Number(item.id));
          lista.push({
            id: Number(item.id),
            itemName: item.itemName,
            priceEth: formatUnits(item.price, 18),
            category: item.category,
            isActive: item.isActive,
            isSold: item.isSold,
            imageUrl: imgs[0],
            isBoosted,
          });
        }
      }
      setMeusProdutos(lista.filter((p) => !deletedIds.has(p.id)));
    } catch (err) { console.error(err); } finally { setCarregandoProdutos(false); }
  };

  useEffect(() => {
    if (abaAtiva === 'produtos' && isConnected) carregarMeusProdutos();
  }, [abaAtiva, isConnected, enderecoUsuario]);

  async function handleCriarLoja(isPro: boolean) {
    if (!nomeLoja.trim()) { setErroMsg('Digite o nome da sua loja.'); return; }
    if (!isConnected) return;
    setEstado('criando'); setErroMsg('');
    try {
      await switchToArc();
      const provider = getProvider(); if (!provider) return;
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
    if (!isConnected) return;
    setTxStatus((p) => ({ ...p, [id]: 'cancelando' }));
    try {
      await switchToArc();
      const provider = getProvider(); if (!provider) return;
      const signer = await provider.getSigner();
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contrato.cancelItem(id);
      await tx.wait();
      setTxStatus((p) => ({ ...p, [id]: 'cancelado' }));
      carregarMeusProdutos();
    } catch { setTxStatus((p) => ({ ...p, [id]: 'erro' })); }
  }

  function handleExcluirItem(id: number) {
    const confirmado = window.confirm('Tem certeza que deseja excluir este anúncio permanentemente?');
    if (confirmado) {
      const next = new Set(deletedIds);
      next.add(id);
      setDeletedIds(next);
      setMeusProdutos((prev) => prev.filter((p) => p.id !== id));
      try {
        localStorage.setItem(`${LS_DELETED_KEY}_${enderecoUsuario}`, JSON.stringify([...next]));
      } catch { /* ignore */ }
    }
  }

  async function handleBoost(prod: MeuProduto) {
    if (!isConnected) { void connect(); return; }
    setBoostEstado('processando');
    setBoostTxHash('');
    setBoostErro('');
    try {
      await switchToArc();
      const provider = getProvider();
      if (!provider) throw new Error('No provider');
      const signer = await provider.getSigner();

      const usdcAddress = STABLECOIN_ADDRESSES['USDC'];
      const boostAmount = toTokenAmount(BOOST_PRICE_USDC, 'USDC');
      const tx = await transferERC20(signer, usdcAddress, TREASURY_WALLET, boostAmount);
      await tx.wait();

      setBoostTxHash(tx.hash);

      const image = prod.imageUrl ?? 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=260&fit=crop';
      addBoostedProduct({
        id: prod.id,
        itemName: prod.itemName,
        priceEth: prod.priceEth,
        category: prod.category,
        currency: 'USDC',
        image,
        destaque: prod.id % 2 === 0 ? 'ouro' : 'roxo',
        storeAddress: enderecoUsuario,
        storeName: loja?.storeName ?? '',
        boostedAt: Date.now(),
      });
      setMeusProdutos((prev) => prev.map((p) => p.id === prod.id ? { ...p, isBoosted: true } : p));
      broadcastVitrineEvent({ type: 'boost:changed' });
      setBoostEstado('sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBoostErro(msg.length > 120 ? msg.slice(0, 120) + '…' : msg);
      setBoostEstado('erro');
    }
  }

  async function handleSetRastreio(id: number, code: string) {
    if (!code.trim()) return;
    if (!isConnected) return;
    setTxStatus((p) => ({ ...p, [id]: 'rastreando' }));
    try {
      await switchToArc();
      const provider = getProvider(); if (!provider) return;
      const signer = await provider.getSigner();
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contrato.setTrackingCode(id, code.trim());
      await tx.wait();
      setTxStatus((p) => ({ ...p, [id]: 'rastreado' }));
      setRastreioId(null); setRastreioCode('');
    } catch { setTxStatus((p) => ({ ...p, [id]: 'erro' })); }
  }

  async function handleUpgradePro() {
    if (!isConnected) return;
    try {
      await switchToArc();
      const provider = getProvider(); if (!provider) return;
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
    if (!isConnected) return;
    try {
      await switchToArc();
      const provider = getProvider(); if (!provider) return;
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
    { id: 'loja', label: t('dash.tab.myStore') },
    { id: 'produtos', label: t('dash.tab.products') },
    { id: 'visual', label: t('dash.tab.visual') },
  ] as const;

  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto w-full">
      {/* Voltar */}
      <button onClick={onVoltar}
        className="mb-8 text-xs text-white/40 hover:text-cyan-400 transition-colors flex items-center gap-2 tracking-widest uppercase"
        style={{ fontFamily: "'Orbitron', sans-serif" }}>
        {t('dash.back')}
      </button>

      {/* Título */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-widest uppercase mb-2"
          style={{ fontFamily: "'Orbitron', sans-serif", color: customizacao.neonColor,
            textShadow: `0 0 30px ${neonAtual.shadow}` }}>
          {t('dash.title')}
        </h1>
        <p className="text-white/40 text-sm tracking-wide">
          {t('dash.subtitle')}
        </p>
      </div>

      {/* Não autenticado */}
      {!isConnected && (
        <div className="flex flex-col items-center py-20 gap-4">
          <div className="text-5xl opacity-30">🔒</div>
          <p className="text-white/40 text-sm tracking-widest uppercase"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            {t('dash.connectWallet')}
          </p>
          <button onClick={() => void connect()} className="btn-neon btn-neon-filled btn-neon-lg">
            {t('dash.connect')}
          </button>
        </div>
      )}

      {isConnected && carregando && (
        <div className="flex flex-col items-center py-20 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <p className="text-cyan-400/60 text-sm tracking-widest uppercase"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            {t('dash.loading')}
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
            {t('dash.storeCreated')}
          </h2>
          <p className="text-white/60 text-sm">{t('dash.storeActive')}</p>
          <button onClick={() => { setEstado('idle'); setCarregando(true); }}
            className="btn-neon btn-neon-cyan">
            {t('dash.viewMyStore')}
          </button>
        </div>
      )}

      {/* Escolha de plano - sem loja */}
      {isConnected && !carregando && !lojaAtiva && estado !== 'sucesso' && (
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-lg font-black tracking-widest uppercase mb-1"
              style={{ fontFamily: "'Orbitron', sans-serif", color: '#fff' }}>
              {t('dash.choosePlan')}
            </h2>
            <p className="text-white/40 text-sm">{t('dash.createDesc')}</p>
          </div>

          <div className="flex flex-col gap-2 max-w-md">
            <label className="text-xs text-white/50 tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {t('dash.storeName')}
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
                  style={{ fontFamily: "'Orbitron', sans-serif" }}>{t('dash.plan')}</p>
                <h3 className="text-xl font-black tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: '#fff' }}>{t('dash.basic')}</h3>
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
      {isConnected && !carregando && lojaAtiva && estado !== 'sucesso' && (
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
                          style={{ fontFamily: "'Orbitron', sans-serif" }}>{t('dash.basic')}</span>
                      )}
                    </div>
                    <p className="text-white/30 text-xs font-mono">{enderecoUsuario}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/5 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-[10px] text-white/30 tracking-widest uppercase mb-1">{t('dash.products')}</p>
                    <p className="text-2xl font-black" style={{ color: customizacao.neonColor, fontFamily: "'Orbitron', sans-serif" }}>
                      {Number(loja!.productCount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-[10px] text-white/30 tracking-widest uppercase mb-1">{t('dash.expiresIn')}</p>
                    <p className="text-sm font-bold"
                      style={{ color: expirou ? '#f87171' : customizacao.neonColor, fontFamily: "'Orbitron', sans-serif" }}>
                      {expirou ? t('dash.expired') : new Date(Number(loja!.expiresAt) * 1000).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-3">
                  {loja!.tier === 0 && (
                    <button onClick={handleUpgradePro}
                      className="btn-neon btn-neon-filled-gold btn-neon-full btn-neon-lg">
                      {t('dash.upgradePro')} {proFee} ETH
                    </button>
                  )}
                  <button onClick={handleRenovar} className="btn-neon btn-neon-cyan btn-neon-full">
                    {t('dash.renew')}
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
                  {t('dash.myProducts')}
                </h3>
                <button onClick={carregarMeusProdutos}
                  className="text-xs text-white/30 hover:text-cyan-400 transition-colors tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {t('vitrine.refresh')}
                </button>
              </div>

              {carregandoProdutos && (
                <div className="flex items-center justify-center py-12 gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <span className="text-cyan-400/60 text-xs tracking-widest"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>{t('dash.loadingProducts')}</span>
                </div>
              )}

              {!carregandoProdutos && meusProdutos.length === 0 && (
                <div className="flex flex-col items-center py-16 gap-3">
                  <span className="text-4xl opacity-20">⬡</span>
                  <p className="text-white/30 text-xs tracking-widest uppercase"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>{t('dash.noProducts')}</p>
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
                            style={{ fontFamily: "'Orbitron', sans-serif" }}>{t('dash.sold')}</span>
                        )}
                        {!prod.isActive && !prod.isSold && (
                          <span className="text-[9px] font-bold tracking-widest bg-red-500/10 border border-red-400/30 text-red-400 px-1.5 py-0.5 rounded-full"
                            style={{ fontFamily: "'Orbitron', sans-serif" }}>{t('dash.paused')}</span>
                        )}
                        {prod.isActive && !prod.isSold && (
                          <span className="text-[9px] font-bold tracking-widest bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 px-1.5 py-0.5 rounded-full"
                            style={{ fontFamily: "'Orbitron', sans-serif" }}>{t('dash.active')}</span>
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
                        {txStatus[prod.id] === 'cancelando' ? `⟳ ${t('dash.canceling')}` : `⏸ ${t('dash.cancelItem')}`}
                      </button>
                      <button
                        onClick={() => setRastreioId(rastreioId === prod.id ? null : prod.id)}
                        className="btn-neon btn-neon-cyan btn-neon-sm">
                        📦 {t('dash.addTracking')}
                      </button>
                      <button
                        onClick={() => handleExcluirItem(prod.id)}
                        className="btn-neon btn-neon-sm btn-neon-delete">
                        🗑 {t('dash.deleteItem')}
                      </button>
                      {prod.isBoosted ? (
                        <span className="text-[10px] px-2 py-1 rounded-lg font-bold tracking-widest"
                          style={{ fontFamily: "'Orbitron', sans-serif", color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
                          {t('boost.alreadyBoosted')}
                        </span>
                      ) : (
                        <button
                          onClick={() => { setBoostProd(prod); setBoostEstado('idle'); setBoostTxHash(''); setBoostErro(''); }}
                          className="btn-neon btn-neon-sm"
                          style={{ borderColor: '#fbbf24', color: '#fbbf24', background: 'rgba(251,191,36,0.08)', boxShadow: '0 0 10px rgba(251,191,36,0.2)' }}>
                          {t('dash.boost')}
                        </button>
                      )}
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
                    <p className="text-green-400 text-xs">✓ {t('dash.trackingSaved')}</p>
                  )}
                  {txStatus[prod.id] === 'cancelado' && (
                    <p className="text-red-400 text-xs">{t('dash.listingPaused')}</p>
                  )}
                  {txStatus[prod.id] === 'erro' && (
                    <p className="text-red-400 text-xs">⚠ {t('dash.txError')}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ABA: VISUAL */}
          {abaAtiva === 'visual' && (
            <div className="flex flex-col gap-6">
              <h3 className="text-sm font-black tracking-widest uppercase"
                style={{ fontFamily: "'Orbitron', sans-serif", color: customizacao.neonColor }}>
                {t('dash.visual.title')}
              </h3>

              {/* ── BANNER ── */}
              <div className="rounded-2xl border border-white/10 p-5 flex flex-col gap-4"
                style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)' }}>
                <label className="text-xs font-bold tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: customizacao.neonColor }}>
                  🖼 {t('dash.visual.banner')}
                </label>

                {/* Preview atual */}
                {customizacao.bannerUrl && (
                  <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/15">
                    <img src={customizacao.bannerUrl} alt="Banner atual"
                      className="w-full h-full object-cover" />
                    <button onClick={() => salvarCustomizacao({ ...customizacao, bannerUrl: '' })}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center
                        text-white text-xs bg-black/60 border border-white/20 hover:bg-red-500/60 transition-all">
                      ✕
                    </button>
                  </div>
                )}

                {/* Presets */}
                <div>
                  <p className="text-[10px] text-white/30 tracking-widest uppercase mb-2"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    {t('dash.visual.presets')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_BANNERS.map((b) => (
                      <button key={b.id} onClick={() => salvarCustomizacao({ ...customizacao, bannerUrl: b.url })}
                        className="relative rounded-lg overflow-hidden h-16 border-2 transition-all"
                        style={{
                          borderColor: customizacao.bannerUrl === b.url ? customizacao.neonColor : 'rgba(255,255,255,0.08)',
                          boxShadow: customizacao.bannerUrl === b.url ? `0 0 12px ${neonAtual.shadow}` : 'none',
                        }}>
                        <img src={b.url} alt={b.label} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 text-center text-[9px] font-bold py-0.5 tracking-widest"
                          style={{ fontFamily: "'Orbitron', sans-serif",
                            background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)' }}>
                          {b.label}
                        </span>
                        {customizacao.bannerUrl === b.url && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                            style={{ background: customizacao.neonColor, color: '#000' }}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload de banner */}
                <div>
                  <p className="text-[10px] text-white/30 tracking-widest uppercase mb-2"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    {t('dash.visual.upload')}
                  </p>
                  <input ref={bannerInputRef} type="file" accept="image/*"
                    className="hidden" onChange={onBannerInput} />
                  <div
                    className="w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 py-5 transition-all"
                    style={{
                      borderColor: convertingBanner ? customizacao.neonColor : dragOverBanner ? customizacao.neonColor : 'rgba(255,255,255,0.12)',
                      background: convertingBanner ? customizacao.neonColor + '08' : dragOverBanner ? customizacao.neonColor + '10' : 'rgba(255,255,255,0.02)',
                      cursor: convertingBanner ? 'not-allowed' : 'pointer',
                      pointerEvents: convertingBanner ? 'none' : 'auto',
                    }}
                    onClick={() => bannerInputRef.current?.click()}
                    onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOverBanner(true); }}
                    onDragLeave={() => setDragOverBanner(false)}
                    onDrop={onBannerDrop}>
                    {convertingBanner ? (
                      <>
                        <span className="text-xl spinner" style={{ display: 'inline-block', color: customizacao.neonColor }}>⟳</span>
                        <span className="text-xs tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif", color: customizacao.neonColor }}>
                          {t('dash.visual.converting')}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">🖼</span>
                        <span className="text-xs text-white/30 tracking-widest"
                          style={{ fontFamily: "'Orbitron', sans-serif" }}>
                          {t('dash.visual.uploadBanner')}
                        </span>
                        <span className="text-[10px] text-white/20">PNG, JPG, WEBP — máx. 5MB</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ── FOTO DE PERFIL ── */}
              <div className="rounded-2xl border border-white/10 p-5 flex flex-col gap-4"
                style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)' }}>
                <label className="text-xs font-bold tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: customizacao.neonColor }}>
                  👤 {t('dash.visual.avatar')}
                </label>

                {/* Preview atual */}
                {customizacao.avatarUrl && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={customizacao.avatarUrl} alt="Avatar atual"
                        className="w-16 h-16 rounded-full object-cover border-2"
                        style={{ borderColor: customizacao.neonColor + '80' }} />
                      <button onClick={() => salvarCustomizacao({ ...customizacao, avatarUrl: '' })}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center
                          text-white text-[9px] bg-black/70 border border-white/20 hover:bg-red-500/70 transition-all">
                        ✕
                      </button>
                    </div>
                    <span className="text-xs text-white/30">{lang === 'en' ? 'Current profile photo' : 'Foto de perfil atual'}</span>
                  </div>
                )}

                {/* Presets */}
                <div>
                  <p className="text-[10px] text-white/30 tracking-widest uppercase mb-2"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    {t('dash.visual.presets')}
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {PRESET_AVATARS.map((a) => (
                      <button key={a.id} onClick={() => salvarCustomizacao({ ...customizacao, avatarUrl: a.url })}
                        className="flex flex-col items-center gap-1 group">
                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 transition-all"
                          style={{
                            borderColor: customizacao.avatarUrl === a.url ? customizacao.neonColor : 'rgba(255,255,255,0.12)',
                            boxShadow: customizacao.avatarUrl === a.url ? `0 0 14px ${neonAtual.shadow}` : 'none',
                          }}>
                          <img src={a.url} alt={a.label} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[9px] tracking-widest uppercase"
                          style={{ fontFamily: "'Orbitron', sans-serif",
                            color: customizacao.avatarUrl === a.url ? customizacao.neonColor : 'rgba(255,255,255,0.3)' }}>
                          {a.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload de avatar */}
                <div>
                  <p className="text-[10px] text-white/30 tracking-widest uppercase mb-2"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    {t('dash.visual.upload')}
                  </p>
                  <input ref={avatarInputRef} type="file" accept="image/*"
                    className="hidden" onChange={onAvatarInput} />
                  <div
                    className="w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 py-5 transition-all"
                    style={{
                      borderColor: convertingAvatar ? customizacao.neonColor : dragOverAvatar ? customizacao.neonColor : 'rgba(255,255,255,0.12)',
                      background: convertingAvatar ? customizacao.neonColor + '08' : dragOverAvatar ? customizacao.neonColor + '10' : 'rgba(255,255,255,0.02)',
                      cursor: convertingAvatar ? 'not-allowed' : 'pointer',
                      pointerEvents: convertingAvatar ? 'none' : 'auto',
                    }}
                    onClick={() => avatarInputRef.current?.click()}
                    onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOverAvatar(true); }}
                    onDragLeave={() => setDragOverAvatar(false)}
                    onDrop={onAvatarDrop}>
                    {convertingAvatar ? (
                      <>
                        <span className="text-xl spinner" style={{ display: 'inline-block', color: customizacao.neonColor }}>⟳</span>
                        <span className="text-xs tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif", color: customizacao.neonColor }}>
                          {t('dash.visual.converting')}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">👤</span>
                        <span className="text-xs text-white/30 tracking-widest"
                          style={{ fontFamily: "'Orbitron', sans-serif" }}>
                          {t('dash.visual.uploadAvatar')}
                        </span>
                        <span className="text-[10px] text-white/20">PNG, JPG, WEBP — {lang === 'en' ? 'recommended 1:1' : 'recomendado 1:1'}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ── COR DO NEON ── */}
              <div className="rounded-2xl border border-white/10 p-5 flex flex-col gap-3"
                style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)' }}>
                <label className="text-xs font-bold tracking-widest uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: customizacao.neonColor }}>
                  ⚡ {t('dash.visual.neon')}
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
                  {lang === 'en' ? 'Neon color is saved locally and personalizes your panel.' : 'A cor do neon é salva localmente e personaliza seu painel.'}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MODAL BOOST ── */}
      {boostProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: 'linear-gradient(145deg,rgba(20,10,40,0.98),rgba(10,13,26,0.99))', border: '1px solid rgba(251,191,36,0.35)', boxShadow: '0 0 40px rgba(251,191,36,0.2)' }}>

            <div className="flex items-center gap-3">
              <span style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.6))' }}>⚡</span>
              <h3 className="font-black tracking-widest uppercase text-base"
                style={{ fontFamily: "'Orbitron', sans-serif", color: '#fbbf24', textShadow: '0 0 16px rgba(251,191,36,0.5)' }}>
                {t('boost.modalTitle')}
              </h3>
            </div>

            {boostProd.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-yellow-400/20" style={{ height: '120px' }}>
                <img src={boostProd.imageUrl} alt={boostProd.itemName} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <p className="text-[10px] text-white/30 tracking-widest uppercase"
                style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {t('boost.modalProduct')}
              </p>
              <p className="font-bold text-white text-sm" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {boostProd.itemName}
              </p>
              <p className="text-white/40 text-xs mt-1">{t('boost.modalDesc')}</p>
            </div>

            <div className="h-px" style={{ background: 'rgba(251,191,36,0.15)' }} />

            {boostEstado === 'idle' && (
              <div className="flex gap-3">
                <button
                  onClick={() => void handleBoost(boostProd)}
                  className="flex-1 py-3 rounded-xl font-black text-xs tracking-widest uppercase transition-all duration-200"
                  style={{ fontFamily: "'Orbitron', sans-serif", background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.5)', color: '#fbbf24', boxShadow: '0 0 16px rgba(251,191,36,0.2)' }}>
                  {t('boost.confirm')}
                </button>
                <button
                  onClick={() => setBoostProd(null)}
                  className="px-4 py-3 rounded-xl text-xs tracking-widest uppercase text-white/40 hover:text-white/60 transition-colors border border-white/10">
                  {t('boost.cancel')}
                </button>
              </div>
            )}

            {boostEstado === 'processando' && (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
                <p className="text-yellow-400/80 text-xs tracking-widest"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {t('boost.processing')}
                </p>
              </div>
            )}

            {boostEstado === 'sucesso' && (
              <div className="flex flex-col items-center gap-3 py-2">
                <span style={{ fontSize: '2rem' }}>🚀</span>
                <p className="text-yellow-400 text-xs text-center font-bold tracking-widest"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {t('boost.success')}
                </p>
                {boostTxHash && (
                  <a
                    href={`https://explorer.testnet.arc.network/tx/${boostTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-2 break-all text-center"
                  >
                    TX: {boostTxHash.slice(0, 12)}…{boostTxHash.slice(-8)}
                  </a>
                )}
                <button
                  onClick={() => setBoostProd(null)}
                  className="mt-1 px-6 py-2 rounded-lg text-xs font-bold tracking-widest uppercase text-black"
                  style={{ background: '#fbbf24', fontFamily: "'Orbitron', sans-serif" }}>
                  ✓ OK
                </button>
              </div>
            )}

            {boostEstado === 'erro' && (
              <div className="flex flex-col items-center gap-3 py-2">
                <span style={{ fontSize: '1.75rem' }}>⚠️</span>
                <p className="text-red-400 text-[11px] text-center font-mono leading-snug">
                  {boostErro || 'Transaction failed'}
                </p>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setBoostEstado('idle')}
                    className="px-5 py-2 rounded-lg text-xs font-bold tracking-widest uppercase"
                    style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24', fontFamily: "'Orbitron', sans-serif" }}>
                    {t('boost.cancel')} / Retry
                  </button>
                  <button
                    onClick={() => setBoostProd(null)}
                    className="px-4 py-2 rounded-lg text-xs tracking-widest uppercase text-white/40 hover:text-white/60 transition-colors border border-white/10">
                    {t('boost.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
