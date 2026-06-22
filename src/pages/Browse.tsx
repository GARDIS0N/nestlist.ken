import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TYPE_LABELS, TYPE_EMOJIS, LISTING_FEES, API_URL, KENYAN_COUNTIES, NAIROBI_ESTATES, AMENITIES } from '../lib/constants';
import { useUser } from '@clerk/clerk-react';
import { useProfile } from '../hooks/useAuth';
import Navbar from '../components/Navbar';

interface Property {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  county: string | null;
  type: string;
  price: number;
  amenities: string[];
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  expires_at: string | null;
  view_count: number;
  inquiry_count: number;
  created_at: string;
  landlord_id: string;
  landlord?: { full_name: string | null; phone: string | null; avatar_url: string | null } | null;
}

const typeKeys = ['all', 'single_room', 'bedsitter', 'studio', '1br', '2br', '3br', '4br', '5br_plus'];
const typeDisplay: Record<string, string> = { all: 'All', single_room: 'Single Room', bedsitter: 'Bedsitter', studio: 'Studio', '1br': '1BR', '2br': '2BR', '3br': '3BR', '4br': '4BR', '5br_plus': '5BR+' };

async function checkExpiredListings() {
  const now = new Date().toISOString();
  await supabase
    .from('properties')
    .update({ is_active: false })
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
  return days + 'd';
}

function isNew(date: string) {
  return (Date.now() - new Date(date).getTime()) < 7 * 24 * 60 * 60 * 1000;
}

