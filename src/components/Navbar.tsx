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

  useEffect(() => {
    setMobileNav(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isLandlord = profile && ['landlord', 'caretaker', 'agent'].includes(profile.role || '');
  const isAdmin = profile && ['admin', 'superadmin'].includes(profile.role || '');
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  return (
    <>
      <nav style={desktopStyle}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            boxShadow: '0 2px 8px rgba(30,107,74,0.25)',
          }}>N</div>
          <span style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#111827',
            fontFamily: "'DM Serif Display', Georgia, serif",
          }}>NestList</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div className="navbar-desktop-links" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <NavLink to="/" active={isActive('/')} label="Browse" />
            {isLandlord && <NavLink to="/dashboard" active={isActive('/dashboard')} label="Dashboard" />}
            {isLandlord && <NavLink to="/post-listing" active={isActive('/post-listing')} label="Post Listing" />}
            {isAdmin && <NavLink to="/admin" active={isActive('/admin')} label="Admin" />}
          </div>

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
                  padding: '4px 8px 4px 12px',
                  borderRadius: '20px',
                  transition: 'background 0.2s',
                  marginLeft: '8px',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                  {profile?.full_name?.split(' ')[0] || 'User'}
                </span>
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
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 2px 6px rgba(30,107,74,0.2)',
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
                  borderRadius: '14px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  minWidth: '220px',
                  padding: '6px',
                  zIndex: 1001,
                  animation: 'fadeInDown 0.15s ease',
                  border: '1px solid #E5E7EB',
                }}>
                  <div style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #F3F4F6',
                    marginBottom: '4px',
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#111827',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>{profile?.full_name}</div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      textTransform: 'capitalize',
                    }}>{profile?.role}</div>
                  </div>

                  {isLandlord && (
                    <DropItem onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}>
                      📊 My Dashboard
                    </DropItem>
                  )}
                  {isAdmin && (
                    <DropItem onClick={() => { setMenuOpen(false); navigate('/admin'); }}>
                      ⚙️ Admin Panel
                    </DropItem>
                  )}
                  <DropItem onClick={() => { setMenuOpen(false); navigate('/'); }}>
                    🏠 Browse Properties
                  </DropItem>

                  <div style={{ borderTop: '1px solid #F3F4F6', marginTop: '4px', paddingTop: '4px' }}>
                    <DropItem onClick={handleSignOut} color="#DC2626">
                      🚪 Sign Out
                    </DropItem>
                  </div>
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
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1E6B4A'; e.currentTarget.style.background = '#F0FDF4'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#fff'; }}
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
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(30,107,74,0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(30,107,74,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                Sign Up Free
              </button>
            </div>
          )}

          <button
            onClick={() => setMobileNav(!mobileNav)}
            className="navbar-mobile-toggle"
            aria-label="Toggle navigation menu"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              padding: '8px',
              color: '#111827',
              transition: 'transform 0.2s',
              marginLeft: '4px',
            }}
          >
            {mobileNav ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile drawer menu */}
      {mobileNav && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setMobileNav(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', top: '64px', left: 0, right: 0,
              background: '#fff', borderBottom: '1px solid #E5E7EB',
              padding: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              animation: 'slideDown 0.2s ease',
            }}
          >
            <MobileNavItem icon="🏠" label="Browse" onClick={() => { setMobileNav(false); navigate('/'); }} />
            {isLandlord && <MobileNavItem icon="📊" label="Dashboard" onClick={() => { setMobileNav(false); navigate('/dashboard'); }} />}
            {isLandlord && <MobileNavItem icon="➕" label="Post Listing" onClick={() => { setMobileNav(false); navigate('/post-listing'); }} />}
            {isAdmin && <MobileNavItem icon="⚙️" label="Admin" onClick={() => { setMobileNav(false); navigate('/admin'); }} />}
            <div style={{ borderTop: '1px solid #F3F4F6', marginTop: '4px', paddingTop: '4px' }}>
              <MobileNavItem icon="📄" label="Terms" onClick={() => { setMobileNav(false); navigate('/terms'); }} />
              <MobileNavItem icon="🔒" label="Privacy" onClick={() => { setMobileNav(false); navigate('/privacy'); }} />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <div className="bottom-nav" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '4px 0',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 4px) + 4px)',
      }}>
        <BottomNavItem icon="🏠" label="Home" active={isActive('/')} onClick={() => navigate('/')} />
        <BottomNavItem icon="🔍" label="Search" active={false} onClick={() => { navigate('/'); window.scrollTo({ top: 300, behavior: 'smooth' }); }} />
        <div style={{ position: 'relative', top: '-14px' }}>
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
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            +
          </button>
        </div>
        <BottomNavItem icon="📋" label="Listings" active={isActive('/dashboard')} onClick={() => navigate('/dashboard')} />
        <BottomNavItem icon="👤" label="Profile" active={isActive(isSignedIn ? '/dashboard' : '/auth')} onClick={() => navigate(isSignedIn ? '/dashboard' : '/auth')} />
      </div>
    </>
  );
}

function NavLink({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        color: active ? '#1E6B4A' : '#6B7280',
        fontSize: '14px',
        fontWeight: active ? 600 : 500,
        padding: '8px 14px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        borderRadius: '8px',
        transition: 'all 0.2s',
        background: active ? '#F0FDF4' : 'transparent',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F3F4F6'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </Link>
  );
}

function DropItem({ children, onClick, color }: { children: React.ReactNode; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '10px 12px',
        border: 'none',
        background: 'none',
        textAlign: 'left',
        fontSize: '14px',
        fontWeight: 500,
        color: color || '#111827',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        cursor: 'pointer',
        borderRadius: '10px',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {children}
    </button>
  );
}

function MobileNavItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '14px 16px',
        border: 'none',
        background: 'none',
        fontSize: '15px',
        fontWeight: 500,
        color: '#374151',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        cursor: 'pointer',
        borderRadius: '12px',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span>{label}</span>
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
        position: 'relative',
        transition: 'color 0.2s',
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '20px', height: '3px', borderRadius: '2px',
          background: '#1E6B4A',
        }} />
      )}
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{
        fontSize: '10px',
        fontWeight: active ? 700 : 500,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>{label}</span>
    </button>
  );
}
