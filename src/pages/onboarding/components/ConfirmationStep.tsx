import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { colors, primaryBtnStyle, outlineBtnStyle } from '../sharedStyles';
import type { Business } from '../../../types';

const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;

interface ConfirmationStepProps {
  createdBusiness: Business | null;
  qrRef: React.RefObject<HTMLCanvasElement | null>;
  downloadQR: () => void;
}

export function ConfirmationStep({
  createdBusiness,
  qrRef,
  downloadQR,
}: ConfirmationStepProps) {
  const navigate = useNavigate();

  if (!createdBusiness) return null;

  return (
    <div className="text-center">
      <div
        style={{
          width: '32px',
          height: '32px',
          border: `2px solid ${colors.green}`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.green,
          margin: '0 auto 12px',
          fontSize: '16px',
        }}
      >
        ✓
      </div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', color: colors.ink }}>
        {createdBusiness.name} is ready
      </h1>

      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          padding: '24px',
          border: `1px solid ${colors.border}`,
          borderRadius: '9px',
          marginBottom: '24px',
        }}
      >
        <div style={{ background: '#fff', padding: '12px', borderRadius: '8px' }}>
          <QRCodeCanvas
            ref={qrRef}
            value={`${PUBLIC_APP_URL}/r/${createdBusiness.businessCode}`}
            size={160}
            level="H"
            bgColor="#ffffff"
            fgColor={colors.ink}
            imageSettings={
              createdBusiness.logoUrl
                ? { src: createdBusiness.logoUrl, height: 34, width: 34, excavate: true }
                : undefined
            }
          />
        </div>
        <p style={{ fontSize: '13px', color: colors.inkMuted, margin: 0 }}>
          reviewboost.app/r/{createdBusiness.businessCode}
        </p>
        <button style={{ ...outlineBtnStyle, width: '100%' }} onClick={downloadQR}>
          ⬇ Download QR code
        </button>
      </div>

      <button
        style={{ ...primaryBtnStyle, width: '100%' }}
        onClick={() => navigate('/dashboard')}
      >
        Go to dashboard →
      </button>
    </div>
  );
}
