import { store } from "../store/useStore";

// Each deploy renames the code-split files and deletes the old ones, so a page left open from an
// older version fails when it lazy-loads a view it hadn't opened yet. Reloading picks up the new one.

const RELOAD_KEY = "ndm_stale_build_reload_at";

export function isChunkLoadError(error: unknown): boolean {
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Unable to preload CSS/i.test(String(error));
}

/** Saves pending changes and reloads the page. Returns false (no reload) if it already reloaded in
 *  the last 30 s, so a missing file that a reload can't fix (offline, broken deploy) doesn't loop. */
export async function reloadForNewVersion(): Promise<boolean> {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY));
    if (last && Date.now() - last < 30_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  await store.flush();
  window.location.reload();
  return true;
}
