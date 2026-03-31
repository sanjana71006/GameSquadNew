import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
if (API_BASE_URL && typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return nativeFetch(`${API_BASE_URL}${input}`, init);
    }
    return nativeFetch(input, init);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
