import React, { createContext, useContext, useMemo } from 'react';
import { useToast, Toast } from './useToast';
import ToastContainer from '../components/ToastContainer';

interface ToastContextValue {
  show: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  remove: (id: number) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, show, remove } = useToast();
  const value = useMemo(() => ({ toasts, show, remove }), [toasts, show, remove]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} remove={remove} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider');
  return ctx;
}
