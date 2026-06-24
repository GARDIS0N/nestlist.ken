import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfile } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import { HouseBackgrounds } from '../components/HouseBackgrounds';
import MpesaPayment from '../components/MpesaPayment';
import {
  TYPE_LABELS, TYPE_EMOJIS, LISTING_FEES,
  AMENITIES, KENYAN_COUNTIES,
  MAX_PHOTOS, MAX_PHOTO_SIZE_MB,
  PURPOSE_LABELS, PURPOSE_EMOJIS, SALE_LISTING_FEES,
} from '../lib/constants';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dmmb5jvbo/image/upload';
const CLOUDINARY_PRESET = 'nestlist_unsigned';

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > 1200) { h = Math.round((h * 1200) / w); w = 1200; }
      if (h > 900) { w = Math.round((w * 900) / h); h = 900; }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/jpeg', 0.75);
    };
    img.src = URL.createObjectURL(file);
  });
}

function uploadPhoto(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const compressed = await compressImage(file);
      const form = new FormData();
      form.append('file', compressed, file.name);
      form.append('upload_preset', CLOUDINARY_PRESET);
      form.append('folder', 'nestlist/listings');
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url);
        else reject(new Error('Upload failed'));
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.open('POST', CLOUDINARY_UPLOAD_URL);
      xhr.send(form);
    } catch (err) { reject(err); }
  });
}

