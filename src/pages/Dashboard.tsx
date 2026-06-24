import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfile } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import { HouseBackgrounds } from '../components/HouseBackgrounds';
import { TYPE_LABELS, TYPE_EMOJIS, LISTING_FEES, PURPOSE_LABELS, PURPOSE_EMOJIS } from '../lib/constants';

interface Property {
  id: string;
  title: string;
  type: string;
  purpose: string;
  price: number;
  sale_price: number | null;
  location: string | null;
  county: string | null;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  expires_at: string | null;
  view_count: number;
  inquiry_count: number;
  created_at: string;
}

interface Inquiry {
  id: string;
  property_id: string;
  tenant_name: string;
  tenant_phone: string | null;
  tenant_email: string | null;
  message: string;
  status: string;
  created_at: string;
  property?: { title: string } | null;
}

interface Payment {
  id: string;
  amount: number;
  amount_paid: number;
  property_type: string | null;
  status: string;
  mpesa_code: string | null;
  created_at: string;
  confirmed_at: string | null;
  property?: { title: string } | null;
}

async function checkExpiredListings(landlordId: string) {
  const now = new Date().toISOString();
  await supabase
    .from('properties')
    .update({ is_active: false })
    .eq('landlord_id', landlordId)
    .eq('is_active', true)
    .lt('expires_at', now);
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'hr';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd';
  return Math.floor(days / 30) + 'mo';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [tab, setTab] = useState<'listings' | 'inquiries' | 'payments'>('listings');
  const [properties, setProperties] = useState<Property[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyModal, setReplyModal] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await checkExpiredListings(profile.id);

      const [propsRes, inqRes, payRes] = await Promise.all([
        supabase.from('properties').select('*').eq('landlord_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('inquiries').select('*, property:properties(title)').eq('landlord_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('listing_payments').select('*, property:properties(title)').eq('landlord_id', profile.id).order('created_at', { ascending: false }),
      ]);

      if (propsRes.data) setProperties(propsRes.data);
      if (inqRes.data) setInquiries(inqRes.data);
      if (payRes.data) setPayments(payRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeListings = properties.filter(p => p.is_active);
  const pendingInquiries = inquiries.filter(i => i.status === 'pending');
  const totalFeesPaid = payments.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + (p.amount_paid || p.amount || 0), 0);
  const expiringSoon = properties.filter(p => {
    if (!p.is_active || !p.expires_at) return false;
    const diff = new Date(p.expires_at).getTime() - Date.now();
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    await supabase.from('properties').delete().eq('id', id);
    loadData();
  };

  const handleToggleActive = async (prop: Property) => {
    if (prop.is_active) {
      await supabase.from('properties').update({ is_active: false }).eq('id', prop.id);
    } else {
      if (prop.expires_at && new Date(prop.expires_at) > new Date()) {
        await supabase.from('properties').update({ is_active: true }).eq('id', prop.id);
      } else {
        navigate('/post-listing');
        return;
      }
    }
    loadData();
  };

  const handleReply = async () => {
    if (!replyModal || !replyText) return;
    await supabase.from('inquiries').update({ status: 'responded' }).eq('id', replyModal.id);
    setReplySent(true);
    setTimeout(() => {
      setReplyModal(null);
      setReplyText('');
      setReplySent(false);
      loadData();
    }, 1500);
  };

  const nameStyle = { fontSize: '22px', fontWeight: 700, color: '#fff', fontFamily: "'DM Serif Display', Georgia, serif", marginBottom: '4px' };

  const firstName = profile?.full_name?.split(' ')[0] || 'User';

  if (!profile) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'Plus Jakarta Sans', sans-serif", position: 'relative' }}>
      <HouseBackgrounds opacity={0.04} density="medium" sky ground />
      <Navbar />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px 16px 100px' }}>
        {/* Welcome Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0A4D2E, #1E6B4A)',
          borderRadius: '16px', padding: '28px 24px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={nameStyle}>
              Welcome back, {firstName} 👋
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
              Manage your listings and track tenant inquiries.
            </div>
          </div>
          <button
            onClick={() => navigate('/post-listing')}
            style={{
              background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '12px', padding: '11px 20px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap',
              backdropFilter: 'blur(4px)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          >+ List Property</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <StatCard icon="🏠" value={activeListings.length} label="Active Listings" color="#1E6B4A" />
          <StatCard icon="💬" value={inquiries.length} label="Total Inquiries" color="#D97706" />
          <StatCard icon="📋" value={properties.length} label="Total Listings" color="#5B21B6" />
          <StatCard icon="💰" value={`KES ${(totalFeesPaid || 0).toLocaleString('en-KE')}`} label="Fees Paid" color="#DB2777" />
        </div>

        {/* Expiry Warning */}
        {expiringSoon.length > 0 && (
          <div style={{
            background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '12px',
            padding: '16px 18px', marginBottom: '20px', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: '13px', color: '#92400E', fontWeight: 500 }}>
              ⚠️ <strong>{expiringSoon.length}</strong> listing(s) expiring within 7 days. Renew now.
            </div>
            <button
              onClick={() => navigate('/post-listing')}
              style={{
                background: '#D97706', color: '#fff', border: 'none', borderRadius: '8px',
                padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap',
              }}
            >Renew Now →</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#F3F4F6', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
          {(['listings', 'inquiries', 'payments'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 16px', border: 'none', borderRadius: '10px',
                background: tab === t ? '#fff' : 'transparent',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                color: tab === t ? '#1E6B4A' : '#6B7280',
                fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize',
                position: 'relative', transition: 'all 0.2s',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {t}
              {t === 'inquiries' && pendingInquiries.length > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '8px',
                  background: '#DC2626', color: '#fff', fontSize: '10px',
                  padding: '1px 6px', borderRadius: '8px', fontWeight: 700,
                }}>{pendingInquiries.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'listings' && (
          <div>
            {properties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏠</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 6px' }}>No listings yet</h3>
                <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px' }}>Post your first listing to start getting tenants</p>
                <button onClick={() => navigate('/post-listing')} className="gradient-btn" style={{ padding: '13px 24px', fontSize: '14px' }}>
                  + List Your First Property
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {properties.map(prop => {
                  const daysLeft = prop.expires_at
                    ? Math.ceil((new Date(prop.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  const statusLabel = !prop.is_active && prop.expires_at && new Date(prop.expires_at) < new Date()
                    ? { label: 'Expired', color: '#DC2626', bg: '#FEE2E2' }
                    : prop.is_active
                      ? { label: 'Active', color: '#065F46', bg: '#D1FAE5' }
                      : { label: 'Inactive', color: '#6B7280', bg: '#F3F4F6' };

                  return (
                    <div key={prop.id} style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      background: '#fff', borderRadius: '14px', padding: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'box-shadow 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
                    >
                      <div style={{
                        width: '72px', height: '56px', borderRadius: '10px',
                        background: '#F3F4F6', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '24px', flexShrink: 0, overflow: 'hidden',
                      }}>
                        {prop.images && prop.images.length > 0
                          ? <img src={prop.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : TYPE_EMOJIS[prop.type] || '🏠'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{prop.title}</span>
                          <span style={{
                            background: statusLabel.bg, color: statusLabel.color,
                            padding: '1px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                          }}>{statusLabel.label}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          📍 {prop.location}{prop.county ? `, ${prop.county}` : ''} · {TYPE_LABELS[prop.type] || prop.type}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '2px' }}>
                          {PURPOSE_EMOJIS[prop.purpose] || '🏠'} {PURPOSE_LABELS[prop.purpose] || prop.purpose}
                        </div>
                        {prop.purpose !== 'sale' && (
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#047857' }}>
                          KES {prop.price.toLocaleString('en-KE')}<span style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280' }}>/mo</span>
                        </div>
                        )}
                        {prop.sale_price && (
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#6366F1' }}>
                          KES {prop.sale_price.toLocaleString('en-KE')}
                        </div>
                        )}
                        {daysLeft !== null && (
                          <div style={{ fontSize: '11px', color: daysLeft <= 7 ? '#DC2626' : '#6B7280' }}>
                            {prop.is_active ? `${daysLeft}d remaining` : ''}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {prop.is_active ? (
                          <button onClick={() => handleToggleActive(prop)} style={{
                            background: '#F3F4F6', color: '#6B7280', border: 'none',
                            borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 600,
                            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}>⏸ Pause</button>
                        ) : (
                          <button onClick={() => handleToggleActive(prop)} style={{
                            background: '#D1FAE5', color: '#065F46', border: 'none',
                            borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 600,
                            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}>🚀 Publish</button>
                        )}
                        <button onClick={() => handleDelete(prop.id)} style={{
                          background: '#FEE2E2', color: '#DC2626', border: 'none',
                          borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 600,
                          cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}>🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'inquiries' && (
          <div>
            {inquiries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 6px' }}>No inquiries yet</h3>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>Inquiries from tenants will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {inquiries.map(inq => (
                  <div key={inq.id} style={{
                    background: '#fff', borderRadius: '14px', padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '16px', fontWeight: 700, flexShrink: 0,
                    }}>
                      {inq.tenant_name?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: inq.status === 'pending' ? 700 : 600, color: '#111827' }}>
                          {inq.tenant_name}
                        </span>
                        <span style={{
                          background: inq.status === 'pending' ? '#FEF3C7' : inq.status === 'responded' ? '#DBEAFE' : '#F3F4F6',
                          color: inq.status === 'pending' ? '#92400E' : inq.status === 'responded' ? '#1D4ED8' : '#6B7280',
                          padding: '1px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                        }}>{inq.status}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        Re: {inq.property?.title || 'Listing'} {inq.tenant_phone ? `· ${inq.tenant_phone}` : ''}
                      </div>
                      <div style={{
                        fontSize: '13px', color: '#374151', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px',
                      }}>
                        {inq.message}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{timeAgo(inq.created_at)}</span>
                        <button
                          onClick={() => { setReplyModal(inq); setReplyText(''); setReplySent(false); }}
                          style={{
                            background: '#F0FDF4', color: '#1E6B4A', border: '1px solid #A7F3D0',
                            borderRadius: '8px', padding: '5px 12px', fontSize: '11px', fontWeight: 600,
                            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#D1FAE5'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#F0FDF4'; }}
                        >Reply</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #0A4D2E, #1E6B4A)',
              borderRadius: '16px', padding: '24px 20px', marginBottom: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Total Fees Paid</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                KES {(totalFeesPaid || 0).toLocaleString('en-KE')}
              </div>
            </div>

            {payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>💰</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 6px' }}>No payments yet</h3>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>Your listing payments will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payments.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#fff', borderRadius: '12px', padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{p.property?.title || TYPE_LABELS[p.property_type || ''] || 'Listing'}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        {p.mpesa_code ? `M-Pesa: ${p.mpesa_code} · ` : ''}{new Date(p.created_at).toLocaleDateString('en-KE')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E6B4A' }}>
                        KES {(p.amount_paid || p.amount || 0).toLocaleString('en-KE')}
                      </div>
                      <span style={{
                        background: p.status === 'confirmed' ? '#D1FAE5' : p.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                        color: p.status === 'confirmed' ? '#065F46' : p.status === 'pending' ? '#92400E' : '#DC2626',
                        padding: '1px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                      }}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {replyModal && (
        <div
          onClick={() => setReplyModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: '520px', padding: '24px',
              animation: 'slideUp 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '4px', background: '#D1D5DB', borderRadius: '2px' }} />
            </div>

            {replySent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px', animation: 'pop 0.5s ease' }}>✅</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Reply sent!</div>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 12px' }}>
                  Reply to {replyModal.tenant_name}
                </h3>

                <div style={{
                  background: '#F9FAFB', borderRadius: '12px', padding: '14px',
                  fontSize: '13px', color: '#6B7280', marginBottom: '16px',
                  border: '1px solid #F3F4F6',
                }}>
                  <div style={{ fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Original message:</div>
                  {replyModal.message}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Your reply</label>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={4}
                    className="input-base"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {replyModal.tenant_phone && (
                  <a href={`tel:${replyModal.tenant_phone}`} style={{
                    display: 'block', textAlign: 'center', color: '#1E6B4A',
                    fontSize: '14px', fontWeight: 600, marginBottom: '12px',
                    textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}>
                    📞 Call Instead
                  </a>
                )}

                <button
                  onClick={handleReply}
                  disabled={!replyText}
                  className="gradient-btn"
                  style={{
                    width: '100%', padding: '13px 20px', fontSize: '15px',
                    cursor: replyText ? 'pointer' : 'not-allowed',
                    opacity: replyText ? 1 : 0.6,
                  }}
                >Send Reply</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '14px', padding: '18px',
      borderTop: `3px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        background: `${color}15`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '20px', marginBottom: '10px',
      }}>{icon}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#6B7280', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: '2px' }}>{label}</div>
    </div>
  );
}
