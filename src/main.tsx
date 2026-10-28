import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
// Fonts are bundled with the app instead of loaded from Google, so visitors' IPs never reach a third party.
import '@fontsource/cinzel-decorative/700.css';
import '@fontsource/cinzel-decorative/900.css';
import '@fontsource-variable/cinzel/wght.css';
import '@fontsource-variable/lora/wght.css';
import '@fontsource-variable/lora/wght-italic.css';
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import './index.css';
import { reloadForNewVersion } from './lib/staleBuild';

// Vite fires this when a lazy file (view, data, markdown parser) can't be downloaded, which also
// covers loads outside the views' ErrorBoundary.
window.addEventListener('vite:preloadError', () => { reloadForNewVersion(); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
