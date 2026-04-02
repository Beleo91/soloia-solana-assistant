/**
 * SOLOIA ELI5 Database
 * Curated "Explain Like I'm 5" explanations and Rust/Anchor code snippets
 * for the most important Solana terms.
 *
 * WHY CURATED (not AI-generated)?
 * - Works instantly, no API keys needed
 * - Always accurate, never hallucinated
 * - Better for offline/dev environments
 */

export interface ELI5Entry {
  termId: string;
  analogy: string; // Simple real-world analogy
  snippet?: string; // Rust/Anchor code example
  snippetLang?: "rust" | "typescript" | "bash";
  snippetTitle?: string;
}

export const ELI5_DATABASE: Record<string, ELI5Entry> = {
  // ── Core Protocol ──────────────────────────────────────────────────────────

  "proof-of-history": {
    termId: "proof-of-history",
    analogy:
      "Imagine você fotografa um jornal segurando na mão — a foto prova que foi tirada DEPOIS que o jornal saiu. O PoH é isso: cada transação é 'fotografada' dentro de uma sequência de hashes irrefutável, provando a ordem exata sem precisar perguntar para ninguém.",
    snippet: `// PoH é transparente para o dev — você apenas envia transações
// e a rede ordena automaticamente via PoH
use solana_program::clock::Clock;
use solana_program::sysvar::Sysvar;

pub fn ver_tempo_atual(ctx: Context<MeuContexto>) -> Result<()> {
    let clock = Clock::get()?;
    msg!("Slot atual (unidade de tempo no PoH): {}", clock.slot);
    msg!("Timestamp Unix: {}", clock.unix_timestamp);
    Ok(())
}`,
    snippetLang: "rust",
    snippetTitle: "Lendo o relógio do PoH (Clock Sysvar)",
  },

  slot: {
    termId: "slot",
    analogy:
      "Pense em um slot como um turno de trabalho de 400 milissegundos. A cada turno, um funcionário diferente (o líder) tem a vez de processar as transações. Se ele faltou ao trabalho, o turno é pulado mas o tempo continua correndo.",
    snippet: `// Verificando o slot atual dentro de um programa
use solana_program::clock::Clock;

let clock = Clock::get()?;
msg!("Estamos no slot: {}", clock.slot);
// Um slot = ~400ms
// Uma epoch = 432.000 slots (~2-3 dias)`,
    snippetLang: "rust",
    snippetTitle: "Consultando o slot atual",
  },

  epoch: {
    termId: "epoch",
    analogy:
      "Epoch é como um mês de trabalho na Solana. A cada 'mês' (432.000 slots), a rede recalcula quem são os melhores 'funcionários' (validadores com mais stake) e redistribui os salários (recompensas de inflação).",
    snippet: `use solana_program::clock::Clock;

pub fn ver_epoch_atual(ctx: Context<MeuContexto>) -> Result<()> {
    let clock = Clock::get()?;
    msg!("Epoch atual: {}", clock.epoch);
    msg!("Slot de início da epoch: {}", clock.epoch_start_slot);
    Ok(())
}`,
    snippetLang: "rust",
    snippetTitle: "Verificando a epoch atual",
  },

  validator: {
    termId: "validator",
    analogy:
      "Validadores são como fiscais auditores da prefeitura. Cada um tem uma cópia do livro contábil (blockchain) e verifica se as transações são legítimas. Quem tem mais 'votos de confiança' (stake) tem mais poder de decisão.",
  },

  // ── Programming Model ─────────────────────────────────────────────────────

  account: {
    termId: "account",
    analogy:
      "Contas na Solana são como arquivos em um pen-drive. Cada arquivo tem um dono (owner), um tamanho fixo (você paga aluguel proporcional) e um conteúdo (os dados). Programas são arquivos especiais que contêm código executável.",
    snippet: `// Estrutura de uma conta personalizada com Anchor
use anchor_lang::prelude::*;

#[account]
pub struct MinhaContaDeDados {
    pub dono: Pubkey,        // Quem criou (32 bytes)
    pub saldo: u64,          // Valor armazenado (8 bytes)
    pub ativo: bool,         // Flag de status (1 byte)
    pub bump: u8,            // Para PDAs (1 byte)
}

// Tamanho = 8 (discriminator) + 32 + 8 + 1 + 1 = 50 bytes
// Rent = ~0.001 SOL para essa conta`,
    snippetLang: "rust",
    snippetTitle: "Definindo uma Account com Anchor",
  },

  pda: {
    termId: "pda",
    analogy:
      "PDA é como um cofre cujo endereço é calculado a partir de uma receita (seeds). Exemplo: 'cofre do usuário João no programa XYZ'. Só o programa XYZ tem a chave desse cofre — nem o João pode abrir sem passar pelo programa. Isso é segurança por design!",
    snippet: `use anchor_lang::prelude::*;

// Derivando um PDA com Anchor
#[derive(Accounts)]
#[instruction(seed_usuario: String)]
pub struct InicializarCofre<'info> {
    #[account(
        init,
        payer = usuario,
        space = 8 + 32 + 8 + 1,
        seeds = [
            b"cofre",           // seed estática
            usuario.key().as_ref(), // seed dinâmica
            seed_usuario.as_bytes(), // seed extra
        ],
        bump
    )]
    pub cofre: Account<'info, Cofre>,
    
    #[account(mut)]
    pub usuario: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Para derivar o endereço no cliente (TypeScript):
// const [pdaAddress, bump] = await PublicKey.findProgramAddress(
//   [Buffer.from("cofre"), userPublicKey.toBuffer()],
//   programId
// );`,
    snippetLang: "rust",
    snippetTitle: "Criando e usando um PDA com Anchor",
  },

  "program-derived-address": {
    termId: "program-derived-address",
    analogy:
      "PDA é como um cofre cujo endereço é calculado a partir de uma receita (seeds). Só o programa tem a chave — segurança por design!",
    snippet: `// Buscando PDA no cliente JavaScript/TypeScript
import { PublicKey } from "@solana/web3.js";

const [pda, bump] = await PublicKey.findProgramAddressSync(
  [
    Buffer.from("cofre"),
    usuarioPublicKey.toBuffer(),
  ],
  programId  // ID do seu programa
);

console.log("Endereço do PDA:", pda.toBase58());
console.log("Bump seed:", bump);`,
    snippetLang: "typescript",
    snippetTitle: "Derivando PDA no cliente TypeScript",
  },

  cpi: {
    termId: "cpi",
    analogy:
      "CPI é como um programa chamando um colega por telefone para fazer uma subtarefa. Seu programa DeFi pode ligar para o Token Program para transferir tokens, sem você precisar reimplementar a lógica de transferência. Os programas se compõem como peças de LEGO.",
    snippet: `use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer, Token};

pub fn transferir_tokens(
    ctx: Context<TransferirTokens>,
    quantidade: u64,
) -> Result<()> {
    // CPI para o Token Program — chamando outro programa!
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.conta_origem.to_account_info(),
            to: ctx.accounts.conta_destino.to_account_info(),
            authority: ctx.accounts.autoridade.to_account_info(),
        },
    );
    
    token::transfer(cpi_ctx, quantidade)?;
    
    msg!("{} tokens transferidos com sucesso!", quantidade);
    Ok(())
}`,
    snippetLang: "rust",
    snippetTitle: "CPI para o Token Program",
  },

  sealevel: {
    termId: "sealevel",
    analogy:
      "Imagine um restaurante onde vários garçons (CPUs) atendem várias mesas ao mesmo tempo — mas há uma regra: dois garçons não podem servir a mesma mesa simultaneamente. O Sealevel é esse sistema: processa milhares de transações em paralelo, mas garante que transações que tocam os mesmos dados executem em sequência.",
  },

  rent: {
    termId: "rent",
    analogy:
      "Armazenar dados na blockchain ocupa espaço físico nos servidores dos validadores. O 'aluguel' (rent) é uma taxa proporcional ao tamanho da conta. Se você depositar SOL suficiente de uma vez (rent-exempt), a conta fica para sempre sem custo adicional. É como comprar em vez de alugar.",
    snippet: `// Calculando o rent-exempt mínimo para uma conta
const { Connection, LAMPORTS_PER_SOL } = require("@solana/web3.js");

const connection = new Connection("https://api.devnet.solana.com");
const espacoEmBytes = 165; // tamanho da conta

const rentExempt = await connection.getMinimumBalanceForRentExemption(
  espacoEmBytes
);

console.log(\`Rent-exempt mínimo: \${rentExempt / LAMPORTS_PER_SOL} SOL\`);
// Tipicamente: ~0.00203928 SOL para 165 bytes`,
    snippetLang: "typescript",
    snippetTitle: "Calculando o Rent-Exempt",
  },

  lamport: {
    termId: "lamport",
    analogy:
      "Lamport é para o SOL o que centavo é para o Real. 1 SOL = 1.000.000.000 lamports (1 bilhão!). Todos os cálculos internos da Solana usam lamports para evitar erros de decimal. É como trabalhar com centavos em vez de reais para não errar arredondamentos.",
    snippet: `// Constante LAMPORTS_PER_SOL
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const solAmount = 1.5;
const lamports = solAmount * LAMPORTS_PER_SOL;
// lamports = 1_500_000_000

// Converter lamports para SOL:
const saldo = await connection.getBalance(publicKey);
const solBalance = saldo / LAMPORTS_PER_SOL;
console.log(\`Saldo: \${solBalance} SOL (\${saldo} lamports)\`);`,
    snippetLang: "typescript",
    snippetTitle: "Convertendo SOL ↔ Lamports",
  },

  "compute-units": {
    termId: "compute-units",
    analogy:
      "Compute Units são como o 'gás' do Ethereum, mas muito mais barato. Cada operação consome CUs — um add=1 CU, um SHA256=100 CUs, etc. O limite por transação é 1.4M CUs, e você pode pagar prioridade por CU para furinha na fila.",
    snippet: `use anchor_lang::prelude::*;
use solana_program::compute_budget::ComputeBudgetInstruction;

// No CLIENTE — solicitando mais compute antes de uma TX pesada:
const { Transaction, ComputeBudgetProgram } = require("@solana/web3.js");

const tx = new Transaction()
  .add(
    // Solicita 400.000 CUs (padrão é 200.000)
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
  )
  .add(
    // Paga prioridade: 1000 microlamports por CU
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
  )
  .add(suaInstrucao);`,
    snippetLang: "typescript",
    snippetTitle: "Definindo Compute Budget",
  },

  "priority-fee": {
    termId: "priority-fee",
    analogy:
      "Taxa de prioridade é como pagar para usar a faixa VIP no embarque do aeroporto. Na hora de congestionamento, quem paga mais por Compute Unit é processado primeiro pelo líder. É uma leilão dinâmico por espaço no bloco.",
    snippet: `import { ComputeBudgetProgram, Transaction } from "@solana/web3.js";

// Buscar taxa recomendada (exemplo com Helius)
const response = await fetch("https://mainnet.helius-rpc.com/?api-key=SUA_KEY", {
  method: "POST",
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getPriorityFeeEstimate",
    params: [{ accountKeys: [programId.toBase58()], options: { priorityLevel: "High" } }]
  })
});
const { result } = await response.json();
const priorityFee = result.priorityFeeEstimate; // microlamports/CU

const tx = new Transaction()
  .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }))
  .add(suaInstrucao);`,
    snippetLang: "typescript",
    snippetTitle: "Priority Fee dinâmica",
  },

  // ── DeFi ──────────────────────────────────────────────────────────────────

  amm: {
    termId: "amm",
    analogy:
      "Um AMM é como uma máquina de câmbio automática no aeroporto, mas gerenciada por uma fórmula matemática (x*y=k). Não há humano negociando — a máquina ajusta o preço automaticamente conforme você compra ou vende. Quanto mais você compra, mais caro fica.",
  },

  "liquidity-pool": {
    termId: "liquidity-pool",
    analogy:
      "Pool de liquidez é como um pote comunitário onde várias pessoas jogam dinheiro (dois tipos de token). Qualquer um pode comprar/vender trocando com esse pote. Quem adicionou dinheiro (LP) ganha uma parte das taxas de cada transação — passivo renda on-chain!",
    snippet: `// Adicionando liquidez a uma pool Meteora DLMM via SDK
import { DLMM } from "@meteora-ag/dlmm";
import { PublicKey, Keypair } from "@solana/web3.js";

const dlmmPool = await DLMM.create(connection, poolAddress);

// Adicionar liquidez em range específico de preço
const addLiqTx = await dlmmPool.addLiquidityByStrategy({
  positionPubKey: position.publicKey,
  user: wallet.publicKey,
  totalXAmount: new BN(1_000_000),  // 1 token X
  totalYAmount: new BN(1_000_000),  // 1 token Y
  strategy: { 
    maxBinId: activeBin + 10, 
    minBinId: activeBin - 10,
    strategyType: StrategyType.Spot 
  },
});`,
    snippetLang: "typescript",
    snippetTitle: "Adicionando Liquidez (Meteora DLMM)",
  },

  mev: {
    termId: "mev",
    analogy:
      "MEV é como um especulador que vê sua ordem de compra ANTES de ela ser executada e compra na sua frente para vender mais caro pra você (sandwich attack). Na Solana, o Jito Block Engine foi criado para democratizar o MEV — em vez de roubar traders, os bots competem em leilões e o lucro vai para os stakers.",
  },

  // ── Token Ecosystem ───────────────────────────────────────────────────────

  spl: {
    termId: "spl",
    analogy:
      "SPL Token é como o padrão de plug elétrico brasileiro (ABNT). Todos os tokens da Solana (USDC, USDT, JUP, etc.) seguem esse padrão — isso garante que qualquer carteira, exchange ou programa pode trabalhar com qualquer token sem código extra.",
    snippet: `// Criando um token SPL do zero com @solana/spl-token
import { createMint, getMint } from "@solana/spl-token";
import { Keypair, Connection } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const pagador = Keypair.generate(); // quem paga o rent

// Cria o mint do token
const mintAddress = await createMint(
  connection,
  pagador,           // Payer
  pagador.publicKey, // Mint Authority (quem pode mintar)
  pagador.publicKey, // Freeze Authority (pode congelar contas)
  9                  // Decimais (9 = padrão SOL)
);

console.log("Token criado:", mintAddress.toBase58());`,
    snippetLang: "typescript",
    snippetTitle: "Criando um Token SPL",
  },

  "token-account": {
    termId: "token-account",
    analogy:
      "Se o SPL Token Mint é a fábrica de moedas, a Token Account é a sua carteira física para guardar essas moedas. Cada usuário precisa de uma Token Account separada para cada tipo de token. O Associated Token Account (ATA) é a versão automática — criada no endereço padrão.",
    snippet: `import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { PublicKey, Connection } from "@solana/web3.js";

// Cria ou encontra a Token Account associada (ATA)
const tokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  pagadorKeypair,        // Quem cobre o custo de criação
  mintAddress,           // Qual token
  proprietarioPublicKey  // Para quem
);

console.log("Token Account:", tokenAccount.address.toBase58());
console.log("Saldo:", tokenAccount.amount.toString());`,
    snippetLang: "typescript",
    snippetTitle: "Criando Associated Token Account",
  },

  "metaplex-metadata": {
    termId: "metaplex-metadata",
    analogy:
      "Metaplex Metadata é como a etiqueta de um produto: nome, imagem, descrição. Sem ela, seu NFT é apenas um número — com ela, o NFT vira um 'Macaco Pixelado #4523' com imagem e atributos visíveis em qualquer marketplace.",
  },

  nft: {
    termId: "nft",
    analogy:
      "NFT é como um documento de identidade digital único. Assim como sua RG tem um número único e não pode ser copiada (em validade legal), o NFT tem um endereço único na blockchain que prova quem é o dono. A imagem pode ser copiada, mas o 'original' não.",
    snippet: `// Mintando um NFT com Metaplex Umi (forma moderna)
import { createNft } from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, percentAmount } from "@metaplex-foundation/umi";

const mint = generateSigner(umi);

await createNft(umi, {
  mint,
  name: "SOLOIA Genesis #1",
  symbol: "SLOIA",
  uri: "https://arweave.net/sua-metadata.json",
  sellerFeeBasisPoints: percentAmount(5), // 5% de royalty
  isMutable: true,
}).sendAndConfirm(umi);

console.log("NFT mintado:", mint.publicKey);`,
    snippetLang: "typescript",
    snippetTitle: "Mintando NFT com Metaplex Umi",
  },

  // ── ZK & Infrastructure ───────────────────────────────────────────────────

  "zero-knowledge-proof": {
    termId: "zero-knowledge-proof",
    analogy:
      "ZK Proof é como provar para o banco que você tem saldo suficiente para um empréstimo SEM mostrar o extrato — apenas uma prova matemática que confirma 'sim, tem dinheiro' sem revelar quanto. Na Solana, isso permite transações privadas e compressão massiva de dados.",
  },

  "state-compression": {
    termId: "state-compression",
    analogy:
      "State Compression é como usar um recibo compactado em vez de guardar cada nota fiscal separada. Em vez de armazenar 1 milhão de NFTs individualmente (caro!), você armazena apenas a 'raiz' da árvore de Merkle (um hash de 32 bytes) e comprova cada item quando necessário. NFTs custam $0.00001 em vez de $0.02.",
    snippet: `// Mintando NFTs comprimidos (cNFTs) com Metaplex
import { mintToCollectionV1 } from "@metaplex-foundation/mpl-bubblegum";

await mintToCollectionV1(umi, {
  leafOwner: proprietario.publicKey,
  merkleTree: merkleTree.publicKey, // Árvore de Merkle
  collectionMint: colecao.publicKey,
  metadata: {
    name: "cNFT Comprimido #1",
    uri: "https://arweave.net/metadata.json",
    sellerFeeBasisPoints: 500,
    collection: { key: colecao.publicKey, verified: false },
    creators: [{ address: criador.publicKey, verified: true, share: 100 }],
  },
}).sendAndConfirm(umi);
// Custo: ~$0.00001 vs $0.02 de NFT normal`,
    snippetLang: "typescript",
    snippetTitle: "Mintando cNFT comprimido",
  },

  // ── Dev Tools ─────────────────────────────────────────────────────────────

  anchor: {
    termId: "anchor",
    analogy:
      "Anchor está para o desenvolvimento Solana assim como o Ruby on Rails está para o desenvolvimento web — um framework que gera automaticamente a estrutura, valida as contas e reduz o boilerplate de 200 linhas para 20. É a forma 'moderna e segura' de escrever programas Solana.",
    snippet: `use anchor_lang::prelude::*;

declare_id!("SEU_PROGRAM_ID_AQUI");

#[program]
pub mod meu_primeiro_programa {
    use super::*;
    
    // Instrução: Inicializar uma conta
    pub fn inicializar(ctx: Context<Inicializar>, mensagem: String) -> Result<()> {
        let conta = &mut ctx.accounts.minha_conta;
        conta.autor = ctx.accounts.usuario.key();
        conta.mensagem = mensagem;
        conta.timestamp = Clock::get()?.unix_timestamp;
        msg!("Conta inicializada: {}", conta.mensagem);
        Ok(())
    }
}

// Estrutura das contas necessárias
#[derive(Accounts)]
pub struct Inicializar<'info> {
    #[account(init, payer = usuario, space = 8 + 32 + 200 + 8)]
    pub minha_conta: Account<'info, MinhaConta>,
    #[account(mut)]
    pub usuario: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Estrutura dos dados da conta
#[account]
pub struct MinhaConta {
    pub autor: Pubkey,
    pub mensagem: String,
    pub timestamp: i64,
}`,
    snippetLang: "rust",
    snippetTitle: "Programa Anchor do zero",
  },

  "solana-cli": {
    termId: "solana-cli",
    analogy:
      "O Solana CLI é como um canivete suíço de linha de comando para a blockchain. Com ele você cria carteiras, envia SOL, deploya programas e consulta a blockchain — tudo sem precisar de interface gráfica.",
    snippet: `# Configurar para devnet
solana config set --url devnet

# Ver sua carteira atual
solana address

# Pedir SOL de graça no devnet
solana airdrop 2

# Ver saldo
solana balance

# Deployr um programa
solana program deploy ./target/deploy/meu_programa.so

# Ver logs em tempo real
solana logs SEU_PROGRAM_ID`,
    snippetLang: "bash",
    snippetTitle: "Comandos essenciais do Solana CLI",
  },

  "anchor-idl": {
    termId: "anchor-idl",
    analogy:
      "IDL (Interface Definition Language) é como a documentação técnica de uma API, mas em JSON. Ela descreve todas as instruções do seu programa, quais contas cada uma precisa e quais argumentos aceita. O cliente JavaScript usa o IDL para saber como chamar o programa automaticamente.",
    snippet: `// Usando o IDL para chamar um programa Anchor no cliente
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import IDL from "./target/idl/meu_programa.json";

const provider = AnchorProvider.env();
const program = new Program(IDL as Idl, provider);

// A tipagem é automática — o TypeScript sabe tudo sobre seu programa!
await program.methods
  .inicializar("Olá, Solana!")
  .accounts({
    minhaConta: minhaContaPublicKey,
    usuario: provider.wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();`,
    snippetLang: "typescript",
    snippetTitle: "Usando o IDL no cliente",
  },

  // ── Network ───────────────────────────────────────────────────────────────

  rpc: {
    termId: "rpc",
    analogy:
      "O RPC é a 'portaria' da blockchain. Para enviar transações ou ler dados, você sempre passa pela portaria. Usar um RPC público é como usar wi-fi público — funciona, mas é lento e tem limite. RPC dedicado (Helius, QuickNode, Alchemy) é sua fibra ótica particular.",
    snippet: `import { Connection, clusterApiUrl } from "@solana/web3.js";

// Devnet (gratuito, para testes)
const devnet = new Connection(clusterApiUrl("devnet"), "confirmed");

// Mainnet com RPC dedicado (Helius — mais rápido e confiável)
const mainnet = new Connection(
  "https://mainnet.helius-rpc.com/?api-key=SUA_API_KEY",
  { commitment: "confirmed", wsEndpoint: "wss://mainnet.helius-rpc.com/?api-key=SUA_API_KEY" }
);

// Verificar latência
const inicio = Date.now();
await mainnet.getSlot();
console.log(\`Latência do RPC: \${Date.now() - inicio}ms\`);`,
    snippetLang: "typescript",
    snippetTitle: "Conectando ao RPC",
  },

  "transaction-fees": {
    termId: "transaction-fees",
    analogy:
      "As taxas de transação na Solana são absurdamente baratas — em torno de $0.00025 por transação. Para comparar: no Ethereum pode custar $5-50 a mesma coisa. É como enviar uma mensagem de texto vs mandar correspondência registrada.",
    snippet: `// Estimando as taxas de uma transação antes de enviar
import { Connection, Transaction } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");

// Monta a transação sem assinar
const tx = new Transaction().add(suaInstrucao);
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
tx.feePayer = suaChavePublica;

// Estima o custo em lamports
const taxaEmLamports = await connection.getFeeForMessage(tx.compileMessage());
console.log(\`Taxa estimada: \${taxaEmLamports?.value} lamports\`);
// Tipicamente: 5000-25000 lamports = $0.0001 - $0.0006`,
    snippetLang: "typescript",
    snippetTitle: "Estimando taxas de transação",
  },

  quic: {
    termId: "quic",
    analogy:
      "QUIC é o protocolo de transporte que a Solana usa para enviar transações ultra-rápido. É como trocar o Correios (TCP/IP) por um drone expresso (QUIC) — menos handshakes, menos latência, mais throughput. Transações chegam ao líder em milissegundos.",
  },

  // ── Security ──────────────────────────────────────────────────────────────

  "reentrancy-attack": {
    termId: "reentrancy-attack",
    analogy:
      "Ataque de reentrância é como um ladrão que ao receber $100 de devolução do caixa eletrônico, pressiona o botão de novo antes de o banco registrar o débito. Na Solana, isso é muito mais difícil que no Ethereum por causa do modelo de contas, mas programas ainda podem ser vulneráveis se não usarem as proteções corretas.",
  },

  "signer-restriction": {
    termId: "signer-restriction",
    analogy:
      "Restrição de signatário é como verificar a assinatura do cheque antes de descontar. Todo programa Solana DEVE verificar se quem mandou a transação realmente é dono da conta que está tentando modificar. Esquecer isso = hack garantido.",
    snippet: `// CORRETO: Anchor verifica automaticamente com #[account(mut)]
// mas você DEVE usar has_one ou constraint para autorizações
#[derive(Accounts)]
pub struct SacarFundos<'info> {
    #[account(
        mut,
        has_one = dono, // Garante que cofre.dono == dono.key()
    )]
    pub cofre: Account<'info, Cofre>,
    
    pub dono: Signer<'info>, // DEVE assinar a transação
}

// ERRADO — sem verificação de autoridade:
// pub fn sacar_ERRADO(ctx: Context<...>) -> Result<()> {
//     // Qualquer um pode chamar isso!
//     cofre.saldo = 0; // BUG DE SEGURANÇA!
// }`,
    snippetLang: "rust",
    snippetTitle: "Verificação de Signer (Segurança)",
  },

  // ── Blockchain General ────────────────────────────────────────────────────

  "public-key": {
    termId: "public-key",
    analogy:
      "Chave pública é como o número da sua conta bancária — você pode compartilhar com qualquer pessoa para receber depósitos. Na Solana, é representada em Base58 (strings como '8Kag...'). Todos os endereços de carteira e programas são chaves públicas.",
    snippet: `import { Keypair, PublicKey } from "@solana/web3.js";

// Gerando um novo par de chaves
const novoPar = Keypair.generate();
console.log("Chave Pública (endereço):", novoPar.publicKey.toBase58());
console.log("Chave Privada:", novoPar.secretKey); // NUNCA compartilhe!

// Reconhecendo uma chave pública existente
const endereco = new PublicKey("11111111111111111111111111111111"); // System Program
console.log("É uma chave válida?", PublicKey.isOnCurve(endereco.toBuffer()));`,
    snippetLang: "typescript",
    snippetTitle: "Keypairs na Solana",
  },

  "private-key": {
    termId: "private-key",
    analogy:
      "Chave privada é como a senha + token físico do seu banco juntos. Quem tem a chave privada controla TUDO da carteira — não há recuperação, não há banco central, não há suporte. Guarde offline, nunca em imagem ou mensagem de texto.",
  },

  transaction: {
    termId: "transaction",
    analogy:
      "Uma transação Solana é como um envelope lacrado com várias ordens dentro: 'transfira X tokens', 'atualize esse dado', 'chame esse programa'. Todas as ordens executam juntas ou nenhuma executa (atomicidade). Você assina o envelope com sua chave privada antes de enviar.",
    snippet: `import { Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";

// Transação com múltiplas instruções (todas executam ou nenhuma)
const tx = new Transaction()
  .add(
    // Instrução 1: Transferir SOL
    SystemProgram.transfer({
      fromPubkey: pagador.publicKey,
      toPubkey: destinatario.publicKey,
      lamports: 0.1 * LAMPORTS_PER_SOL,
    })
  )
  .add(suaInstrucaoCustom); // Instrução 2: Chamar seu programa

// Enviar e aguardar confirmação
const assinatura = await sendAndConfirmTransaction(
  connection,
  tx,
  [pagador] // Signatários
);

console.log("TX confirmada:", \`https://solscan.io/tx/\${assinatura}\`);`,
    snippetLang: "typescript",
    snippetTitle: "Construindo uma Transação",
  },

  // ── Solana Ecosystem ──────────────────────────────────────────────────────

  jupiter: {
    termId: "jupiter",
    analogy:
      "Jupiter é como o Google Flights das exchanges — em vez de você verificar cada companhia aérea manualmente, o Jupiter compara todas as pools e rotas de DeFi para encontrar o melhor preço para sua troca de tokens. É o agregador de DEX mais usado da Solana.",
    snippet: `// Swap via Jupiter API v6
const response = await fetch(
  \`https://quote-api.jup.ag/v6/quote?\` +
  \`inputMint=So11111111111111111111111111111111111111112\` + // SOL
  \`&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\` + // USDC
  \`&amount=\${0.1 * LAMPORTS_PER_SOL}\` +
  \`&slippageBps=50\` // 0.5% slippage
);
const quote = await response.json();

// Executar o swap
const swapResponse = await fetch("https://quote-api.jup.ag/v6/swap", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ quoteResponse: quote, userPublicKey: wallet.publicKey.toBase58() }),
});
const { swapTransaction } = await swapResponse.json();`,
    snippetLang: "typescript",
    snippetTitle: "Swap via Jupiter API",
  },

  "solana-pay": {
    termId: "solana-pay",
    analogy:
      "Solana Pay é como um QR Code do Pix, mas para qualquer token da Solana. Você encoda um pedido de pagamento em uma URL, transforma em QR, e o cliente escaneia com a carteira para pagar em segundos — sem intermediários, sem taxas de processadora.",
    snippet: `import { encodeURL, createQR } from "@solana/pay";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

// Criar URL de pagamento Solana Pay
const url = encodeURL({
  recipient: new PublicKey("SEU_ENDERECO"),
  amount: new BigNumber(10),    // 10 USDC
  splToken: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
  reference: Keypair.generate().publicKey, // Para rastrear pagamento
  label: "SOLOIA Store",
  message: "Pagamento de produto #123",
});

// Gerar QR Code
const qr = createQR(url);
document.getElementById("qrcode")!.innerHTML = "";
qr.append(document.getElementById("qrcode")!);`,
    snippetLang: "typescript",
    snippetTitle: "Gerando QR de Pagamento",
  },

  helios: {
    termId: "helios",
    analogy:
      "Helius é o provedor de RPC mais completo da Solana — pense como um AWS mas especializado em infraestrutura Solana. Além do RPC ultra-rápido, oferece webhooks para monitorar transações, APIs de analytics e parsing de instruções complexas automaticamente.",
  },
};

/**
 * Retorna a entrada ELI5 para um term ID específico
 */
export function getELI5(termId: string): ELI5Entry | undefined {
  return ELI5_DATABASE[termId];
}

/**
 * Verifica se um termo tem ELI5 disponível
 */
export function hasELI5(termId: string): boolean {
  return termId in ELI5_DATABASE;
}
