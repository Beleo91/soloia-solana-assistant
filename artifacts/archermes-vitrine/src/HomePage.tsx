import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import './Home.css';

// ──────────────────────────────────────────────────────────
// Cole o endereço do seu contrato do Remix aqui:
const CONTRACT_ADDRESS = '0x741aA13E978Abf28080Cc04E9dbcf8705aCb7787';
// ──────────────────────────────────────────────────────────

interface FormData {
  nomeItem: string;
  preco: string;
  linkImagem: string;
}

function HomePage() {
  const { login, authenticated, user } = usePrivy();

  const [modalAberto, setModalAberto] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState<FormData>({ nomeItem: '', preco: '', linkImagem: '' });

  function abrirModal() {
    setEnviado(false);
    setForm({ nomeItem: '', preco: '', linkImagem: '' });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEnviado(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handlePublicar(e: React.FormEvent) {
    e.preventDefault();
    console.log('Contrato:', CONTRACT_ADDRESS);
    console.log('Dados do produto:', form);
    setEnviado(true);
  }

  return (
    <div className="container-principal">
      <header className="cabecalho">
        <h1>ARCHERMES</h1>
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

            {!enviado ? (
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
                      id="nomeItem"
                      name="nomeItem"
                      type="text"
                      placeholder="Ex: Tênis Air Max Limited"
                      value={form.nomeItem}
                      onChange={handleChange}
                      required
                      autoComplete="off"
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="preco">Preço (USDC)</label>
                    <input
                      id="preco"
                      name="preco"
                      type="number"
                      placeholder="Ex: 25.00"
                      step="0.0001"
                      min="0"
                      value={form.preco}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="linkImagem">Link da Imagem</label>
                    <input
                      id="linkImagem"
                      name="linkImagem"
                      type="text"
                      placeholder="https://..."
                      value={form.linkImagem}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {form.linkImagem && (
                    <div className="preview-imagem">
                      <img src={form.linkImagem} alt="Preview" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}

                  <button type="submit" className="btn-publicar">
                    🚀 Publicar no Marketplace
                  </button>
                </form>
              </>
            ) : (
              <div className="modal-sucesso">
                <div className="sucesso-icone">✓</div>
                <h2>Produto Publicado!</h2>
                <p>
                  <strong>{form.nomeItem}</strong> foi enviado ao marketplace com sucesso.
                </p>
                {CONTRACT_ADDRESS && (
                  <p className="contrato-info">Contrato: <code>{CONTRACT_ADDRESS.slice(0, 10)}…</code></p>
                )}
                <button onClick={fecharModal} className="btn-publicar">
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
