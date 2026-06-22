import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useProfile } from '../hooks/useAuth';

export default function Navbar() {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isLandlord = profile && ['landlord', 'caretaker', 'agent'].includes(profile.role || '');
  const isAdmin = profile && ['admin', 'superadmin'].includes(profile.role || '');
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  const isActive = (path: string) => location.pathname === path;

  const desktopStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid #E5E7EB',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    fontFamily: 'Plus Jakarta Sans',
  };

  return (
    <>
      <nav style={desktopStyle}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '18px',
            fontFamily: "'DM Serif Display', Georgia, serif",
          }}>N</div>
          <span style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#111827',
            fontFamily: "'DM Serif Display', Georgia, serif",
          }}>NestList</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLandlord && (
            <Link to="/dashboard" style={{
              textDecoration: 'none',
              color: isActive('/dashboard') ? '#1E6B4A' : '#6B7280',
              fontSize: '14px',
              fontWeight: 500,
              padding: '8px 12px',
              fontFamily: 'Plus Jakarta Sans',
            }}>Dashboard</Link>
          )}

          {isSignedIn ? (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px',
                  borderRadius: '8px',
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'Plus Jakarta Sans',
                }}>
                  {initials}
                </div>
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  minWidth: '200px',
                  padding: '8px',
                  zIndex: 1001,
                }}>
                  <div style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #E5E7EB',
                    marginBottom: '4px',
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#111827',
                      fontFamily: 'Plus Jakarta Sans',
                    }}>{profile?.full_name}</div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      fontFamily: 'Plus Jakarta Sans',
                      textTransform: 'capitalize',
                    }}>{profile?.role}</div>
                  </div>

                  {isLandlord && (
                    <DropItem onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}>
                      My Dashboard
                    </DropItem>
                  )}
                  {isAdmin && (
                    <DropItem onClick={() => { setMenuOpen(false); navigate('/admin'); }}>
                      Admin Panel
                    </DropItem>
                  )}

                  <DropItem onClick={handleSignOut} color="#DC2626">
                    Sign Out
                  </DropItem>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => navigate('/auth')}
                style={{
                  background: '#ffffff',
                  color: '#374151',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: 'Plus Jakarta Sans',
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/auth')}
                style={{
                  background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: 'Plus Jakarta Sans',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(30,107,74,0.3)',
                }}
              >
                Sign Up Free
              </button>
            </div>
          )}

          <button
            onClick={() => setMobileNav(!mobileNav)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              color: '#111827',
            }}
          >
            ☰
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: '#fff',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '6px 0',
        paddingBottom: 'env(safe-area-inset-bottom, 6px)',
      }}>
        <BottomNavItem icon="🏠" label="Home" active={isActive('/')} onClick={() => navigate('/')} />
        <BottomNavItem icon="🔍" label="Search" active={false} onClick={() => navigate('/')} />
        <div style={{ position: 'relative', top: '-12px' }}>
          <button
            onClick={() => navigate('/post-listing')}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
              border: 'none',
              color: '#fff',
              fontSize: '28px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(30,107,74,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            +
          </button>
        </div>
        <BottomNavItem icon="📋" label="Listings" active={isActive('/dashboard')} onClick={() => navigate('/dashboard')} />
        <BottomNavItem icon="👤" label="Profile" active={isActive('/auth')} onClick={() => navigate('/auth')} />
      </div>
    </>
  );
}

function DropItem({ children, onClick, color }: { children: React.ReactNode; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: '10px 12px',
        border: 'none',
        background: 'none',
        textAlign: 'left',
        fontSize: '14px',
        fontWeight: 500,
        color: color || '#111827',
        fontFamily: 'Plus Jakarta Sans',
        cursor: 'pointer',
        borderRadius: '8px',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {children}
    </button>
  );
}

function BottomNavItem({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px 12px',
        minHeight: '48px',
        color: active ? '#1E6B4A' : '#9CA3AF',
      }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{
        fontSize: '10px',
        fontWeight: active ? 700 : 500,
        fontFamily: 'Plus Jakarta Sans',
      }}>{label}</span>
    </button>
  );
}
