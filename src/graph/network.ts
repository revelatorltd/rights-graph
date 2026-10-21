import { useSyncExternalStore } from "react";

/**
 * The network the graph is read over — a STAND-IN, because the fixtures answer at once. A page's
 * first read in a session takes the time a real one would; a page read before is answered from the
 * cache at once. `Offline` fails every first read, so each page's error state can be seen.
 */
export const NETWORKS = ["Normal", "Slow", "Offline"] as const;
export type Network = (typeof NETWORKS)[number];

/** How long a first read takes, by network. */
export const LATENCY: Record<Network, number> = { Normal: 450, Slow: 2400, Offline: 900 };

const KEPT = "rights-graph:network";
const listeners = new Set<() => void>();
let network: Network = read();
/** The addresses already read this session — answered from the cache. */
const READ = new Set<string>();

function read(): Network {
  try {
    const kept = sessionStorage.getItem(KEPT);
    return NETWORKS.find((one) => one === kept) ?? "Normal";
  } catch {
    // No session storage: the network is normal.
    return "Normal";
  }
}

export function setNetwork(next: Network) {
  network = next;
  // A network changed is a cache emptied: every page reads again, the new way.
  READ.clear();
  try {
    sessionStorage.setItem(KEPT, next);
  } catch {
    // Not kept past a reload.
  }
  for (const listener of listeners) listener();
}

export function useNetwork(): Network {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => network,
  );
}

export const wasRead = (address: string) => READ.has(address);
export const markRead = (address: string) => READ.add(address);
