import { useState, useMemo } from 'react';
import type { RegistryStore } from './registry';
import { getNeonShadow } from './registry';
import { STABLECOIN_META, formatStablecoinPrice, type StablecoinSymbol } from './stablecoins';

type Moeda = 'ETH' | StablecoinSymbol;

export interface StoreItem {
  id: number;
  itemName: string;
  priceEth: string;
  category: string;
  seller: string;
  images?: string[];
  currency?: Moeda;
}

type SortOrder = 'default' | 'price-asc' | 'price-desc';

const CATEGORIAS = ['Moda', 'Eletrônicos', 'Perfumes e Beleza', 'Games', 'Casa', 'Outros'];

function abreviarEndereco(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function handleTilt(e: React.MouseEvent<HTMLDivElement>, shadow: string) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const rX = (y - 0.5) * -14;
  const rY = (x - 0.5) * 14;
  el.style.transform = `perspective(700px) rotateX(${rX}deg) rotateY(${rY}deg) translateY(-5px)`;
  el.style.boxShadow = `0 16px 36px ${shadow}`;
}

function resetTilt(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.transform = '';
  e.currentTarget.style.boxShadow = '';
}

interface Props {
  storeAddress: string;
  storeInfo: RegistryStore | undefined;
  allItems: StoreItem[];
  sellersPro: Set<string>;
  isConnected: boolean;
  onVoltar: () => void;
  onAbrirCompra: (item: StoreItem) => void;
  t: (key: string) => string;
  lang: 'en' | 'pt';
}

