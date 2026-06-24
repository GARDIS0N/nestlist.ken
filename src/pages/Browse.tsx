import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TYPE_LABELS, TYPE_EMOJIS, LISTING_FEES, API_URL, KENYAN_COUNTIES, NAIROBI_ESTATES, AMENITIES, PURPOSE_LABELS, PURPOSE_EMOJIS } from '../lib/constants';
import { useUser } from '@clerk/clerk-react';
import { useProfile } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import { HouseBackgrounds } from '../components/HouseBackgrounds';

interface Property {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  county: string | null;
  type: string;
  purpose: string;
  price: number;
  sale_price: number | null;
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

const typeKeys = ['all', 'single_room', 'bedsitter', 'studio', '1br', '2br', '3br', '4br', '5br_plus', 'land', 'commercial'];
const typeDisplay: Record<string, string> = {
  all: 'All', single_room: 'Single Room', bedsitter: 'Bedsitter', studio: 'Studio',
  '1br': '1BR', '2br': '2BR', '3br': '3BR', '4br': '4BR', '5br_plus': '5BR+', land: 'Land', commercial: 'Commercial'
};

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
  if (days < 30) return days + 'd';
  return Math.floor(days / 30) + 'mo';
}

function isNew(date: string) {
  return (Date.now() - new Date(date).getTime()) < 7 * 24 * 60 * 60 * 1000;
}

