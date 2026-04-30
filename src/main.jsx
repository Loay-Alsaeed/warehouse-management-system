import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const hideBootLoader = () => {
  const loader = document.getElementById('boot-loader');
  if (!loader) return;

  loader.classList.add('boot-loader-hidden');
  window.setTimeout(() => loader.remove(), 300);
};

window.addEventListener('app-ready', hideBootLoader, { once: true });
window.setTimeout(hideBootLoader, 8000);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
