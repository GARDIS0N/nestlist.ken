import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn, useSignUp, useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';
import { ROLE_LABELS } from '../lib/constants';

type Role = 'landlord' | 'caretaker' | 'agent' | 'tenant';

const roleOptions: { role: Role; emoji: string; desc: string }[] = [
  { role: 'landlord', emoji: '\u{1F3E0}', desc: 'I own property to rent' },
  { role: 'caretaker', emoji: '\u{1F511}', desc: 'I manage property for an owner' },
  { role: 'agent', emoji: '\u{1F454}', desc: 'I am a licensed property agent' },
  { role: 'tenant', emoji: '\u{1F50D}', desc: 'I am looking to rent' },
];

export default function Auth() {
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();
  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  if (isSignedIn && user) {
    navigate('/', { replace: true });
    return null;
  }

  const pwStrength = (pw: string): { bars: number; label: string; color: string } => {
    const len = pw.length;
    if (len === 0) return { bars: 0, label: '', color: '' };
    if (len < 6) return { bars: 1, label: 'Weak', color: '#DC2626' };
    if (len < 9) return { bars: 2, label: 'Fair', color: '#D97706' };
    if (len < 13) return { bars: 3, label: 'Good', color: '#65A30D' };
    return { bars: 4, label: 'Strong', color: '#16A34A' };
  };
  const strength = pwStrength(password);

  const formatPhone = (val: string) => {
    const d = val.replace(/[^0-9]/g, '');
    if (d.startsWith('254')) return d;
    if (d.startsWith('0')) return '254' + d.slice(1);
    if (d.startsWith('7')) return '254' + d;
    return d;
  };

  const mapClerkError = (e: any): string => {
    const msg = e?.errors?.[0]?.message || e?.message || '';
    if (msg.includes('password_incorrect')) return 'Incorrect password. Please try again.';
    if (msg.includes('identifier_not_found')) return 'No account with this email.';
    if (msg.includes('identifier_exists')) return 'An account already exists with this email.';
    if (msg.includes('password') && msg.includes('short')) return 'Password must be at least 8 characters.';
    if (msg.includes('Network') || msg.includes('network')) return 'Connection failed. Check your internet.';
    return msg || 'Something went wrong.';
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !role) return;
    setLoading(true);
    setError('');
    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      });
      await setActiveSignUp({ session: result.createdSessionId });
      const userId = result.createdUserId;
      const { error: dbError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: name,
        phone: formatPhone(phone),
        email,
        role,
        is_active: true,
        created_at: new Date().toISOString(),
      });
      if (dbError) throw dbError;
      navigate('/onboarding', { replace: true });
    } catch (err: any) {
      setError(mapClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      await setActiveSignIn({ session: result.createdSessionId });
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', result.createdUserId)
        .single();
      if (profile?.role === 'admin' || profile?.role === 'superadmin') {
        navigate('/admin', { replace: true });
      } else if (['landlord', 'caretaker', 'agent'].includes(profile?.role || '')) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(mapClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email });
      setError('Reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(mapClerkError(err));
    } finally {
      setLoading(false);
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

  const btnStyle: React.CSSProperties = {
    width: '100%',
    background: loading
      ? 'linear-gradient(135deg, #1E6B4A, #34D399)'
      : 'linear-gradient(135deg, #1E6B4A, #34D399)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 20px',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'Plus Jakarta Sans',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 16px rgba(30,107,74,0.3)',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9FAFB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Plus Jakarta Sans',
    }}>
      <div style={{
        position: 'absolute',
        top: '-60px',
        right: '-60px',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(30,107,74,0.12) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-60px',
        left: '-60px',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{ padding: '32px 24px 24px', textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '24px',
            fontFamily: "'DM Serif Display', Georgia, serif",
            margin: '0 auto 12px',
          }}>N</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#111827',
            fontFamily: "'DM Serif Display', Georgia, serif",
            margin: '0 0 4px',
          }}>NestList</h1>
          <p style={{
            fontSize: '14px',
            color: '#6B7280',
            margin: '0 0 24px',
          }}>Kenya Rentals</p>

          <div style={{
            display: 'flex',
            borderBottom: '1px solid #E5E7EB',
            marginBottom: '24px',
          }}>
            <button
              onClick={() => { setMode('login'); setStep(1); setError(''); setForgotMode(false); }}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'none',
                fontSize: '15px',
                fontWeight: 600,
                color: mode === 'login' ? '#1E6B4A' : '#9CA3AF',
                borderBottom: mode === 'login' ? '2px solid #1E6B4A' : '2px solid transparent',
                fontFamily: 'Plus Jakarta Sans',
                cursor: 'pointer',
              }}
            >Sign In</button>
            <button
              onClick={() => { setMode('register'); setStep(1); setError(''); setForgotMode(false); }}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'none',
                fontSize: '15px',
                fontWeight: 600,
                color: mode === 'register' ? '#1E6B4A' : '#9CA3AF',
                borderBottom: mode === 'register' ? '2px solid #1E6B4A' : '2px solid transparent',
                fontFamily: 'Plus Jakarta Sans',
                cursor: 'pointer',
              }}
            >Register</button>
          </div>

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
              alignItems: 'flex-start',
              textAlign: 'left',
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' ? (
            step === 1 ? (
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Full Name</label>
                  <input style={inputStyle} value={name} onChange={e => { setError(''); setName(e.target.value); }} placeholder="John Kamau" />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Phone</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ background: '#F0FDF4', padding: '11px 10px', fontSize: '13px', fontWeight: 600, color: '#1E6B4A', borderRight: '1.5px solid #E5E7EB', whiteSpace: 'nowrap' }}>🇰🇪 +254</div>
                    <input style={{ ...inputStyle, border: 'none', borderRadius: 0 }} value={phone.replace('254', '')} onChange={e => { setError(''); setPhone('254' + e.target.value.replace(/[^0-9]/g, '')); }} placeholder="712 345 678" />
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Email</label>
                  <input style={inputStyle} type="email" value={email} onChange={e => { setError(''); setEmail(e.target.value); }} placeholder="john@example.com" />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input style={inputStyle} type={showPw ? 'text' : 'password'} value={password} onChange={e => { setError(''); setPassword(e.target.value); }} placeholder="At least 8 characters" />
                    <button
                      onClick={() => setShowPw(!showPw)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#6B7280', padding: '4px' }}
                    >{showPw ? '🙈' : '👁️'}</button>
                  </div>
                  {password.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} style={{
                            flex: 1, height: '4px', borderRadius: '2px',
                            background: i <= strength.bars ? strength.color : '#E5E7EB',
                          }} />
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: strength.color, fontWeight: 600 }}>{strength.label}</div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={!name || !email || password.length < 6}
                  style={{
                    ...btnStyle,
                    opacity: (!name || !email || password.length < 6) ? 0.5 : 1,
                  }}
                >Continue →</button>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 16px' }}>Choose your role</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
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
                        transition: 'all 0.2s',
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
                  onClick={handleRegister}
                  disabled={!role || loading}
                  style={{
                    ...btnStyle,
                    opacity: (!role || loading) ? 0.5 : 1,
                  }}
                >
                  {loading ? (
                    <><div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Creating...</>
                  ) : (
                    `Create Account as ${role ? ROLE_LABELS[role] : ''} →`
                  )}
                </button>
                <button onClick={() => { setStep(1); setError(''); }} style={{ width: '100%', background: 'transparent', color: '#6B7280', border: 'none', padding: '12px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', marginTop: '4px' }}>← Back</button>
              </div>
            )
          ) : forgotMode ? (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 16px' }}>Reset Password</h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Email</label>
                <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <button onClick={handleForgotPassword} disabled={!email || loading} style={{ ...btnStyle, opacity: (!email || loading) ? 0.5 : 1 }}>
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>
              <button onClick={() => { setForgotMode(false); setError(''); }} style={{ width: '100%', background: 'transparent', color: '#6B7280', border: 'none', padding: '12px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', marginTop: '4px' }}>← Back to Sign In</button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Email</label>
                <input style={inputStyle} type="email" value={email} onChange={e => { setError(''); setEmail(e.target.value); }} placeholder="john@example.com" />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Password</label>
                  <button onClick={() => setForgotMode(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#1E6B4A', fontWeight: 600, fontFamily: 'Plus Jakarta Sans', padding: 0 }}>Forgot password?</button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input style={inputStyle} type={showPw ? 'text' : 'password'} value={password} onChange={e => { setError(''); setPassword(e.target.value); }} placeholder="Enter your password" />
                  <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#6B7280', padding: '4px' }}>{showPw ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <button onClick={handleLogin} disabled={!email || !password || loading} style={{ ...btnStyle, opacity: (!email || !password || loading) ? 0.5 : 1, marginTop: '16px' }}>
                {loading ? (
                  <><div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Signing In...</>
                ) : 'Sign In →'}
              </button>
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          fontSize: '12px',
          color: '#9CA3AF',
        }}>
          <span>🔒 Secure</span>
          <span>✅ Verified</span>
          <span>🇰🇪 Kenya</span>
        </div>
      </div>
    </div>
  );
}
