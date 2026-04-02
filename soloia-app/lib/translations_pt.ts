/**
 * SOLOIA Manual Portuguese Translations
 * Overrides for the @stbr/solana-glossary English mock-ups
 */

export const PT_TRANSLATIONS: Record<string, { term: string; definition: string }> = {
  // ── Core Concepts ────────────────────────────────────────────────────────
  "sdk": {
    "term": "SDK (Software Development Kit)",
    "definition": "Um Kit de Desenvolvimento de Software. É uma coleção de ferramentas, bibliotecas e documentação que permite aos desenvolvedores criar aplicativos para a Solana. Exemplos incluem o @solana/web3.js (TypeScript) e o solana-program (Rust)."
  },
  "pda": {
    "term": "PDA (Program Derived Address)",
    "definition": "Um Endereço Derivado de Programa. São endereços que não possuem uma chave privada correspondente e são controlados exclusivamente por um programa específico. São fundamentais para criar estados de dados seguros na Solana."
  },
  "account": {
    "term": "Conta (Account)",
    "definition": "O registro básico de armazenamento na Solana. Quase tudo na rede é uma conta: desde sua carteira (System Account) até os programas (Executable Accounts) e dados de tokens."
  },
  "lamport": {
    "term": "Lamport",
    "definition": "A menor unidade fracionária do SOL. Um SOL equivale a 1 bilhão de lamports. É o equivalente ao 'Satoshi' do Bitcoin ou 'Wei' do Ethereum."
  },
  "cpi": {
    "term": "CPI (Cross-Program Invocation)",
    "definition": "Invocação entre Programas. É o mecanismo que permite que um programa chame as funções de outro programa, como se fossem peças de LEGO se conectando."
  },
  "anchor": {
    "term": "Framework Anchor",
    "definition": "O framework mais popular para desenvolvimento na Solana. Ele simplifica a escrita de programas em Rust, cuidando da segurança, serialização de dados e geração automática de IDLs."
  },
  "rent": {
    "term": "Aluguel (Rent)",
    "definition": "Uma pequena taxa cobrada para manter dados armazenados na blockchain. Contas com saldo suficiente de SOL são consideradas 'isentas de aluguel' (rent-exempt) e permanecem na rede sem custo recorrente."
  },
  "solana-cli": {
    "term": "Solana CLI",
    "definition": "Interface de Linha de Comando oficial da Solana. Permite que desenvolvedores interajam com a rede, enviem transações e façam deploy de programas diretamente do terminal."
  },
  "blockchain": {
    "term": "Blockchain",
    "definition": "Um registro digital descentralizado e imutável que armazena todas as transações e o estado da rede Solana de forma pública e auditável."
  },
  "smart-contract": {
    "term": "Contrato Inteligente (Programa)",
    "definition": "Na Solana, referimo-nos a eles como 'Programas'. É o código executável armazenado na blockchain que define as regras e a lógica das transações."
  },
  "wallet": {
    "term": "Carteira (Wallet)",
    "definition": "Uma ferramenta (como a Phantom ou Solflare) que gerencia suas chaves públicas e privadas, permitindo que você assine transações e gerencie seus ativos."
  },
  "rpc": {
    "term": "RPC (Remote Procedure Call)",
    "definition": "O canal de comunicação entre seu aplicativo e a blockchain Solana. Servidores RPC recebem suas solicitações e as encaminham para a rede."
  },
  "token": {
    "term": "Token",
    "definition": "Um ativo digital criado na Solana, geralmente seguindo o padrão SPL. Pode representar desde uma moeda (SPL Token) até um item único (NFT)."
  },
  "spl-token": {
    "term": "Token SPL",
    "definition": "O padrão oficial da Solana para a criação de tokens fungíveis (como USDC ou JUP) e não fungíveis (NFTs). É análogo ao padrão ERC-20 do Ethereum."
  },
  "mainnet": {
    "term": "Mainnet Beta",
    "definition": "A rede principal da Solana, onde ocorrem as transações reais com valores econômicos de verdade."
  },
  "devnet": {
    "term": "Devnet",
    "definition": "Uma rede de testes gratuita para desenvolvedores. Você pode usar 'airdrops' de SOL falso para testar seus programas sem gastar dinheiro real."
  },
  "testnet": {
    "term": "Testnet",
    "definition": "Uma rede dedicada principalmente para validadores testarem novas versões do software da Solana antes que cheguem à Mainnet."
  },
  "validator": {
    "term": "Validador",
    "definition": "Um nó da rede responsável por processar transações e manter a segurança da blockchain por meio de um sistema de Proof-of-Stake."
  },
  "stake": {
    "term": "Stake (Participação)",
    "definition": "O ato de bloquear seus tokens SOL com um validador para ajudar a garantir a segurança da rede e, em troca, receber recompensas inflacionárias."
  },
  "burn": {
    "term": "Queima (Burn)",
    "definition": "O processo de destruir tokens permanentemente, removendo-os de circulação. Isso é feito enviando os tokens para um endereço inacessível."
  },
  "mint": {
    "term": "Criação (Mint)",
    "definition": "O ato de gerar novos tokens a partir de um 'Mint Account', aumentando o suprimento total em circulação."
  },
  "metadata": {
    "term": "Metadados",
    "definition": "Informações adicionais sobre um token ou NFT, como nome, símbolo e o link para a imagem."
  },
  "poh": {
    "term": "Proof of History (PoH)",
    "definition": "Prova de Histórico. A inovação principal da Solana que funciona como um relógio digital, permitindo que a rede ordene transações de forma ultra-rápida e eficiente."
  },
  "sealevel": {
    "term": "Sealevel",
    "definition": "O motor de execução paralelo da Solana. Ele permite que a rede processe milhares de transações simultaneamente em vez de uma por uma."
  },
  "quic": {
    "term": "QUIC",
    "definition": "O protocolo de rede moderno que a Solana usa para gerenciar o tráfego de transações de forma eficiente e segura."
  },
  "tps": {
    "term": "TPS (Transactions Per Second)",
    "definition": "Transações por Segundo. A medida de velocidade de uma rede blockchain. A Solana é conhecida por atingir milhares de TPS."
  },
  "gas-fee": {
    "term": "Taxa de Rede (Gas)",
    "definition": "O pequeno custo pago em SOL para realizar qualquer operação na rede. Na Solana, essa taxa é extremamente baixa, geralmente frações de centavo."
  },
  "airdrop": {
    "term": "Airdrop",
    "definition": "A distribuição gratuita de tokens para usuários. Na Devnet, o comando 'airdrop' fornece SOL de teste para desenvolvedores."
  },
  "program-id": {
    "term": "Program ID",
    "definition": "O endereço único (chave pública) que identifica um programa específico na blockchain Solana."
  },
  "borsh": {
    "term": "Borsh",
    "definition": "Binary Object Representation Serializer for Hashing. O formato de serialização de dados ultra-eficiente usado pela Solana para salvar e ler dados em contas."
  },
  "idl": {
    "term": "IDL (Interface Definition Language)",
    "definition": "Um arquivo JSON que descreve como interagir com um programa Anchor, expondo suas funções e estruturas de dados de forma amigável."
  },
  "sysvar": {
    "term": "Sysvar",
    "definition": "Contas especiais do sistema Solana que contêm informações dinâmicas sobre a rede, como o relógio (Clock), taxas (Fees) e recompensas (Rent)."
  },
  "ed25519": {
    "term": "Ed25519",
    "definition": "O algoritmo de assinatura digital de curva elíptica usado pela Solana para todas as assinaturas de transações. É ultra-rápido, seguro e gera assinaturas de 64 bytes com chaves públicas de 32 bytes."
  },
  "base58": {
    "term": "Base58",
    "definition": "O esquema de codificação de texto usado pela Solana para representar chaves públicas e assinaturas. É similar ao Base64, mas remove caracteres confusos como 0 (zero), O (o maiúsculo), I (i maiúsculo) e l (L minúsculo)."
  },
  "transaction": {
    "term": "Transação (Transaction)",
    "definition": "Um pacote de instruções assinado que solicita a execução de lógica na blockchain. As transações na Solana são atômicas: ou todas as instruções funcionam, ou nenhuma é aplicada."
  },
  "instruction": {
    "term": "Instrução (Instruction)",
    "definition": "A menor unidade de lógica operacional na Solana. Uma transação pode conter múltiplas instruções, cada uma chamando um programa diferente."
  },
  "slot": {
    "term": "Slot",
    "definition": "A unidade básica de tempo na Solana, durando aproximadamente 400 milissegundos. É o período durante o qual um líder de rede pode produzir um bloco."
  },
  "epoch": {
    "term": "Epoch (Época)",
    "definition": "Um período de tempo que dura aproximadamente 2 a 3 dias (432.000 slots). Ao final de cada epoch, a rede recalcula as recompensas de stake e a lista de validadores."
  },
  "bpf": {
    "term": "BPF / eBPF",
    "definition": "Berkeley Packet Filter. É a arquitetura de baixo nível que a Solana utiliza para executar programas (smart contracts) de forma eficiente e segura diretamente no kernel da rede."
  },
  "compute-budget": {
    "term": "Orçamento de Computação",
    "definition": "O limite de recursos (unidades de computação) que uma transação pode consumir. Desenvolvedores podem pagar taxas de prioridade para aumentar esse limite em transações complexas."
  },
  "program-derived-address": {
    "term": "PDA (Program Derived Address)",
    "definition": "Endereços derivados deterministicamente de um programa e de 'seeds', permitindo que o programa assine transações sem precisar de uma chave privada comum."
  },
  "cross-program-invocation": {
    "term": "CPI (Invocação entre Programas)",
    "definition": "O processo pelo qual um programa Solana chama outro programa. Isso permite a composição de protocolos, como um programa DeFi chamando o Token Program."
  },
  "associated-token-account": {
    "term": "ATA (Associated Token Account)",
    "definition": "Uma conta de token cujo endereço é derivado da chave pública do usuário e do mint do token, garantindo que cada usuário tenha um endereço padrão para cada token."
  },
  "mainnet-beta": {
    "term": "Mainnet Beta",
    "definition": "A rede de produção principal da Solana, onde ativos reais são transacionados."
  },
  "cluster": {
    "term": "Cluster",
    "definition": "Um conjunto de computadores (validadores) que trabalham juntos para manter um registro compartilhado de transações (ex: Mainnet, Devnet)."
  },
  "ledger": {
    "term": "Ledger (Livro-Razão)",
    "definition": "O registro histórico completo de todas as transações que já ocorreram em um cluster Solana."
  }
};
