import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'bootstrap/dist/css/bootstrap.min.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BarrierProvider } from './barriers/BarrierContext';
import { ToastContainer } from './components/atoms';
import './config/i18n';
import './index.css';
import { SkinProvider } from './skins/SkinContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // 401エラーの場合は再試行しない（apiCallで既に処理済み）
        if (error?.status === 401 || error?.message?.includes('401')) {
          return false;
        }
        // その他のエラーは最大3回まで再試行
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5分
      gcTime: 10 * 60 * 1000, // 10分（旧cacheTime）
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // 401エラーの場合は再試行しない（apiCallで既に処理済み）
        if (error?.status === 401 || error?.message?.includes('401')) {
          return false;
        }
        // その他のエラーは最大1回まで再試行
        return failureCount < 1;
      },
    },
  },
});

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
