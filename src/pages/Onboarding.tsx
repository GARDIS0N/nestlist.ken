import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useProfile } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { ROLE_LABELS } from '../lib/constants';

type Role = 'landlord' | 'caretaker' | 'agent' | 'tenant';

const roleOptions: { role: Role; emoji: string; desc: string }[] = [
  { role: 'landlord', emoji: '\u{1F3E0}', desc: 'I own property to rent' },
  { role: 'caretaker', emoji: '\u{1F511}', desc: 'I manage property for an owner' },
  { role: 'agent', emoji: '\u{1F454}', desc: 'I am a licensed property agent' },
  { role: 'tenant', emoji: '\u{1F50D}', desc: 'I am looking to rent' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { profile, loading: profileLoading, refetch } = useProfile();
  const [name, setName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profileLoading && profile) {
      if (['admin', 'superadmin'].includes(profile.role || '')) {
        navigate('/admin', { replace: true });
      } else if (['landlord', 'caretaker', 'agent'].includes(profile.role || '')) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [profile, profileLoading, navigate]);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!role) return;
    setSaving(true);
    setError('');
    try {
      const formattedPhone = phone
        ? '254' + phone.replace(/[^0-9]/g, '').replace(/^0?254?/, '')
        : null;
      const { error: dbError } = await supabase.from('profiles').insert({
        id: user.id,
        full_name: name,
        phone: formattedPhone,
        email: user.primaryEmailAddress?.emailAddress || '',
        role,
        is_active: true,
        created_at: new Date().toISOString(),
      });
      if (dbError) throw dbError;
      await refetch();
      if (role === 'admin' || role === 'superadmin') {
        navigate('/admin', { replace: true });
      } else if (role === 'landlord' || role === 'caretaker' || role === 'agent') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1.5px solid #E5E7EB',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '16px',
    fontFamily: 'Plus Jakarta Sans',
    color: '#111827',
    background: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9FAFB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Plus Jakarta Sans',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>👋</div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#111827',
          fontFamily: "'DM Serif Display', Georgia, serif",
          margin: '0 0 6px',
        }}>Welcome to NestList!</h1>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          margin: '0 0 24px',
        }}>Tell us about yourself to get started.</p>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '11px 14px',
            color: '#DC2626',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            gap: '8px',
            textAlign: 'left',
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginBottom: '16px', textAlign: 'left' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Full Name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="John Kamau" />
        </div>

        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Phone (optional)</label>
          <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ background: '#F0FDF4', padding: '11px 10px', fontSize: '13px', fontWeight: 600, color: '#1E6B4A', borderRight: '1.5px solid #E5E7EB', whiteSpace: 'nowrap' }}>🇰🇪 +254</div>
            <input style={{ ...inputStyle, border: 'none', borderRadius: 0 }} value={phone.replace(/^0?254?/, '')} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} placeholder="712 345 678" />
          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 16px', textAlign: 'left' }}>Choose your role</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          {roleOptions.map(({ role: r, emoji, desc }) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                padding: '16px 12px',
                borderRadius: '12px',
                border: role === r ? '2px solid #1E6B4A' : '1.5px solid #E5E7EB',
                background: role === r ? '#F0FDF4' : '#fff',
                cursor: 'pointer',
                textAlign: 'center',
                position: 'relative',
                boxShadow: role === r ? '0 0 0 3px rgba(30,107,74,0.1)' : 'none',
                fontFamily: 'Plus Jakarta Sans',
              }}
            >
              {role === r && <span style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '16px' }}>✓</span>}
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>{emoji}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '2px', textTransform: 'capitalize' }}>{r}</div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>{desc}</div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!role || saving}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 20px',
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: 'Plus Jakarta Sans',
            cursor: (!role || saving) ? 'not-allowed' : 'pointer',
            opacity: (!role || saving) ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(30,107,74,0.3)',
          }}
        >
          {saving ? (
            <><div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Saving...</>
          ) : (
            `Continue as ${role ? ROLE_LABELS[role] : ''} →`
          )}
        </button>
      </div>
    </div>
  );
}
