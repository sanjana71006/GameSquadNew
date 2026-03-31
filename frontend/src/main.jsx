import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const normalizeBaseUrl = (baseUrl) => {
  if (!baseUrl) return '';
  return String(baseUrl).trim().replace(/\/+$/, '');
};

const inferRenderBackendBaseUrl = () => {
  if (typeof window === 'undefined' || !window.location) return '';

  // Common Render blueprint convention: <app>-frontend.onrender.com + <app>-backend.onrender.com
  const host = window.location.hostname;
  const match = host.match(/^(.*?)-frontend(\.onrender\.com)$/);
  if (match) return `https://${match[1]}-backend${match[2]}`;

  return '';
};

const configuredBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const inferredBase = import.meta.env.PROD ? inferRenderBackendBaseUrl() : '';
const API_BASE_URL = configuredBase || inferredBase;

if (API_BASE_URL && typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return nativeFetch(`${API_BASE_URL}${input}`, init);
    }
    return nativeFetch(input, init);
  };
} else if (import.meta.env.PROD) {
  // eslint-disable-next-line no-console
  console.warn('API base URL is not configured. Set VITE_API_BASE_URL to your backend origin (e.g. https://<service>.onrender.com).');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
