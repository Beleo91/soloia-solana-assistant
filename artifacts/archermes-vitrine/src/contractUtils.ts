/**
 * Shared contract / wallet error-handling utilities.
 * Imported by both HomePage.tsx and StoreDashboard.tsx.
 */

/** Returns true when the user dismissed a wallet popup (no on-chain error). */
export function isUserRejection(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes('user rejected') ||
    lower.includes('user denied') ||
    lower.includes('rejected the request') ||
    (err as Record<string, unknown>).code === 4001
  );
}

/** Extracts a clean, user-friendly Portuguese error message from any wallet/contract error. */
export function extractContractError(err: unknown): string {
  if (!err) return 'Erro desconhecido.';

  // User deliberately rejected → short friendly message
  if (isUserRejection(err)) {
    // Log the raw error so we can diagnose cases where this fires incorrectly
    console.error('[contractUtils] isUserRejection triggered on:', err);
    return 'Transação cancelada pelo usuário.';
  }

  const e = err as Record<string, unknown>;

  // ethers v6 CALL_EXCEPTION (missing revert data)
  if (e.code === 'CALL_EXCEPTION') {
    try {
      const data = e.data as Record<string, unknown> | undefined;
      if (data && typeof data.message === 'string' && data.message.length > 0) return data.message;
    } catch { /* ignore */ }
    return 'Transação rejeitada pelo contrato. Verifique se sua loja está ativa e com assinatura válida.';
  }

  // ethers v6: `reason` field
  if (typeof e.reason === 'string' && e.reason.length > 0) return e.reason;

  // viem shortMessage
  if (typeof e.shortMessage === 'string' && e.shortMessage.length > 0) return e.shortMessage;

  // MetaMask / Rabby: info.error
  try {
    const info = e.info as Record<string, unknown> | undefined;
    if (info) {
      const inner = info.error as Record<string, unknown> | undefined;
      if (inner && typeof inner.message === 'string') return inner.message;
      if (typeof info.message === 'string') return info.message;
    }
  } catch { /* ignore */ }

  // data.message
  try {
    const data = e.data as Record<string, unknown> | undefined;
    if (data && typeof data.message === 'string') return data.message;
  } catch { /* ignore */ }

  // Standard JS Error — extract meaningful part
  if (err instanceof Error) {
    const m = err.message;
    const rMatch = m.match(/reason="([^"]+)"/);
    if (rMatch) return rMatch[1];
    const detailsMatch = m.match(/Details:\s*(.+?)(?:\s+Version:|$)/s);
    if (detailsMatch) {
      const detail = detailsMatch[1].trim();
      if (detail.toLowerCase().includes('execution reverted'))
        return 'Transação revertida pelo contrato. Verifique se sua loja está ativa e os dados estão corretos.';
      return detail.length > 200 ? detail.slice(0, 200) + '…' : detail;
    }
    if (m.toLowerCase().includes('execution reverted'))
      return 'Transação revertida pelo contrato. Verifique se sua loja está ativa e os dados estão corretos.';
    if (m.toLowerCase().includes('missing revert data'))
      return 'Transação rejeitada pelo contrato. Verifique se sua loja está ativa e com assinatura válida.';
    return m.length > 200 ? m.slice(0, 200) + '…' : m;
  }

  return String(err).slice(0, 200);
}
