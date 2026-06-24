import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../hooks/useAuth';
import { TYPE_LABELS, ROLE_LABELS } from '../lib/constants';
import { HouseBackgrounds } from '../components/HouseBackgrounds';

interface PropertyRow {
  id: string;
  title: string;
  type: string;
  price: number;
  is_active: boolean;
  created_at: string;
  landlord_id: string;
  landlord?: { full_name: string | null } | null;
}

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  listing_count?: number;
}

interface PaymentRow {
  id: string;
  amount: number;
  amount_paid: number;
  status: string;
  mpesa_code: string | null;
  created_at: string;
  property_type: string | null;
  landlord_id: string;
  landlord?: { full_name: string | null } | null;
}

const roleBadgeColors: Record<string, { bg: string; color: string }> = {
  landlord: { bg: '#D1FAE5', color: '#065F46' },
  caretaker: { bg: '#FEF3C7', color: '#92400E' },
  agent: { bg: '#EDE9FE', color: '#5B21B6' },
  tenant: { bg: '#DBEAFE', color: '#1D4ED8' },
  admin: { bg: '#F3F4F6', color: '#6B7280' },
  superadmin: { bg: '#FEE2E2', color: '#DC2626' },
};

export default function Admin() {
  const { profile } = useProfile();
  const [sidebar, setSidebar] = useState<'overview' | 'listings' | 'users' | 'revenue'>('overview');
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [listings, setListings] = useState<PropertyRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listSearch, setListSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ action: string; id: string; type: 'listing' | 'user' } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, userRes, payRes] = await Promise.all([
        supabase.from('properties').select('*, landlord:profiles!properties_landlord_id_fkey(full_name)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('listing_payments').select('*, landlord:profiles(full_name)').order('created_at', { ascending: false }),
      ]);
      if (listRes.data) setListings(listRes.data);
      if (userRes.data) setUsers(userRes.data);
      if (payRes.data) setPayments(payRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const activeListings = listings.filter(l => l.is_active).length;
  const totalRevenue = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount_paid || p.amount || 0), 0);
  const monthRevenue = payments.filter(p => {
    if (p.status !== 'confirmed') return false;
    return new Date(p.created_at).getMonth() === new Date().getMonth();
  }).reduce((s, p) => s + (p.amount_paid || p.amount || 0), 0);
  const pendingReview = listings.filter(l => !l.is_active).length;
  const suspendedUsers = users.filter(u => !u.is_active).length;

  const handleToggleListing = async (id: string, active: boolean) => {
    await supabase.from('properties').update({ is_active: !active }).eq('id', id);
    setConfirmModal(null);
    loadData();
  };

  const handleToggleUser = async (id: string, active: boolean) => {
    await supabase.from('profiles').update({ is_active: !active }).eq('id', id);
    setConfirmModal(null);
    loadData();
  };

  const filteredListings = listings.filter(l =>
    l.title?.toLowerCase().includes(listSearch.toLowerCase()) ||
    l.landlord?.full_name?.toLowerCase().includes(listSearch.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.getMonth();
    const amount = payments.filter(p => {
      if (p.status !== 'confirmed') return false;
      const pd = new Date(p.created_at);
      return pd.getMonth() === month && pd.getFullYear() === d.getFullYear();
    }).reduce((s, p) => s + (p.amount_paid || p.amount || 0), 0);
    return { label: months[month], amount };
  });
  const maxMonthly = Math.max(...monthlyData.map(m => m.amount), 1);

  const filteredPayments = payments.slice(0, 50);

  if (!profile || !['admin', 'superadmin'].includes(profile.role || '')) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'Plus Jakarta Sans', sans-serif", position: 'relative' }}>
      <HouseBackgrounds opacity={0.03} density="low" sky ground={false} />
      <button
        onClick={() => setMobileSidebar(!mobileSidebar)}
        className="admin-mobile-toggle"
        aria-label="Toggle sidebar"
        style={{
          position: 'fixed', top: '12px', left: '12px', zIndex: 200,
          width: '40px', height: '40px', borderRadius: '10px',
          background: '#fff', border: '1px solid #E5E7EB',
          fontSize: '20px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >{mobileSidebar ? '✕' : '☰'}</button>

      {mobileSidebar && (
        <div onClick={() => setMobileSidebar(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99,
          backdropFilter: 'blur(2px)',
        }} />
      )}

      <div className="admin-sidebar-desktop" style={{
        width: '220px', height: '100vh', position: 'fixed', left: 0, top: 0,
        background: '#fff', borderRight: '1px solid #E5E7EB', padding: '20px 0',
        display: 'flex', flexDirection: 'column', zIndex: 100,
      }}>
        <SidebarContent sidebar={sidebar} setSidebar={setSidebar} setMobileSidebar={setMobileSidebar} profile={profile} />
      </div>

      {mobileSidebar && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '260px', height: '100vh',
          background: '#fff', zIndex: 100, padding: '20px 0',
          animation: 'slideInLeft 0.2s ease',
          boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
        }}>
          <SidebarContent sidebar={sidebar} setSidebar={setSidebar} setMobileSidebar={setMobileSidebar} profile={profile} />
        </div>
      )}

      <div style={{ marginLeft: '220px', padding: '24px' }} className="admin-main-content">
        {sidebar === 'overview' && (
          <OverviewPage
            totalRevenue={totalRevenue}
            activeListings={activeListings}
            users={users}
            monthRevenue={monthRevenue}
            pendingReview={pendingReview}
            suspendedUsers={suspendedUsers}
            monthlyData={monthlyData}
            maxMonthly={maxMonthly}
            payments={payments}
          />
        )}

        {sidebar === 'listings' && (
          <ListingsPage
            listSearch={listSearch}
            setListSearch={setListSearch}
            filteredListings={filteredListings}
            setConfirmModal={setConfirmModal}
          />
        )}

        {sidebar === 'users' && (
          <UsersPage
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            filteredUsers={filteredUsers}
            listings={listings}
            setConfirmModal={setConfirmModal}
          />
        )}

        {sidebar === 'revenue' && (
          <RevenuePage
            totalRevenue={totalRevenue}
            monthRevenue={monthRevenue}
            payments={payments}
            filteredPayments={filteredPayments}
            setConfirmModal={setConfirmModal}
          />
        )}
      </div>

      {confirmModal && (
        <ConfirmModal
          action={confirmModal.action}
          type={confirmModal.type}
          onConfirm={() => {
            if (confirmModal.type === 'listing') {
              const listing = listings.find(l => l.id === confirmModal.id);
              if (listing) handleToggleListing(confirmModal.id, listing.is_active);
            } else {
              const usr = users.find(u => u.id === confirmModal.id);
              if (usr) handleToggleUser(confirmModal.id, usr.is_active);
            }
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Sidebar ─── */
function SidebarContent({ sidebar, setSidebar, setMobileSidebar, profile }: {
  sidebar: string; setSidebar: (v: any) => void; setMobileSidebar: (v: boolean) => void;
  profile: any;
}) {
  const items = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'listings', icon: '🏠', label: 'Listings' },
    { key: 'users', icon: '👥', label: 'Users' },
    { key: 'revenue', icon: '💰', label: 'Revenue' },
  ];

  return (
    <>
      <div style={{ padding: '0 16px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '16px',
            fontFamily: "'DM Serif Display', Georgia, serif",
          }}>N</div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif" }}>NestList</span>
        </div>
        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px', marginLeft: '42px' }}>Admin Panel</div>
      </div>

      {items.map(s => (
        <button
          key={s.key}
          onClick={() => { setSidebar(s.key); setMobileSidebar(false); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
            padding: '12px 16px', border: 'none',
            background: sidebar === s.key ? '#F0FDF4' : 'transparent',
            color: sidebar === s.key ? '#1E6B4A' : '#6B7280',
            fontSize: '14px', fontWeight: sidebar === s.key ? 700 : 500,
            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'left',
            borderLeft: sidebar === s.key ? '3px solid #1E6B4A' : '3px solid transparent',
            borderRadius: '0 8px 8px 0', marginBottom: '2px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (sidebar !== s.key) e.currentTarget.style.background = '#F9FAFB'; }}
          onMouseLeave={e => { if (sidebar !== s.key) e.currentTarget.style.background = 'transparent'; }}
        >
          <span>{s.icon}</span>
          <span>{s.label}</span>
        </button>
      ))}

      <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '12px', fontWeight: 700,
        }}>
          {profile?.full_name?.[0] || 'A'}
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{profile?.full_name || 'Admin'}</div>
          <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'capitalize' }}>{profile?.role || 'Admin'}</div>
        </div>
      </div>
    </>
  );
}

