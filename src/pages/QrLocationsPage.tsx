import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useCurrentBusiness } from '../hooks/queries/useBusiness';

export default function QrLocationsPage() {
  const { data: business, isLoading: loading, error: queryError } = useCurrentBusiness();
  const error = queryError ? queryError.message : null;
  const qrRef = useRef<HTMLCanvasElement>(null);

  const generatePoster = () => {
    const qrCanvas = qrRef.current;
    if (!qrCanvas || !business) return null;

    const W = 750;
    const H = 1050;
    const poster = document.createElement('canvas');
    poster.width = W;
    poster.height = H;
    const ctx = poster.getContext('2d')!;

    const NAVY = '#0d1b4a';
    const BLUE = '#1a56db';
    const LIGHT_BLUE = '#2563eb';
    const WHITE = '#ffffff';
    const LIGHT_BG = '#f0f4ff';

    // --- Background ---
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, W, H);

    // --- Top curved wave (navy to blue gradient) ---
    const topGrad = ctx.createLinearGradient(0, 0, W, 120);
    topGrad.addColorStop(0, NAVY);
    topGrad.addColorStop(1, BLUE);
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, 80);
    ctx.quadraticCurveTo(W * 0.5, 140, 0, 80);
    ctx.closePath();
    ctx.fill();

    // --- Bottom curved wave ---
    const btmGrad = ctx.createLinearGradient(0, H - 120, W, H);
    btmGrad.addColorStop(0, BLUE);
    btmGrad.addColorStop(1, NAVY);
    ctx.fillStyle = btmGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W, H);
    ctx.lineTo(W, H - 80);
    ctx.quadraticCurveTo(W * 0.5, H - 140, 0, H - 80);
    ctx.closePath();
    ctx.fill();

    // --- "RB" Logo icon ---
    const logoY = 115;
    // Draw a stylized RB monogram
    ctx.fillStyle = NAVY;
    ctx.font = 'bold 52px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RB', W / 2, logoY);
    // Decorative bracket around RB
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 42, logoY - 42, 84, 54, 10);
    ctx.stroke();

    // --- Business Name ---
    const bizName = business.name || 'Your Business';
    ctx.fillStyle = NAVY;
    ctx.font = 'bold 36px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    // Truncate if too long
    let displayName = bizName;
    while (ctx.measureText(displayName).width > W - 80 && displayName.length > 5) {
      displayName = displayName.slice(0, -1);
    }
    if (displayName !== bizName) displayName += '…';
    ctx.fillText(displayName, W / 2, logoY + 55);

    // --- Tagline ---
    ctx.fillStyle = '#4a5568';
    ctx.font = '16px Arial, Helvetica, sans-serif';
    // Decorative lines around tagline
    const tagline = 'Your Reviews, Our Priority';
    const tagW = ctx.measureText(tagline).width;
    const tagY = logoY + 80;
    ctx.fillText(tagline, W / 2, tagY);
    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth = 1.5;
    const lineGap = 12;
    ctx.beginPath();
    ctx.moveTo(W / 2 - tagW / 2 - 40, tagY - 5);
    ctx.lineTo(W / 2 - tagW / 2 - lineGap, tagY - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W / 2 + tagW / 2 + lineGap, tagY - 5);
    ctx.lineTo(W / 2 + tagW / 2 + 40, tagY - 5);
    ctx.stroke();

    // --- Divider line ---
    const divY = tagY + 25;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, divY);
    ctx.lineTo(W - 60, divY);
    ctx.stroke();

    // --- "WE VALUE YOUR" ---
    const headY = divY + 55;
    ctx.fillStyle = NAVY;
    ctx.font = 'bold 38px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WE VALUE YOUR', W / 2, headY);

    // --- "FEEDBACK!" ---
    ctx.font = 'bold 52px Arial, Helvetica, sans-serif';
    ctx.fillText('FEEDBACK!', W / 2, headY + 55);

    // --- "SCAN TO LEAVE A REVIEW" pill ---
    const pillY = headY + 85;
    const pillText = 'SCAN TO LEAVE A REVIEW';
    ctx.font = 'bold 18px Arial, Helvetica, sans-serif';
    const pillTextW = ctx.measureText(pillText).width;
    const pillW = pillTextW + 70;
    const pillH = 42;
    const pillX = (W - pillW) / 2;

    // Pill background
    const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
    pillGrad.addColorStop(0, BLUE);
    pillGrad.addColorStop(1, LIGHT_BLUE);
    ctx.fillStyle = pillGrad;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();

    // Phone icon in pill
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 2;
    const phoneX = pillX + 22;
    const phoneY2 = pillY + 10;
    ctx.beginPath();
    ctx.roundRect(phoneX, phoneY2, 16, 22, 3);
    ctx.stroke();
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.arc(phoneX + 8, phoneY2 + 18, 2, 0, Math.PI * 2);
    ctx.fill();

    // Pill text
    ctx.fillStyle = WHITE;
    ctx.textAlign = 'center';
    ctx.fillText(pillText, W / 2 + 10, pillY + 28);

    // --- QR Code with border ---
    const qrSize = 300;
    const qrBorder = 20;
    const qrX = (W - qrSize - qrBorder * 2) / 2;
    const qrY2 = pillY + pillH + 25;

    // QR border/shadow
    ctx.fillStyle = LIGHT_BG;
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(qrX, qrY2, qrSize + qrBorder * 2, qrSize + qrBorder * 2, 16);
    ctx.fill();
    ctx.stroke();

    // Draw the actual QR code from the hidden canvas
    ctx.drawImage(qrCanvas, qrX + qrBorder, qrY2 + qrBorder, qrSize, qrSize);

    // --- Heart icon ---
    const thankY = qrY2 + qrSize + qrBorder * 2 + 40;
    // Simple heart
    ctx.fillStyle = BLUE;
    const heartX = W / 2;
    const heartR = 16;
    ctx.beginPath();
    ctx.arc(heartX - heartR * 0.6, thankY - heartR * 0.3, heartR * 0.65, Math.PI, 0, false);
    ctx.arc(heartX + heartR * 0.6, thankY - heartR * 0.3, heartR * 0.65, Math.PI, 0, false);
    ctx.lineTo(heartX, thankY + heartR * 0.8);
    ctx.closePath();
    ctx.fill();

    // White circle behind heart
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.arc(heartX, thankY, heartR + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Blue circle outline
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(heartX, thankY, heartR + 8, 0, Math.PI * 2);
    ctx.stroke();

    // --- "Thank you!" ---
    ctx.fillStyle = BLUE;
    ctx.font = 'italic bold 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Thank you!', W / 2, thankY + 40);

    // --- "Your support means a lot to us." ---
    ctx.fillStyle = '#4a5568';
    ctx.font = '15px Arial, Helvetica, sans-serif';
    ctx.fillText('Your support means a lot to us.', W / 2, thankY + 65);

    // Decorative lines around "Thank you"
    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 140, thankY + 35);
    ctx.lineTo(W / 2 - 90, thankY + 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W / 2 + 90, thankY + 35);
    ctx.lineTo(W / 2 + 140, thankY + 35);
    ctx.stroke();

    return poster;
  };

  const downloadQR = () => {
    const poster = generatePoster();
    if (!poster || !business) return;

    // --- Export ---
    const link = document.createElement('a');
    link.href = poster.toDataURL('image/png');
    link.download = `qr-${business.name || 'business'}.png`;
    link.click();
  };

  const handlePrint = () => {
    const poster = generatePoster();
    if (!poster || !business) return;

    const dataUrl = poster.toDataURL('image/png');
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Poster - ${business.name || 'Business'}</title>
          <style>
            @page {
              size: auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #fff;
            }
            img {
              max-width: 100%;
              max-height: 100vh;
              height: auto;
              object-fit: contain;
              display: block;
            }
          </style>
        </head>
        <body>
          <img id="poster-img" src="${dataUrl}" alt="QR Poster" />
        </body>
      </html>
    `);
    doc.close();

    const img = doc.getElementById('poster-img') as HTMLImageElement;
    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print failed', e);
      }
      setTimeout(() => {
        iframe.remove();
      }, 1000);
    };

    if (img && !img.complete) {
      img.onload = () => {
        setTimeout(triggerPrint, 100);
      };
    } else {
      setTimeout(triggerPrint, 100);
    }
  };

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
