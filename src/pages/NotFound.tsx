import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HouseBackgrounds } from '../components/HouseBackgrounds';

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
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      <HouseBackgrounds opacity={0.04} color="#1E6B4A" blur sky ground density="low" />

      <div style={{ fontSize: '80px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite' }}>🏚️</div>
      <h1 style={{
        fontSize: '28px', fontWeight: 700, color: '#111827',
        fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 8px',
      }}>Page Not Found</h1>
      <p style={{
        fontSize: '14px', color: '#6B7280', margin: '0 0 32px',
        textAlign: 'center', maxWidth: '300px',
      }}>
        This page doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        className="gradient-btn"
        style={{
          padding: '14px 28px', fontSize: '15px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}
      >
        ← Back to Home
      </button>
    </div>
  );
}
