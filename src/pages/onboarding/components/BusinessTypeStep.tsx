import { colors, inputStyle, labelStyle, primaryBtnStyle } from '../sharedStyles';

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'cafe', label: 'Café', icon: '☕' },
  { value: 'bakery', label: 'Bakery', icon: '🥖' },
  { value: 'other', label: 'Other', icon: '•••' },
];

interface BusinessTypeStepProps {
  businessType: string;
  setBusinessType: (val: string) => void;
  customBusinessType: string;
  setCustomBusinessType: (val: string) => void;
  error: string;
  goNext: () => void;
}

export function BusinessTypeStep({
  businessType,
  setBusinessType,
  customBusinessType,
  setCustomBusinessType,
  error,
  goNext,
}: BusinessTypeStepProps) {
  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, textAlign: 'center', marginBottom: '10px', color: colors.ink }}>
        Choose your business type
      </h1>
      <p style={{ fontSize: '14px', color: colors.inkMuted, textAlign: 'center', marginBottom: '28px', lineHeight: 1.5 }}>
        This sets up the right tags and copy for you
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {BUSINESS_TYPES.map((type) => {
          const selected = businessType === type.value;
          return (
            <button
              key={type.value}
              onClick={() => {
                setBusinessType(type.value);
                if (type.value !== 'other') setCustomBusinessType('');
              }}
              style={{
                border: `1px solid ${selected ? colors.borderActive : colors.border}`,
                borderWidth: selected ? '1.5px' : '1px',
                borderRadius: '9px',
                padding: '28px 12px',
                textAlign: 'center',
                background: colors.cardBg,
                cursor: 'pointer',
              }}
            >
              <span className="text-4xl mb-3 block">{type.icon}</span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: colors.ink }}>{type.label}</span>
            </button>
          );
        })}
      </div>

      {businessType === 'other' && (
        <div className="mb-8">
          <label htmlFor="customType" style={labelStyle}>
            Please specify your business type
          </label>
          <input
            id="customType"
            type="text"
            placeholder="e.g. Spa, Salon, Gym..."
            value={customBusinessType}
            onChange={(e) => setCustomBusinessType(e.target.value)}
            autoFocus
            style={inputStyle}
          />
        </div>
      )}

      {error && <p style={{ color: colors.danger, fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>{error}</p>}

      <button
        style={{
          ...primaryBtnStyle,
          width: '100%',
          marginTop: '20px',
          opacity: !businessType || (businessType === 'other' && !customBusinessType.trim()) ? 0.5 : 1,
          cursor: !businessType || (businessType === 'other' && !customBusinessType.trim()) ? 'not-allowed' : 'pointer',
        }}
        disabled={!businessType || (businessType === 'other' && !customBusinessType.trim())}
        onClick={goNext}
      >
        Continue →
      </button>
    </div>
  );
}
