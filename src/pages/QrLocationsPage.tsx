import { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useCurrentBusiness } from '../hooks/queries/useBusiness';
import './qrLocations.css';

type PosterTheme = 'royal_wave' | 'emerald_wave' | 'ruby_wave' | 'obsidian_wave' | 'custom_wave';

interface ThemeConfig {
  id: PosterTheme;
  name: string;
  desc: string;
  brandColor: string;
  standBg: string;
}

const THEMES: Record<PosterTheme, ThemeConfig> = {
  royal_wave: {
    id: 'royal_wave',
    name: 'Classic Royal Blue',
    desc: 'Navy to royal blue gradient waves',
    brandColor: '#1A56DB',
    standBg: '#FFFFFF',
  },
  emerald_wave: {
    id: 'emerald_wave',
    name: 'Emerald Botanical',
    desc: 'Deep pine to lush green waves',
    brandColor: '#059669',
    standBg: '#FFFFFF',
  },
  ruby_wave: {
    id: 'ruby_wave',
    name: 'Crimson Passion',
    desc: 'Burgundy to bright crimson waves',
    brandColor: '#DC2626',
    standBg: '#FFFFFF',
  },
  obsidian_wave: {
    id: 'obsidian_wave',
    name: 'Obsidian Dark Luxe',
    desc: 'Charcoal waves with dark stand',
    brandColor: '#3B82F6',
    standBg: '#121620',
  },
  custom_wave: {
    id: 'custom_wave',
    name: 'Custom Brand Stand',
    desc: 'Choose your exact brand & stand colors',
    brandColor: '#1A56DB',
    standBg: '#FFFFFF',
  },
};

const POPULAR_BRAND_SWATCHES = [
  { name: 'Royal Blue', color: '#1A56DB' },
  { name: 'Emerald', color: '#059669' },
  { name: 'Crimson', color: '#DC2626' },
  { name: 'Purple', color: '#7C3AED' },
  { name: 'Amber', color: '#D97706' },
  { name: 'Hot Coral', color: '#E11D48' },
  { name: 'Midnight', color: '#1A1A1A' },
];

const STAND_BG_PRESETS = [
  { name: 'Pure White', color: '#FFFFFF' },
  { name: 'Soft Mist', color: '#F4F7FC' },
  { name: 'Warm Cream', color: '#FBF9F4' },
  { name: 'Pastel Mint', color: '#F0FDF4' },
  { name: 'Dark Charcoal', color: '#121620' },
];

const CTA_PRESETS = [
  'Scan to leave a review',
  'Share your feedback & review',
  'How did we do today? Scan here',
];

// Helper: check if a color is dark
function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 135;
}

