import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker active:', reg.scope))
        .catch((err) => console.warn('Service Worker registration skipped:', err));
    } catch (e) {
      console.warn('Service Worker registration error:', e);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

