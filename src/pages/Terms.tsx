import React from 'react';
import { Link } from 'react-router-dom';
import { HouseBackgrounds } from '../components/HouseBackgrounds';

const sections = [
  { title: 'Acceptance', content: 'By using NestList, you agree to these terms. If you do not agree, please do not use the platform.' },
  { title: 'Platform Description', content: 'NestList is a property listing platform connecting landlords, caretakers, agents, and tenants across Kenya. Property owners pay a listing fee to advertise their properties. Tenants browse and inquire for free.' },
  { title: 'Listing Fees', content: 'Listing fees are non-refundable and are paid via M-Pesa before a property goes live. Fees are based on property type as displayed during the listing process. Each listing is active for 30 days.' },
  { title: 'User Responsibilities', content: 'Users must provide accurate information. Landlords must ensure their properties are accurately described. Tenants must use the platform for legitimate housing inquiries only.' },
  { title: 'Payments', content: 'All payments are processed through M-Pesa via Safaricom Daraja API. NestList does not store payment card details. Listing fees are final and non-refundable.' },
  { title: 'Privacy', content: 'We collect and use personal data as described in our Privacy Policy. By using NestList, you consent to such collection and use.' },
  { title: 'Prohibited Content', content: 'Users may not post fraudulent, misleading, or illegal content. NestList reserves the right to remove any listing or suspend any user that violates these terms.' },
  { title: 'Contact', content: 'For questions about these terms, contact us at gardisonkirui11@gmail.com.' },
];

export default function Terms() {
  return (
    <div style={{
      minHeight: '100vh', background: '#F9FAFB',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '40px 20px', position: 'relative',
      overflow: 'hidden',
    }}>
      <HouseBackgrounds opacity={0.04} color="#1E6B4A" blur sky ground density="low" />
      <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative' }}>
        <Link to="/" style={{
          color: '#1E6B4A', fontSize: '14px', fontWeight: 600, textDecoration: 'none',
          marginBottom: '20px', display: 'inline-block',
        }}>
          ← Back to Home
        </Link>
        <h1 style={{
          fontSize: '32px', fontWeight: 700, color: '#111827',
          fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 24px',
        }}>Terms of Service</h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '32px' }}>Last updated: June 2026</p>

        {sections.map((s, i) => (
          <div key={i} className="card-base" style={{ padding: '20px', marginBottom: '12px' }}>
            <h2 style={{
              fontSize: '18px', fontWeight: 700, color: '#111827',
              fontFamily: "'DM Serif Display', Georgia, serif", margin: '0 0 8px',
            }}>{i + 1}. {s.title}</h2>
            <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6, margin: 0 }}>{s.content}</p>
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: '#9CA3AF' }}>
          NestList · BN-P7SEPZD3
        </div>
      </div>
    </div>
  );
}
