import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { FirebaseProvider } from './components/FirebaseProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="srm-theme">
      <FirebaseProvider>
        <App />
        <Toaster />
      </FirebaseProvider>
    </ThemeProvider>
  </StrictMode>,
);
