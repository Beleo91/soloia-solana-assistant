import { useEffect, useRef, useCallback } from 'react';
import { JsonRpcProvider, Interface } from 'ethers';
import { arcTestnet } from './chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';

const CHANNEL_NAME = 'archermes:vitrine:sync';
const POLL_INTERVAL_MS = 6_000;

export type SyncEvent =
  | { type: 'product:listed';    id: number }
  | { type: 'product:sold';      id: number }
  | { type: 'product:banned';    id: number }
  | { type: 'product:cancelled'; id: number }
  | { type: 'store:created';     address: string }
  | { type: 'store:upgraded';    address: string }
  | { type: 'boost:changed' }
  | { type: 'profile:updated';   address: string };

export const BOOST_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function broadcastVitrineEvent(event: SyncEvent): void {
  try {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage(event);
    ch.close();
  } catch { /* ignore */ }
}

export function useVitrineSync(onEvent: (event: SyncEvent) => void): void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const emit = useCallback((event: SyncEvent) => {
    onEventRef.current(event);
  }, []);

  useEffect(() => {
    let destroyed = false;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (e: MessageEvent<SyncEvent>) => {
      if (!destroyed) emit(e.data);
    };

    const handleStorage = (e: StorageEvent) => {
      if (destroyed) return;
      if (e.key === 'archermes_boosted_products') {
        emit({ type: 'boost:changed' });
      } else if (e.key?.startsWith('archermes_customizacao_')) {
        const addr = e.key.replace('archermes_customizacao_', '');
        emit({ type: 'profile:updated', address: addr });
      }
    };
    window.addEventListener('storage', handleStorage);

    const provider = new JsonRpcProvider(arcTestnet.rpcUrls.default.http[0]);
    const iface = new Interface(CONTRACT_ABI);
    let lastBlock = 0;

    const pollLogs = async () => {
      if (destroyed) return;
      try {
        const current = await provider.getBlockNumber();
        if (lastBlock === 0) { lastBlock = current; return; }
        if (current <= lastBlock) return;
        const fromBlock = lastBlock + 1;
        const toBlock = current;
        lastBlock = current;

        const logs = await provider.getLogs({
          address: CONTRACT_ADDRESS,
          fromBlock,
          toBlock,
        });

        for (const log of logs) {
          try {
            const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
            if (!parsed) continue;
            let event: SyncEvent | null = null;
            switch (parsed.name) {
              case 'ItemListed':
                event = { type: 'product:listed', id: Number(parsed.args[0] as bigint) };
                break;
              case 'ItemBought':
                event = { type: 'product:sold', id: Number(parsed.args[0] as bigint) };
                break;
              case 'ItemBanned':
                event = { type: 'product:banned', id: Number(parsed.args[0] as bigint) };
                break;
              case 'ItemCancelled':
                event = { type: 'product:cancelled', id: Number(parsed.args[0] as bigint) };
                break;
              case 'StoreCreated':
                event = { type: 'store:created', address: parsed.args[0] as string };
                break;
              case 'StoreUpgraded':
                event = { type: 'store:upgraded', address: parsed.args[0] as string };
                break;
            }
            if (event) {
              emit(event);
              broadcastVitrineEvent(event);
            }
          } catch { /* parse error, ignore */ }
        }
      } catch { /* RPC error, ignore silently */ }
    };

    const pollInterval = setInterval(() => { void pollLogs(); }, POLL_INTERVAL_MS);

    const boostTimer = setInterval(() => {
      if (destroyed) return;
      try {
        const raw = localStorage.getItem('archermes_boosted_products');
        if (!raw) return;
        const products = JSON.parse(raw) as Array<{ boostedAt: number }>;
        const hasExpired = products.some((p) => Date.now() - p.boostedAt > BOOST_DURATION_MS);
        if (hasExpired) {
          const event: SyncEvent = { type: 'boost:changed' };
          emit(event);
          broadcastVitrineEvent(event);
        }
      } catch { /* ignore */ }
    }, 30_000);

    return () => {
      destroyed = true;
      channel.close();
      window.removeEventListener('storage', handleStorage);
      clearInterval(pollInterval);
      clearInterval(boostTimer);
    };
  }, [emit]);
}
