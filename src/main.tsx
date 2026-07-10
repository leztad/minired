import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Interceptar llamadas a fetch en el entorno de escritorio Tauri para redirigirlas al backend Express local en el puerto 3000
const isTauri =
  (window as any).__TAURI__ !== undefined ||
  (window as any).__TAURI_INTERNALS__ !== undefined ||
  window.location.protocol === 'tauri:' ||
  window.location.hostname === 'tauri.localhost';

if (isTauri) {
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    let urlStr = '';
    if (typeof input === 'string') {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.href;
    } else if (input instanceof Request) {
      urlStr = input.url;
    }

    // Si es una ruta relativa que empieza por /api
    if (urlStr.startsWith('/api') || urlStr.startsWith('api')) {
      const cleanPath = urlStr.startsWith('/') ? urlStr : '/' + urlStr;
      const targetUrl = `http://localhost:3000${cleanPath}`;

      if (typeof input === 'string') {
        input = targetUrl;
      } else if (input instanceof URL) {
        input = new URL(targetUrl);
      } else if (input instanceof Request) {
        input = new Request(targetUrl, input);
      }
    }
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
