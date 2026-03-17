import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { arcTestnet } from './App';
import './Home.css';

// ──────────────────────────────────────────────────────────
// Endereço do contrato na rede ARC test:
const CONTRACT_ADDRESS = '0x741aA13E978Abf28080Cc04E9dbcf8705aCb7787';

// ABI mínimo — função listItem do contrato
const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: 'string',  name: 'name',     type: 'string'  },
      { internalType: 'uint256', name: 'price',    type: 'uint256' },
      { internalType: 'string',  name: 'imageUrl', type: 'string'  },
    ],
    name: 'listItem',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
// ──────────────────────────────────────────────────────────

interface FormData {
  nomeItem: string;
  preco: string;
  linkImagem: string;
}

type Estado = 'idle' | 'enviando' | 'sucesso' | 'erro';

function HomePage() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const [modalAberto, setModalAberto] = useState(false);
  const [estado, setEstado] = useState<Estado>('idle');
  const [txHash, setTxHash] = useState('');
  const [erroMsg, setErroMsg] = useState('');
  const [form, setForm] = useState<FormData>({ nomeItem: '', preco: '', linkImagem: '' });

  function abrirModal() {
    setEstado('idle');
    setTxHash('');
    setErroMsg('');
    setForm({ nomeItem: '', preco: '', linkImagem: '' });
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
      if (!wallet) throw new Error('Nenhuma carteira conectada. Faça login novamente.');

      // Garante que a carteira está na Arc Testnet
      await wallet.switchChain(arcTestnet.id);

      // Obtém o provider EIP-1193 da carteira Privy
      const eip1193 = await wallet.getEthereumProvider();
      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();

      // Instancia o contrato
      const contrato = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // USDC usa 6 casas decimais
      const precoUsdc = parseUnits(form.preco, 6);

      // Envia a transação — a carteira pedirá confirmação ao usuário
      const tx = await contrato.listItem(form.nomeItem, precoUsdc, form.linkImagem);
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
          <button onClick={login} className="btn-login">
            Entrar / Criar Minha Loja
          </button>
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
                    <label htmlFor="preco">Preço (USDC)</label>
                    <input
                      id="preco" name="preco" type="number"
                      placeholder="Ex: 25.00"
                      step="0.000001" min="0"
                      value={form.preco} onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="linkImagem">Link da Imagem</label>
                    <input
                      id="linkImagem" name="linkImagem" type="text"
                      placeholder="https://..."
                      value={form.linkImagem} onChange={handleChange}
                      required
                    />
                  </div>

                  {form.linkImagem && (
                    <div className="preview-imagem">
                      <img src={form.linkImagem} alt="Preview"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}

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
