import { colors, inputStyle, labelStyle, primaryBtnStyle } from '../sharedStyles';
import { ALL_CATEGORY_LIST } from '../../../config/businessCategoryConfig';

const BUSINESS_TYPES = [
  ...ALL_CATEGORY_LIST.map((cat) => ({
    value: cat.key,
    label: cat.displayName,
    icon: cat.icon,
  })),
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
      <p style={{ fontSize: '14px', color: colors.inkMuted, textAlign: 'center', marginBottom: '24px', lineHeight: 1.5 }}>
        This sets up the right tags, copy, and services for you
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
        maxHeight: '360px',
        overflowY: 'auto',
        paddingRight: '4px',
      }}>
        {BUSINESS_TYPES.map((type) => {
          const selected = businessType === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                setBusinessType(type.value);
                if (type.value !== 'other') setCustomBusinessType('');
              }}
              style={{
                border: `1.5px solid ${selected ? colors.borderActive : colors.border}`,
                borderRadius: '10px',
                padding: '16px 8px',
                textAlign: 'center',
                background: selected ? 'rgba(26, 26, 26, 0.04)' : colors.cardBg,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '6px' }}>{type.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: colors.ink, display: 'block', lineHeight: 1.3 }}>{type.label}</span>
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
