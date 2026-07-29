import React from 'react';
import { colors, inputStyle, labelStyle, primaryBtnStyle, outlineBtnStyle } from '../sharedStyles';

interface BusinessProfileStepProps {
  businessName: string;
  setBusinessName: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  logoPreview: string;
  handleDrop: (e: React.DragEvent) => void;
  handleLogoSelect: (file: File) => void;
  error: string;
  goBack: () => void;
  goNext: () => void;
}

export function BusinessProfileStep({
  businessName,
  setBusinessName,
  city,
  setCity,
  logoPreview,
  handleDrop,
  handleLogoSelect,
  error,
  goBack,
  goNext,
}: BusinessProfileStepProps) {
  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, textAlign: 'center', marginBottom: '10px', color: colors.ink }}>
        Tell us about your place
      </h1>
      <p style={{ fontSize: '14px', color: colors.inkMuted, textAlign: 'center', marginBottom: '28px', lineHeight: 1.5 }}>
        This info helps us personalize the review experience
      </p>

      <div className="flex flex-col gap-6 mb-8">
        <div>
          <label htmlFor="businessName" style={labelStyle}>Business name</label>
          <input
            id="businessName"
            type="text"
            placeholder="e.g. Spice Kitchen"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            autoFocus
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="city" style={labelStyle}>City</label>
          <input
            id="city"
            type="text"
            placeholder="e.g. Mumbai"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Logo (optional)</label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById('logoInput')?.click()}
            style={{
              border: `1px dashed ${colors.border}`,
              borderRadius: '9px',
              padding: '32px 16px',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="h-24 w-24 rounded-lg object-cover mx-auto" />
            ) : (
              <div>
                <span className="text-3xl block mb-3" style={{ color: colors.inkFaint }}>📷</span>
                <p style={{ fontSize: '14px', color: colors.inkMuted, margin: 0 }}>
                  Drag &amp; drop or click to upload
                </p>
                <p style={{ fontSize: '12px', color: colors.inkFaint, margin: '4px 0 0' }}>
                  JPEG, PNG, WebP · Max 2 MB
                </p>
              </div>
            )}
            <input
              id="logoInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoSelect(file);
              }}
            />
          </div>
        </div>
      </div>

      {error && <p style={{ color: colors.danger, fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>{error}</p>}

      <div className="flex justify-between items-center gap-3" style={{ marginTop: '20px' }}>
        <button style={outlineBtnStyle} onClick={goBack}>Back</button>
        <button
          style={{ ...primaryBtnStyle, flex: 1, opacity: !businessName.trim() ? 0.5 : 1, cursor: !businessName.trim() ? 'not-allowed' : 'pointer' }}
          disabled={!businessName.trim()}
          onClick={goNext}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
