import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { inicializar } from './dados/seed';
import './estilos.css';

registerSW({ immediate: true });

// Pede ao browser para não apagar os dados locais quando faltar espaço
navigator.storage?.persist?.().catch(() => undefined);

inicializar()
  .catch((e) => console.error('Erro ao preparar os dados', e))
  .finally(() => {
    createRoot(document.getElementById('raiz')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
