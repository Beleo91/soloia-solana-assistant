import { usePrivy } from '@privy-io/react-auth';
import './Home.css';

function HomePage() {
  const { login, ready, authenticated, user } = usePrivy();

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
    </div>
  );
}

export default HomePage;
