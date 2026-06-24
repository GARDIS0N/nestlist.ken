import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import Browse from './pages/Browse';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import ListProperty from './pages/ListProperty';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './hooks/ToastContext';
import './styles/global.css';

/* ─── Register Service Worker ─── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Check for updates on page load
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available - show prompt if desired
              console.log('[PWA] New version available. Refresh to update.');
            }
          });
        }
      });
    }).catch((err) => {
      console.error('[PWA] Service worker registration failed:', err);
    });
  });

  // Handle service worker updates: when new SW takes over, reload
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const hasClerkKey = clerkKey.length > 0;
const hasSupabaseConfig = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

/* ─── Missing Config Warning (render-friendly, not a crash) ─── */
function ConfigGuard({ children }: { children: React.ReactNode }) {
  if (!hasClerkKey || !hasSupabaseConfig) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#F9FAFB',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{
          maxWidth: '480px',
          textAlign: 'center',
          background: '#fff',
          borderRadius: '24px',
          padding: '48px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔧</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#111827',
            fontFamily: "'DM Serif Display', Georgia, serif",
            margin: '0 0 8px',
          }}>NestList</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px', lineHeight: 1.6 }}>
            The app needs a few configuration values to run. If you're the site owner, please set the following in your Vercel dashboard:
          </p>
          <div style={{
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            textAlign: 'left',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E', marginBottom: '8px' }}>Required Environment Variables:</div>
            <ul style={{ fontSize: '12px', color: '#92400E', margin: 0, paddingLeft: '20px', lineHeight: 1.8 }}>
              {!hasClerkKey && <li><strong>VITE_CLERK_PUBLISHABLE_KEY</strong> — from Clerk dashboard</li>}
              {!import.meta.env.VITE_SUPABASE_URL && <li><strong>VITE_SUPABASE_URL</strong> — from Supabase project</li>}
              {!import.meta.env.VITE_SUPABASE_ANON_KEY && <li><strong>VITE_SUPABASE_ANON_KEY</strong> — from Supabase project</li>}
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 28px',
              fontSize: '15px',
              fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(30,107,74,0.3)',
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConfigGuard>
        <ClerkProvider
          publishableKey={clerkKey}
          afterSignInUrl="/"
          afterSignUpUrl="/"
        >
          <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Browse />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-listing"
                element={
                  <ProtectedRoute roles={['landlord', 'caretaker', 'agent']}>
                    <ListProperty />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute roles={['landlord', 'caretaker', 'agent']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={['admin', 'superadmin']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </BrowserRouter>
          </ToastProvider>
        </ClerkProvider>
      </ConfigGuard>
    </ErrorBoundary>
  </React.StrictMode>
);
