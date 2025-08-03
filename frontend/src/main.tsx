import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App.tsx';
import { SkinProvider } from './skins/SkinContext';
import { BarrierProvider } from './barriers/BarrierContext';
import { ToastContainer } from './components/atoms';
import './config/i18n';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SkinProvider>
        <BarrierProvider>
          <ToastContainer>
            <App />
          </ToastContainer>
        </BarrierProvider>
      </SkinProvider>
    </QueryClientProvider>
  </StrictMode>,
);
