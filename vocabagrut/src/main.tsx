import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from './hooks/useLanguage';
import { SessionProvider } from './hooks/useSession';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </LanguageProvider>
  </StrictMode>,
);