/* ─── StatBox ─── */
function StatBox({ icon, value, label, color, trend }: {
  icon: string; value: string | number; label: string; color: string; trend?: { up: boolean; pct: string }
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: '14px', padding: '20px',
      border: '1px solid #E5E7EB', transition: 'box-shadow 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: `${color}15`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '22px',
        }}>{icon}</div>
        {trend && (
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '8px',
            background: trend.up ? '#D1FAE5' : '#FEE2E2',
            color: trend.up ? '#065F46' : '#DC2626',
          }}>
            {trend.up ? '↑' : '↓'} {trend.pct}
          </span>
        )}
      </div>
      <div style={{ fontSize: '26px', fontWeight: 700, color, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#6B7280' }}>{label}</div>
    </div>
  );
}

/* ─── Overview Page ─── */
function OverviewPage({ totalRevenue, activeListings, users, monthRevenue, pendingReview, suspendedUsers, monthlyData, maxMonthly, payments }: any) {
  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 20px' }}>
        📊 Overview
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatBox icon="💰" value={`KES ${totalRevenue.toLocaleString('en-KE')}`} label="Total Revenue" color="#7C3AED" trend={{ up: true, pct: '12%' }} />
        <StatBox icon="🏠" value={activeListings} label="Active Listings" color="#1E6B4A" trend={{ up: true, pct: '8%' }} />
        <StatBox icon="👥" value={users.length} label="Total Users" color="#2563EB" trend={{ up: true, pct: '5%' }} />
        <StatBox icon="📈" value={`KES ${monthRevenue.toLocaleString('en-KE')}`} label="This Month" color="#D97706" />
        <StatBox icon="⏳" value={pendingReview} label="Pending Review" color="#F59E0B" />
        <StatBox icon="🚫" value={suspendedUsers} label="Suspended" color="#DC2626" />
      </div>

      {/* Bar Chart */}
      <div className="card-base" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Monthly Revenue</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '160px' }}>
          {monthlyData.map((m: any, i: number) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', fontWeight: 600 }}>
                KES {m.amount.toLocaleString('en-KE')}
              </div>
              <div style={{
                width: '100%', maxWidth: '48px', borderRadius: '6px 6px 0 0',
                background: 'linear-gradient(180deg, #1E6B4A, #34D399)',
                height: `${(m.amount / maxMonthly) * 130}px`,
                minHeight: '4px', transition: 'height 0.5s',
              }} />
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', fontWeight: 500 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="card-base" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Recent Payments</h3>
        {payments.slice(0, 5).map((p: any) => (
          <div key={p.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: '1px solid #F3F4F6',
          }}>
            <div style={{ fontSize: '13px', color: '#374151' }}>
              <strong>{p.landlord?.full_name || 'Unknown'}</strong> · {TYPE_LABELS[p.property_type || ''] || p.property_type || 'Listing'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E6B4A' }}>
                KES {(p.amount_paid || p.amount || 0).toLocaleString('en-KE')}
              </span>
              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                {new Date(p.created_at).toLocaleDateString('en-KE')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Listings Page ─── */
function ListingsPage({ listSearch, setListSearch, filteredListings, setConfirmModal }: any) {
  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 16px' }}>
        🏠 Listings
      </h1>
      <input
        className="input-base"
        style={{ marginBottom: '16px' }}
        value={listSearch}
        onChange={e => setListSearch(e.target.value)}
        placeholder="Filter by title or landlord name..."
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB', background: '#F9FAFB' }}>
              {['Property', 'Landlord', 'Type', 'Price', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '12px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredListings.map((l: any) => (
              <tr key={l.id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>{l.title}</td>
                <td style={{ padding: '12px 14px', color: '#6B7280' }}>{l.landlord?.full_name || 'Unknown'}</td>
                <td style={{ padding: '12px 14px', color: '#6B7280' }}>{TYPE_LABELS[l.type] || l.type}</td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1E6B4A' }}>KES {l.price.toLocaleString('en-KE')}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{
                    background: l.is_active ? '#D1FAE5' : '#FEE2E2',
                    color: l.is_active ? '#065F46' : '#DC2626',
                    padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                  }}>{l.is_active ? 'Active' : 'Suspended'}</span>
                </td>
                <td style={{ padding: '12px 14px', color: '#9CA3AF', fontSize: '12px' }}>{new Date(l.created_at).toLocaleDateString('en-KE')}</td>
                <td style={{ padding: '12px 14px' }}>
                  <button
                    onClick={() => setConfirmModal({ action: l.is_active ? 'suspend' : 'restore', id: l.id, type: 'listing' })}
                    style={{
                      background: l.is_active ? '#FEE2E2' : '#D1FAE5',
                      color: l.is_active ? '#DC2626' : '#065F46',
                      border: 'none', borderRadius: '8px', padding: '5px 12px',
                      fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >{l.is_active ? '🚫 Suspend' : '✅ Restore'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Users Page ─── */
function UsersPage({ userSearch, setUserSearch, filteredUsers, listings, setConfirmModal }: any) {
  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 16px' }}>
        👥 Users
      </h1>
      <input
        className="input-base"
        style={{ marginBottom: '16px' }}
        value={userSearch}
        onChange={e => setUserSearch(e.target.value)}
        placeholder="Filter by name or email..."
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB', background: '#F9FAFB' }}>
              {['User', 'Role', 'Email', 'Listings', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '12px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u: any) => {
              const bc = roleBadgeColors[u.role] || { bg: '#F3F4F6', color: '#6B7280' };
              const listCount = listings.filter((l: any) => l.landlord_id === u.id).length;
              return (
                <tr key={u.id} style={{
                  borderBottom: '1px solid #F3F4F6',
                  borderLeft: u.is_active ? 'none' : '3px solid #DC2626',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      background: bc.bg, color: bc.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700,
                    }}>
                      {u.full_name?.[0] || '?'}
                    </div>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{u.full_name || 'Unknown'}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      background: bc.bg, color: bc.color,
                      padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                    }}>{ROLE_LABELS[u.role] || u.role}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#6B7280' }}>{u.email || '-'}</td>
                  <td style={{ padding: '12px 14px', color: '#6B7280' }}>{listCount}</td>
                  <td style={{ padding: '12px 14px', color: '#9CA3AF', fontSize: '12px' }}>{new Date(u.created_at).toLocaleDateString('en-KE')}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      onClick={() => setConfirmModal({ action: u.is_active ? 'suspend' : 'restore', id: u.id, type: 'user' })}
                      style={{
                        background: u.is_active ? '#FEE2E2' : '#D1FAE5',
                        color: u.is_active ? '#DC2626' : '#065F46',
                        border: 'none', borderRadius: '8px', padding: '5px 12px',
                        fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >{u.is_active ? 'Suspend' : 'Reinstate'}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Revenue Page ─── */
function RevenuePage({ totalRevenue, monthRevenue, payments, filteredPayments }: any) {
  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 16px' }}>
        💰 Revenue
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <StatBox icon="💰" value={`KES ${totalRevenue.toLocaleString('en-KE')}`} label="Total Revenue" color="#7C3AED" />
        <StatBox icon="📈" value={`KES ${monthRevenue.toLocaleString('en-KE')}`} label="This Month" color="#D97706" />
        <StatBox icon="📋" value={payments.length} label="Total Payments" color="#2563EB" />
        <StatBox icon="❌" value={payments.filter((p: any) => p.status === 'failed').length} label="Failed" color="#DC2626" />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB', background: '#F9FAFB' }}>
              {['Landlord', 'Type', 'Amount', 'M-Pesa Code', 'Date', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '12px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>{p.landlord?.full_name || 'Unknown'}</td>
                <td style={{ padding: '12px 14px', color: '#6B7280' }}>{TYPE_LABELS[p.property_type || ''] || p.property_type || '-'}</td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1E6B4A' }}>KES {(p.amount_paid || p.amount || 0).toLocaleString('en-KE')}</td>
                <td style={{ padding: '12px 14px', color: '#6B7280', fontSize: '12px' }}>{p.mpesa_code || '-'}</td>
                <td style={{ padding: '12px 14px', color: '#9CA3AF', fontSize: '12px' }}>{new Date(p.created_at).toLocaleDateString('en-KE')}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{
                    background: p.status === 'confirmed' ? '#D1FAE5' : p.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                    color: p.status === 'confirmed' ? '#065F46' : p.status === 'pending' ? '#92400E' : '#DC2626',
                    padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                  }}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Confirm Modal ─── */
function ConfirmModal({ action, type, onConfirm, onCancel }: {
  action: string; type: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: '24px', padding: '36px 24px',
        maxWidth: '400px', width: 'calc(100% - 32px)', textAlign: 'center',
        animation: 'scaleIn 0.25s ease',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {action === 'suspend' ? '🚫' : '✅'}
        </div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", marginBottom: '8px' }}>
          {action === 'suspend' ? 'Suspend' : 'Restore'} {type}
        </div>
        <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
          Are you sure you want to {action} this {type}?
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, background: '#F3F4F6', color: '#374151', border: 'none',
              borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: action === 'suspend' ? '#DC2626' : '#1E6B4A',
              color: '#fff', border: 'none', borderRadius: '12px', padding: '12px',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >Confirm</button>
        </div>
      </div>
    </div>
  );
}