// Helper: get darker companion shade for gradient
function getDarkerShade(hex: string, factor: number = 0.42): string {
  const c = hex.replace('#', '');
  let r = parseInt(c.substring(0, 2), 16) || 0;
  let g = parseInt(c.substring(2, 4), 16) || 0;
  let b = parseInt(c.substring(4, 6), 16) || 0;
  r = Math.max(0, Math.floor(r * factor));
  g = Math.max(0, Math.floor(g * factor));
  b = Math.max(0, Math.floor(b * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper: get lighter companion shade for gradient
function getLighterShade(hex: string, factor: number = 1.25): string {
  const c = hex.replace('#', '');
  let r = parseInt(c.substring(0, 2), 16) || 0;
  let g = parseInt(c.substring(2, 4), 16) || 0;
  let b = parseInt(c.substring(4, 6), 16) || 0;
  r = Math.min(255, Math.floor(r * factor));
  g = Math.min(255, Math.floor(g * factor));
  b = Math.min(255, Math.floor(b * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function QrLocationsPage() {
  const { data: business, isLoading: loading, error: queryError } = useCurrentBusiness();
  const error = queryError ? queryError.message : null;
  const qrRef = useRef<HTMLCanvasElement>(null);

  // Customization States
  const [activeTheme, setActiveTheme] = useState<PosterTheme>('royal_wave');
  const [brandColor, setBrandColor] = useState<string>('#1A56DB');
  const [standBg, setStandBg] = useState<string>('#FFFFFF');
  const [selectedCta, setSelectedCta] = useState<string>(CTA_PRESETS[0]);
  const [customCta, setCustomCta] = useState<string>('');
  const [isCustomCta, setIsCustomCta] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);

  // Determine active call-to-action text
  const currentCta = isCustomCta ? (customCta || 'Scan to leave a review') : selectedCta;
  const reviewUrl = business?.businessCode
    ? `${window.location.origin}/r/${business.businessCode}`
    : window.location.origin;

  // Try to load business logo for poster canvas
  useEffect(() => {
    if (business?.logoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setLogoImg(img);
      img.onerror = () => setLogoImg(null);
      img.src = business.logoUrl;
    } else {
      setLogoImg(null);
    }
  }, [business?.logoUrl]);

  // When theme changes from presets, sync colors
  const handleSelectTheme = (themeKey: PosterTheme) => {
    setActiveTheme(themeKey);
    const t = THEMES[themeKey];
    setBrandColor(t.brandColor);
    setStandBg(t.standBg);
  };

  // When custom color is modified, auto-switch theme to custom_wave
  const handleBrandColorChange = (newColor: string) => {
    setBrandColor(newColor);
    setActiveTheme('custom_wave');
  };

  const handleStandBgChange = (newBg: string) => {
    setStandBg(newBg);
    setActiveTheme('custom_wave');
  };

  // High-Fidelity Wave Poster Generator
  const generatePoster = useCallback(() => {
    const qrCanvas = qrRef.current;
    if (!qrCanvas || !business) return null;

    const W = 750;
    const H = 1050;
    const poster = document.createElement('canvas');
    poster.width = W;
    poster.height = H;
    const ctx = poster.getContext('2d')!;

    const isDark = isColorDark(standBg);
    const darkGradientShade = getDarkerShade(brandColor, 0.35);
    const lightGradientShade = getLighterShade(brandColor, 1.2);

    const textColorPrimary = isDark ? '#FFFFFF' : getDarkerShade(brandColor, 0.28);
    const textColorSecondary = isDark ? '#94A3B8' : '#4A5568';
    const dividerColor = isDark ? '#334155' : '#E2E8F0';
    const qrFrameBg = isDark ? '#1E293B' : (standBg.toLowerCase() === '#ffffff' ? '#F0F4FF' : '#FFFFFF');
    const qrFrameBorder = isDark ? '#475569' : '#D1D5DB';

    // 1. Stand Background
    ctx.fillStyle = standBg;
    ctx.fillRect(0, 0, W, H);

    // 2. Top Curved Wave Gradient
    const topGrad = ctx.createLinearGradient(0, 0, W, 130);
    topGrad.addColorStop(0, darkGradientShade);
    topGrad.addColorStop(1, brandColor);
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, 80);
    ctx.quadraticCurveTo(W * 0.5, 140, 0, 80);
    ctx.closePath();
    ctx.fill();

    // 3. Bottom Curved Wave Gradient
    const btmGrad = ctx.createLinearGradient(0, H - 130, W, H);
    btmGrad.addColorStop(0, brandColor);
    btmGrad.addColorStop(1, darkGradientShade);
    ctx.fillStyle = btmGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W, H);
    ctx.lineTo(W, H - 80);
    ctx.quadraticCurveTo(W * 0.5, H - 140, 0, H - 80);
    ctx.closePath();
    ctx.fill();

    // 4. Monogram / Business Logo Box
    const logoY = 110;
    const boxW = 86;
    const boxH = 56;
    const boxX = (W - boxW) / 2;
    const boxY = logoY - boxH / 2;

    // Fill with stand background to cut cleanly through wave
    ctx.fillStyle = standBg;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    ctx.fill();

    // Border around logo box
    ctx.strokeStyle = brandColor;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    if (logoImg) {
      try {
        ctx.drawImage(logoImg, boxX + 6, boxY + 6, boxW - 12, boxH - 12);
      } catch {
        drawMonogramText();
      }
    } else {
      drawMonogramText();
    }

    function drawMonogramText() {
      ctx.fillStyle = textColorPrimary;
      ctx.font = 'bold 36px "Inter", Arial, sans-serif';
      ctx.textAlign = 'center';
      const initials = business?.name ? business.name.slice(0, 2).toUpperCase() : 'RB';
      ctx.fillText(initials, W / 2, logoY + 12);
    }

    // 5. Business Name
    const bizName = business.name || 'Your Business';
    ctx.fillStyle = textColorPrimary;
    ctx.font = 'bold 36px "Inter", Arial, sans-serif';
    ctx.textAlign = 'center';
    let displayName = bizName;
    while (ctx.measureText(displayName).width > W - 100 && displayName.length > 5) {
      displayName = displayName.slice(0, -1);
    }
    if (displayName !== bizName) displayName += '…';
    ctx.fillText(displayName, W / 2, logoY + 58);

    // 6. Tagline with decorative lines
    const tagline = 'Your Reviews, Our Priority';
    ctx.fillStyle = textColorSecondary;
    ctx.font = '16px "Inter", Arial, sans-serif';
    const tagW = ctx.measureText(tagline).width;
    const tagY = logoY + 84;
    ctx.fillText(tagline, W / 2, tagY);

    // Decorative side lines
    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = 1.5;
    const lineGap = 14;
    ctx.beginPath();
    ctx.moveTo(W / 2 - tagW / 2 - 40, tagY - 5);
    ctx.lineTo(W / 2 - tagW / 2 - lineGap, tagY - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W / 2 + tagW / 2 + lineGap, tagY - 5);
    ctx.lineTo(W / 2 + tagW / 2 + 40, tagY - 5);
    ctx.stroke();

    // 7. Subtle Divider
    const divY = tagY + 26;
    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, divY);
    ctx.lineTo(W - 60, divY);
    ctx.stroke();

    // 8. Headlines ("WE VALUE YOUR FEEDBACK!")
    const headY = divY + 55;
    ctx.fillStyle = textColorPrimary;
    ctx.font = 'bold 38px "Inter", Arial, sans-serif';
    ctx.fillText('WE VALUE YOUR', W / 2, headY);
    ctx.font = 'bold 52px "Inter", Arial, sans-serif';
    ctx.fillText('FEEDBACK!', W / 2, headY + 55);

    // 9. Call to Action Pill with Phone Icon
    const pillY = headY + 85;
    const pillText = currentCta.toUpperCase();
    ctx.font = 'bold 18px "Inter", Arial, sans-serif';
    const pillTextW = ctx.measureText(pillText).width;
    const pillW = Math.min(pillTextW + 74, W - 100);
    const pillH = 44;
    const pillX = (W - pillW) / 2;

    const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
    pillGrad.addColorStop(0, brandColor);
    pillGrad.addColorStop(1, lightGradientShade);
    ctx.fillStyle = pillGrad;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();

    const pillTextColor = isColorDark(brandColor) ? '#FFFFFF' : '#1A1A1A';

    // Phone icon inside pill
    ctx.strokeStyle = pillTextColor;
    ctx.lineWidth = 2;
    const phoneX = pillX + 22;
    const phoneY = pillY + 11;
    ctx.beginPath();
    ctx.roundRect(phoneX, phoneY, 15, 22, 3);
    ctx.stroke();
    ctx.fillStyle = pillTextColor;
    ctx.beginPath();
    ctx.arc(phoneX + 7.5, phoneY + 18, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Text in pill
    ctx.fillStyle = pillTextColor;
    ctx.textAlign = 'center';
    ctx.fillText(pillText, W / 2 + 10, pillY + 29);

    // 10. QR Code Frame
    const qrSize = 300;
    const qrBorder = 20;
    const frameSize = qrSize + qrBorder * 2;
    const qrX = (W - frameSize) / 2;
    const qrY = pillY + pillH + 25;

    ctx.fillStyle = qrFrameBg;
    ctx.strokeStyle = qrFrameBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(qrX, qrY, frameSize, frameSize, 16);
    ctx.fill();
    ctx.stroke();

    // Draw the actual QR Code
    ctx.drawImage(qrCanvas, qrX + qrBorder, qrY + qrBorder, qrSize, qrSize);

    // 11. Heart Circle & "Thank you!"
    const thankY = qrY + frameSize + 40;
    const heartX = W / 2;
    const circleR = 24;

    // Circle background
    ctx.fillStyle = brandColor;
    ctx.beginPath();
    ctx.arc(heartX, thankY, circleR, 0, Math.PI * 2);
    ctx.fill();

    // White heart inside
    ctx.fillStyle = '#FFFFFF';
    const hR = 9;
    ctx.beginPath();
    ctx.arc(heartX - hR * 0.55, thankY - hR * 0.25, hR * 0.58, Math.PI, 0, false);
    ctx.arc(heartX + hR * 0.55, thankY - hR * 0.25, hR * 0.58, Math.PI, 0, false);
    ctx.lineTo(heartX, thankY + hR * 0.85);
    ctx.closePath();
    ctx.fill();

    // "Thank you!" with decorative lines
    ctx.fillStyle = brandColor;
    ctx.font = 'italic bold 32px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Thank you!', W / 2, thankY + 44);

    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 160, thankY + 39);
    ctx.lineTo(W / 2 - 100, thankY + 39);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W / 2 + 100, thankY + 39);
    ctx.lineTo(W / 2 + 160, thankY + 39);
    ctx.stroke();

    // 12. Subtitle
    ctx.fillStyle = textColorSecondary;
    ctx.font = '15px "Inter", Arial, sans-serif';
    ctx.fillText('Your support means a lot to us.', W / 2, thankY + 68);

    return poster;
  }, [brandColor, business, currentCta, logoImg, standBg]);

  // Update preview image whenever state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const poster = generatePoster();
      if (poster) {
        setPreviewDataUrl(poster.toDataURL('image/png'));
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [generatePoster]);

  // Action: Download Printable Poster
  const downloadPoster = () => {
    const poster = generatePoster();
    if (!poster || !business) return;

    const link = document.createElement('a');
    link.href = poster.toDataURL('image/png');
    link.download = `review-stand-${business.name ? business.name.toLowerCase().replace(/\s+/g, '-') : 'stand'}.png`;
    link.click();
  };

  // Action: Download QR Code Only (400x400)
  const downloadQROnly = () => {
    const qrCanvas = qrRef.current;
    if (!qrCanvas || !business) return;

    const size = 400;
    const margin = 40;
    const qrTargetSize = size - margin * 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, size - 24, size - 24);

    ctx.drawImage(qrCanvas, margin, margin, qrTargetSize, qrTargetSize);

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `qr-code-${business.businessCode || 'business'}.png`;
    link.click();
  };

  // Action: Print Directly
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
          <title>Print Review Stand - ${business.name || 'Business'}</title>
          <style>
            @page { size: auto; margin: 0; }
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
          <img id="poster-img" src="${dataUrl}" alt="Review Stand" />
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
      img.onload = () => setTimeout(triggerPrint, 120);
    } else {
      setTimeout(triggerPrint, 120);
    }
  };

  // Action: Copy Review Link with Inline Toast
  const copyReviewLink = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = reviewUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  return (
    <div className="qr-page">
      {/* Hidden QR Canvas for high-res rendering */}
      <div className="qr-hidden-canvas">
        {business && (
          <QRCodeCanvas
            ref={qrRef}
            value={reviewUrl}
            size={340}
            level="H"
            bgColor="#ffffff"
            fgColor="#1a1a2e"
          />
        )}
      </div>

      {/* Top Bar (No 'official review touchpoint' text) */}
      <header className="qr-header">
        <div className="qr-kicker-pill">
          <span>❖</span> PRINT & QR STAND STUDIO
        </div>
        <h1 className="qr-title">QR Stand & Review Studio</h1>
        <p className="qr-subtitle">
          Customize your review stand colors, choose your brand wave gradient, and export print-ready physical displays.
        </p>
      </header>

      {/* Error state */}
      {error && (
        <div className="qr-error-banner" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="qr-loading-container">
          <div className="qr-loading-spinner" />
          <p style={{ fontWeight: 800, fontSize: '0.9rem', color: '#666' }}>Loading studio workspace...</p>
        </div>
      )}

      {/* Main Studio Content */}
      {!loading && business && (
        <>
          <div className="qr-studio">
            {/* Left Column: Controls & Studio Tools */}
            <div className="qr-controls-panel">
              {/* Section 1: Stand Style & Color Palette */}
              <div className="qr-section">
                <div className="qr-section-header">
                  <h3 className="qr-section-title">
                    <span className="qr-step-num">1</span>
                    Stand Theme & Color Palette
                  </h3>
                </div>

                {/* Theme Preset Cards */}
                <div className="qr-theme-grid">
                  {(Object.keys(THEMES) as PosterTheme[]).map((themeKey) => {
                    const t = THEMES[themeKey];
                    const isSelected = activeTheme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        className={`qr-theme-card ${isSelected ? 'active' : ''}`}
                        onClick={() => handleSelectTheme(themeKey)}
                      >
                        <div
                          className="qr-theme-swatch"
                          style={{
                            background: themeKey === 'custom_wave' ? standBg : t.standBg,
                            borderColor: themeKey === 'custom_wave' ? brandColor : '#1A1A1A',
                          }}
                        >
                          <div
                            className="qr-theme-swatch-inner"
                            style={{
                              background: themeKey === 'custom_wave' ? brandColor : t.brandColor,
                            }}
                          />
                        </div>
                        <div className="qr-theme-info">
                          <span className="qr-theme-name">{t.name}</span>
                          <span className="qr-theme-desc">{t.desc}</span>
                        </div>
                        {isSelected && <span className="qr-theme-check">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Brand Color & Stand Background Customizer */}
                <div className="qr-brand-customizer">
                  {/* Wave / Brand Accent Color */}
                  <p className="qr-brand-label">
                    <span>Wave & Brand Accent Color</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{brandColor}</span>
                  </p>

                  <div className="qr-brand-swatches">
                    {POPULAR_BRAND_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.color}
                        type="button"
                        className={`qr-brand-chip ${brandColor.toLowerCase() === swatch.color.toLowerCase() ? 'active' : ''}`}
                        style={{ background: swatch.color }}
                        title={swatch.name}
                        onClick={() => handleBrandColorChange(swatch.color)}
                      >
                        {brandColor.toLowerCase() === swatch.color.toLowerCase() && '✓'}
                      </button>
                    ))}
                  </div>

                  <div className="qr-color-picker-row">
                    <div className="qr-native-color-wrap" style={{ background: brandColor }}>
                      <input
                        type="color"
                        className="qr-native-color-input"
                        value={brandColor}
                        onChange={(e) => handleBrandColorChange(e.target.value)}
                        title="Pick brand color"
                      />
                    </div>
                    <input
                      type="text"
                      className="qr-hex-input"
                      value={brandColor}
                      maxLength={7}
                      onChange={(e) => handleBrandColorChange(e.target.value)}
                      placeholder="#1A56DB"
                    />
                  </div>

                  {/* Stand Background Color */}
                  <p className="qr-brand-label" style={{ marginTop: '0.35rem' }}>
                    <span>Stand Background Color</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{standBg}</span>
                  </p>

                  <div className="qr-bg-tones-row">
                    {STAND_BG_PRESETS.map((tone) => (
                      <button
                        key={tone.color}
                        type="button"
                        className={`qr-bg-tone-btn ${standBg.toLowerCase() === tone.color.toLowerCase() ? 'active' : ''}`}
                        onClick={() => handleStandBgChange(tone.color)}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            borderRadius: '2px',
                            border: '1px solid #1A1A1A',
                            background: tone.color,
                          }}
                        />
                        {tone.name}
                      </button>
                    ))}
                  </div>

                  <div className="qr-color-picker-row">
                    <div className="qr-native-color-wrap" style={{ background: standBg }}>
                      <input
                        type="color"
                        className="qr-native-color-input"
                        value={standBg}
                        onChange={(e) => handleStandBgChange(e.target.value)}
                        title="Pick custom stand background color"
                      />
                    </div>
                    <input
                      type="text"
                      className="qr-hex-input"
                      value={standBg}
                      maxLength={7}
                      onChange={(e) => handleStandBgChange(e.target.value)}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Call to Action */}
              <div className="qr-section">
                <div className="qr-section-header">
                  <h3 className="qr-section-title">
                    <span className="qr-step-num">2</span>
                    Headline Call to Action
                  </h3>
                </div>
                <div className="qr-cta-presets">
                  {CTA_PRESETS.map((preset) => {
                    const isSelected = !isCustomCta && selectedCta === preset;
                    return (
                      <div
                        key={preset}
                        className={`qr-cta-pill ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedCta(preset);
                          setIsCustomCta(false);
                        }}
                      >
                        <div className="qr-radio-dot" />
                        <span>{preset}</span>
                      </div>
                    );
                  })}

                  <div
                    className={`qr-cta-pill ${isCustomCta ? 'active' : ''}`}
                    onClick={() => setIsCustomCta(true)}
                  >
                    <div className="qr-radio-dot" />
                    <span>Write Custom Headline...</span>
                  </div>

                  {isCustomCta && (
                    <div className="qr-custom-input-wrap">
                      <input
                        type="text"
                        className="qr-custom-input"
                        placeholder="e.g. Scan to rate your visit today!"
                        value={customCta}
                        maxLength={50}
                        onChange={(e) => setCustomCta(e.target.value)}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Export & Print Actions */}
              <div className="qr-section">
                <div className="qr-section-header">
                  <h3 className="qr-section-title">
                    <span className="qr-step-num">3</span>
                    Export & Deploy Actions
                  </h3>
                </div>
                <div className="qr-actions-stack">
                  <button
                    type="button"
                    className="qr-btn-primary"
                    onClick={downloadPoster}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Printable Stand (PNG)
                  </button>

                  <div className="qr-btn-row">
                    <button
                      type="button"
                      className="qr-btn-secondary"
                      onClick={downloadQROnly}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                      QR Only (PNG)
                    </button>

                    <button
                      type="button"
                      className="qr-btn-outline"
                      onClick={handlePrint}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Print Directly
                    </button>
                  </div>

                  <div className="qr-copy-container">
                    <button
                      type="button"
                      className="qr-btn-copy"
                      onClick={copyReviewLink}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy Review Link to Clipboard
                    </button>

                    {copiedToast && (
                      <div className="qr-copy-toast">
                        ✓ Review link copied to clipboard!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Stand Preview */}
            <div className="qr-preview-panel">
              <div className="qr-preview-card">
                <div className="qr-preview-badge">
                  <span>●</span> LIVE STAND PREVIEW
                </div>

                <div className="qr-preview-img-wrap" style={{ background: standBg }}>
                  {previewDataUrl ? (
                    <img
                      src={previewDataUrl}
                      alt="Review stand preview"
                      className="qr-preview-img"
                    />
                  ) : (
                    <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                      <div className="qr-loading-spinner" style={{ margin: '0 auto 1rem' }} />
                      <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>Generating live preview...</span>
                    </div>
                  )}
                </div>

                <div className="qr-preview-meta">
                  <span>Scan Target URL:</span>
                  <span className="qr-preview-url-pill" title={reviewUrl}>
                    {reviewUrl}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Component 3: Physical Placement Playbook */}
          <section className="qr-playbook-section">
            <h2 className="qr-playbook-title">
              <span>📍</span> Physical Placement Playbook & Best Practices
            </h2>
            <div className="qr-playbook-grid">
              <div className="qr-playbook-card mint">
                <div className="qr-playbook-icon-wrap">🏪</div>
                <h3 className="qr-playbook-headline">Point of Sale & Counter</h3>
                <p className="qr-playbook-body">
                  Position directly facing the customer next to the payment terminal where average dwell time is 30–60 seconds.
                </p>
                <div className="qr-playbook-stat">
                  <span>⚡</span> +42% Scan Rate
                </div>
              </div>

              <div className="qr-playbook-card butter">
                <div className="qr-playbook-icon-wrap">🍽️</div>
                <h3 className="qr-playbook-headline">Table Tents & Packaging</h3>
                <p className="qr-playbook-body">
                  Print compact 4×6 acrylic table tents or include custom sticker inserts directly inside takeaway bag handles.
                </p>
                <div className="qr-playbook-stat">
                  <span>🎯</span> High Intent Timing
                </div>
              </div>

              <div className="qr-playbook-card sky">
                <div className="qr-playbook-icon-wrap">🚪</div>
                <h3 className="qr-playbook-headline">Exit Door & Window Decals</h3>
                <p className="qr-playbook-body">
                  Place eye-level glass stickers at the main exit doorway with a friendly "Thank you for visiting us today!" callout.
                </p>
                <div className="qr-playbook-stat">
                  <span>★</span> Peak Satisfaction Scan
                </div>
              </div>
            </div>
          </section>

          {/* Component 4: Locations & Touchpoints Card */}
          <section className="qr-location-section">
            <div className="qr-location-card">
              <div className="qr-location-top">
                <div className="qr-location-title-wrap">
                  <h2 className="qr-location-title">Registered Touchpoint Locations</h2>
                </div>
                <button
                  type="button"
                  className="qr-location-badge-coming"
                  disabled
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Location (Multi-Branch Coming Soon)
                </button>
              </div>

              {/* Primary Location */}
              <div className="qr-location-row">
                <div className="qr-location-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24" style={{ color: '#1A1A1A' }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="qr-location-details">
                  <h3 className="qr-location-name">{business.name || 'Primary Business Location'}</h3>
                  <p className="qr-location-meta">
                    <span>{business.businessType || 'General Business'}</span>
                    <span>•</span>
                    <span>Primary Location</span>
                    <span>•</span>
                    <span>1 QR Matrix Generated</span>
                  </p>
                </div>
                <div className="qr-location-status-badge">
                  <span>●</span> ACTIVE
                </div>
              </div>

              {/* Multi-location roadmap banner */}
              <div className="qr-multi-banner">
                <span className="qr-multi-banner-icon">💡</span>
                <p className="qr-multi-banner-text">
                  <strong>Need multi-branch review tracking?</strong> In our upcoming release, you will be able to provision unique QR codes and individualized review capture funnels for every branch or counter staff member.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
