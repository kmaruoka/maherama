import React, { createContext, useCallback, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastContainerProps {
  children: React.ReactNode;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ children }) => {
  const showToast = useCallback((message: string, type: ToastType, duration?: number) => {
    const toastOptions = {
      duration: duration || 3000,
      style: {
        fontSize: '0.85rem',
        padding: '12px 16px',
        minWidth: '200px',
        maxWidth: '400px',
      },
    };

    switch (type) {
      case 'success':
        toast.success(message, toastOptions);
        break;
      case 'error':
        toast.error(message, toastOptions);
        break;
      case 'warning':
        toast(message, { ...toastOptions, icon: '⚠' });
        break;
      case 'info':
        toast(message, { ...toastOptions, icon: 'ℹ' });
        break;
      default:
        toast(message, toastOptions);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: '24px',
            padding: '16px 20px',
            minWidth: '300px',
            maxWidth: '400px',
            zIndex: 99999,
          },
        }}
        gutter={8}
        containerStyle={{
          top: 20,
          zIndex: 99999,
        }}
        reverseOrder={false}
      />
    </ToastContext.Provider>
  );
};
