import React from 'react';
import { Link } from 'react-router-dom';
import { HouseBackgrounds } from '../components/HouseBackgrounds';

const sections = [
  { title: 'What We Collect', content: 'We collect information you provide directly: your name, email address, phone number, and property details. We also collect usage data such as pages viewed and searches performed.' },
  { title: 'How We Use It', content: 'We use your data to facilitate property listings and inquiries, process payments via M-Pesa, send SMS notifications about your listings, and improve our platform.' },
  { title: 'Data Sharing', content: "We share your data with third-party service providers including Safaricom (M-Pesa), Cloudinary (image hosting), Africa's Talking (SMS), and EmailJS (email). We do not sell your personal data to third parties." },
  { title: 'Data Security', content: 'We implement industry-standard security measures including encryption in transit and at rest. Your payment information is processed by Safaricom and is not stored on our servers.' },
  { title: 'Your Rights', content: 'You may request access to, correction of, or deletion of your personal data at any time by contacting us. You may also opt out of SMS notifications.' },
  { title: 'Contact', content: 'For privacy-related inquiries, contact us at gardisonkirui11@gmail.com.' },
];

export default function Privacy() {
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
        }}>Privacy Policy</h1>
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