export default function StoreView({
  storeAddress,
  storeInfo,
  allItems,
  sellersPro,
  isConnected,
  onVoltar,
  onAbrirCompra,
  t,
  lang,
}: Props) {
  const [busca, setBusca] = useState('');
  const [categoriaSel, setCategoriaSel] = useState('Todos');
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');
  const [selectedImages, setSelectedImages] = useState<Record<number, number>>({});
  const [searchFocused, setSearchFocused] = useState(false);

  const isValidAddress = storeAddress.startsWith('0x') && storeAddress.length === 42;
  const isPro = sellersPro.has(storeAddress.toLowerCase());
  const neonColor = storeInfo?.neonColor ?? '#00e5ff';
  const neonShadow = getNeonShadow(neonColor);
  const bannerUrl = storeInfo?.bannerUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=200&fit=crop';
  const avatarUrl = storeInfo?.avatarUrl || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=120&h=120&fit=crop';
  const storeName = storeInfo?.storeName ?? (isValidAddress ? abreviarEndereco(storeAddress) : storeAddress);

  const storeItems = useMemo(
    () =>
      isValidAddress
        ? allItems.filter((item) => item.seller.toLowerCase() === storeAddress.toLowerCase())
        : [],
    [allItems, storeAddress, isValidAddress],
  );

  const filtered = useMemo(() => {
    let items = storeItems;
    if (busca.trim()) {
      const q = busca.toLowerCase().trim();
      items = items.filter((item) => item.itemName.toLowerCase().includes(q));
    }
    if (categoriaSel !== 'Todos') {
      items = items.filter((item) => item.category === categoriaSel);
    }
    if (sortOrder === 'price-asc') {
      items = [...items].sort((a, b) => parseFloat(a.priceEth) - parseFloat(b.priceEth));
    } else if (sortOrder === 'price-desc') {
      items = [...items].sort((a, b) => parseFloat(b.priceEth) - parseFloat(a.priceEth));
    }
    return items;
  }, [storeItems, busca, categoriaSel, sortOrder]);

  const sortLabels: Record<SortOrder, string> = {
    default: lang === 'en' ? '↕ Default' : '↕ Padrão',
    'price-asc': lang === 'en' ? '↑ Lowest' : '↑ Menor Preço',
    'price-desc': lang === 'en' ? '↓ Highest' : '↓ Maior Preço',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#05070f', fontFamily: "'Inter', sans-serif" }}>

      {/* ── STORE HEADER ── */}
      <div style={{ position: 'relative', marginBottom: '0' }}>

        {/* Banner */}
        <div style={{ width: '100%', height: '200px', overflow: 'hidden', position: 'relative' }}>
          <img
            src={bannerUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.45) saturate(1.4)' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(5,7,15,0.2) 0%, rgba(5,7,15,0.98) 100%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at center, ${neonColor}10 0%, transparent 70%)`,
          }} />
        </div>

        {/* Back button — top left over banner */}
        <button
          onClick={onVoltar}
          style={{
            position: 'absolute', top: '1rem', left: '1.25rem', zIndex: 20,
            background: 'rgba(5,7,15,0.75)', border: `1px solid ${neonColor}40`,
            color: neonColor, borderRadius: '0.5rem', padding: '0.4rem 0.85rem',
            fontSize: '0.62rem', fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.12em',
            cursor: 'pointer', backdropFilter: 'blur(12px)',
            boxShadow: `0 0 12px ${neonShadow}`,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${neonColor}20`;
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 18px ${neonShadow}`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(5,7,15,0.75)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 12px ${neonShadow}`;
          }}
        >
          ← {lang === 'en' ? 'Back' : 'Voltar'}
        </button>

        {/* Avatar + Name — centered, floating over banner bottom */}
        <div style={{
          position: 'absolute', bottom: '-3.5rem', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
          zIndex: 10,
        }}>
          <div style={{
            width: '86px', height: '86px', borderRadius: '50%',
            border: `3px solid ${neonColor}`,
            boxShadow: `0 0 0 4px rgba(5,7,15,1), 0 0 24px ${neonShadow}`,
            overflow: 'hidden', background: '#0a0d1a',
          }}>
            <img src={avatarUrl} alt={storeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: '1.05rem', fontWeight: 900,
              letterSpacing: '0.12em', color: neonColor, textTransform: 'uppercase',
              textShadow: `0 0 20px ${neonShadow}`, margin: 0, lineHeight: 1.2,
            }}>
              {storeName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
              {isPro && (
                <span style={{
                  fontSize: '0.58rem', fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.12em',
                  background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
                  color: '#fbbf24', padding: '0.12rem 0.5rem', borderRadius: '9999px',
                  textShadow: '0 0 8px rgba(251,191,36,0.5)',
                }}>
                  ⚡ VIP PRO
                </span>
              )}
              <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', margin: 0 }}>
                {isValidAddress ? abreviarEndereco(storeAddress) : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for avatar overflow */}
      <div style={{ height: '5.5rem' }} />

      {/* ── CONTROLS ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Product count */}
        <p style={{
          color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem',
          fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.1em',
          marginBottom: '1.75rem', textAlign: 'center', textTransform: 'uppercase',
        }}>
          {storeItems.length} {lang === 'en' ? `product${storeItems.length !== 1 ? 's' : ''} listed on-chain` : `produto${storeItems.length !== 1 ? 's' : ''} listado${storeItems.length !== 1 ? 's' : ''} na blockchain`}
        </p>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <span style={{
            position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
            color: searchFocused ? neonColor : 'rgba(255,255,255,0.3)', fontSize: '0.82rem',
            transition: 'color 0.2s', pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="text"
            placeholder={lang === 'en' ? 'Search products by name...' : 'Pesquisar produtos por nome...'}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${searchFocused ? neonColor + '70' : neonColor + '25'}`,
              borderRadius: '0.75rem', padding: '0.7rem 1rem 0.7rem 2.4rem',
              color: '#fff', fontSize: '0.85rem', outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxShadow: searchFocused ? `0 0 16px ${neonShadow}` : 'none',
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              style={{
                position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer', fontSize: '0.8rem', padding: '0.15rem',
              }}
            >✕</button>
          )}
        </div>

        {/* Pills row: categories + sort */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center', marginBottom: '2rem' }}>
          {/* ALL pill */}
          <button
            onClick={() => setCategoriaSel('Todos')}
            style={{
              padding: '0.32rem 0.8rem', borderRadius: '9999px', fontSize: '0.6rem',
              fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.1em', cursor: 'pointer',
              border: `1px solid ${categoriaSel === 'Todos' ? neonColor : 'rgba(255,255,255,0.12)'}`,
              background: categoriaSel === 'Todos' ? `${neonColor}20` : 'transparent',
              color: categoriaSel === 'Todos' ? neonColor : 'rgba(255,255,255,0.4)',
              boxShadow: categoriaSel === 'Todos' ? `0 0 10px ${neonShadow}` : 'none',
              transition: 'all 0.18s',
            }}
          >
            {lang === 'en' ? 'ALL' : 'TODOS'}
          </button>

          {CATEGORIAS.map((cat) => {
            const isActive = categoriaSel === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoriaSel(cat === categoriaSel ? 'Todos' : cat)}
                style={{
                  padding: '0.32rem 0.8rem', borderRadius: '9999px', fontSize: '0.6rem',
                  fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.08em', cursor: 'pointer',
                  border: `1px solid ${isActive ? neonColor : 'rgba(255,255,255,0.12)'}`,
                  background: isActive ? `${neonColor}20` : 'transparent',
                  color: isActive ? neonColor : 'rgba(255,255,255,0.38)',
                  boxShadow: isActive ? `0 0 10px ${neonShadow}` : 'none',
                  transition: 'all 0.18s',
                }}
              >
                {cat.toUpperCase()}
              </button>
            );
          })}

          {/* push sort to right */}
          <div style={{ flex: 1, minWidth: '0.5rem' }} />

          {/* Sort pills */}
          {(['default', 'price-asc', 'price-desc'] as SortOrder[]).map((s) => {
            const isActive = sortOrder === s;
            return (
              <button
                key={s}
                onClick={() => setSortOrder(s)}
                style={{
                  padding: '0.32rem 0.8rem', borderRadius: '9999px', fontSize: '0.58rem',
                  fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.06em', cursor: 'pointer',
                  border: `1px solid ${isActive ? '#fbbf24' : 'rgba(255,255,255,0.12)'}`,
                  background: isActive ? 'rgba(251,191,36,0.15)' : 'transparent',
                  color: isActive ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.18s',
                }}
              >
                {sortLabels[s]}
              </button>
            );
          })}
        </div>

        {/* ── PRODUCT GRID ── */}
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '5rem 1rem', gap: '1rem',
            border: `1px dashed ${neonColor}18`, borderRadius: '1rem',
            background: `${neonColor}04`,
            marginBottom: '4rem',
          }}>
            <span style={{ fontSize: '2.5rem', opacity: 0.2 }}>⬡</span>
            <p style={{
              color: 'rgba(255,255,255,0.28)', fontSize: '0.72rem',
              fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.1em',
              textTransform: 'uppercase', textAlign: 'center',
            }}>
              {busca || categoriaSel !== 'Todos'
                ? (lang === 'en' ? 'No products found in this category' : 'Nenhum produto encontrado nesta categoria')
                : !isValidAddress
                ? (lang === 'en' ? 'This store is not registered on-chain yet' : 'Esta loja ainda não está registrada on-chain')
                : (lang === 'en' ? 'This store has no listed products yet' : 'Esta loja ainda não possui produtos listados')}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1.25rem',
            paddingBottom: '5rem',
          }}>
            {filtered.map((item) => {
              const isItemPro = sellersPro.has(item.seller.toLowerCase());
              const selectedImg = selectedImages[item.id] ?? 0;
              const cardNeon = isItemPro ? '#fbbf24' : neonColor;
              const cardShadow = isItemPro ? 'rgba(251,191,36,0.3)' : neonShadow;

              return (
                <div
                  key={item.id}
                  style={{
                    background: isItemPro
                      ? 'linear-gradient(145deg,rgba(124,58,237,0.12),rgba(10,13,26,0.96))'
                      : 'rgba(255,255,255,0.04)',
                    border: isItemPro ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '1rem', padding: '1.25rem',
                    display: 'flex', flexDirection: 'column', gap: '0.9rem',
                    position: 'relative',
                    transition: 'transform 0.18s, box-shadow 0.18s',
                    cursor: 'default',
                  }}
                  onMouseMove={(e) => handleTilt(e, cardShadow)}
                  onMouseLeave={resetTilt}
                >
                  {/* Category badge */}
                  {item.category && (
                    <span style={{
                      position: 'absolute', top: '0.7rem', left: '0.7rem',
                      fontSize: '0.53rem', fontWeight: 700, letterSpacing: '0.09em',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.38)', padding: '0.12rem 0.45rem', borderRadius: '9999px',
                      fontFamily: "'Orbitron', sans-serif",
                    }}>
                      {item.category}
                    </span>
                  )}

                  {/* VIP badge */}
                  {isItemPro && (
                    <span style={{
                      position: 'absolute', top: '0.7rem', right: '0.7rem',
                      fontSize: '0.53rem', fontWeight: 700, letterSpacing: '0.09em',
                      background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
                      color: '#fbbf24', padding: '0.12rem 0.45rem', borderRadius: '9999px',
                      fontFamily: "'Orbitron', sans-serif",
                      textShadow: '0 0 8px rgba(251,191,36,0.5)',
                    }}>
                      ⚡ VIP
                    </span>
                  )}

                  {/* Image area */}
                  {item.images && item.images.length > 0 ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{
                        width: '100%', height: '145px', overflow: 'hidden',
                        borderRadius: '0.6rem', background: 'rgba(0,0,0,0.3)',
                      }}>
                        <img
                          src={item.images[selectedImg]}
                          alt={item.itemName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      </div>
                      {item.images.length > 1 && (
                        <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem' }}>
                          {item.images.map((src, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedImages((p) => ({ ...p, [item.id]: idx }))}
                              style={{
                                width: '36px', height: '28px', borderRadius: '0.25rem',
                                overflow: 'hidden', padding: 0, cursor: 'pointer',
                                border: `1px solid ${(selectedImages[item.id] ?? 0) === idx ? cardNeon : 'rgba(255,255,255,0.1)'}`,
                                background: 'none', opacity: (selectedImages[item.id] ?? 0) === idx ? 1 : 0.45,
                                transition: 'opacity 0.15s, border-color 0.15s',
                              }}
                            >
                              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      width: '100%', height: '145px', marginTop: '0.5rem',
                      borderRadius: '0.6rem',
                      background: isItemPro ? 'rgba(124,58,237,0.07)' : 'rgba(255,255,255,0.03)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '2rem',
                      color: isItemPro ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.07)',
                    }}>⬡</div>
                  )}

                  {/* Name + ID */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontFamily: "'Orbitron', sans-serif", fontSize: '0.78rem', fontWeight: 700,
                      letterSpacing: '0.05em', color: '#fff', lineHeight: 1.35,
                      margin: '0 0 0.2rem 0',
                      textShadow: isItemPro ? '0 0 10px rgba(251,191,36,0.3)' : 'none',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {item.itemName}
                    </h3>
                    <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace', margin: 0 }}>
                      #{item.id}
                    </p>
                  </div>

                  {/* Price + Buy button */}
                  <div>
                    <p style={{
                      fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em',
                      textTransform: 'uppercase', marginBottom: '0.2rem',
                      fontFamily: "'Orbitron', sans-serif",
                    }}>
                      {t('vitrine.price')}
                    </p>
                    <p style={{
                      fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', fontWeight: 900,
                      color: isItemPro
                        ? '#fbbf24'
                        : item.currency === 'USDC' ? '#4ade80'
                        : item.currency === 'EURC' ? '#60a5fa'
                        : '#00e5ff',
                      textShadow: isItemPro ? '0 0 12px rgba(251,191,36,0.5)' : '0 0 12px rgba(0,229,255,0.4)',
                      marginBottom: '0.75rem',
                      margin: '0 0 0.75rem 0',
                    }}>
                      {item.currency && item.currency !== 'ETH'
                        ? formatStablecoinPrice(item.priceEth, item.currency as StablecoinSymbol)
                        : parseFloat(item.priceEth).toFixed(4)}
                      {(!item.currency || item.currency === 'ETH') && (
                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginLeft: '0.25rem', fontWeight: 400 }}>ETH</span>
                      )}
                      {item.currency && item.currency !== 'ETH' && (
                        <span style={{
                          display: 'inline-block', fontSize: '0.55rem', marginLeft: '0.35rem',
                          padding: '0.1rem 0.4rem', borderRadius: '0.25rem',
                          background: STABLECOIN_META[item.currency as StablecoinSymbol].corFundo,
                          border: `1px solid ${STABLECOIN_META[item.currency as StablecoinSymbol].cor}55`,
                          color: STABLECOIN_META[item.currency as StablecoinSymbol].cor,
                          fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.05em',
                        }}>
                          {item.currency}
                        </span>
                      )}
                    </p>
                    <button
                      onClick={() => onAbrirCompra(item)}
                      style={{
                        width: '100%', padding: '0.6rem 0.5rem',
                        borderRadius: '0.5rem',
                        fontFamily: "'Orbitron', sans-serif", fontSize: '0.62rem',
                        fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer',
                        transition: 'all 0.18s',
                        border: `1px solid ${cardNeon}`,
                        background: `${cardNeon}18`,
                        color: cardNeon,
                        boxShadow: `0 0 12px ${cardShadow}`,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = `${cardNeon}30`;
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${cardShadow}`;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = `${cardNeon}18`;
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 12px ${cardShadow}`;
                      }}
                    >
                      {isConnected ? t('vitrine.buyNow') : t('vitrine.connectToBuy')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