export default function ListProperty() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [step, setStep] = useState(1);
  const [listingId, setListingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [propType, setPropType] = useState('');
  const [purpose, setPurpose] = useState<'rent' | 'sale' | 'both'>('rent');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [location, setLocation] = useState('');
  const [county, setCounty] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const needRent = purpose === 'rent' || purpose === 'both';
  const needSale = purpose === 'sale' || purpose === 'both';
  const rentFee = propType ? LISTING_FEES[propType] || 0 : 0;
  const saleFee = propType ? SALE_LISTING_FEES[propType] || 0 : 0;
  const fee = purpose === 'sale' ? saleFee : purpose === 'both' ? Math.max(rentFee, saleFee) : rentFee;
  const step1Valid = title && propType && ((needRent && price) || (needSale && salePrice)) && location && county;
  const totalSteps = 5;

  const toggleAmenity = (a: string) => {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = files.slice(0, remaining);
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) continue;
      const idx = photos.length + i;
      setUploadingIndex(idx);
      setUploadProgress(0);
      try {
        const url = await uploadPhoto(file, (pct) => setUploadProgress(pct));
        setPhotos(prev => [...prev, url]);
      } catch (err) { console.error(err); }
    }
    setUploadingIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  const handleContinueToPayment = async () => {
    if (!profile) return;
    const { data, error } = await supabase.from('properties').insert({
      landlord_id: profile.id, title, description: description || null,
      location, county, type: propType, purpose,
      price: needRent ? parseInt(price) : 0,
      sale_price: needSale ? parseInt(salePrice) : null,
      amenities: selectedAmenities, images: photos, is_active: false,
    }).select().single();
    if (error) { console.error(error); return; }
    setListingId(data.id);
    setStep(5);
  };

  if (showSuccess) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Navbar />
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 16px 120px' }}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', animation: 'pop 0.5s ease' }}>🎉</div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 8px' }}>
              You're LIVE on NestList!
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px' }}>
              Tenants across Kenya can now see your listing.
            </p>
            <div className="card-base" style={{ padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>
                📍 {location}{county ? `, ${county}` : ''}
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>
                Active until: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Share your listing:</div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => navigator.clipboard.writeText(window.location.origin)}
                  style={{
                    background: '#fff', color: '#374151', border: '1.5px solid #E5E7EB',
                    borderRadius: '12px', padding: '12px 20px', fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >📋 Copy link</button>
                <button
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this NestList listing: ${title} in ${location}`)}`)}
                  style={{
                    background: '#fff', color: '#374151', border: '1.5px solid #E5E7EB',
                    borderRadius: '12px', padding: '12px 20px', fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >💬 WhatsApp</button>
              </div>
            </div>
            <button onClick={() => navigate('/dashboard')} className="gradient-btn" style={{ padding: '14px 28px', fontSize: '15px' }}>
              View My Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'Plus Jakarta Sans', sans-serif", position: 'relative' }}>
      <HouseBackgrounds opacity={0.04} density="medium" sky ground />
      <Navbar />
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px 120px' }}>
        {/* Step Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} style={{
              height: '8px',
              width: step === s ? '32px' : '8px',
              borderRadius: '4px',
              background: step > s ? '#1E6B4A' : step === s ? 'linear-gradient(90deg, #1E6B4A, #34D399)' : '#D1D5DB',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
        <div style={{ fontSize: '13px', color: '#6B7280', textAlign: 'center', marginBottom: '24px' }}>
          Step {step} of {totalSteps}
        </div>

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 20px' }}>
              Tell us about your property
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Listing Title *</label>
              <input className="input-base" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Bright 2BR with parking in Westlands" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Property Type *</label>
              <select className="input-base" value={propType} onChange={e => setPropType(e.target.value)}>
                <option value="">Select type</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{TYPE_EMOJIS[k]} {v}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Purpose *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['rent', 'sale', 'both'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPurpose(p)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px',
                      border: purpose === p ? '2px solid #047857' : '1.5px solid #E5E7EB',
                      background: purpose === p ? '#ECFDF5' : '#fff',
                      cursor: 'pointer', textAlign: 'center',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '18px', marginBottom: '2px' }}>{PURPOSE_EMOJIS[p]}</div>
                    <div style={{ fontSize: '12px', fontWeight: purpose === p ? 700 : 500, color: purpose === p ? '#047857' : '#6B7280' }}>{PURPOSE_LABELS[p]}</div>
                  </button>
                ))}
              </div>
            </div>
            {needRent && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Monthly Rent (KES) *</label>
              <input className="input-base" type="number" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 25000" />
            </div>
            )}
            {needSale && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Sale Price (KES) *</label>
              <input className="input-base" type="number" inputMode="numeric" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="e.g. 5000000" />
            </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Estate / Area *</label>
              <input className="input-base" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Westlands" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>County *</label>
              <select className="input-base" value={county} onChange={e => setCounty(e.target.value)}>
                <option value="">Select county</option>
                {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Description</label>
              <textarea
                className="input-base"
                style={{ resize: 'vertical', minHeight: '100px' }}
                value={description} onChange={e => e.target.value.length <= 500 && setDescription(e.target.value)}
                placeholder="Describe the property..." maxLength={500}
              />
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                {description.length}/500
              </div>
            </div>

            {propType && (
              <div style={{
                background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '12px',
                padding: '14px 16px', marginBottom: '20px',
              }}>
                <div style={{ fontWeight: 700, color: '#92400E', fontSize: '15px' }}>
                  Listing Fee: KES {fee.toLocaleString('en-KE')} · 30 days active
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="gradient-btn"
              style={{
                width: '100%', padding: '13px 20px', fontSize: '15px', marginBottom: '10px',
                opacity: step1Valid ? 1 : 0.5,
                cursor: step1Valid ? 'pointer' : 'not-allowed',
              }}
            >Continue</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 4px' }}>
              What does your property have?
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px' }}>Select all that apply</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
              {AMENITIES.map(a => {
                const sel = selectedAmenities.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    style={{
                      padding: '10px 12px', borderRadius: '10px', textAlign: 'left',
                      border: sel ? '1.5px solid #1E6B4A' : '1.5px solid #E5E7EB',
                      background: sel ? '#F0FDF4' : '#fff',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                      color: sel ? '#065F46' : '#374151',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      display: 'flex', alignItems: 'center', gap: '6px',
                      transition: 'all 0.15s',
                    }}
                  >
                    {sel && <span style={{ color: '#1E6B4A' }}>✓</span>}
                    {!sel && <span style={{ width: '16px' }} />}
                    {a}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
              {selectedAmenities.length} amenities selected
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, background: '#fff', color: '#374151', border: '1.5px solid #E5E7EB',
                borderRadius: '12px', padding: '12px 20px', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>← Back</button>
              <button onClick={() => setStep(3)} className="gradient-btn" style={{ flex: 1, padding: '12px 20px', fontSize: '14px' }}>Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 4px' }}>
              Add photos of your property
            </h2>
            <div style={{
              background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px',
              padding: '10px 14px', fontSize: '13px', color: '#1D4ED8', marginBottom: '20px',
            }}>
              📸 Listings with photos get 3× more inquiries
            </div>

            {photos.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #D1D5DB', borderRadius: '20px',
                  padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                  marginBottom: '20px', transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#1E6B4A'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#D1D5DB'}
              >
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📸</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Drop photos here or tap to select
                </div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px' }}>
                  JPG or PNG · Max {MAX_PHOTO_SIZE_MB}MB each · Up to {MAX_PHOTOS} photos
                </div>
                <button className="gradient-btn" style={{ padding: '12px 24px', fontSize: '14px' }}>Choose Photos</button>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {photos.map((url, idx) => (
                    <div key={idx} style={{
                      position: 'relative', aspectRatio: '4/3',
                      borderRadius: '12px', overflow: 'hidden',
                      gridColumn: idx === 0 ? 'span 2 / span 2' : undefined,
                      gridRow: idx === 0 ? 'span 2' : undefined,
                    }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {idx === 0 && (
                        <span style={{
                          position: 'absolute', top: '6px', left: '6px',
                          background: '#1E6B4A', color: '#fff', padding: '2px 8px',
                          borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                        }}>COVER</span>
                      )}
                      <button
                        onClick={() => removePhoto(idx)}
                        style={{
                          position: 'absolute', top: '6px', right: '6px',
                          width: '24px', height: '24px', borderRadius: '50%',
                          background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none',
                          cursor: 'pointer', fontSize: '12px', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >✕</button>
                      {uploadingIndex === idx && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'rgba(0,0,0,0.4)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{
                            width: '80%', background: 'rgba(255,255,255,0.3)', borderRadius: '4px',
                            height: '6px', overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${uploadProgress}%`, height: '100%',
                              background: '#34D399', borderRadius: '4px', transition: 'width 0.3s',
                            }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #D1D5DB', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        aspectRatio: '4/3', cursor: 'pointer', fontSize: '32px',
                        color: '#9CA3AF', transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#1E6B4A'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#D1D5DB'}
                    >+</div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
                  {photos.length}/{MAX_PHOTOS} photos · First photo is cover
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file" accept="image/jpeg,image/png" multiple
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(2)} style={{
                flex: 1, background: '#fff', color: '#374151', border: '1.5px solid #E5E7EB',
                borderRadius: '12px', padding: '12px 20px', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>← Back</button>
              <button onClick={() => setStep(4)} className="gradient-btn" style={{ flex: 1, padding: '12px 20px', fontSize: '14px' }}>Continue →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 20px' }}>
              Review your listing
            </h2>

            <div className="card-base" style={{ padding: '20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>{TYPE_EMOJIS[propType]}</div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <span className="badge-green">{TYPE_LABELS[propType]}</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                📍 {location}, {county}
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span className="badge-green">{PURPOSE_EMOJIS[purpose]} {PURPOSE_LABELS[purpose]}</span>
              </div>
              {needRent && (
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#047857', marginBottom: needSale ? '4px' : '12px' }}>
                KES {parseInt(price || '0').toLocaleString('en-KE')}/month
              </div>
              )}
              {needSale && salePrice && (
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#6366F1', marginBottom: '12px' }}>
                KES {parseInt(salePrice).toLocaleString('en-KE')} sale
              </div>
              )}
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                <strong>Amenities:</strong> {selectedAmenities.length > 0 ? selectedAmenities.join(', ') : 'None selected'}
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>
                <strong>Photos:</strong> {photos.length} uploaded
              </div>
            </div>

            <div style={{
              background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '12px',
              padding: '14px 16px', marginBottom: '20px',
            }}>
              <div style={{ fontWeight: 700, color: '#92400E', fontSize: '15px' }}>
                Listing Fee: KES {fee.toLocaleString('en-KE')} — one-time · 30 days
              </div>
            </div>

            <button onClick={() => setStep(1)} style={{
              width: '100%', background: '#fff', color: '#374151', border: '1.5px solid #E5E7EB',
              borderRadius: '12px', padding: '12px 20px', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px',
            }}>
              ← Edit
            </button>
            <button
              onClick={handleContinueToPayment}
              className="gradient-btn"
              style={{ width: '100%', padding: '13px 20px', fontSize: '15px' }}
            >
              Pay KES {fee.toLocaleString('en-KE')} & Publish 🚀
            </button>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 20px' }}>
              Pay Listing Fee
            </h2>
            <MpesaPayment
              amount={fee}
              propertyType={propType}
              propertyId={listingId || undefined}
              landlordId={profile?.id}
              defaultPhone={profile?.phone || ''}
              onSuccess={handlePaymentSuccess}
              onBack={() => setStep(4)}
            />
          </div>
        )}
      </div>
    </div>
  );

  function handlePaymentSuccess() {
    setShowSuccess(true);
  }
}
