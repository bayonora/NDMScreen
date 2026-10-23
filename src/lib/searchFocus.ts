import { useEffect } from "react";
import { actions, useStore } from "../store/useStore";

/**
 * "Take me there" from the global search: after switching tabs, the element marked with
 * `data-search-id="<id>"` is scrolled into view and glows for a moment. Views only need to put
 * that attribute on their cards/rows.
 */
export function focusSearchResult(id: string) {
  actions.updateUI({ searchFocusId: id });
}

/** Mounted once in App. Waits for the target to render (views are lazy-loaded), then highlights it. */
export function useSearchFocus() {
  const id = useStore((s) => s.uiState.searchFocusId);

  useEffect(() => {
    if (!id) return;
    let tries = 0;
    const poll = setInterval(() => {
      const el = document.querySelector<HTMLElement>(`[data-search-id="${CSS.escape(id)}"]`);
      if (!el && ++tries < 40) return;
      clearInterval(poll);
      actions.updateUI({ searchFocusId: undefined });
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      el.classList.remove("search-flash");
      void el.offsetWidth; // restart the animation if it was already running
      el.classList.add("search-flash");
      setTimeout(() => el.classList.remove("search-flash"), 2600);
    }, 80);
    return () => clearInterval(poll);
  }, [id]);
}
