import { useState } from 'react';
import { usePrivy, useWallets, useConnectWallet } from '@privy-io/react-auth';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { arcTestnet } from './chains';
import './Home.css';

// ──────────────────────────────────────────────────────────
// Contrato oficial do marketplace na Arc Testnet
const CONTRACT_ADDRESS = '0x3Fa4EA19fB854B237Cb19F647832725911B15C1a';

const CONTRACT_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }],
    name: 'boostItem',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_id', type: 'uint256' },
      { internalType: 'address payable', name: '_referrer', type: 'address' },
    ],
    name: 'buyItem',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }],
    name: 'confirmDelivery',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'buyer', type: 'address' },
      { indexed: true, internalType: 'address', name: 'referrer', type: 'address' },
    ],
    name: 'ItemBought',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' }],
    name: 'ItemDelivered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'itemName', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'price', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'seller', type: 'address' },
    ],
    name: 'ItemListed',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'string', name: '_itemName', type: 'string' },
      { internalType: 'uint256', name: '_price', type: 'uint256' },
    ],
    name: 'listItem',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }],
    name: 'refundBuyer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'buyer', type: 'address' },
    ],
    name: 'RefundIssued',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'items',
    outputs: [
      { internalType: 'uint256', name: 'id', type: 'uint256' },
      { internalType: 'string', name: 'itemName', type: 'string' },
      { internalType: 'uint256', name: 'price', type: 'uint256' },
      { internalType: 'address payable', name: 'seller', type: 'address' },
      { internalType: 'address payable', name: 'buyer', type: 'address' },
      { internalType: 'address payable', name: 'referrer', type: 'address' },
      { internalType: 'bool', name: 'isSold', type: 'bool' },
      { internalType: 'bool', name: 'isDelivered', type: 'bool' },
      { internalType: 'bool', name: 'isBoosted', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address payable', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalItems',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];
// ──────────────────────────────────────────────────────────

interface FormData {
  nomeItem: string;
  preco: string;
}

type Estado = 'idle' | 'enviando' | 'sucesso' | 'erro' | 'sem-carteira';

function HomePage() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { connectWallet } = useConnectWallet();

  const [modalAberto, setModalAberto] = useState(false);
  const [estado, setEstado] = useState<Estado>('idle');
  const [txHash, setTxHash] = useState('');
  const [erroMsg, setErroMsg] = useState('');
  const [form, setForm] = useState<FormData>({ nomeItem: '', preco: '' });

  function abrirModal() {
    setEstado('idle');
    setTxHash('');
    setErroMsg('');
    setForm({ nomeItem: '', preco: '' });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEstado('idle');
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handlePublicar(e: React.FormEvent) {
    e.preventDefault();
    setEstado('enviando');
    setErroMsg('');

    try {
      const wallet = wallets[0];
      if (!wallet) {
        setEstado('sem-carteira');
        return;
      }

      // Garante que a carteira está na Arc Testnet
      await wallet.switchChain(arcTestnet.id);

      // Obtém o provider EIP-1193 da carteira Privy
      const eip1193 = await wallet.getEthereumProvider();
      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();

      // Instancia o contrato
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Preço em wei (18 decimais — ETH nativo da Arc Testnet)
      const precoWei = parseUnits(form.preco, 18);

      // Chama listItem(_itemName, _price) no contrato oficial
      const tx = await contrato.listItem(form.nomeItem, precoWei);
      await tx.wait();

      setTxHash(tx.hash);
      setEstado('sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErroMsg(msg.length > 140 ? msg.slice(0, 140) + '…' : msg);
      setEstado('erro');
    }
  }

  return (
    <div className="container-principal">
      <header className="cabecalho">
        <div className="logo-wrapper">
          <img src="/images/logo-ahs.png" alt="ARCHERMES" className="logo-img" />
          <span className="logo-texto">ARCHERMES</span>
        </div>
        {!authenticated ? (
          <div className="acoes-header">
            <button onClick={login} className="btn-entrar">
              Entrar
            </button>
            <button onClick={login} className="btn-login">
              Criar Minha Loja
            </button>
          </div>
        ) : (
          <div className="painel-usuario">
            <span>Olá, {user?.email ? user.email.address : 'Vendedor'}!</span>
            <button onClick={abrirModal} className="btn-anunciar">
              + Anunciar Produto
            </button>
            <button onClick={() => logout()} className="btn-sair">
              Sair
            </button>
          </div>
        )}
      </header>

      <section className="area-patrocinada">
        <h2>🔥 Lojas em Destaque</h2>
        <p className="subtitulo">As melhores ofertas da semana</p>
        <div className="carrossel-anuncios">
          <div className="card-destaque">
            <span className="tag-patrocinado">Patrocinado</span>
            <img src="foto-perfume.jpg" alt="Perfumes Importados" />
            <h3>Oásis dos Perfumes</h3>
            <p>Frete grátis para todo o país</p>
          </div>
          <div className="card-destaque">
            <span className="tag-patrocinado">Patrocinado</span>
            <img src="foto-tenis.jpg" alt="Tênis Exclusivos" />
            <h3>Sneakers Store</h3>
            <p>Modelos exclusivos</p>
          </div>
        </div>
      </section>

      <section className="area-nichos">
        <h2>Explore por Categorias</h2>
        <div className="grid-categorias">
          <button className="btn-nicho"><span className="icone">👕</span> Moda e Vestuário</button>
          <button className="btn-nicho"><span className="icone">📱</span> Eletrônicos</button>
          <button className="btn-nicho"><span className="icone">💧</span> Perfumes e Beleza</button>
          <button className="btn-nicho"><span className="icone">🎮</span> Games e Consoles</button>
        </div>
      </section>

      {/* ── MODAL ── */}
      {modalAberto && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-fechar" onClick={fecharModal} aria-label="Fechar">✕</button>

            {/* SEM CARTEIRA */}
            {estado === 'sem-carteira' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone" style={{ color: '#f59e0b' }}>⚠</div>
                <h2>Carteira não encontrada</h2>
                <p>Para publicar na blockchain, você precisa conectar uma carteira.<br />Clique abaixo para conectar.</p>
                <button
                  className="btn-publicar"
                  onClick={() => { connectWallet(); setEstado('idle'); }}
                >
                  Conectar Carteira
                </button>
                <button
                  className="btn-sair"
                  style={{ marginTop: '0.5rem', width: '100%' }}
                  onClick={() => setEstado('idle')}
                >
                  Voltar ao formulário
                </button>
              </div>
            )}

            {/* FORMULÁRIO */}
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
                    <input
                      id="nomeItem" name="nomeItem" type="text"
                      placeholder="Ex: Tênis Air Max Limited"
                      value={form.nomeItem} onChange={handleChange}
                      required autoComplete="off"
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="preco">Preço (ETH)</label>
                    <input
                      id="preco" name="preco" type="number"
                      placeholder="Ex: 0.05"
                      step="0.000000000000000001" min="0"
                      value={form.preco} onChange={handleChange}
                      required
                    />
                  </div>

                  {estado === 'erro' && (
                    <div className="modal-erro">⚠️ {erroMsg}</div>
                  )}

                  <button type="submit" className="btn-publicar">
                    🚀 Publicar no Marketplace
                  </button>
                </form>
              </>
            )}

            {/* AGUARDANDO */}
            {estado === 'enviando' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone spinner">⟳</div>
                <h2>Aguardando confirmação...</h2>
                <p>A carteira vai pedir sua autorização.<br />Confirme a transação para continuar.</p>
              </div>
            )}

            {/* SUCESSO */}
            {estado === 'sucesso' && (
              <div className="modal-sucesso">
                <div className="sucesso-icone">✓</div>
                <h2>Produto postado na Blockchain!</h2>
                <p><strong>{form.nomeItem}</strong> foi listado com sucesso no marketplace.</p>
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

export default HomePage;
