/**
 * SOLOIA Security Engine — "Detetive Solana"
 *
 * Detecta padrões perigosos em código Anchor/Rust e cross-referencia
 * com @stbr/solana-glossary para dar contexto educativo.
 *
 * Cada regra tem:
 *  - Padrão regex para detectar
 *  - Severidade: critical | warning | info
 *  - ID do termo no glossário (@stbr/solana-glossary)
 *  - Explicação do risco e sugestão de fix
 */

export type Severity = "critical" | "warning" | "info";

export interface SecurityRule {
  id: string;
  name: string;
  /** Regex patterns — any match triggers this rule */
  patterns: RegExp[];
  /** Lines that triggered the rule (populated during analysis) */
  severity: Severity;
  description: string;
  /** Glossary term ID from @stbr/solana-glossary */
  glossaryTermId: string;
  /** Short actionable fix */
  fix: string;
  /** Optional code example of the fix */
  fixExample?: string;
  /** CWE or Solana-specific vulnerability class */
  category: string;
}

export interface SecurityFinding {
  rule: SecurityRule;
  /** 1-indexed line numbers where the pattern was found */
  lines: number[];
  /** The actual matched text snippets */
  matches: string[];
}

export interface SecurityReport {
  findings: SecurityFinding[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  score: number; // 0-100 (100 = safe)
  analysisTargetLines: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const SECURITY_RULES: SecurityRule[] = [
  // ── CRITICAL ───────────────────────────────────────────────────────────────

  {
    id: "unchecked-account",
    name: "UncheckedAccount Detectado",
    patterns: [/UncheckedAccount/g, /AccountInfo<'info>/g],
    severity: "critical",
    description:
      "UncheckedAccount aceita QUALQUER conta sem validação de proprietário, tipo ou existência. Um atacante pode passar uma conta maliciosa e drenar fundos ou corromper estado. É a vulnerabilidade mais comum em hacks Solana.",
    glossaryTermId: "account",
    category: "Account Validation",
    fix: "Substitua UncheckedAccount por Account<'info, T> com a struct correta. Adicione constraint = account.owner == expected_program.key() se precisar de AccountInfo.",
    fixExample: `// ❌ PERIGOSO:
pub unchecked: UncheckedAccount<'info>,

// ✅ SEGURO:
pub minha_conta: Account<'info, MinhaConta>,
// OU com verificação manual:
/// CHECK: Verificado manualmente abaixo
pub minha_conta: AccountInfo<'info>,
// ...e então no código:
require!(minha_conta.owner == &program_id, ErrorCode::InvalidOwner);`,
  },

  {
    id: "missing-signer",
    name: "Autoridade sem verificação de Signer",
    patterns: [
      /pub\s+(authority|admin|owner|payer|signer)\s*:\s*(?!Signer)(?!UncheckedAccount)Account\b/gi,
      /has_one\s*=\s*\w+(?!\s*@)/g,
    ],
    severity: "critical",
    description:
      "Uma conta de autoridade (authority/admin/owner) não está sendo verificada como Signer. Isso significa que QUALQUER um pode forjar ser o dono e executar operações privilegiadas — saques, upgrades, fechamento de contas.",
    glossaryTermId: "pda",
    category: "Access Control",
    fix: "Use Signer<'info> para contas de autoridade, ou adicione #[account(signer)] explicitamente.",
    fixExample: `// ❌ PERIGOSO — não verifica se assinou:
pub authority: Account<'info, AuthorityData>,

// ✅ SEGURO — exige assinatura:
pub authority: Signer<'info>,`,
  },

  {
    id: "arithmetic-overflow",
    name: "Aritmética sem proteção de overflow",
    patterns: [
      /\b(\w+)\s*\+\s*(\w+)\b(?!\s*\.checked)/g,
      /\b(\w+)\s*\*\s*(\w+)\b(?!\s*\.checked)/g,
      /\b(\w+)\s*-\s*(\w+)\b(?!\s*\.checked)/g,
    ],
    severity: "critical",
    description:
      "Operações aritméticas diretas em Rust podem causar panic (em debug) ou overflow silencioso (em release) em valores u64/u128. Transferências incorretas, saldos negativos e exploits de DeFi são possíveis.",
    glossaryTermId: "compute-units",
    category: "Arithmetic Safety",
    fix: "Use métodos checked_add(), checked_sub(), checked_mul() com tratamento de erro, ou a macro checked_arithmetic! se disponível no seu framework.",
    fixExample: `// ❌ PERIGOSO — overflow em release mode!
let novo_saldo = saldo_atual + quantidade;

// ✅ SEGURO — retorna erro ao invés de overflow
let novo_saldo = saldo_atual
    .checked_add(quantidade)
    .ok_or(ErrorCode::Overflow)?;`,
  },

  {
    id: "mutable-without-owner-check",
    name: "Conta mutável sem verificação de proprietário",
    patterns: [/\#\[account\(mut\)\]\s*\n\s*pub\s+(?!payer|user|signer)/g, /\bmut\b(?!.*has_one)(?!.*constraint)/g],
    severity: "warning",
    description:
      "Uma conta marcada como mut (mutável) pode ser modificada sem verificar se o programa é o proprietário. Um atacante pode passar uma conta de outro programa e causar escritas indevidas.",
    glossaryTermId: "account",
    category: "Account Validation",
    fix: "Adicione has_one = authority ou constraint = conta.owner.key() == expected_program.key().",
  },

  // ── WARNING ────────────────────────────────────────────────────────────────

  {
    id: "init-if-needed",
    name: "init_if_needed — Risco de reentrada",
    patterns: [/init_if_needed/g],
    severity: "warning",
    description:
      "init_if_needed pode ser explorado se a inicialização não for idempotente (executar duas vezes não deve mudar o estado). Um atacante pode reinicializar uma conta existente, zerando saldos ou alterando autoridades.",
    glossaryTermId: "pda",
    category: "Initialization Safety",
    fix: "Prefira init separado + verificação de estado. Se usar init_if_needed, garanta que todas as instruções de inicialização sejam idempotentes e verifique campos críticos após a init.",
    fixExample: `// ⚠️ CUIDADO com init_if_needed:
#[account(
    init_if_needed,
    payer = payer,
    space = 8 + MinhaEstruct::LEN,
    seeds = [b"seed", user.key().as_ref()],
    bump
)]
// Adicione verificação pós-init:
pub fn instrucao(ctx: Context<...>) -> Result<()> {
    let conta = &mut ctx.accounts.conta;
    // Se já existia, verifica que o dono não mudou
    if conta.inicializado {
        require!(conta.autoridade == ctx.accounts.user.key(), ErrorCode::Unauthorized);
    }
    conta.inicializado = true;
    Ok(())
}`,
  },

  {
    id: "unwrap-usage",
    name: "unwrap() em código de produção",
    patterns: [/\.unwrap\(\)/g],
    severity: "warning",
    description:
      "unwrap() causa panic e abortará a transação com uma mensagem genérica. Em produção, use ? ou .ok_or(ErrorCode::...) para propagar erros de forma controlada e informativa.",
    glossaryTermId: "compute-units",
    category: "Error Handling",
    fix: "Substitua .unwrap() por .ok_or(ErrorCode::SeuErro)? ou .map_err(|_| ErrorCode::SeuErro)?",
    fixExample: `// ❌ Vai panic com mensagem confusa
let valor = opcional.unwrap();

// ✅ Erro descritivo e controlado
let valor = opcional.ok_or(ErrorCode::ValorNaoEncontrado)?;`,
  },

  {
    id: "missing-seeds-bump",
    name: "Seeds sem verificação de bump",
    patterns: [/seeds\s*=\s*\[/g],
    severity: "warning",
    description:
      "PDAs derivadas com seeds devem sempre incluir o bump seed na verificação para evitar ataques de substituição de PDA. Sem o bump, um atacante pode tentar criar PDAs alternativas que colidiram com a sua.",
    glossaryTermId: "pda",
    category: "PDA Safety",
    fix: "Adicione 'bump' no constraint da conta PDA e armazene o bump na struct ao inicializar.",
    fixExample: `// ✅ Correto — inclui bump verificação:
#[account(
    seeds = [b"cofre", usuario.key().as_ref()],
    bump = cofre.bump  // bump armazenado na struct
)]
pub cofre: Account<'info, Cofre>,

#[account]
pub struct Cofre {
    pub bump: u8,  // ← armazene o bump na struct!
    // ...
}`,
  },

  {
    id: "close-without-check",
    name: "close = sem verificação de autoridade",
    patterns: [/close\s*=\s*\w+/g],
    severity: "warning",
    description:
      "Fechar uma conta (close) e enviar o SOL do rent para outra conta é uma operação destrutiva irreversível. Sem verificar que o chamador tem autoridade, qualquer um pode fechar contas e roubar o SOL do rent.",
    glossaryTermId: "rent",
    category: "Account Lifecycle",
    fix: "Combine close = destino com has_one = autoridade ou constraint que verifica que o signatário tem permissão.",
    fixExample: `// ✅ Seguro — verifica autoridade antes de fechar:
#[account(
    mut,
    has_one = autoridade,  // ← verifica dono
    close = autoridade     // ← SOL vai para o dono
)]
pub conta: Account<'info, MinhaConta>,
pub autoridade: Signer<'info>,  // ← DEVE assinar`,
  },

  {
    id: "hardcoded-program-id",
    name: "Program ID hardcoded",
    patterns: [/Pubkey::from_str\("/, /Pubkey::new_from_array\(/, /from_str_const/g],
    severity: "warning",
    description:
      "Program IDs hardcoded no código aumentam o risco de phishing/substituição. Se o programa for re-deployado (ex: durante desenvolvimento ou upgrade), o ID hardcoded estará desatualizado e causará falhas silenciosas.",
    glossaryTermId: "program",
    category: "Configuration Safety",
    fix: "Use declare_id!() para o ID do próprio programa. Para programas externos, importe os crate oficiais (spl-token, anchor-spl) que já têm os IDs corretos.",
  },

  {
    id: "missing-token-account-check",
    name: "Token Account sem verificação de mint",
    patterns: [/TokenAccount/g],
    severity: "warning",
    description:
      "Contas de token devem ter o mint verificado. Sem verificar que o TokenAccount pertence ao mint correto, um atacante pode passar uma conta de token de outro mint e causar lógica incorreta.",
    glossaryTermId: "token-account",
    category: "Token Safety",
    fix: "Adicione has_one = mint ou constraint = token_account.mint == mint.key() na conta de token.",
    fixExample: `// ✅ Verificação correta de mint:
#[account(
    mut,
    constraint = token_account.mint == token_mint.key() @ ErrorCode::InvalidMint,
    constraint = token_account.owner == user.key() @ ErrorCode::InvalidOwner,
)]
pub token_account: Account<'info, TokenAccount>,
pub token_mint: Account<'info, Mint>,`,
  },

  // ── INFO ───────────────────────────────────────────────────────────────────

  {
    id: "todo-fixme",
    name: "TODO/FIXME — Código incompleto",
    patterns: [/TODO|FIXME|HACK|XXX/g],
    severity: "info",
    description:
      "Existem marcadores TODO/FIXME no código. Verifique se algum deles indica verificações de segurança pendentes antes de deployer para produção.",
    glossaryTermId: "program",
    category: "Code Quality",
    fix: "Resolva todos os TODOs relacionados à segurança antes do deploy em mainnet.",
  },

  {
    id: "lamports-manipulation",
    name: "Manipulação direta de lamports",
    patterns: [/\.lamports(\.borrow_mut|\(\)\.borrow_mut)/g, /\*\*ctx\.accounts\.\w+\.lamports\.borrow_mut/g],
    severity: "info",
    description:
      "Manipulação direta de lamports bypassa as verificações do Anchor/SPL. Certifique-se de que as invariantes de saldo sejam mantidas: a soma de lamports nunca pode diminuir (exceto via fees).",
    glossaryTermId: "lamport",
    category: "Balance Safety",
    fix: "Prefira System Program transfer para mover SOL. Se precisar de manipulação direta, verifique que a soma total de lamports antes e depois é conservada.",
  },

  {
    id: "cpi-arbitrary",
    name: "CPI para programa arbitrário",
    patterns: [/invoke\s*\(|invoke_signed\s*\(/g],
    severity: "info",
    description:
      "invoke() de baixo nível não verifica qual programa está sendo chamado. Certifique-se de que o program_id passado é o esperado, não uma entrada do usuário.",
    glossaryTermId: "cpi",
    category: "CPI Safety",
    fix: "Prefira o Anchor CpiContext e use crates tipados (anchor-spl, etc.) que garantem o program_id correto.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analisa um bloco de código Anchor/Rust e retorna todas as vulnerabilidades encontradas
 */
export function analyzeCode(code: string): SecurityReport {
  if (!code.trim()) {
    return { findings: [], criticalCount: 0, warningCount: 0, infoCount: 0, score: 100, analysisTargetLines: 0 };
  }

  const lines = code.split("\n");
  const findings: SecurityFinding[] = [];

  for (const rule of SECURITY_RULES) {
    const ruleLines: number[] = [];
    const ruleMatches: string[] = [];

    // Check each line against each pattern
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      // Skip comment lines for most checks
      const isComment = line.trim().startsWith("//") || line.trim().startsWith("///") || line.trim().startsWith("*");

      for (const pattern of rule.patterns) {
        pattern.lastIndex = 0; // reset regex state
        const match = pattern.exec(line);
        if (match && !isComment) {
          if (!ruleLines.includes(lineIdx + 1)) {
            ruleLines.push(lineIdx + 1);
            ruleMatches.push(match[0].trim().substring(0, 60));
          }
        }
      }
    }

    if (ruleLines.length > 0) {
      findings.push({ rule, lines: ruleLines, matches: ruleMatches });
    }
  }

  const criticalCount = findings.filter((f) => f.rule.severity === "critical").length;
  const warningCount = findings.filter((f) => f.rule.severity === "warning").length;
  const infoCount = findings.filter((f) => f.rule.severity === "info").length;

  // Score: start at 100, deduct by severity
  const score = Math.max(
    0,
    100 - criticalCount * 25 - warningCount * 10 - infoCount * 2
  );

  return {
    findings,
    criticalCount,
    warningCount,
    infoCount,
    score,
    analysisTargetLines: lines.length,
  };
}

// Severity config for UI
export const SEVERITY_CONFIG = {
  critical: {
    label: "CRÍTICO",
    color: "#ff4757",
    bg: "rgba(255, 71, 87, 0.08)",
    border: "rgba(255, 71, 87, 0.3)",
    icon: "🚨",
    glow: "rgba(255, 71, 87, 0.4)",
  },
  warning: {
    label: "ATENÇÃO",
    color: "#f7b731",
    bg: "rgba(247, 183, 49, 0.08)",
    border: "rgba(247, 183, 49, 0.3)",
    icon: "⚠️",
    glow: "rgba(247, 183, 49, 0.3)",
  },
  info: {
    label: "INFO",
    color: "#00c3ff",
    bg: "rgba(0, 195, 255, 0.06)",
    border: "rgba(0, 195, 255, 0.2)",
    icon: "ℹ️",
    glow: "rgba(0, 195, 255, 0.2)",
  },
};

// Example vulnerable code for demo
export const DEMO_VULNERABLE_CODE = `use anchor_lang::prelude::*;

declare_id!("SEU_PROGRAM_ID");

#[program]
pub mod cofre_inseguro {
    use super::*;

    // TODO: adicionar verificação de autoridade depois
    pub fn sacar(ctx: Context<Sacar>, quantidade: u64) -> Result<()> {
        let cofre = &mut ctx.accounts.cofre;
        
        // FIXME: isso pode dar overflow?
        let novo_saldo = cofre.saldo - quantidade;
        cofre.saldo = novo_saldo;
        
        // Transferindo... mas quem é o authority?
        let valor = cofre.total.unwrap();
        
        msg!("Saque de {} lamports", quantidade);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Sacar<'info> {
    #[account(mut)]
    pub cofre: Account<'info, Cofre>,
    
    // Sem verificar se é Signer!
    pub authority: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Cofre {
    pub authority: Pubkey,
    pub saldo: u64,
    pub total: Option<u64>,
}`;
