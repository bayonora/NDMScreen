import { useEffect, useRef } from "react";
import type { Tab } from "../store/useStore";

// Pressing the tab you're already on (bottom bar or "Más" sheet) sends this signal, so a view
// can go back to its start, e.g. Tiendas leaves the open shop and shows the shop grid.
const EVENT = "dm:tab-reselect";

export function emitTabReselect(tab: Tab) {
  window.dispatchEvent(new CustomEvent<Tab>(EVENT, { detail: tab }));
}

/** Calls `onReselect` when the user presses `tab` while already on it. */
export function useTabReselect(tab: Tab, onReselect: () => void) {
  const cb = useRef(onReselect);
  cb.current = onReselect;
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<Tab>).detail === tab) cb.current();
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, [tab]);
}
