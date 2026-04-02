# 🔮 SOLOIA — Solana Voice Intelligence
> **A primeira assistente de voz e IA focada no ecossistema Solana.**
> *Submissão para o Bounty da Superteam Brazil ($1,500).*

![SOLOIA Preview](https://raw.githubusercontent.com/Beleo91/Archer-Mes-Vitrine/main/soloia-app/public/logo.png)

## 🚀 Visão Geral
SOLOIA (**Sol**ana **V**oice **I**ntelligence **A**ssistant) é uma ferramenta avançada projetada para desenvolvedores Solana que desejam produtividade total sem tirar as mãos do teclado. Combinando reconhecimento de voz em tempo real, análise forense de erros e injeção de contexto anti-alucinação para IDEs, a SOLOIA é o "J.A.R.V.I.S." dos desenvolvedores Web3.

---

## ✨ Funcionalidades Principais

### 1. 🎙️ Orbe de Voz (Core)
*   **Interface Neural:** Um orbe responsivo que pulsa conforme o nível do áudio do usuário.
*   **Busca por Voz:** Conversão de fala para texto (Web Speech API) para consultar instantaneamente mais de 1.000 termos no SDK `@stbr/solana-glossary`.
*   **Narração Automática (TTS):** A assistente lê a definição oficial de volta para o usuário, permitindo aprendizado passivo enquanto codifica.

### 2. 🐛 Decodificador de Erros (Forensics)
*   **Análise de Logs:** Cole logs brutos do terminal ou do Anchor.
*   **Camada de Reasoning:** A SOLOIA sintetiza o erro usando lógica de IA "synthetic assistant", explicando o motivo da falha (ex: `0x1771`, `Insufficient Funds`) e como corrigir.
*   **Identificação de Termos:** Cruza automaticamente palavras-chave do erro com o glossário oficial.

### 3. 🕵️ Detetive de Segurança (Auditor)
*   **Scan Estático:** Detecta vulnerabilidades comuns em programas Rust/Anchor (ex: Unchecked Account, Reentrancy, Missing Signer).
*   **Integração com Glossário:** Explica termos de segurança detectados e fornece snippets de código para correção imediata.

### 4. 💉 Injetor de Contexto (Anti-Hallucination)
*   **Prompt Engineering:** Gera prompts estruturados para Cursor, Windsurf ou GitHub Copilot contendo a "Ground Truth" (Verdade Absoluta) do SDK.
*   **Prevenção de Alucinação:** Garante que a IA da sua IDE use definições oficiais e não invente conceitos técnicos de Solana.

---

## 🛠️ Stack Técnica
*   **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS.
*   **Animações:** Framer Motion (para o Orbe Neural e transições fluidas).
*   **Ícones:** Lucide React (Premium UI).
*   **Motores de Voz:** WebkitSpeechRecognition & Web Speech Synthesis.
*   **Data Source:** `@stbr/solana-glossary` (Dados oficiais da Superteam Brazil).
*   **i18n:** Suporte nativo a Português (PT-BR) e Inglês (EN).

---

## 🌎 Multilíngue (i18n)
A SOLOIA foi construída para o dev brasileiro, mas pronta para o mundo. Com um simples clique no ícone de globo, toda a interface e os dados do glossário alternam entre **Português** e **Inglês**, consumindo os arquivos de tradução oficiais do SDK.

---

## 📦 Como Rodar Localmente

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/vossa-conta/soloia.git
    cd soloia-app
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

4.  **Acesse no navegador:**
    [http://localhost:3000](http://localhost:3000)

---

## 🏆 Bounty Superteam Brazil
Este projeto foi desenvolvido seguindo rigorosamente os critérios de:
- **Quality & Polish (25%):** Interface Cyberpunk premium, logo customizada, animações suaves e ícones Lucide.
- **Usefulness (30%):** Resolve a dor de cabeça de buscar termos técnicos e decodificar erros complexos.
- **Novelty (15%):** Primeira assistente de voz focada no nicho Solana.
- **Multilingual Support (10%):** Integração total com i18n da Superteam.

---

**SOLOIA — Built with ❤️ for the Solana Community by @Archer-Mes.**
