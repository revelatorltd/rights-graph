import { useEffect, useState, type ReactNode } from "react";
import { Button, EmptyState, Slot, SlotItem, Spinner } from "@revelator/pro-ui";

import { LATENCY, markRead, useNetwork, wasRead } from "../graph/network";

/**
 * A page while its graph is on its way — the one place every surface draws its page through.
 *
 * The system's declared forms take no loading state yet (gaps.md B19), and its guidance is that a
 * placeholder is the loading state of the component that will occupy it, never a grey box drawn
 * beside one. So until a `CollectionPage` or a `DetailPage` can say it is loading, the wait is a
 * Spinner, which the system keeps for a wait with no known shape; and a read that fails is an empty
 * state saying so, with the way to try again. A page read once this session opens at once.
 */
export function Arriving({ children }: { children: ReactNode }) {
  const network = useNetwork();
  const address = `${globalThis.location.search}${globalThis.location.hash}`;
  const [state, setState] = useState<"arriving" | "failed" | "here">(wasRead(address) ? "here" : "arriving");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (wasRead(address)) {
      setState("here");
      return;
    }
    setState("arriving");
    const timer = setTimeout(() => {
      if (network === "Offline") return setState("failed");
      markRead(address);
      setState("here");
    }, LATENCY[network]);
    return () => clearTimeout(timer);
  }, [address, network, attempt]);

  if (state === "here") return children;
  if (state === "failed")
    return (
      <Slot layout="empty">
        <EmptyState
          mark="error"
          title="The graph could not be reached"
          detail="Nothing on this page was read, so nothing on it is shown. Your last changes are kept and nothing was lost."
        >
          <Button onClick={() => setAttempt((one) => one + 1)}>Try again</Button>
        </EmptyState>
      </Slot>
    );
  return (
    <Slot layout="empty">
      <SlotItem>
        <Spinner label="Reading the graph" />
      </SlotItem>
    </Slot>
  );
}
