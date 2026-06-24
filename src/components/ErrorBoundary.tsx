import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
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
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏠</div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#111827',
              fontFamily: "'DM Serif Display', Georgia, serif",
              margin: '0 0 8px',
            }}>
              NestList
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px', lineHeight: 1.6 }}>
              We're having trouble loading the app. This usually means some required configuration is missing.
            </p>
            {this.state.error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '24px',
                textAlign: 'left',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B', marginBottom: '4px' }}>
                  Error details:
                </div>
                <div style={{ fontSize: '12px', color: '#DC2626', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                  {this.state.error.message}
                </div>
              </div>
            )}
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
              🔄 Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