function SkeletonCard() {
  return (
    <div style={{
      background: '#fff', borderRadius: '16px', overflow: 'hidden',
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
  const [purposeFilter, setPurposeFilter] = useState<'all' | 'rent' | 'sale'>('all');
  const [countyFilter, setCountyFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState(200000);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [inquiryForm, setInquiryForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [offline, setOffline] = useState(!navigator.onLine);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null!);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const setSearchImmediate = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearch(value);
    setDebouncedSearch(value);
  };

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
    if (isSignedIn && profile?.role === 'tenant') loadSaved();
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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadSaved = async () => {
    if (!user) return;
    const { data } = await supabase.from('saved_properties').select('property_id').eq('tenant_id', user.id);
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
    if (purposeFilter !== 'all' && p.purpose !== purposeFilter && p.purpose !== 'both') return false;
    if (purposeFilter === 'sale' && !p.sale_price) return false;
    if (countyFilter && p.county !== countyFilter) return false;
    if (purposeFilter !== 'sale' && p.price > maxPrice) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      const match = (p.title?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.county?.toLowerCase().includes(q) ||
        NAIROBI_ESTATES.some(e => e.toLowerCase().includes(q)) ||
        KENYAN_COUNTIES.some(c => c.toLowerCase().includes(q)));
      if (!match) return false;
    }
    return true;
  });

  const hasFilters = typeFilter !== 'all' || purposeFilter !== 'all' || countyFilter !== '' || maxPrice < 200000 || search !== '';

  const openDetail = (prop: Property) => {
    setSelectedProperty(prop);
    setCurrentImageIdx(0);
    setInquiryForm({
      name: profile?.full_name || '',
      phone: profile?.phone || '',
      email: user?.primaryEmailAddress?.emailAddress || '',
      message: ''
    });
    setInquirySent(false);
    setShowModal(true);
  };

  const sendInquiry = async () => {
    if (!selectedProperty || !inquiryForm.name || !inquiryForm.message) return;
    setInquiryLoading(true);
    try {
      const { error } = await supabase.from('inquiries').insert({
        property_id: selectedProperty.id, tenant_id: user?.id || null,
        landlord_id: selectedProperty.landlord_id, message: inquiryForm.message,
        tenant_name: inquiryForm.name, tenant_phone: inquiryForm.phone,
        tenant_email: inquiryForm.email, status: 'pending',
      });
      if (error) throw error;
      setInquirySent(true);
      try {
        await fetch(API_URL + '/api/sms', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: selectedProperty.landlord?.phone || '',
            message: `NestList: ${inquiryForm.name} is interested in ${selectedProperty.title}. Phone: ${inquiryForm.phone}. Reply at nestlist.co.ke`
          }),
        });
      } catch (e) {}
    } catch (e) { console.error(e); }
    finally { setInquiryLoading(false); }
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

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'Plus Jakarta Sans', sans-serif", position: 'relative' }}>
      <HouseBackgrounds opacity={0.05} density="high" sky ground />
      <Navbar />

      {offline && (
        <div style={{
          background: '#FEF3C7', color: '#92400E', textAlign: 'center', padding: '8px 16px',
          fontSize: '13px', fontWeight: 600, animation: 'fadeIn 0.3s ease',
        }}>
          ⚠️ You're offline. Showing cached data.
        </div>
      )}

      {/* Hero */}
      <HeroSection
        search={search}
        setSearch={setSearchImmediate}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        suggestions={suggestions}
        searchRef={searchRef}
      />

      {/* Filters */}
      <FilterBar
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        purposeFilter={purposeFilter}
        setPurposeFilter={setPurposeFilter}
        countyFilter={countyFilter}
        setCountyFilter={setCountyFilter}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        hasFilters={hasFilters}
        filteredCount={filtered.length}
        onClear={() => { setTypeFilter('all'); setPurposeFilter('all'); setCountyFilter(''); setMaxPrice(200000); setSearchImmediate(''); }}
      />

      {/* Listing Grid */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px 100px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onClear={() => { setTypeFilter('all'); setCountyFilter(''); setMaxPrice(200000); setSearchImmediate(''); }} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {filtered.map((prop, idx) => (
              <div key={prop.id} style={{ animation: `fadeInUp 0.5s ease ${idx * 0.05}s both` }}>
                <ListingCard
                  property={prop}
                  isSaved={savedIds.has(prop.id)}
                  onSave={() => toggleSave(prop.id)}
                  onClick={() => openDetail(prop)}
                  showSave={!!(isSignedIn && profile?.role === 'tenant')}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showModal && selectedProperty && (
        <DetailModal
          property={selectedProperty}
          currentImageIdx={currentImageIdx}
          setCurrentImageIdx={setCurrentImageIdx}
          onClose={() => setShowModal(false)}
          inquiryForm={inquiryForm}
          setInquiryForm={setInquiryForm}
          inquirySent={inquirySent}
          inquiryLoading={inquiryLoading}
          onSendInquiry={sendInquiry}
          isSaved={savedIds.has(selectedProperty.id)}
          onSave={() => toggleSave(selectedProperty.id)}
          showSave={!!(isSignedIn && profile?.role === 'tenant')}
        />
      )}
    </div>
  );
}

/* ─── Hero Section ─── */
const HERO_IMAGES = [
  '/images/hero-1.jpg',
  '/images/hero-2.jpg',
  '/images/hero-3.jpg',
  '/images/hero-4.jpg',
  '/images/hero-5.jpg',
];

function HeroSection({
  search, setSearch, showSearch, setShowSearch, suggestions, searchRef
}: {
  search: string; setSearch: (v: string) => void;
  showSearch: boolean; setShowSearch: (v: boolean) => void;
  suggestions: string[];  searchRef: React.Ref<HTMLInputElement>;
}) {
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIdx(prev => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      padding: '60px 24px 80px',
      textAlign: 'center',
      color: '#fff',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      {/* Background image layer — crossfade slideshow */}
      {HERO_IMAGES.map((img, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${img})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: i === slideIdx ? 1 : 0,
            transition: 'opacity 1.8s ease-in-out',
            zIndex: 0,
          }}
        />
      ))}

      {/* Dark gradient overlay — deep green at bottom, dark at top */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        background: 'linear-gradient(135deg, rgba(5,20,10,0.75) 0%, rgba(10,50,30,0.6) 40%, rgba(10,77,46,0.5) 70%, rgba(10,77,46,0.85) 100%)',
      }} />

      {/* Animated gradient orbs */}
      <div style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.2, width: '400px', height: '400px', background: '#34D399', top: '-120px', right: '-100px', animation: 'driftRight 20s ease-in-out infinite alternate', zIndex: 1 }} />
      <div style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.15, width: '300px', height: '300px', background: '#86EFAC', bottom: '-80px', left: '-80px', animation: 'driftLeft 25s ease-in-out infinite alternate', zIndex: 1 }} />
      <div style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.1, width: '250px', height: '250px', background: '#6EE7B7', top: '40%', left: '30%', animation: 'pulse 4s ease-in-out infinite', zIndex: 1 }} />

      {/* Decorative floating houses in hero */}
      <div style={{ position: 'absolute', opacity: 0.12, color: '#fff', width: '120px', height: '96px', top: '15%', left: '5%', animation: 'houseFloat0 6s ease-in-out infinite', zIndex: 1 }}>
        <svg viewBox="0 0 200 160" fill="none"><path d="M10 90 L100 10 L190 90" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8"/><path d="M25 90 L25 148 L175 148 L175 90" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.7"/></svg>
      </div>
      <div style={{ position: 'absolute', opacity: 0.1, color: '#fff', width: '90px', height: '72px', bottom: '20%', right: '8%', animation: 'houseFloat1 8s ease-in-out infinite 2s', zIndex: 1 }}>
        <svg viewBox="0 0 160 200" fill="none"><path d="M15 15 L15 190 L145 190 L145 15 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.8"/><path d="M10 15 L150 15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8"/></svg>
      </div>
      <div style={{ position: 'absolute', opacity: 0.08, color: '#fff', width: '70px', height: '56px', top: '55%', right: '20%', animation: 'houseFloat2 7s ease-in-out infinite 4s', zIndex: 1 }}>
        <svg viewBox="0 0 200 150" fill="none"><path d="M5 100 L100 5 L195 100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8"/><path d="M30 100 L30 142 L170 142 L170 100" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.7"/></svg>
      </div>

      {/* Slide indicators */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        zIndex: 2,
      }}>
        {HERO_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlideIdx(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: i === slideIdx ? '28px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i === slideIdx ? '#34D399' : 'rgba(255,255,255,0.4)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Content — stacked above background and overlays */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{
          display: 'inline-block', background: 'rgba(255,255,255,0.12)',
          padding: '7px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
          marginBottom: '20px', border: '1px solid rgba(255,255,255,0.1)',
          animation: 'fadeInDown 0.6s ease',
        }}>
          🇰🇪 Kenya's #1 Property Platform — Rent or Buy
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 700,
          fontFamily: "'DM Serif Display', Georgia, serif",
          margin: '0 0 4px', lineHeight: 1.1,
          animation: 'fadeInUp 0.6s ease 0.1s both',
        }}>
          Find Your Dream Home
        </h1>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 700,
          fontFamily: "'DM Serif Display', Georgia, serif",
          margin: '0 0 20px',
          background: 'linear-gradient(135deg, #86EFAC, #34D399)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          animation: 'fadeInUp 0.6s ease 0.2s both',
        }}>
          Across Kenya
        </h1>

        <p style={{
          fontSize: '15px', color: 'rgba(255,255,255,0.8)', maxWidth: '440px',
          margin: '0 auto 28px', lineHeight: 1.6,
          animation: 'fadeInUp 0.6s ease 0.3s both',
        }}>
          Browse & buy verified properties from trusted sellers — direct contact, no middlemen.
        </p>

        <div style={{
          display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '32px',
          animation: 'fadeInUp 0.6s ease 0.4s both',
        }}>
          {['🏠 1,200+ Listings', '✅ Verified Sellers', '⚡ Instant Contact', '🏷 For Sale & Rent'].map((chip, i) => (
            <div key={i} style={{
              padding: '7px 16px', borderRadius: '20px',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              fontSize: '12px', fontWeight: 500,
              backdropFilter: 'blur(4px)',
            }}>{chip}</div>
          ))}
        </div>

        <div style={{
          maxWidth: '560px', margin: '0 auto', position: 'relative',
          animation: 'fadeInUp 0.6s ease 0.5s both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', overflow: 'hidden',
            transition: 'box-shadow 0.3s',
          }}>
            <span style={{ padding: '0 14px', fontSize: '18px' }}>🔍</span>
            <input
              ref={searchRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              placeholder="Search by location, estate, or area…"
              style={{
                flex: 1, border: 'none', outline: 'none', padding: '16px 8px',
                fontSize: '16px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#111827',
              }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setShowSearch(false); }} style={{
                background: 'none', border: 'none', padding: '0 14px', cursor: 'pointer',
                fontSize: '16px', color: '#9CA3AF',
              }}>✕</button>
            )}
          </div>

          {showSearch && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px',
              background: '#fff', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              zIndex: 100, overflow: 'hidden', textAlign: 'left',
              animation: 'fadeIn 0.2s ease',
            }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setSearch(s); setShowSearch(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                    padding: '14px 18px', border: 'none', background: 'none',
                    fontSize: '14px', color: '#111827', cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    borderBottom: i < suggestions.length - 1 ? '1px solid #F3F4F6' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  📍 {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Popular locations */}
        <div style={{
          display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '24px',
          paddingBottom: '6px', justifyContent: 'center',
          animation: 'fadeInUp 0.6s ease 0.6s both',
        }}>
          {['Kilimani', 'Westlands', 'Karen', 'Kasarani', 'Mombasa', 'Nakuru', 'Lavington', 'Ngong Road'].map((chip, i) => (
            <button
              key={i}
              onClick={() => { setSearch(chip); setShowSearch(false); }}
              style={{
                padding: '7px 16px', borderRadius: '20px', whiteSpace: 'nowrap',
                background: search === chip ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif", backdropFilter: 'blur(4px)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (search !== chip) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { if (search !== chip) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            >{chip}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Filter Bar ─── */
function FilterBar({
  typeFilter, setTypeFilter, purposeFilter, setPurposeFilter,
  countyFilter, setCountyFilter,
  maxPrice, setMaxPrice, hasFilters, filteredCount, onClear
}: {
  typeFilter: string; setTypeFilter: (v: string) => void;
  purposeFilter: string; setPurposeFilter: (v: 'all' | 'rent' | 'sale') => void;
  countyFilter: string; setCountyFilter: (v: string) => void;
  maxPrice: number; setMaxPrice: (v: number) => void;
  hasFilters: boolean; filteredCount: number; onClear: () => void;
}) {
  return (
    <div style={{
      background: '#fff', borderBottom: '1px solid #E5E7EB',
      padding: '14px 16px', position: 'sticky', top: '64px', zIndex: 50,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {/* Purpose Filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {(['all', 'rent', 'sale'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPurposeFilter(p)}
            style={{
              padding: '7px 18px', borderRadius: '20px',
              background: purposeFilter === p ? 'linear-gradient(135deg, #047857, #059669)' : '#F3F4F6',
              color: purposeFilter === p ? '#fff' : '#6B7280',
              border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: '5px',
              transition: 'all 0.2s',
            }}
          >
            {p === 'all' ? '🏡 All' : p === 'rent' ? '🔑 For Rent' : '🏷 For Sale'}
          </button>
        ))}
      </div>

      {/* Property Type Row */}

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '12px', paddingBottom: '4px' }}>
        {typeKeys.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{
              padding: '8px 18px', borderRadius: '20px', whiteSpace: 'nowrap',
              background: typeFilter === t ? '#1E6B4A' : '#F3F4F6',
              color: typeFilter === t ? '#fff' : '#6B7280',
              border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'all 0.2s',
              boxShadow: typeFilter === t ? '0 2px 8px rgba(30,107,74,0.3)' : 'none',
            }}
            onMouseEnter={e => { if (typeFilter !== t) e.currentTarget.style.background = '#E5E7EB'; }}
            onMouseLeave={e => { if (typeFilter !== t) e.currentTarget.style.background = '#F3F4F6'; }}
          >{typeDisplay[t]}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <select
            value={countyFilter}
            onChange={e => setCountyFilter(e.target.value)}
            style={{
              padding: '10px 32px 10px 14px', borderRadius: '10px', border: '1.5px solid #E5E7EB',
              fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#111827',
              background: '#fff', outline: 'none', minWidth: '130px',
              cursor: 'pointer', appearance: 'none', transition: 'border-color 0.2s',
            }}
          >
            <option value="">All Counties</option>
            {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#6B7280', pointerEvents: 'none' }}>▼</span>
        </div>

        {purposeFilter !== 'sale' && (
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px', fontWeight: 500 }}>
            Max {purposeFilter === 'rent' ? 'Rent' : 'Price'}: <span style={{ color: '#047857', fontWeight: 700 }}>KES {maxPrice.toLocaleString('en-KE')}</span>
          </div>
          <input
            type="range" min={2000} max={200000} step={1000}
            value={maxPrice}
            onChange={e => setMaxPrice(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#10B981', height: '6px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>
            <span>KES 2,000</span>
            <span>KES 200,000</span>
          </div>
        </div>
        )}

        <div style={{
          background: '#F0FDF4', borderRadius: '20px', padding: '6px 14px',
          fontSize: '13px', color: '#065F46', fontWeight: 600, whiteSpace: 'nowrap',
        }}>
          {filteredCount} found
        </div>

        {hasFilters && (
          <button
            onClick={onClear}
            style={{
              background: '#FEE2E2', border: 'none', color: '#DC2626', fontSize: '12px',
              fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              padding: '8px 14px', borderRadius: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
            onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}
          >Clear all</button>
        )}
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div style={{
      textAlign: 'center', padding: '80px 20px', background: '#fff',
      borderRadius: '20px', border: '1px solid #E5E7EB',
      animation: 'scaleIn 0.3s ease',
    }}>
      <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔍</div>
      <h3 style={{
        fontSize: '22px', fontWeight: 700, color: '#111827',
        fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 8px'
      }}>No properties found</h3>
      <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px' }}>
        Try adjusting your filters or search in a different area
      </p>
      <button
        onClick={onClear}
        className="gradient-btn"
        style={{ padding: '14px 28px', fontSize: '15px' }}
      >Clear Filters</button>
    </div>
  );
}

/* ─── Listing Card ─── */
function ListingCard({ property: prop, isSaved, onSave, onClick, showSave }: {
  property: Property; isSaved: boolean; onSave: () => void; onClick: () => void; showSave: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div style={{ position: 'relative', height: '210px', background: '#F3F4F6', overflow: 'hidden' }}>
        {prop.images && prop.images.length > 0 ? (
          <img
            ref={imgRef}
            src={prop.images[0]} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
            loading="lazy"
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '48px',
            background: 'linear-gradient(135deg, #F0FDF4, #D1FAE5)'
          }}>
            {TYPE_EMOJIS[prop.type] || '🏠'}
          </div>
        )}
        {isNew(prop.created_at) && (
          <span style={{
            position: 'absolute', top: '12px', left: '12px',
            background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
            color: '#fff', padding: '4px 12px', borderRadius: '20px',
            fontSize: '11px', fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            boxShadow: '0 2px 8px rgba(30,107,74,0.3)',
          }}>NEW</span>
        )}
        {showSave && (
          <button
            onClick={e => { e.stopPropagation(); onSave(); }}
            style={{
              position: 'absolute', top: '12px', right: '12px',
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            aria-label={isSaved ? 'Unsave property' : 'Save property'}
          >
            {isSaved ? '❤️' : '🤍'}
          </button>
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.75) 100%)',
          padding: '24px 14px 12px',
        }}>
          {(prop.purpose === 'sale' || prop.purpose === 'both') && prop.sale_price ? (
            <div style={{
              color: '#818CF8', fontSize: '20px', fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              textShadow: '0 1px 4px rgba(0,0,0,0.2)'
            }}>
              KES {prop.sale_price.toLocaleString('en-KE')}<span style={{ fontSize: '11px', fontWeight: 500, color: '#A5B4FC' }}> sale</span>
            </div>
          ) : (
            <div style={{
              color: '#fff', fontSize: '20px', fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              textShadow: '0 1px 4px rgba(0,0,0,0.2)'
            }}>
              KES {prop.price.toLocaleString('en-KE')}<span style={{ fontSize: '13px', fontWeight: 500 }}>/mo</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span className="badge-green">{TYPE_LABELS[prop.type] || prop.type}</span>
        </div>
        <div style={{
          fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '4px',
          fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {prop.title}
        </div>
        <div style={{
          fontSize: '13px', color: '#6B7280', marginBottom: '12px',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          📍 {prop.location}{prop.county ? `, ${prop.county}` : ''}
        </div>

        {prop.amenities && prop.amenities.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {prop.amenities.slice(0, 3).map((a, i) => (
              <span key={i} style={{
                background: '#F3F4F6', color: '#6B7280', padding: '3px 9px',
                borderRadius: '12px', fontSize: '10px', fontWeight: 500,
              }}>{a}</span>
            ))}
            {prop.amenities.length > 3 && (
              <span style={{
                background: '#F3F4F6', color: '#6B7280', padding: '3px 9px',
                borderRadius: '12px', fontSize: '10px', fontWeight: 500,
              }}>+{prop.amenities.length - 3} more</span>
            )}
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px',
          paddingTop: '12px', borderTop: '1px solid #F3F4F6',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '11px', fontWeight: 700,
            flexShrink: 0,
          }}>
            {prop.landlord?.full_name?.[0] || '?'}
          </div>
          <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, flex: 1 }}>
            {prop.landlord?.full_name || 'Landlord'} <span style={{ color: '#1E6B4A' }}>✅</span>
          </span>
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{timeAgo(prop.created_at)}</span>
        </div>

        <div style={{
          color: '#1E6B4A', fontSize: '14px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          View Details <span style={{ fontSize: '16px' }}>→</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Detail Modal ─── */
function DetailModal({
  property, currentImageIdx, setCurrentImageIdx, onClose,
  inquiryForm, setInquiryForm, inquirySent, inquiryLoading, onSendInquiry,
  isSaved, onSave, showSave
}: {
  property: Property; currentImageIdx: number; setCurrentImageIdx: (v: number | ((p: number) => number)) => void;
  onClose: () => void;
  inquiryForm: { name: string; phone: string; email: string; message: string };
  setInquiryForm: (v: any) => void;
  inquirySent: boolean; inquiryLoading: boolean; onSendInquiry: () => void;
  isSaved: boolean; onSave: () => void; showSave: boolean;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '20px 20px 0 0',
          width: '100%', maxWidth: '520px', maxHeight: '90vh',
          overflow: 'auto',
          animation: 'slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: '44px', height: '5px', background: '#D1D5DB', borderRadius: '3px' }} />
        </div>

        <div style={{ position: 'relative' }}>
          {property.images && property.images.length > 0 ? (
            <div style={{ position: 'relative', width: '100%', height: '260px', overflow: 'hidden' }}>
              <img
                src={property.images[currentImageIdx]} alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.3s ease' }}
              />
              <div style={{
                position: 'absolute', bottom: '12px', right: '12px',
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                padding: '3px 10px', borderRadius: '12px',
                fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
                backdropFilter: 'blur(4px)',
              }}>
                {currentImageIdx + 1} / {property.images.length}
              </div>
              {property.images.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); setCurrentImageIdx(prev => prev === 0 ? property.images.length - 1 : prev - 1); }}
                  style={{
                    position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none',
                    fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)', transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
                  aria-label="Previous image"
                >◀</button>
              )}
              {property.images.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); setCurrentImageIdx(prev => prev === property.images.length - 1 ? 0 : prev + 1); }}
                  style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none',
                    fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)', transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
                  aria-label="Next image"
                >▶</button>
              )}
              {property.images.length > 1 && (
                <div style={{
                  position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', gap: '6px',
                }}>
                  {property.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={e => { e.stopPropagation(); setCurrentImageIdx(idx); }}
                      style={{
                        width: idx === currentImageIdx ? '20px' : '8px',
                        height: '8px', borderRadius: '4px',
                        background: idx === currentImageIdx ? '#34D399' : 'rgba(255,255,255,0.6)',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0,
                      }}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              width: '100%', height: '260px',
              background: 'linear-gradient(135deg, #F0FDF4, #D1FAE5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px',
            }}>
              {TYPE_EMOJIS[property.type] || '🏠'}
            </div>
          )}
          {isNew(property.created_at) && (
            <span style={{
              position: 'absolute', top: '16px', left: '16px',
              background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
              color: '#fff', padding: '4px 14px', borderRadius: '20px',
              fontSize: '12px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 2px 8px rgba(30,107,74,0.3)',
            }}>NEW</span>
          )}
          {showSave && (
            <button
              onClick={e => { e.stopPropagation(); onSave(); }}
              style={{
                position: 'absolute', top: '60px', right: '16px',
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', backdropFilter: 'blur(4px)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isSaved ? '❤️' : '🤍'}
            </button>
          )}
          <button onClick={onClose} style={{
            position: 'absolute', top: '16px', right: '16px',
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none',
            fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)', transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
          aria-label="Close modal"
          >✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span className="badge-green">{TYPE_LABELS[property.type] || property.type}</span>
          </div>
          {property.purpose === 'sale' || property.purpose === 'both' ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              {property.purpose !== 'sale' && (
                <div style={{
                  fontSize: '20px', fontWeight: 700, color: '#047857',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.3
                }}>
                  KES {property.price.toLocaleString('en-KE')}<span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>/mo rent</span>
                </div>
              )}
              {property.sale_price && (
                <div style={{
                  fontSize: '20px', fontWeight: 700, color: '#6366F1',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.3
                }}>
                  KES {property.sale_price.toLocaleString('en-KE')}<span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}> sale</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              fontSize: '30px', fontWeight: 700, color: '#047857',
              fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px', lineHeight: 1.1
            }}>
              KES {property.price.toLocaleString('en-KE')}<span style={{ fontSize: '15px', color: '#6B7280', fontWeight: 500 }}>/mo</span>
            </div>
          )}
          <h2 style={{
            fontSize: '22px', fontWeight: 700, color: '#111827',
            fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 6px', lineHeight: 1.2
          }}>
            {property.title}
          </h2>
          <div style={{
            fontSize: '14px', color: '#6B7280', marginBottom: '20px',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            📍 {property.location}{property.county ? `, ${property.county}` : ''}
          </div>

          {property.amenities && property.amenities.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Amenities</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {property.amenities.slice(0, 8).map((a, i) => (
                  <div key={i} style={{
                    fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px',
                    background: '#F9FAFB', padding: '8px 10px', borderRadius: '8px',
                  }}>
                    <span style={{
                      width: '16px', height: '16px', borderRadius: '50%', background: '#D1FAE5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#1E6B4A', fontSize: '10px', fontWeight: 700, flexShrink: 0,
                    }}>✓</span> {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {property.description && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Description</div>
              <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
                {property.description}
              </p>
            </div>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px',
            padding: '16px 0', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '16px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 2px 8px rgba(30,107,74,0.2)', flexShrink: 0,
            }}>
              {property.landlord?.full_name?.[0] || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                {property.landlord?.full_name || 'Landlord'} <span style={{ color: '#1E6B4A' }}>✅</span>
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Verified Landlord</div>
            </div>
            {property.landlord?.phone && (
              <a href={`tel:${property.landlord.phone}`} style={{
                background: '#F0FDF4', color: '#1E6B4A', border: '1px solid #A7F3D0',
                borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 600,
                textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#D1FAE5'; e.currentTarget.style.borderColor = '#6EE7B7'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F0FDF4'; e.currentTarget.style.borderColor = '#A7F3D0'; }}
              >📞 Call Landlord</a>
            )}
          </div>

          {inquirySent ? (
            <div style={{
              textAlign: 'center', padding: '24px 0',
              background: '#F0FDF4', borderRadius: '16px',
              animation: 'scaleIn 0.3s ease',
            }}>
              <div style={{ fontSize: '52px', marginBottom: '12px', animation: 'pop 0.5s ease' }}>✅</div>
              <div style={{
                fontSize: '20px', fontWeight: 700, color: '#065F46',
                fontFamily: "'DM Serif Display', Georgia, serif", marginBottom: '4px'
              }}>Inquiry Sent!</div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>The landlord will contact you soon.</div>
            </div>
          ) : (
            <div>
              <h4 style={{
                fontSize: '16px', fontWeight: 700, color: '#111827',
                fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 14px'
              }}>
                📩 Send Inquiry
              </h4>
              <div style={{ marginBottom: '10px' }}>
                <input
                  value={inquiryForm.name}
                  onChange={e => setInquiryForm((p: any) => ({ ...p, name: e.target.value }))}
                  placeholder="Full name *" required aria-label="Your full name"
                  className="input-base"
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <input
                  value={inquiryForm.phone}
                  onChange={e => setInquiryForm((p: any) => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone (+254 format)" type="tel" inputMode="numeric" aria-label="Phone number"
                  className="input-base"
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <textarea
                  value={inquiryForm.message}
                  onChange={e => setInquiryForm((p: any) => ({ ...p, message: e.target.value }))}
                  placeholder="Your message to the landlord... *" rows={3} required aria-label="Your message"
                  className="input-base"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button
                onClick={onSendInquiry}
                disabled={!inquiryForm.name || !inquiryForm.message || inquiryLoading}
                className="gradient-btn"
                style={{
                  width: '100%', padding: '14px 20px', fontSize: '16px',
                  cursor: inquiryLoading ? 'not-allowed' : 'pointer',
                  opacity: (!inquiryForm.name || !inquiryForm.message) ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {inquiryLoading ? (
                  <><div style={{
                    width: '18px', height: '18px', border: '2.5px solid rgba(255,255,255,0.3)',
                    borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                  }} /> Sending...</>
                ) : '📩 Send Inquiry'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
