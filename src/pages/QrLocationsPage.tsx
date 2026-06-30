import { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import api, { type ApiResponse } from '../lib/api';

interface Business {
  _id: string;
  name: string;
  businessCode: string;
  logoUrl?: string;
}

export default function QrLocationsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const downloadQR = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `qr-${business?.name || 'reviewboost'}.png`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<ApiResponse<Business>>('/business/me');
        if (res.data.success && res.data.data) {
          setBusiness(res.data.data);
        } else {
          setError(res.data.error?.message || 'Failed to load business data');
        }
      } catch {
        setError('Could not connect to server. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, []);

  return (
    <div className="db-page animate-fade-in">
      {/* ---- Top bar ---- */}
      <div className="db-topbar">
        <div>
          <h1 className="db-title">QR Code & Locations</h1>
          <p className="db-subtitle">Manage your review collection points</p>
        </div>
      </div>

      {/* ---- Error state ---- */}
      {error && (
        <div className="db-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* ---- Loading state ---- */}
      {loading && (
        <div className="db-loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}

      {/* ---- Content ---- */}
      {!loading && business && (
        <>
          {/* ---- QR Code Card ---- */}
          <div className="db-card db-qr-card">
            <h2 className="db-card-title">Your Review QR Code</h2>
            <div className="db-qr-inner">
              <div className="db-qr-wrap">
                <div className="db-qr-canvas-bg">
                  <QRCodeCanvas
                    ref={qrRef}
                    value={`${window.location.origin}/r/${business.businessCode}`}
                    size={200}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#1a1a2e"
                  />
                </div>
              </div>
              <div className="db-qr-info">
                <p className="db-qr-label">Scan link</p>
                <p className="db-qr-url">{window.location.origin}/r/{business.businessCode}</p>
                <p className="db-qr-hint">
                  Print this QR code and place it where customers can easily scan it to leave a review.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button className="db-qr-download" onClick={downloadQR}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download PNG
                  </button>
                  <button className="db-qr-download" onClick={handlePrint} style={{ background: '#fff', color: '#1A1A1A', border: '1px solid #E3E1D9' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ---- Locations Card ---- */}
          <div className="db-card" style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 className="db-card-title" style={{ marginBottom: 0 }}>Locations</h2>
              <button
                disabled
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#A3A39A',
                  background: '#F2F0EA',
                  border: '1px solid #E3E1D9',
                  cursor: 'not-allowed',
                  opacity: 0.6,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Location (Coming Soon)
              </button>
            </div>

            {/* Current Location */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              borderRadius: '12px',
              background: '#F2F0EA',
              border: '1px solid #E3E1D9',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24" style={{ color: '#3F7D45' }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1A1A1A', marginBottom: '0.25rem' }}>
                  {business.name}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#6B6B63', margin: 0 }}>
                  Primary location • Active
                </p>
              </div>
              <div style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '99px',
                background: '#E9F2E7',
                border: '1px solid rgba(63,125,69,0.2)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#3F7D45',
              }}>
                Active
              </div>
            </div>

            {/* Info box */}
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '8px',
              background: 'rgba(99,102,241,0.05)',
              border: '1px solid rgba(99,102,241,0.1)',
            }}>
              <p style={{ fontSize: '0.875rem', color: '#6B6B63', margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: '#1A1A1A' }}>Multi-location support coming soon.</strong> You'll be able to create separate QR codes for different locations and track each one's performance independently.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