function SkeletonCard() {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        height: '200px',
        background: 'linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }} />
      <div style={{ padding: '16px' }}>
        <div style={{ height: '14px', width: '60%', background: '#E5E7EB', borderRadius: '4px', marginBottom: '10px' }} />
        <div style={{ height: '18px', width: '80%', background: '#E5E7EB', borderRadius: '4px', marginBottom: '8px' }} />
        <div style={{ height: '14px', width: '40%', background: '#E5E7EB', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

const PHONE_REGEX = /^(\+?254|0)?(7[0-9]{8})$/;

export default function Browse() {
  const { isSignedIn, user } = useUser();
  const { profile } = useProfile();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [countyFilter, setCountyFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState(200000);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [offline, setOffline] = useState(!navigator.onLine);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    checkExpiredListings();
    loadProperties();
  }, []);

  useEffect(() => {
    if (isSignedIn && profile?.role === 'tenant') {
      loadSaved();
    }
  }, [isSignedIn, profile]);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    try {
      const cached = localStorage.getItem('nestlist_properties');
      const cachedTime = localStorage.getItem('nestlist_properties_time');
      if (cached && cachedTime && Date.now() - parseInt(cachedTime) < 60000) {
        setProperties(JSON.parse(cached));
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('properties')
        .select('*, landlord:profiles!properties_landlord_id_fkey(full_name, phone, avatar_url)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setProperties(data);
        localStorage.setItem('nestlist_properties', JSON.stringify(data));
        localStorage.setItem('nestlist_properties_time', Date.now().toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSaved = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('saved_properties')
      .select('property_id')
      .eq('tenant_id', user.id);
    if (data) setSavedIds(new Set(data.map(s => s.property_id)));
  };

  const toggleSave = async (propertyId: string) => {
    if (!isSignedIn || !user) return;
    if (savedIds.has(propertyId)) {
      await supabase.from('saved_properties').delete().eq('tenant_id', user.id).eq('property_id', propertyId);
      setSavedIds(prev => { const n = new Set(prev); n.delete(propertyId); return n; });
    } else {
      await supabase.from('saved_properties').insert({ tenant_id: user.id, property_id: propertyId });
      setSavedIds(prev => new Set(prev).add(propertyId));
    }
  };

  const filtered = properties.filter(p => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (countyFilter && p.county !== countyFilter) return false;
    if (p.price > maxPrice) return false;
    if (search) {
      const q = search.toLowerCase();
      const match = (p.title?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.county?.toLowerCase().includes(q) ||
        NAIROBI_ESTATES.some(e => e.toLowerCase().includes(q)) ||
        KENYAN_COUNTIES.some(c => c.toLowerCase().includes(q)));
      if (!match) return false;
    }
    return true;
  });

  const hasFilters = typeFilter !== 'all' || countyFilter !== '' || maxPrice < 200000 || search !== '';

  const openDetail = (prop: Property) => {
    setSelectedProperty(prop);
    setInquiryForm({ name: profile?.full_name || '', phone: profile?.phone || '', email: user?.primaryEmailAddress?.emailAddress || '', message: '' });
    setInquirySent(false);
    setShowModal(true);
  };

  const sendInquiry = async () => {
    if (!selectedProperty || !inquiryForm.name || !inquiryForm.message) return;
    setInquiryLoading(true);
    try {
      const { error } = await supabase.from('inquiries').insert({
        property_id: selectedProperty.id,
        tenant_id: user?.id || null,
        landlord_id: selectedProperty.landlord_id,
        message: inquiryForm.message,
        tenant_name: inquiryForm.name,
        tenant_phone: inquiryForm.phone,
        tenant_email: inquiryForm.email,
        status: 'pending',
      });
      if (error) throw error;
      setInquirySent(true);

      try {
        await fetch(API_URL + '/api/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: selectedProperty.landlord?.phone || '',
            message: `NestList: ${inquiryForm.name} is interested in ${selectedProperty.title}. Phone: ${inquiryForm.phone}. Reply at nestlist.co.ke`
          }),
        });
      } catch (e) {}
    } catch (e) {
      console.error(e);
    } finally {
      setInquiryLoading(false);
    }
  };

  const getSearchSuggestions = () => {
    if (search.length < 2) return [];
    const q = search.toLowerCase();
    const matches: string[] = [];
    for (const e of NAIROBI_ESTATES) if (e.toLowerCase().includes(q)) matches.push(e);
    for (const c of KENYAN_COUNTIES) if (c.toLowerCase().includes(q) && !matches.includes(c)) matches.push(c);
    return matches.slice(0, 6);
  };
  const suggestions = getSearchSuggestions();

  const heroStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0A4D2E, #1E6B4A)',
    padding: '60px 24px',
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'Plus Jakarta Sans',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Plus Jakarta Sans' }}>
      <Navbar />

      {offline && (
        <div style={{
          background: '#FEF3C7', color: '#92400E', textAlign: 'center', padding: '8px 16px',
          fontSize: '13px', fontWeight: 600,
        }}>
          ⚠️ You're offline. Showing cached data.
        </div>
      )}

      {/* Hero */}
      <div style={heroStyle}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.12)',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          marginBottom: '16px',
        }}>
          🇰🇪 Kenya's Premium Rental Platform
        </div>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 700,
          fontFamily: "'DM Serif Display', Georgia, serif",
          margin: '0 0 4px',
          lineHeight: 1.15,
        }}>
          Find Your Dream Home
        </h1>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 700,
          fontFamily: "'DM Serif Display', Georgia, serif",
          margin: '0 0 20px',
          background: 'linear-gradient(135deg, #86EFAC, #34D399)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Across Kenya
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', maxWidth: '400px', margin: '0 auto 24px' }}>
          Browse verified listings from trusted landlords — direct contact, no middlemen.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
          {['🏠 1,200+ Listings', '✅ Verified Landlords', '⚡ Instant Contact'].map((chip, i) => (
            <div key={i} style={{
              padding: '6px 14px', borderRadius: '20px',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              fontSize: '12px', fontWeight: 500,
            }}>{chip}</div>
          ))}
        </div>

        <div style={{ maxWidth: '520px', margin: '0 auto', position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', overflow: 'hidden',
          }}>
            <span style={{ padding: '0 12px', fontSize: '16px' }}>🔍</span>
            <input
              ref={searchRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              placeholder="Search by location, estate, or area…"
              style={{
                flex: 1, border: 'none', outline: 'none', padding: '14px 8px',
                fontSize: '15px', fontFamily: 'Plus Jakarta Sans', color: '#111827',
              }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setShowSearch(false); }} style={{ background: 'none', border: 'none', padding: '0 12px', cursor: 'pointer', fontSize: '16px', color: '#9CA3AF' }}>✕</button>
            )}
          </div>

          {showSearch && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
              background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              zIndex: 100, overflow: 'hidden', textAlign: 'left',
            }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setSearch(s); setShowSearch(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                    padding: '12px 16px', border: 'none', background: 'none',
                    fontSize: '14px', color: '#111827', cursor: 'pointer',
                    fontFamily: 'Plus Jakarta Sans',
                    borderBottom: i < suggestions.length - 1 ? '1px solid #F3F4F6' : 'none',
                  }}
                >
                  <span>📍</span> {s}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => {
            if (search && suggestions.length > 0) {
              setSearch(suggestions[0]);
              setShowSearch(false);
            }
          }} style={{
            marginTop: '12px',
            background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
            color: '#fff', border: 'none', borderRadius: '12px',
            padding: '13px 32px', fontSize: '15px', fontWeight: 700,
            fontFamily: 'Plus Jakarta Sans', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(30,107,74,0.3)',
          }}>Search</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '20px', paddingBottom: '4px', justifyContent: 'center' }}>
          {['Kilimani', 'Westlands', 'Karen', 'Kasarani', 'Mombasa', 'Nakuru', 'Lavington', 'Ngong Road'].map((chip, i) => (
            <button
              key={i}
              onClick={() => { setSearch(chip); setShowSearch(false); }}
              style={{
                padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap',
                background: search === chip ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans',
              }}
            >{chip}</button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px', position: 'sticky', top: '64px', zIndex: 50,
      }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '12px', paddingBottom: '4px' }}>
          {typeKeys.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '7px 16px', borderRadius: '20px', whiteSpace: 'nowrap',
                background: typeFilter === t ? '#1E6B4A' : '#F3F4F6',
                color: typeFilter === t ? '#fff' : '#6B7280',
                border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans',
              }}
            >{typeDisplay[t]}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={countyFilter}
            onChange={e => setCountyFilter(e.target.value)}
            style={{
              padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #E5E7EB',
              fontSize: '13px', fontFamily: 'Plus Jakarta Sans', color: '#111827',
              background: '#fff', outline: 'none', minWidth: '120px',
            }}
          >
            <option value="">All Counties</option>
            {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div style={{ flex: 1, minWidth: '160px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px', fontWeight: 500 }}>
              Max Rent: KES {maxPrice.toLocaleString('en-KE')}
            </div>
            <input
              type="range"
              min={2000}
              max={200000}
              step={1000}
              value={maxPrice}
              onChange={e => setMaxPrice(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#1E6B4A' }}
            />
          </div>

          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {filtered.length} found
          </span>

          {hasFilters && (
            <button
              onClick={() => { setTypeFilter('all'); setCountyFilter(''); setMaxPrice(200000); setSearch(''); }}
              style={{
                background: 'none', border: 'none', color: '#DC2626', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans',
                padding: '4px 8px',
              }}
            >Clear all</button>
          )}
        </div>
      </div>

      {/* Listing Grid */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 16px 100px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 6px' }}>No properties found</h3>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px' }}>Try adjusting your filters</p>
            <button
              onClick={() => { setTypeFilter('all'); setCountyFilter(''); setMaxPrice(200000); setSearch(''); }}
              style={{
                background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
                color: '#fff', border: 'none', borderRadius: '12px',
                padding: '13px 24px', fontSize: '14px', fontWeight: 700,
                fontFamily: 'Plus Jakarta Sans', cursor: 'pointer',
              }}
            >Clear Filters</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filtered.map(prop => (
              <ListingCard
                key={prop.id}
                property={prop}
                isSaved={savedIds.has(prop.id)}
                onSave={() => toggleSave(prop.id)}
                onClick={() => openDetail(prop)}
                showSave={isSignedIn && profile?.role === 'tenant'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Listing Detail Modal */}
      {showModal && selectedProperty && (
        <div
          onClick={() => setShowModal(false)}
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
              width: '100%', maxWidth: '520px', maxHeight: '90vh',
              overflow: 'auto', animation: 'slideUp 0.3s ease',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
              <div style={{ width: '40px', height: '4px', background: '#D1D5DB', borderRadius: '2px' }} />
            </div>

            <div style={{ position: 'relative' }}>
              {selectedProperty.images && selectedProperty.images.length > 0 ? (
                <img src={selectedProperty.images[0]} alt="" style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '240px', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
                  {TYPE_EMOJIS[selectedProperty.type] || '🏠'}
                </div>
              )}
              <button onClick={() => setShowModal(false)} style={{
                position: 'absolute', top: '12px', right: '12px',
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none',
                fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  display: 'inline-block', background: '#D1FAE5', color: '#065F46',
                  padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  fontFamily: 'Plus Jakarta Sans',
                }}>{TYPE_LABELS[selectedProperty.type] || selectedProperty.type}</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1E6B4A', fontFamily: 'Plus Jakarta Sans', marginBottom: '4px' }}>
                KES {selectedProperty.price.toLocaleString('en-KE')}<span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>/mo</span>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 4px' }}>
                {selectedProperty.title}
              </h2>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
                📍 {selectedProperty.location}{selectedProperty.county ? `, ${selectedProperty.county}` : ''}
              </div>

              {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {selectedProperty.amenities.slice(0, 8).map((a, i) => (
                      <div key={i} style={{ fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#1E6B4A' }}>✓</span> {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProperty.description && (
                <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.5, marginBottom: '16px' }}>
                  {selectedProperty.description}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '12px 0', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '14px', fontWeight: 700, fontFamily: 'Plus Jakarta Sans',
                }}>
                  {selectedProperty.landlord?.full_name?.[0] || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{selectedProperty.landlord?.full_name || 'Landlord'} ✅</div>
                </div>
                {selectedProperty.landlord?.phone && (
                  <a href={`tel:${selectedProperty.landlord.phone}`} style={{
                    background: '#F0FDF4', color: '#1E6B4A', border: '1px solid #A7F3D0',
                    borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 600,
                    textDecoration: 'none', fontFamily: 'Plus Jakarta Sans',
                  }}>📞 Call</a>
                )}
              </div>

              {inquirySent ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", marginBottom: '4px' }}>Inquiry Sent!</div>
                  <div style={{ fontSize: '14px', color: '#6B7280' }}>The landlord will contact you soon.</div>
                </div>
              ) : (
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 12px' }}>Send Inquiry</h4>
                  <div style={{ marginBottom: '10px' }}>
                    <input value={inquiryForm.name} onChange={e => setInquiryForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" style={{
                      width: '100%', border: '1.5px solid #E5E7EB', borderRadius: '10px',
                      padding: '11px 14px', fontSize: '16px', fontFamily: 'Plus Jakarta Sans',
                      color: '#111827', outline: 'none', boxSizing: 'border-box',
                    }} />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <input value={inquiryForm.phone} onChange={e => setInquiryForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone (+254 format)" style={{
                      width: '100%', border: '1.5px solid #E5E7EB', borderRadius: '10px',
                      padding: '11px 14px', fontSize: '16px', fontFamily: 'Plus Jakarta Sans',
                      color: '#111827', outline: 'none', boxSizing: 'border-box',
                    }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <textarea value={inquiryForm.message} onChange={e => setInquiryForm(p => ({ ...p, message: e.target.value }))} placeholder="Your message to the landlord..." rows={3} style={{
                      width: '100%', border: '1.5px solid #E5E7EB', borderRadius: '10px',
                      padding: '11px 14px', fontSize: '16px', fontFamily: 'Plus Jakarta Sans',
                      color: '#111827', outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                    }} />
                  </div>
                  <button
                    onClick={sendInquiry}
                    disabled={!inquiryForm.name || !inquiryForm.message || inquiryLoading}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
                      color: '#fff', border: 'none', borderRadius: '12px',
                      padding: '13px 20px', fontSize: '15px', fontWeight: 700,
                      fontFamily: 'Plus Jakarta Sans', cursor: inquiryLoading ? 'not-allowed' : 'pointer',
                      opacity: (!inquiryForm.name || !inquiryForm.message) ? 0.6 : 1,
                      boxShadow: '0 4px 16px rgba(30,107,74,0.3)',
                    }}
                  >
                    {inquiryLoading ? 'Sending...' : '📩 Send Inquiry'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ListingCard({ property: prop, isSaved, onSave, onClick, showSave }: {
  property: Property;
  isSaved: boolean;
  onSave: () => void;
  onClick: () => void;
  showSave: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ position: 'relative', height: '200px', background: '#F3F4F6' }}>
        {prop.images && prop.images.length > 0 ? (
          <img src={prop.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '48px' }}>
            {TYPE_EMOJIS[prop.type] || '🏠'}
          </div>
        )}
        {isNew(prop.created_at) && (
          <span style={{
            position: 'absolute', top: '12px', left: '12px',
            background: '#1E6B4A', color: '#fff', padding: '3px 10px',
            borderRadius: '20px', fontSize: '11px', fontWeight: 700,
            fontFamily: 'Plus Jakarta Sans',
          }}>NEW</span>
        )}
        {showSave && (
          <button
            onClick={e => { e.stopPropagation(); onSave(); }}
            style={{
              position: 'absolute', top: '12px', right: '12px',
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {isSaved ? '❤️' : '🤍'}
          </button>
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          padding: '20px 14px 10px',
        }}>
          <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700, fontFamily: 'Plus Jakarta Sans' }}>
            KES {prop.price.toLocaleString('en-KE')}<span style={{ fontSize: '12px', fontWeight: 500 }}>/mo</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span style={{
            display: 'inline-block', background: '#D1FAE5', color: '#065F46',
            padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
            fontFamily: 'Plus Jakarta Sans',
          }}>{TYPE_LABELS[prop.type] || prop.type}</span>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '4px', fontFamily: 'Plus Jakarta Sans' }}>
          {prop.title}
        </div>
        <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '10px' }}>
          📍 {prop.location}{prop.county ? `, ${prop.county}` : ''}
        </div>

        {prop.amenities && prop.amenities.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {prop.amenities.slice(0, 3).map((a, i) => (
              <span key={i} style={{
                background: '#F3F4F6', color: '#6B7280', padding: '2px 8px',
                borderRadius: '12px', fontSize: '10px', fontWeight: 500,
              }}>{a}</span>
            ))}
            {prop.amenities.length > 3 && (
              <span style={{
                background: '#F3F4F6', color: '#6B7280', padding: '2px 8px',
                borderRadius: '12px', fontSize: '10px', fontWeight: 500,
              }}>+{prop.amenities.length - 3} more</span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '10px', fontWeight: 700,
          }}>
            {prop.landlord?.full_name?.[0] || '?'}
          </div>
          <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>
            {prop.landlord?.full_name || 'Landlord'} ✅
          </span>
        </div>

        <div style={{ color: '#1E6B4A', fontSize: '13px', fontWeight: 600 }}>View Details →</div>
      </div>
    </div>
  );
}
