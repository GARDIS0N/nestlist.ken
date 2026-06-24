import React, { useState, useEffect } from 'react';
import { useMpesa } from '../hooks/useMpesa';
import { TYPE_LABELS } from '../lib/constants';

interface MpesaPaymentProps {
  amount: number;
  propertyType: string;
  propertyId?: string;
  landlordId?: string;
  defaultPhone?: string;
  onSuccess: () => void;
  onBack: () => void;
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return '254' + digits.slice(1);
  if (digits.startsWith('7')) return '254' + digits;
  return digits;
}

export default function MpesaPayment({
  amount, propertyType, propertyId, defaultPhone, onSuccess, onBack
}: MpesaPaymentProps) {
  const [phone, setPhone] = useState(defaultPhone || '');
  const mpesa = useMpesa();

  const handlePay = () => {
    if (phone.length < 10) return;
    const formatted = formatPhoneInput(phone);
    mpesa.initiate({
      phone: formatted,
      amount,
      listingId: propertyId,
      listingTitle: TYPE_LABELS[propertyType] || propertyType,
      onSuccess,
    });
  };

  const handleResend = () => {
    if (phone.length < 10) return;
    const formatted = formatPhoneInput(phone);
    mpesa.resend({
      phone: formatted,
      amount,
      listingId: propertyId,
      listingTitle: TYPE_LABELS[propertyType] || propertyType,
    });
  };

  const formatDisplayPhone = (p: string) => {
    if (p.startsWith('2547') && p.length >= 12) {
      return '+254 7' + p.slice(3, 6) + ' ' + p.slice(6, 9) + ' ' + p.slice(9);
    }
    return p;
  };

  const feeFormatted = 'KES ' + amount.toLocaleString('en-KE');

  return (
    <div>
      <div style={{
        background: '#FEF3C7',
        border: '1px solid #FDE68A',
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            display: 'inline-block',
            background: '#F0FDF4',
            color: '#065F46',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            {TYPE_LABELS[propertyType] || propertyType}
          </div>
          <div style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#92400E',
            fontFamily: 'Plus Jakarta Sans',
            marginTop: '6px',
          }}>
            {feeFormatted}
          </div>
        </div>
        <div style={{
          textAlign: 'right',
          fontSize: '12px',
          color: '#92400E',
          fontFamily: 'Plus Jakarta Sans',
        }}>
          <div>Active for</div>
          <div style={{ fontWeight: 700 }}>30 days</div>
        </div>
      </div>

      {mpesa.status === 'idle' || mpesa.status === 'loading' ? (
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#111827',
            fontFamily: 'Plus Jakarta Sans',
            marginBottom: '8px',
          }}>
            M-Pesa Phone Number
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1.5px solid #E5E7EB',
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}>
            <div style={{
              background: '#F0FDF4',
              padding: '11px 12px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1E6B4A',
              fontFamily: 'Plus Jakarta Sans',
              borderRight: '1.5px solid #E5E7EB',
              whiteSpace: 'nowrap',
            }}>
              🇰🇪 +254
            </div>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="712 345 678"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                padding: '11px 14px',
                fontSize: '16px',
                fontFamily: 'Plus Jakarta Sans',
                color: '#111827',
                background: '#ffffff',
              }}
            />
          </div>

          <button
            onClick={handlePay}
            disabled={phone.length < 9 || mpesa.status === 'loading'}
            style={{
              width: '100%',
              background: mpesa.status === 'loading'
                ? 'linear-gradient(135deg, #1E6B4A, #34D399)'
                : 'linear-gradient(135deg, #1E6B4A, #34D399)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '15px 20px',
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: 'Plus Jakarta Sans',
              cursor: mpesa.status === 'loading' ? 'not-allowed' : 'pointer',
              opacity: phone.length < 9 ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(30,107,74,0.3)',
            }}
          >
            {mpesa.status === 'loading' ? (
              <>
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2.5px solid rgba(255,255,255,0.3)',
                  borderTop: '2.5px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Sending...
              </>
            ) : (
              <>💚 Pay {feeFormatted} via M-Pesa</>
            )}
          </button>

          {mpesa.error && (
            <div style={{
              marginTop: '12px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              padding: '11px 14px',
              color: '#DC2626',
              fontSize: '13px',
              fontFamily: 'Plus Jakarta Sans',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}>
              <span>⚠️</span>
              <span>{mpesa.error}</span>
            </div>
          )}

          <button
            onClick={onBack}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#6B7280',
              border: 'none',
              padding: '12px',
              fontSize: '14px',
              fontFamily: 'Plus Jakarta Sans',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            ← Back
          </button>
        </div>
      ) : mpesa.status === 'waiting' ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '16px',
            animation: 'bounce 1s infinite',
          }}>
            📱
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#111827',
            fontFamily: "'DM Serif Display', Georgia, serif",
            marginBottom: '8px',
          }}>
            Check your phone!
          </div>
          <div style={{
            fontSize: '14px',
            color: '#6B7280',
            fontFamily: 'Plus Jakarta Sans',
            marginBottom: '4px',
          }}>
            Enter your M-Pesa PIN to pay {feeFormatted}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#9CA3AF',
            fontFamily: 'Plus Jakarta Sans',
            marginBottom: '20px',
          }}>
            Sent to: {formatDisplayPhone(formatPhoneInput(phone))}
          </div>
          <div style={{
            fontSize: '36px',
            fontWeight: 700,
            color: mpesa.countdown < 15 ? '#DC2626' : '#1E6B4A',
            fontFamily: 'Plus Jakarta Sans',
            marginBottom: '12px',
          }}>
            {Math.floor(mpesa.countdown / 60)}:{String(mpesa.countdown % 60).padStart(2, '0')}
          </div>
          <div style={{
            width: '100%',
            height: '4px',
            background: '#E5E7EB',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '24px',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #1E6B4A, #34D399)',
              animation: 'progressSlide 2s ease-in-out infinite',
            }} />
          </div>

          <button
            onClick={() => mpesa.manualConfirm(onSuccess)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '15px 20px',
              fontSize: '15px',
              fontWeight: 700,
              fontFamily: 'Plus Jakarta Sans',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(30,107,74,0.3)',
              marginBottom: '10px',
            }}
          >
            ✅ I have paid — Activate my listing
          </button>

          <button
            onClick={handleResend}
            style={{
              width: '100%',
              background: '#ffffff',
              color: '#374151',
              border: '1.5px solid #E5E7EB',
              borderRadius: '12px',
              padding: '13px 20px',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'Plus Jakarta Sans',
              cursor: 'pointer',
            }}
          >
            🔄 Resend M-Pesa prompt
          </button>

          <button
            onClick={mpesa.reset}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#6B7280',
              border: 'none',
              padding: '12px',
              fontSize: '14px',
              fontFamily: 'Plus Jakarta Sans',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            ← Change phone number
          </button>

          {mpesa.error && (
            <div style={{
              marginTop: '12px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              padding: '11px 14px',
              color: '#DC2626',
              fontSize: '13px',
              fontFamily: 'Plus Jakarta Sans',
            }}>
              {mpesa.error}
            </div>
          )}
        </div>
      ) : mpesa.status === 'confirmed' ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', animation: 'pop 0.5s ease' }}>
            🎉
          </div>
          <div style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#111827',
            fontFamily: "'DM Serif Display', Georgia, serif",
            marginBottom: '8px',
          }}>
            You're LIVE on NestList!
          </div>
          <div style={{
            fontSize: '14px',
            color: '#6B7280',
            fontFamily: 'Plus Jakarta Sans',
            marginBottom: '24px',
          }}>
            Tenants across Kenya can now see your listing.
          </div>
          <button
            onClick={onSuccess}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '15px 20px',
              fontSize: '15px',
              fontWeight: 700,
              fontFamily: 'Plus Jakarta Sans',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(30,107,74,0.3)',
            }}
          >
            View My Dashboard →
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#DC2626',
            fontFamily: 'Plus Jakarta Sans',
            marginBottom: '8px',
          }}>
            Payment Failed
          </div>
          <div style={{
            fontSize: '14px',
            color: '#6B7280',
            fontFamily: 'Plus Jakarta Sans',
            marginBottom: '20px',
          }}>
            {mpesa.error || 'Something went wrong. Please try again.'}
          </div>
          <button
            onClick={mpesa.reset}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #1E6B4A, #34D399)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '15px 20px',
              fontSize: '15px',
              fontWeight: 700,
              fontFamily: 'Plus Jakarta Sans',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(30,107,74,0.3)',
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
