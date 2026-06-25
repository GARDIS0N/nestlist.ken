import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn, useSignUp, useUser, useClerk } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';
import { ROLE_LABELS } from '../lib/constants';
import { HouseBackgrounds } from '../components/HouseBackgrounds';
import { useToastContext } from '../hooks/ToastContext';

type Role = 'landlord' | 'caretaker' | 'agent' | 'tenant' | 'admin' | 'superadmin';

const roleOptions: { role: Role; emoji: string; desc: string }[] = [
  { role: 'landlord', emoji: '\u{1F3E0}', desc: 'I own property to rent' },
  { role: 'caretaker', emoji: '\u{1F511}', desc: 'I manage property for an owner' },
  { role: 'agent', emoji: '\u{1F454}', desc: 'I am a licensed property agent' },
  { role: 'tenant', emoji: '\u{1F50D}', desc: 'I want to rent or buy property' },
];

export default function Auth() {
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();
  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const clerk = useClerk();

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
  const { show: showToast } = useToastContext();
  const [pendingRetry, setPendingRetry] = useState<{
    userId: string;
    profile: { full_name: string; phone: string; role: string };
  } | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  // Don't redirect away if we're mid-registration or mid-retry
  if (isSignedIn && user && !registering && !pendingRetry) {
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
    if (!name || !email || !password || !role || !signUp) return;
    setLoading(true);
    setError('');
    setRegistering(true);
    try {
      const result = await signUp.create({ emailAddress: email, password });

      if (result.status === 'complete') {
        // Activate the Clerk session FIRST so ProtectedRoute
        // sees isSignedIn=true before any navigation happens
        if (setActiveSignUp && result.createdSessionId) {
          await setActiveSignUp({ session: result.createdSessionId });
        }
        // Then create profile in Supabase and navigate
        await createProfileAndNavigate(result.createdUserId);
      } else {
        // Email verification is required — send verification code
        // Note: createdUserId is null until verification completes
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setShowVerification(true);
        setError('');
      }
    } catch (err: any) {
      setError(mapClerkError(err));
      setRegistering(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!signUp || !verificationCode) return;
    setLoading(true);
    setError('');
    setRegistering(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode });

      if (result.status === 'complete') {
        // Activate the Clerk session FIRST so ProtectedRoute
        // sees isSignedIn=true before any navigation happens
        if (setActiveSignUp && result.createdSessionId) {
          await setActiveSignUp({ session: result.createdSessionId });
        }
        // Then create profile in Supabase and navigate
        // createdUserId is now populated since verification is complete
        await createProfileAndNavigate(result.createdUserId);
        setShowVerification(false);
      } else {
        setError('The verification code is incorrect or expired. Please try again.');
      }
    } catch (err: any) {
      setError(mapClerkError(err));
      setRegistering(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!signUp) return;
    setLoading(true);
    setError('');
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setError('✅ A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(mapClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const createProfileAndNavigate = async (userId: string | null | undefined) => {
    if (!userId) throw new Error('Your account was created but we could not retrieve your user ID.');

    const profileData = {
      id: userId,
      full_name: name,
      phone: formatPhone(phone),
      role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });

    if (profileError) {
      setPendingRetry({
        userId,
        profile: { full_name: name, phone: formatPhone(phone), role: role || 'tenant' },
      });
      setError(
        `Your NestList account was created, but we couldn't save your profile. ` +
        `Click "Retry" below to try again.`
      );
      setRegistering(false);
      setShowVerification(false);
      return;
    }

    showToast('Account created! Welcome to NestList.', 'success');
    setRegistering(false);
    if (role === 'admin' || role === 'superadmin') navigate('/admin', { replace: true });
    else if (role === 'landlord' || role === 'caretaker' || role === 'agent') navigate('/dashboard', { replace: true });
    else navigate('/', { replace: true });
  };

  const handleRetrySupabase = async () => {
    if (!pendingRetry) return;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: pendingRetry.userId,
        full_name: pendingRetry.profile.full_name,
        phone: pendingRetry.profile.phone,
        role: pendingRetry.profile.role,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      setPendingRetry(null);
      const retryRole = pendingRetry.profile.role;
      if (retryRole === 'admin' || retryRole === 'superadmin') navigate('/admin', { replace: true });
      else if (retryRole === 'landlord' || retryRole === 'caretaker' || retryRole === 'agent') navigate('/dashboard', { replace: true });
      else navigate('/', { replace: true });
    } catch (err: any) {
      setError(`Profile setup still failed: ${err.message}. You can try again or contact support.`);
    } finally {
      setLoading(false);
    }
  };

  const dismissRetry = async () => {
    // Sign out of Clerk since the profile couldn't be created
    try { await clerk.signOut(); } catch { /* best effort */ }
    setPendingRetry(null);
    setError('');
  };

  const handleLogin = async () => {
    if (!email || !password || !signIn) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({ identifier: email, password });
      if (setActiveSignIn && result.createdSessionId) {
        await setActiveSignIn({ session: result.createdSessionId });
      }
      // After login, ProtectedRoute handles redirect to /onboarding if no profile,
      // or to dashboard/admin/home based on role — navigate to / which triggers that logic
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(mapClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !signIn) return;
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

  return (
    <div style={{
      minHeight: '100vh', background: '#F9FAFB',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <HouseBackgrounds opacity={0.04} color="#1E6B4A" blur sky={false} ground density="low" />

      <div style={{
        width: '100%', maxWidth: '440px',
        background: '#fff', borderRadius: '24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        overflow: 'hidden', position: 'relative',
        animation: 'fadeInUp 0.4s ease',
      }}>
        <div style={{ padding: '36px 24px 24px', textAlign: 'center' }}>
          {/* Logo */}
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '24px',
            fontFamily: "'DM Serif Display', Georgia, serif",
            margin: '0 auto 12px', boxShadow: '0 4px 16px rgba(30,107,74,0.2)',
          }}>N</div>
          <h1 style={{
            fontSize: '24px', fontWeight: 700, color: '#111827',
            fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 4px',
          }}>NestList</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px' }}>
            Kenya's Rental Platform
          </p>

          {/* Mode Tabs */}
          {!forgotMode && (
            <div style={{
              display: 'flex', background: '#F3F4F6', borderRadius: '12px',
              padding: '4px', marginBottom: '24px',
            }}>
              <button
                onClick={() => { setMode('login'); setStep(1); setError(''); setForgotMode(false); setShowVerification(false); setVerificationCode(''); setPendingUserId(null); }}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                  background: mode === 'login' ? '#fff' : 'transparent',
                  fontSize: '14px', fontWeight: 600,
                  color: mode === 'login' ? '#1E6B4A' : '#6B7280',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  cursor: 'pointer', boxShadow: mode === 'login' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s',
                }}
              >Sign In</button>
              <button
                onClick={() => { setMode('register'); setStep(1); setError(''); setForgotMode(false); setShowVerification(false); setVerificationCode(''); setPendingUserId(null); }}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                  background: mode === 'register' ? '#fff' : 'transparent',
                  fontSize: '14px', fontWeight: 600,
                  color: mode === 'register' ? '#1E6B4A' : '#6B7280',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  cursor: 'pointer', boxShadow: mode === 'register' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s',
                }}
              >Register</button>
            </div>
          )}

          {/* Error Box */}
          {error && (
            <div style={{
              background: error.includes('sent!') ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${error.includes('sent!') ? '#A7F3D0' : '#FECACA'}`,
              borderRadius: '12px', padding: '12px 14px',
              color: error.includes('sent!') ? '#065F46' : '#DC2626',
              fontSize: '13px', marginBottom: '16px',
              display: 'flex', gap: '8px', alignItems: 'flex-start', textAlign: 'left',
            }}>
              <span>{error.includes('sent!') ? '✅' : '⚠️'}</span>
              <span>{error}</span>
            </div>
          )}

          {/* Verification step: email code */}
          {mode === 'register' && showVerification && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📧</div>
                <h3 style={{
                  fontSize: '18px', fontWeight: 700, color: '#111827',
                  fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 8px'
                }}>Verify your email</h3>
                <p style={{ fontSize: '14px', color: '#6B7280', margin: '0', lineHeight: 1.5 }}>
                  We sent a 6-digit verification code to <strong style={{ color: '#111827' }}>{email}</strong>.
                  Enter it below to activate your account.
                </p>
              </div>
              <div style={{ textAlign: 'left', marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Verification Code</label>
                <input
                  className="input-base"
                  value={verificationCode}
                  onChange={e => { setError(''); setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); }}
                  placeholder="Enter 6-digit code"
                  inputMode="numeric"
                  autoFocus
                  style={{
                    letterSpacing: '8px',
                    fontSize: '20px',
                    fontWeight: 700,
                    textAlign: 'center',
                    padding: '14px',
                  }}
                />
              </div>
              <button
                onClick={handleVerifyCode}
                disabled={verificationCode.length < 6 || loading}
                className="gradient-btn"
                style={{
                  width: '100%', padding: '14px 20px', fontSize: '15px',
                  opacity: (verificationCode.length < 6 || loading) ? 0.5 : 1,
                }}
              >
                {loading ? 'Verifying...' : '✅ Verify Email'}
              </button>
              <button
                onClick={handleResendCode}
                disabled={loading}
                style={{
                  width: '100%', background: 'transparent', color: '#1E6B4A',
                  border: 'none', padding: '12px', fontSize: '13px',
                  fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '8px',
                  opacity: loading ? 0.5 : 1,
                }}
              >Re-send code</button>
              <button
                onClick={() => { setShowVerification(false); setVerificationCode(''); setPendingUserId(null); setError(''); }}
                disabled={loading}
                style={{
                  width: '100%', background: 'transparent', color: '#6B7280',
                  border: 'none', padding: '12px', fontSize: '13px',
                  fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  opacity: loading ? 0.5 : 1,
                }}
              >← Back</button>
            </div>
          )}

          {/* Retry mode: show simplified retry view */}
          {mode === 'register' && pendingRetry && step === 2 && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
              <h3 style={{
                fontSize: '18px', fontWeight: 700, color: '#111827',
                fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 8px'
              }}>Almost there</h3>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>
                Your NestList account was created successfully, but we hit a snag saving your profile. 
                Just click retry below and we'll finish setting things up.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={handleRetrySupabase}
                  disabled={loading}
                  className="gradient-btn"
                  style={{
                    padding: '14px 28px', fontSize: '15px', flex: 1,
                    opacity: loading ? 0.5 : 1, maxWidth: '200px',
                  }}
                >
                  {loading ? 'Retrying...' : '🔄 Retry'}
                </button>
                <button
                  onClick={dismissRetry}
                  disabled={loading}
                  style={{
                    padding: '14px 20px', fontSize: '14px', fontWeight: 500,
                    borderRadius: '12px', border: '1.5px solid #E5E7EB',
                    background: '#fff', color: '#6B7280', cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#fff'; }}
                >
                  Cancel & Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Register Step 1 */}
          {mode === 'register' && step === 1 && !pendingRetry && (
            <div>
              <div style={{ marginBottom: '14px', textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input
                  className="input-base"
                  value={name}
                  onChange={e => { setError(''); setName(e.target.value); }}
                  placeholder="John Kamau"
                />
              </div>
              <div style={{ marginBottom: '14px', textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Phone</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  <div style={{ background: '#F0FDF4', padding: '11px 10px', fontSize: '13px', fontWeight: 600, color: '#1E6B4A', borderRight: '1.5px solid #E5E7EB', whiteSpace: 'nowrap' }}>🇰🇪 +254</div>
                  <input
                    className="input-base"
                    style={{ border: 'none', borderRadius: 0 }}
                    value={phone.replace('254', '')}
                    onChange={e => { setError(''); setPhone('254' + e.target.value.replace(/[^0-9]/g, '')); }}
                    placeholder="712 345 678"
                  />
                </div>
              </div>
              <div style={{ marginBottom: '14px', textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Email</label>
                <input
                  className="input-base"
                  type="email"
                  value={email}
                  onChange={e => { setError(''); setEmail(e.target.value); }}
                  placeholder="john@example.com"
                />
              </div>
              <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-base"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setError(''); setPassword(e.target.value); }}
                    placeholder="At least 8 characters"
                  />
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
                          transition: 'background 0.3s',
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
                className="gradient-btn"
                style={{
                  width: '100%', padding: '14px 20px', fontSize: '15px',
                  opacity: (!name || !email || password.length < 6) ? 0.5 : 1,
                }}
              >Continue →</button>
            </div>
          )}          {/* Register Step 2 - Role Selection */}
          {mode === 'register' && step === 2 && !pendingRetry && (
            <div>
              <h3 style={{
                fontSize: '18px', fontWeight: 700, color: '#111827',
                fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 16px'
              }}>Choose your role</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {roleOptions.map(({ role: r, emoji, desc }) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    style={{
                      padding: '18px 12px', borderRadius: '14px',
                      border: role === r ? '2px solid #1E6B4A' : '1.5px solid #E5E7EB',
                      background: role === r ? '#F0FDF4' : '#fff',
                      cursor: 'pointer', textAlign: 'center', position: 'relative',
                      boxShadow: role === r ? '0 0 0 3px rgba(30,107,74,0.1)' : 'none',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (role !== r) e.currentTarget.style.borderColor = '#D1D5DB'; }}
                    onMouseLeave={e => { if (role !== r) e.currentTarget.style.borderColor = '#E5E7EB'; }}
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
                className="gradient-btn"
                style={{
                  width: '100%', padding: '14px 20px', fontSize: '15px',
                  opacity: (!role || loading) ? 0.5 : 1,
                }}
              >
                {loading ? (
                  <><div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Creating...</>
                ) : `Create Account as ${role ? ROLE_LABELS[role] : ''} →`}
              </button>
              <button onClick={() => { setStep(1); setError(''); }} style={{ width: '100%', background: 'transparent', color: '#6B7280', border: 'none', padding: '12px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '4px' }}>← Back</button>
            </div>
          )}

          {/* Forgot Password */}
          {forgotMode && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 16px' }}>Reset Password</h3>
              <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Email</label>
                <input className="input-base" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <button onClick={handleForgotPassword} disabled={!email || loading} className="gradient-btn" style={{ width: '100%', padding: '14px 20px', fontSize: '15px', opacity: (!email || loading) ? 0.5 : 1 }}>
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>
              <button onClick={() => { setForgotMode(false); setError(''); }} style={{ width: '100%', background: 'transparent', color: '#6B7280', border: 'none', padding: '12px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '4px' }}>← Back to Sign In</button>
            </div>
          )}

          {/* Login */}
          {!forgotMode && mode === 'login' && (
            <div>
              <div style={{ marginBottom: '14px', textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Email</label>
                <input className="input-base" type="email" value={email} onChange={e => { setError(''); setEmail(e.target.value); }} placeholder="john@example.com" />
              </div>
              <div style={{ marginBottom: '8px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Password</label>
                  <button onClick={() => setForgotMode(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#1E6B4A', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0 }}>Forgot password?</button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input className="input-base" type={showPw ? 'text' : 'password'} value={password} onChange={e => { setError(''); setPassword(e.target.value); }} placeholder="Enter your password" />
                  <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#6B7280', padding: '4px' }}>{showPw ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <button
                onClick={handleLogin}
                disabled={!email || !password || loading}
                className="gradient-btn"
                style={{
                  width: '100%', padding: '14px 20px', fontSize: '15px',
                  opacity: (!email || !password || loading) ? 0.5 : 1, marginTop: '16px',
                }}
              >
                {loading ? (
                  <><div style={{ width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Signing In...</>
                ) : 'Sign In →'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'center', gap: '20px',
          fontSize: '12px', color: '#9CA3AF',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🔒 Secure</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>✅ Verified</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🇰🇪 Kenya</span>
        </div>
      </div>
    </div>
  );
}
