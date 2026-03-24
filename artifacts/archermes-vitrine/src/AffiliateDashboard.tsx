import { useState } from 'react';
import { usePrivy, useWallets, useConnectWallet } from '@privy-io/react-auth';

const MISSOES = [
  {
    id: 'ceo',
    label: 'Seguir o CEO',
    handle: '@bLeosoares',
    url: 'https://twitter.com/intent/follow?screen_name=bLeosoares',
    cor: '#1DA1F2',
  },
  {
    id: 'rede',
    label: 'Seguir a Rede',
    handle: '@ARCHERMES1',
    url: 'https://twitter.com/intent/follow?screen_name=ARCHERMES1',
    cor: '#00e5ff',
  },
];

export default function AffiliateDashboard({ onVoltar }: { onVoltar: () => void }) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { connectWallet } = useConnectWallet();

  const [clicados, setClicados] = useState<Set<string>>(new Set());
  const [copiado, setCopiado] = useState(false);

  const endereco = wallets[0]?.address ?? '';
  const linkAfiliado = endereco
    ? `${window.location.origin}${window.location.pathname}?ref=${endereco}`
    : '';

  const todasMissoesFeitas = clicados.size >= MISSOES.length;

  function marcarClicado(id: string, url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
    setClicados((prev) => new Set([...prev, id]));
  }

  async function copiarLink() {
    if (!linkAfiliado) return;
    try {
      await navigator.clipboard.writeText(linkAfiliado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = linkAfiliado;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-2xl mx-auto w-full">
      {/* Voltar */}
      <button
        onClick={onVoltar}
        className="mb-8 text-xs text-white/40 hover:text-cyan-400 transition-colors flex items-center gap-2 tracking-widest uppercase"
        style={{ fontFamily: "'Orbitron', sans-serif" }}
      >
        ← Voltar
      </button>

      {/* Título */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px #4ade80)' }}>🔗</span>
          <h1
            className="text-3xl font-black tracking-widest uppercase"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              color: '#4ade80',
              textShadow: '0 0 30px rgba(74,222,128,0.5)',
            }}
          >
            Portal do Divulgador
          </h1>
        </div>
        <p className="text-white/40 text-sm tracking-wide ml-11">
          Ganhe <span className="text-green-400 font-bold">1% de comissão</span> em cada venda gerada pelo seu link — direto na blockchain.
        </p>
      </div>

      {/* Sem autenticação */}
      {!authenticated && (
        <div
          className="rounded-2xl border border-white/10 p-10 flex flex-col items-center gap-5"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)' }}
        >
          <span className="text-5xl opacity-30">🔒</span>
          <p className="text-white/40 text-sm tracking-widest uppercase text-center"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
            Faça login para acessar o portal
          </p>
          <button
            onClick={login}
            className="px-6 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase
              transition-all hover:shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:-translate-y-0.5"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              background: 'linear-gradient(135deg,#4ade80,#22d3ee)',
              color: '#000', border: 'none',
            }}
          >
            Entrar
          </button>
        </div>
      )}

      {/* Sem carteira */}
      {authenticated && !endereco && (
        <div
          className="rounded-2xl border border-yellow-400/20 p-10 flex flex-col items-center gap-5"
          style={{ background: 'rgba(251,191,36,0.04)', backdropFilter: 'blur(16px)' }}
        >
          <span className="text-5xl">⚡</span>
          <p className="text-white/60 text-sm text-center">
            Conecte uma carteira para gerar seu link de afiliado.
          </p>
          <button
            onClick={() => connectWallet()}
            className="px-6 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase border
              border-yellow-400/40 text-yellow-300 hover:bg-yellow-400/10 transition-all"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            Conectar Carteira
          </button>
        </div>
      )}

      {/* Dashboard principal */}
      {authenticated && endereco && (
        <div className="flex flex-col gap-6">

          {/* Como funciona */}
          <div
            className="rounded-2xl border border-white/10 p-6 flex flex-col gap-3"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)' }}
          >
            <h3 className="text-xs font-black tracking-widest uppercase text-white/50"
              style={{ fontFamily: "'Orbitron', sans-serif" }}>
              Como Funciona
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { n: '01', txt: 'Complete as missões abaixo' },
                { n: '02', txt: 'Gere seu link personalizado' },
                { n: '03', txt: 'Ganhe 1% por cada venda' },
              ].map(({ n, txt }) => (
                <div key={n} className="flex flex-col items-center gap-2 text-center">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      background: 'rgba(74,222,128,0.12)',
                      border: '1px solid rgba(74,222,128,0.3)',
                      color: '#4ade80',
                    }}
                  >
                    {n}
                  </span>
                  <p className="text-white/50 text-xs leading-snug">{txt}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Missões do X */}
          <div
            className="rounded-2xl border p-6 flex flex-col gap-5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(12px)',
              borderColor: todasMissoesFeitas ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)',
              boxShadow: todasMissoesFeitas ? '0 0 20px rgba(74,222,128,0.1)' : 'none',
              transition: 'all 0.4s ease',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-widest uppercase"
                style={{ fontFamily: "'Orbitron', sans-serif", color: '#fff' }}>
                🎯 Missões para Liberar
              </h3>
              <span
                className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  background: todasMissoesFeitas ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${todasMissoesFeitas ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: todasMissoesFeitas ? '#4ade80' : 'rgba(255,255,255,0.3)',
                }}
              >
                {clicados.size}/{MISSOES.length} concluídas
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {MISSOES.map((missao) => {
                const feita = clicados.has(missao.id);
                return (
                  <div
                    key={missao.id}
                    className="flex items-center justify-between p-4 rounded-xl border transition-all duration-300"
                    style={{
                      background: feita ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.02)',
                      borderColor: feita ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all"
                        style={{
                          borderColor: feita ? '#4ade80' : 'rgba(255,255,255,0.2)',
                          background: feita ? 'rgba(74,222,128,0.15)' : 'transparent',
                          color: feita ? '#4ade80' : 'rgba(255,255,255,0.2)',
                        }}
                      >
                        {feita ? '✓' : '𝕏'}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-white">{missao.label}</p>
                        <p className="text-[11px] text-white/30 font-mono">{missao.handle}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => marcarClicado(missao.id, missao.url)}
                      className="text-[11px] font-bold tracking-widest uppercase px-4 py-2 rounded-lg
                        transition-all duration-200 flex items-center gap-1.5"
                      style={{
                        fontFamily: "'Orbitron', sans-serif",
                        background: feita ? 'rgba(74,222,128,0.12)' : 'rgba(29,161,242,0.15)',
                        border: `1px solid ${feita ? 'rgba(74,222,128,0.35)' : 'rgba(29,161,242,0.35)'}`,
                        color: feita ? '#4ade80' : '#1DA1F2',
                      }}
                    >
                      {feita ? '✓ Seguido' : 'Seguir'}
                    </button>
                  </div>
                );
              })}
            </div>

            {!todasMissoesFeitas && (
              <p className="text-white/25 text-xs text-center tracking-wide">
                Complete as missões acima para desbloquear seu link de afiliado
              </p>
            )}
          </div>

          {/* Geração do link */}
          <div
            className="rounded-2xl border p-6 flex flex-col gap-5 transition-all duration-500"
            style={{
              background: todasMissoesFeitas ? 'rgba(74,222,128,0.05)' : 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(16px)',
              borderColor: todasMissoesFeitas ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)',
              boxShadow: todasMissoesFeitas ? '0 0 30px rgba(74,222,128,0.08)' : 'none',
            }}
          >
            <h3
              className="text-xs font-black tracking-widest uppercase transition-colors duration-500"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                color: todasMissoesFeitas ? '#4ade80' : 'rgba(255,255,255,0.2)',
              }}
            >
              🔗 Seu Link de Afiliado
            </h3>

            {/* Preview do link */}
            <div
              className="rounded-xl px-4 py-3 border font-mono text-xs break-all transition-all duration-500"
              style={{
                background: todasMissoesFeitas ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.02)',
                borderColor: todasMissoesFeitas ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)',
                color: todasMissoesFeitas ? '#4ade80' : 'rgba(255,255,255,0.15)',
                filter: todasMissoesFeitas ? 'none' : 'blur(3px)',
                userSelect: todasMissoesFeitas ? 'all' : 'none',
              }}
            >
              {linkAfiliado || window.location.origin + '?ref=0x...'}
            </div>

            {/* Carteira do afiliado */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30 tracking-widest uppercase"
                style={{ fontFamily: "'Orbitron', sans-serif" }}>
                Sua carteira:
              </span>
              <span className="text-[11px] font-mono text-white/40">
                {endereco.slice(0, 8)}…{endereco.slice(-6)}
              </span>
            </div>

            {/* Botão principal */}
            <button
              disabled={!todasMissoesFeitas}
              onClick={copiarLink}
              className="w-full py-4 rounded-xl text-sm font-black tracking-widest uppercase
                transition-all duration-500 relative overflow-hidden"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                background: todasMissoesFeitas
                  ? copiado
                    ? 'linear-gradient(135deg,#4ade80,#22d3ee)'
                    : 'linear-gradient(135deg,#4ade80,#4ade80aa)'
                  : 'rgba(255,255,255,0.04)',
                border: todasMissoesFeitas
                  ? '1px solid rgba(74,222,128,0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
                color: todasMissoesFeitas ? '#000' : 'rgba(255,255,255,0.15)',
                cursor: todasMissoesFeitas ? 'pointer' : 'not-allowed',
                boxShadow: todasMissoesFeitas && !copiado
                  ? '0 0 25px rgba(74,222,128,0.3), 0 0 50px rgba(74,222,128,0.1)'
                  : 'none',
              }}
            >
              {copiado ? '✓ LINK COPIADO!' : todasMissoesFeitas ? '🔗 GERAR E COPIAR LINK' : '🔒 COMPLETE AS MISSÕES'}
            </button>

            {copiado && (
              <div
                className="text-center text-xs tracking-wide"
                style={{ color: '#4ade80', textShadow: '0 0 10px rgba(74,222,128,0.5)' }}
              >
                ✓ Link copiado! Cole em qualquer lugar para divulgar e ganhar comissão.
              </div>
            )}
          </div>

          {/* Info da comissão */}
          <div
            className="rounded-2xl border border-white/5 p-5 flex flex-col gap-3"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <h4 className="text-[10px] text-white/30 tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', sans-serif" }}>
              Como a Comissão Funciona
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs text-white/40 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">→</span>
                <span>Quando alguém usa seu link e compra, o contrato registra seu endereço automaticamente</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">→</span>
                <span>1% do valor de cada venda é transferido para sua carteira on-chain sem intermediários</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
