import React from 'react';
import { Toast, useToast } from '../hooks/useToast';

const bgColors: Record<string, string> = {
  success: '#D1FAE5',
  error: '#FEE2E2',
  info: '#DBEAFE',
  warning: '#FEF3C7',
};
const textColors: Record<string, string> = {
  success: '#065F46',
  error: '#DC2626',
  info: '#1D4ED8',
  warning: '#92400E',
};
const icons: Record<string, string> = {
  success: '\u2705',
  error: '\u274C',
  info: '\u2139\uFE0F',
  warning: '\u26A0\uFE0F',
};

interface ToastContainerProps {
  toasts: Toast[];
  remove: (id: number) => void;
}

export default function ToastContainer({ toasts, remove }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '320px',
      width: 'calc(100% - 32px)',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          style={{
            background: bgColors[t.type],
            color: textColors[t.type],
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '13px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            animation: 'slideInRight 0.3s ease',
            fontFamily: 'Plus Jakarta Sans',
            fontWeight: 500,
          }}
        >
          <span>{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
