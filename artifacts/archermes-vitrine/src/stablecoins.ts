import { Contract, parseUnits, type Signer } from 'ethers';

export type StablecoinSymbol = 'USDC' | 'EURC';

/**
 * Placeholder addresses for Arc Testnet.
 * Replace with real deployed addresses when available.
 */
export const STABLECOIN_ADDRESSES: Record<StablecoinSymbol, string> = {
  USDC: '0x0000000000000000000000000000000000000001',
  EURC: '0x0000000000000000000000000000000000000002',
};

export const STABLECOIN_DECIMALS: Record<StablecoinSymbol, number> = {
  USDC: 6,
  EURC: 6,
};

export const STABLECOIN_META: Record<StablecoinSymbol, { simbolo: string; cor: string; corFundo: string }> = {
  USDC: { simbolo: '$', cor: '#4ade80', corFundo: 'rgba(74,222,128,0.12)' },
  EURC: { simbolo: '€', cor: '#60a5fa', corFundo: 'rgba(96,165,250,0.12)' },
};

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

/**
 * Approves `spender` to transfer `amount` of the ERC-20 token on behalf of the signer.
 * Call this before buyItemERC20 on the marketplace contract.
 */
export async function approveERC20(
  signer: Signer,
  tokenAddress: string,
  spender: string,
  amount: bigint,
) {
  const token = new Contract(tokenAddress, ERC20_ABI, signer);
  return token.approve(spender, amount) as Promise<{ wait: () => Promise<unknown>; hash: string }>;
}

/**
 * Transfers `amount` of the ERC-20 token directly to `to`.
 * Used as a placeholder until the marketplace contract supports ERC-20 buyItem.
 */
export async function transferERC20(
  signer: Signer,
  tokenAddress: string,
  to: string,
  amount: bigint,
) {
  const token = new Contract(tokenAddress, ERC20_ABI, signer);
  return token.transfer(to, amount) as Promise<{ wait: () => Promise<unknown>; hash: string }>;
}

/**
 * Returns the on-chain price amount in token atomic units (6 decimals for USDC/EURC).
 */
export function toTokenAmount(priceStr: string, symbol: StablecoinSymbol): bigint {
  return parseUnits(priceStr, STABLECOIN_DECIMALS[symbol]);
}

/**
 * Formats a price string for display with the correct currency symbol.
 */
export function formatStablecoinPrice(priceStr: string, symbol: StablecoinSymbol): string {
  const val = parseFloat(priceStr);
  const { simbolo } = STABLECOIN_META[symbol];
  return `${simbolo}${val.toFixed(2)}`;
}
