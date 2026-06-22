import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useProfile } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useUser();
  const { profile, loading } = useProfile();
  const location = useLocation();

  if (!isLoaded || loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#F9FAFB',
        gap: '16px',
      }}>
        <div style={{
          fontSize: '48px',
          fontWeight: 700,
          fontFamily: "'DM Serif Display', Georgia, serif",
          background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>N</div>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #E5E7EB',
          borderTop: '3px solid #1E6B4A',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ color: '#6B7280', fontSize: '14px', fontFamily: 'Plus Jakarta Sans' }}>
          Loading NestList...
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (roles && profile && !roles.includes(profile.role || '')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
