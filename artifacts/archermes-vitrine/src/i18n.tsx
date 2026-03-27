import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Lang = 'en' | 'pt';

const LS_LANG_KEY = 'archermes_lang';

const translations = {
  en: {
    /* ── NAV ── */
    'nav.affiliate': '🔗 Affiliate',
    'nav.myStore': 'My Store',
    'nav.myStoreIcon': '⬡ My Store',
    'nav.connect': 'Connect Wallet',
    'nav.createStore': 'Create My Store',
    'nav.list': '+ List',
    'nav.disconnect': 'Disconnect',

    /* ── REF BANNER ── */
    'ref.active': 'Active affiliate link:',
    'ref.commission': '— 1% commission goes to the referrer',

    /* ── SECTIONS ── */
    'section.featured': 'Featured Stores',
    'section.partners': 'Partner Stores',
    'section.partnersDesc': 'Verified marketplaces on Arc Testnet',
    'section.boosted': 'Boosted Products',
    'section.boostedDesc': 'Selected highlights this week',
    'section.vitrine': '⬡ On-Chain Showcase',
    'section.vitrineDesc': 'Products registered on Arc Testnet in real time',
    'section.categories': 'Explore by Categories',

    /* ── VITRINE ── */
    'vitrine.refresh': '↻ Refresh',
    'vitrine.all': 'All',
    'vitrine.loading': 'Syncing with blockchain...',
    'vitrine.timeout': 'Arc Testnet is taking too long to respond. Check your connection and try again.',
    'vitrine.error': 'Could not load products.',
    'vitrine.retry': 'Try again',
    'vitrine.empty': 'No products found',
    'vitrine.addFirst': '+ List the first product',
    'vitrine.price': 'Price',
    'vitrine.buyNow': '⚡ Buy Now',
    'vitrine.connectToBuy': '🔒 Connect to Buy',
    'vitrine.connectToBuyBtn': '🔒 Connect to buy',
    'vitrine.seller': 'Seller:',
    'vitrine.category': 'Category:',

    /* ── MODAL LIST PRODUCT ── */
    'modal.list.title': 'List Product',
    'modal.list.subtitle': 'Fill in the item details to publish on the marketplace',
    'modal.list.itemName': 'Item Name',
    'modal.list.itemNamePlaceholder': 'Ex: Air Max Limited Sneakers',
    'modal.list.price': 'Price (ETH)',
    'modal.list.pricePlaceholder': 'Ex: 0.05',
    'modal.list.category': 'Category',
    'modal.list.images': 'Product Images',
    'modal.list.uploadLoading': 'Loading images...',
    'modal.list.uploadConverting': 'Converting files, please wait',
    'modal.list.uploadClick': 'Click or drag product images here',
    'modal.list.uploadFormats': 'PNG, JPG, WEBP · multiple files accepted',
    'modal.list.publish': '🚀 Publish on Marketplace',
    'modal.list.waiting': 'Awaiting confirmation...',
    'modal.list.waitingDesc': 'Confirm the transaction in your wallet.',
    'modal.list.success': 'Product posted on Blockchain!',
    'modal.list.successDesc': 'was listed successfully.',
    'modal.list.close': 'Close',
    'modal.list.noWallet': 'Wallet not found',
    'modal.list.noWalletDesc': 'Connect a wallet to publish on the blockchain.',
    'modal.list.connectWallet': 'Connect Wallet',
    'modal.list.back': 'Back',

    /* ── MODAL BUY ── */
    'modal.buy.title': 'Confirm Purchase',
    'modal.buy.subtitle': 'Review the details before confirming on blockchain',
    'modal.buy.product': 'Product',
    'modal.buy.total': 'Total',
    'modal.buy.affiliateActive': 'Active affiliate link',
    'modal.buy.affiliateCommission': '+1% commission',
    'modal.buy.confirm': '⚡ Confirm & Pay',
    'modal.buy.cancel': 'Cancel',
    'modal.buy.processing': 'Processing...',
    'modal.buy.confirmingDesc': 'Confirm the transaction in your wallet.',
    'modal.buy.success': 'Purchase Complete!',
    'modal.buy.successDesc': 'Transaction confirmed on blockchain.',
    'modal.buy.viewTx': 'View on Explorer',
    'modal.buy.error': 'Transaction error',
    'modal.buy.retry': '↻ Try again',

    /* ── STORE DASHBOARD ── */
    'dash.title': 'Merchant Dashboard',
    'dash.subtitle': 'Manage your store in the decentralized ARCHERMES marketplace',
    'dash.back': '← Back',
    'dash.connectWallet': 'Connect your wallet to access your store',
    'dash.connect': 'Connect',
    'dash.loading': 'Querying blockchain...',
    'dash.storeCreated': 'Store Created Successfully!',
    'dash.storeActive': 'Your store is active on Arc Testnet.',
    'dash.viewMyStore': 'View My Store',
    'dash.choosePlan': 'Choose Your Plan',
    'dash.createDesc': 'Create your on-chain store and start selling on Arc Testnet.',
    'dash.storeName': 'Your store name',
    'dash.plan': 'Plan',
    'dash.basic': 'Basic',
    'dash.pro': 'PRO',
    'dash.recommended': '⚡ RECOMMENDED',
    'dash.processing': '⟳ Processing...',
    'dash.openFor': 'Open for',
    'dash.proFor': 'PRO for',
    'dash.upto10': 'Up to 10 products',
    'dash.onchainVitrine': 'On-chain showcase',
    'dash.web3Payments': 'Web3 Payments',
    'dash.unlimited': 'Unlimited products',
    'dash.vip': 'VIP badge ⚡',
    'dash.featuredSpot': 'Showcase highlight',
    'dash.tracking': 'Delivery tracking',
    'dash.tab.myStore': '⬡ My Store',
    'dash.tab.products': '📦 Products',
    'dash.tab.visual': '🎨 Visual',
    'dash.products': 'Products',
    'dash.expiresIn': 'Expires',
    'dash.expired': '⚠ Expired',
    'dash.upgradePro': '⚡ UPGRADE TO PRO —',
    'dash.renew': '↻ Renew Subscription',
    'dash.basic.badge': 'BASIC',
    /* ── DASH PRODUCTS TAB ── */
    'dash.myProducts': 'My Listings',
    'dash.loadingProducts': 'Loading products...',
    'dash.noProducts': 'No products listed yet.',
    'dash.trackingCode': 'Tracking code',
    'dash.setTracking': 'Set Code',
    'dash.cancelItem': 'Cancel',
    'dash.deleteItem': 'Delete',
    'dash.canceling': 'Canceling...',
    'dash.canceled': 'Canceled',
    'dash.tracking.setting': 'Setting...',
    'dash.tracking.set': 'Sent!',
    'dash.sold': 'SOLD',
    'dash.paused': 'PAUSED',
    'dash.active': 'ACTIVE',
    'dash.addTracking': 'Insert Tracking',
    'dash.trackingSaved': 'Tracking code saved on blockchain!',
    'dash.listingPaused': 'Listing paused successfully.',
    'dash.txError': 'Transaction error. Try again.',
    /* ── BOOST ── */
    'dash.boost': '🚀 Boost',
    'boost.modalTitle': '⚡ Boost Product',
    'boost.modalProduct': 'Product',
    'boost.modalDesc': 'Pay 5 USDC on Arc Network to boost this product to the Main Showcase?',
    'boost.confirm': '⚡ Confirm — Pay 5 USDC',
    'boost.cancel': 'Cancel',
    'boost.processing': '⟳ Simulating signature...',
    'boost.success': '🚀 Boost applied! Product will appear in Featured section.',
    'boost.alreadyBoosted': '🚀 Boosted',
    'boost.emptyState': 'No boosted products yet.',
    'boost.emptyStateDesc': 'Boost a product from your merchant dashboard to feature it here.',
    /* ── DASH VISUAL TAB ── */
    'dash.visual.title': 'Store Visual',
    'dash.visual.banner': 'Banner',
    'dash.visual.avatar': 'Avatar / Logo',
    'dash.visual.neon': 'Neon Color',
    'dash.visual.presets': 'Presets',
    'dash.visual.upload': 'Upload',
    'dash.visual.uploadBanner': 'Click or drag to upload banner',
    'dash.visual.uploadAvatar': 'Click or drag to upload avatar',
    'dash.visual.converting': 'Converting...',
    'dash.visual.saved': 'Saved!',

    /* ── AFFILIATE ── */
    'affiliate.title': 'Divulger Portal',
    'affiliate.subtitle': 'Earn',
    'affiliate.subtitleMid': '1% commission',
    'affiliate.subtitleEnd': 'on each sale from your link — directly on blockchain.',
    'affiliate.connectWallet': 'Connect your wallet to access the portal',
    'affiliate.connect': 'Connect',
    'affiliate.howItWorks': 'How It Works',
    'affiliate.step1': 'Complete the missions below',
    'affiliate.step2': 'Generate your personalized link',
    'affiliate.step3': 'Earn 1% per sale',
    'affiliate.missions': '🎯 Missions to Unlock',
    'affiliate.follow': '𝕏 Follow',
    'affiliate.followed': '✓ Followed',
    'affiliate.yourLink': '🔗 Your Affiliate Link',
    'affiliate.yourWallet': 'Your wallet:',
    'affiliate.copyLink': '🔗 GENERATE & COPY LINK',
    'affiliate.completeMissions': '🔒 COMPLETE MISSIONS',
    'affiliate.copied': '✓ LINK COPIED!',
    'affiliate.copiedDesc': '✓ Link copied! Paste it anywhere to share and earn commission.',
    'affiliate.completeMissionsHint': 'Complete the missions above to unlock your affiliate link',
    'affiliate.howCommission': 'How Commission Works',
    'affiliate.commission1': 'When someone uses your link and buys, the contract registers your address automatically',
    'affiliate.commission2': '1% of each sale is transferred to your wallet on-chain without intermediaries',

    /* ── MISC ── */
    'section.boostedBadge': '⚡ BOOSTED',

    /* ── CATEGORIES ── */
    'cat.fashion': 'Fashion',
    'cat.electronics': 'Electronics',
    'cat.perfumes': 'Perfumes & Beauty',
    'cat.games': 'Games',

    /* ── WALLET TOASTS ── */
    'wallet.connecting': 'Connecting...',
    'wallet.cancelled': 'Connection cancelled.',
    'wallet.noWallet': 'No Web3 wallet detected. Install MetaMask or Rabby.',
    'wallet.noAccounts': 'No account authorized.',
    'wallet.error': 'Wallet connection error. Try again.',

    /* ── ESCROW / SAFE PURCHASE ── */
    'escrow.toggle': '🔒 Safe Purchase (Free)',
    'escrow.desc': 'Payment held by smart contract — released only when you confirm receipt',
    'escrow.usdc': 'Note: Safe Purchase applies to ARC/ETH payments only. Stablecoin payments are sent directly.',

    /* ── MY PURCHASES ── */
    'purchases.title': '🛍 My Purchases',
    'purchases.empty': 'No purchases found on this wallet.',
    'purchases.confirmBtn': '✓ Confirm Receipt',
    'purchases.confirming': 'Confirming...',
    'purchases.confirmed': '✓ Confirmed',
    'purchases.delivered': '✓ Delivered',
    'purchases.refunded': '↩ Refunded',
    'purchases.pending': 'Awaiting confirmation',
    'purchases.loading': 'Loading purchases...',
    'purchases.dispute': 'Problem with your order? Contact support:',
    'purchases.show': '🛍 My Purchases',
    'purchases.hide': 'Hide',

    /* ── PRO PLAN LIMIT ── */
    'pro.limitReached': 'Free plan: 10 product limit reached. Upgrade to Pro for unlimited listings.',
    'pro.badge': '⭐ PRO',
    'pro.upgrading': 'Upgrading to Pro...',
    'pro.upgraded': '⭐ Upgrade successful! Welcome to Pro.',
    'pro.upgradeFailed': 'Upgrade failed. Try again.',
    'dash.productLimit': 'of 10 (free plan)',
    'dash.productLimitPro': 'products (unlimited)',
    'dash.upgradeSuccess': '⭐ Now on Pro plan!',

    /* ── LANG TOGGLE ── */
    'lang.toggle': 'PT',
  },

  pt: {
    /* ── NAV ── */
    'nav.affiliate': '🔗 Afiliar',
    'nav.myStore': 'Minha Loja',
    'nav.myStoreIcon': '⬡ Minha Loja',
    'nav.connect': 'Entrar',
    'nav.createStore': 'Criar Minha Loja',
    'nav.list': '+ Anunciar',
    'nav.disconnect': 'Sair',

    /* ── REF BANNER ── */
    'ref.active': 'Link de afiliado ativo:',
    'ref.commission': '— 1% da comissão vai para o divulgador',

    /* ── SECTIONS ── */
    'section.featured': 'Lojas em Destaque',
    'section.partners': 'Lojas Parceiras',
    'section.partnersDesc': 'Marketplaces verificadas na Arc Testnet',
    'section.boosted': 'Produtos Impulsionados',
    'section.boostedDesc': 'Destaques selecionados nesta semana',
    'section.vitrine': '⬡ Vitrine On-Chain',
    'section.vitrineDesc': 'Produtos registrados na Arc Testnet em tempo real',
    'section.categories': 'Explore por Categorias',

    /* ── VITRINE ── */
    'vitrine.refresh': '↻ Atualizar',
    'vitrine.all': 'Todos',
    'vitrine.loading': 'Sincronizando com a blockchain...',
    'vitrine.timeout': 'A Arc Testnet demorou demais para responder. Verifique sua conexão e tente novamente.',
    'vitrine.error': 'Não foi possível carregar os produtos.',
    'vitrine.retry': 'Tentar novamente',
    'vitrine.empty': 'Nenhum produto encontrado',
    'vitrine.addFirst': '+ Anunciar o primeiro produto',
    'vitrine.price': 'Preço',
    'vitrine.buyNow': '⚡ Comprar Agora',
    'vitrine.connectToBuy': '🔒 Entrar para Comprar',
    'vitrine.connectToBuyBtn': '🔒 Entrar para comprar',
    'vitrine.seller': 'Vendedor:',
    'vitrine.category': 'Categoria:',

    /* ── MODAL LIST PRODUCT ── */
    'modal.list.title': 'Anunciar Produto',
    'modal.list.subtitle': 'Preencha os dados do item para publicar no marketplace',
    'modal.list.itemName': 'Nome do Item',
    'modal.list.itemNamePlaceholder': 'Ex: Tênis Air Max Limited',
    'modal.list.price': 'Preço (ETH)',
    'modal.list.pricePlaceholder': 'Ex: 0.05',
    'modal.list.category': 'Categoria',
    'modal.list.images': 'Imagens do Produto',
    'modal.list.uploadLoading': 'Carregando imagens...',
    'modal.list.uploadConverting': 'Convertendo arquivos, aguarde',
    'modal.list.uploadClick': 'Clique ou arraste as imagens do produto aqui',
    'modal.list.uploadFormats': 'PNG, JPG, WEBP · múltiplos arquivos aceitos',
    'modal.list.publish': '🚀 Publicar no Marketplace',
    'modal.list.waiting': 'Aguardando confirmação...',
    'modal.list.waitingDesc': 'Confirme a transação na sua carteira.',
    'modal.list.success': 'Produto postado na Blockchain!',
    'modal.list.successDesc': 'foi listado com sucesso.',
    'modal.list.close': 'Fechar',
    'modal.list.noWallet': 'Carteira não encontrada',
    'modal.list.noWalletDesc': 'Conecte uma carteira para publicar na blockchain.',
    'modal.list.connectWallet': 'Conectar Carteira',
    'modal.list.back': 'Voltar',

    /* ── MODAL BUY ── */
    'modal.buy.title': 'Confirmar Compra',
    'modal.buy.subtitle': 'Revise os detalhes antes de confirmar na blockchain',
    'modal.buy.product': 'Produto',
    'modal.buy.total': 'Total',
    'modal.buy.affiliateActive': 'Link de afiliado ativo',
    'modal.buy.affiliateCommission': '+1% comissão',
    'modal.buy.confirm': '⚡ Confirmar & Pagar',
    'modal.buy.cancel': 'Cancelar',
    'modal.buy.processing': 'Processando...',
    'modal.buy.confirmingDesc': 'Confirme a transação na sua carteira.',
    'modal.buy.success': 'Compra Concluída!',
    'modal.buy.successDesc': 'Transação confirmada na blockchain.',
    'modal.buy.viewTx': 'Ver no Explorer',
    'modal.buy.error': 'Erro na transação',
    'modal.buy.retry': '↻ Tentar novamente',

    /* ── STORE DASHBOARD ── */
    'dash.title': 'Painel do Lojista',
    'dash.subtitle': 'Gerencie sua loja no marketplace descentralizado ARCHERMES',
    'dash.back': '← Voltar',
    'dash.connectWallet': 'Conecte sua carteira para acessar sua loja',
    'dash.connect': 'Entrar',
    'dash.loading': 'Consultando blockchain...',
    'dash.storeCreated': 'Loja Criada com Sucesso!',
    'dash.storeActive': 'Sua loja está ativa na Arc Testnet.',
    'dash.viewMyStore': 'Ver Minha Loja',
    'dash.choosePlan': 'Escolha seu Plano',
    'dash.createDesc': 'Crie sua loja on-chain e comece a vender na Arc Testnet.',
    'dash.storeName': 'Nome da sua loja',
    'dash.plan': 'Plano',
    'dash.basic': 'Básico',
    'dash.pro': 'PRO',
    'dash.recommended': '⚡ RECOMENDADO',
    'dash.processing': '⟳ Processando...',
    'dash.openFor': 'Abrir por',
    'dash.proFor': 'PRO por',
    'dash.upto10': 'Até 10 produtos',
    'dash.onchainVitrine': 'Vitrine on-chain',
    'dash.web3Payments': 'Pagamentos Web3',
    'dash.unlimited': 'Produtos ilimitados',
    'dash.vip': 'Selo VIP ⚡',
    'dash.featuredSpot': 'Destaque na vitrine',
    'dash.tracking': 'Rastreamento de entregas',
    'dash.tab.myStore': '⬡ Minha Loja',
    'dash.tab.products': '📦 Produtos',
    'dash.tab.visual': '🎨 Visual',
    'dash.products': 'Produtos',
    'dash.expiresIn': 'Expira em',
    'dash.expired': '⚠ Expirado',
    'dash.upgradePro': '⚡ FAZER UPGRADE PARA PRO —',
    'dash.renew': '↻ Renovar Assinatura',
    'dash.basic.badge': 'BÁSICO',
    /* ── DASH PRODUCTS TAB ── */
    'dash.myProducts': 'Meus Anúncios',
    'dash.loadingProducts': 'Carregando produtos...',
    'dash.noProducts': 'Nenhum produto anunciado ainda.',
    'dash.trackingCode': 'Código de rastreio',
    'dash.setTracking': 'Salvar Código',
    'dash.cancelItem': 'Cancelar',
    'dash.deleteItem': 'Excluir',
    'dash.canceling': 'Cancelando...',
    'dash.canceled': 'Cancelado',
    'dash.tracking.setting': 'Salvando...',
    'dash.tracking.set': 'Enviado!',
    'dash.sold': 'VENDIDO',
    'dash.paused': 'PAUSADO',
    'dash.active': 'ATIVO',
    'dash.addTracking': 'Inserir Rastreio',
    'dash.trackingSaved': 'Código de rastreio salvo na blockchain!',
    'dash.listingPaused': 'Anúncio pausado com sucesso.',
    'dash.txError': 'Erro na transação. Tente novamente.',
    /* ── BOOST ── */
    'dash.boost': '🚀 Impulsionar',
    'boost.modalTitle': '⚡ Impulsionar Produto',
    'boost.modalProduct': 'Produto',
    'boost.modalDesc': 'Pagar 5 USDC na rede Arc para impulsionar este produto para a Vitrine Principal?',
    'boost.confirm': '⚡ Confirmar — Pagar 5 USDC',
    'boost.cancel': 'Cancelar',
    'boost.processing': '⟳ Simulando assinatura...',
    'boost.success': '🚀 Boost aplicado! O produto aparecerá nos Destaques.',
    'boost.alreadyBoosted': '🚀 Impulsionado',
    'boost.emptyState': 'Nenhum produto impulsionado ainda.',
    'boost.emptyStateDesc': 'Impulsione um produto pelo painel do lojista para destacá-lo aqui.',
    /* ── DASH VISUAL TAB ── */
    'dash.visual.title': 'Visual da Loja',
    'dash.visual.banner': 'Banner',
    'dash.visual.avatar': 'Avatar / Logo',
    'dash.visual.neon': 'Cor Neon',
    'dash.visual.presets': 'Predefinidos',
    'dash.visual.upload': 'Upload',
    'dash.visual.uploadBanner': 'Clique ou arraste para enviar o banner',
    'dash.visual.uploadAvatar': 'Clique ou arraste para enviar o avatar',
    'dash.visual.converting': 'Convertendo...',
    'dash.visual.saved': 'Salvo!',

    /* ── AFFILIATE ── */
    'affiliate.title': 'Portal do Divulgador',
    'affiliate.subtitle': 'Ganhe',
    'affiliate.subtitleMid': '1% de comissão',
    'affiliate.subtitleEnd': 'em cada venda gerada pelo seu link — direto na blockchain.',
    'affiliate.connectWallet': 'Conecte sua carteira para acessar o portal',
    'affiliate.connect': 'Entrar',
    'affiliate.howItWorks': 'Como Funciona',
    'affiliate.step1': 'Complete as missões abaixo',
    'affiliate.step2': 'Gere seu link personalizado',
    'affiliate.step3': 'Ganhe 1% por cada venda',
    'affiliate.missions': '🎯 Missões para Liberar',
    'affiliate.follow': '𝕏 Seguir',
    'affiliate.followed': '✓ Seguido',
    'affiliate.yourLink': '🔗 Seu Link de Afiliado',
    'affiliate.yourWallet': 'Sua carteira:',
    'affiliate.copyLink': '🔗 GERAR E COPIAR LINK',
    'affiliate.completeMissions': '🔒 COMPLETE AS MISSÕES',
    'affiliate.copied': '✓ LINK COPIADO!',
    'affiliate.copiedDesc': '✓ Link copiado! Cole em qualquer lugar para divulgar e ganhar comissão.',
    'affiliate.completeMissionsHint': 'Complete as missões acima para desbloquear seu link de afiliado',
    'affiliate.howCommission': 'Como a Comissão Funciona',
    'affiliate.commission1': 'Quando alguém usa seu link e compra, o contrato registra seu endereço automaticamente',
    'affiliate.commission2': '1% do valor de cada venda é transferido para sua carteira on-chain sem intermediários',

    /* ── MISC ── */
    'section.boostedBadge': '⚡ IMPULSIONADO',

    /* ── CATEGORIES ── */
    'cat.fashion': 'Moda',
    'cat.electronics': 'Eletrônicos',
    'cat.perfumes': 'Perfumes e Beleza',
    'cat.games': 'Games',

    /* ── WALLET TOASTS ── */
    'wallet.connecting': 'Conectando...',
    'wallet.cancelled': 'Conexão cancelada.',
    'wallet.noWallet': 'Nenhuma carteira Web3 detectada. Instale MetaMask ou Rabby.',
    'wallet.noAccounts': 'Nenhuma conta autorizada.',
    'wallet.error': 'Erro ao conectar carteira. Tente novamente.',

    /* ── ESCROW / COMPRA SEGURA ── */
    'escrow.toggle': '🔒 Compra Segura (Grátis)',
    'escrow.desc': 'Pagamento travado no contrato — liberado só quando você confirmar o recebimento',
    'escrow.usdc': 'Obs: Compra Segura funciona apenas para pagamentos ARC/ETH. Stablecoins vão direto ao vendedor.',

    /* ── MINHAS COMPRAS ── */
    'purchases.title': '🛍 Minhas Compras',
    'purchases.empty': 'Nenhuma compra encontrada nesta carteira.',
    'purchases.confirmBtn': '✓ Confirmar Recebimento',
    'purchases.confirming': 'Confirmando...',
    'purchases.confirmed': '✓ Confirmado',
    'purchases.delivered': '✓ Entregue',
    'purchases.refunded': '↩ Reembolsado',
    'purchases.pending': 'Aguardando confirmação',
    'purchases.loading': 'Carregando compras...',
    'purchases.dispute': 'Problema com seu pedido? Entre em contato:',
    'purchases.show': '🛍 Minhas Compras',
    'purchases.hide': 'Ocultar',

    /* ── PLANO PRO ── */
    'pro.limitReached': 'Plano grátis: limite de 10 produtos atingido. Faça upgrade para Pro e anuncie ilimitado.',
    'pro.badge': '⭐ PRO',
    'pro.upgrading': 'Fazendo upgrade para Pro...',
    'pro.upgraded': '⭐ Upgrade realizado! Bem-vindo ao Pro.',
    'pro.upgradeFailed': 'Upgrade falhou. Tente novamente.',
    'dash.productLimit': 'de 10 (plano grátis)',
    'dash.productLimitPro': 'produtos (ilimitado)',
    'dash.upgradeSuccess': '⭐ Agora no plano Pro!',

    /* ── LANG TOGGLE ── */
    'lang.toggle': 'EN',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface LangContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(LS_LANG_KEY);
      if (saved === 'en' || saved === 'pt') return saved;
    } catch { /* ignore */ }
    return 'en';
  });

  useEffect(() => {
    try { localStorage.setItem(LS_LANG_KEY, lang); } catch { /* ignore */ }
  }, [lang]);

  function toggleLang() {
    setLang((prev) => (prev === 'en' ? 'pt' : 'en'));
  }

  function t(key: TranslationKey): string {
    return translations[lang][key] ?? translations.en[key] ?? key;
  }

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
