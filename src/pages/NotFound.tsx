import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F9FAFB',
      padding: '20px',
      fontFamily: 'Plus Jakarta Sans',
    }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏚️</div>
      <h1 style={{
        fontSize: '28px',
        fontWeight: 700,
        color: '#111827',
        fontFamily: "'DM Serif Display', Georgia, serif",
        margin: '0 0 8px',
      }}>Page Not Found</h1>
      <p style={{
        fontSize: '14px',
        color: '#6B7280',
        margin: '0 0 24px',
        textAlign: 'center',
      }}>
        This page doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          padding: '13px 24px',
          fontSize: '15px',
          fontWeight: 700,
          fontFamily: 'Plus Jakarta Sans',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(30,107,74,0.3)',
        }}
      >
        ← Back to Home
      </button>
    </div>
  );
}
