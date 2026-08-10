import React, { useState } from 'react';

export interface WhatsappTemplateConfig {
  templateKey: 'warm' | 'review_request' | 'direct' | 'thank_you';
  customMessage: string;
  buttonText?: string;
}

interface TemplateOption {
  key: WhatsappTemplateConfig['templateKey'];
  name: string;
  badge: string;
  badgeClass: string;
  desc: string;
  icon: string;
  defaultMessage: string;
}

interface WhatsappTemplateSelectorProps {
  businessName: string;
  reviewUrl?: string;
  value: WhatsappTemplateConfig;
  onChange: (val: WhatsappTemplateConfig) => void;
}

export const WhatsappTemplateSelector: React.FC<WhatsappTemplateSelectorProps> = ({
  businessName,
  reviewUrl,
  value,
  onChange,
}) => {
  // Default to Preview mode
  const [activeTab, setActiveTab] = useState<'preview' | 'editor'>('preview');

  const templates: TemplateOption[] = [
    {
      key: 'warm',
      name: 'Friendly & Warm (Recommended)',
      badge: '★ High Response',
      badgeClass: 'campaign-status-badge campaign-status-badge--running',
      desc: 'Warm, personable tone with emojis. Feels like a real message from the owner.',
      icon: '☀️',
      defaultMessage: `Hi {{name}}! 🙏 Thanks for visiting {{businessName}}. We would truly appreciate your feedback! Could you take 30 seconds to rate your experience with us?`,
    },
    {
      key: 'review_request',
      name: 'Clean & Professional',
      badge: 'Formal',
      badgeClass: 'campaign-status-badge campaign-status-badge--draft',
      desc: 'Polite and corporate tone. Ideal for B2B, clinics, consulting, and premium services.',
      icon: '🏛️',
      defaultMessage: `Hello {{name}}, thank you for choosing {{businessName}}. We strive for excellence and would greatly appreciate your feedback to help us serve you better:`,
    },
    {
      key: 'direct',
      name: 'Quick & Direct',
      badge: 'Fast Ask',
      badgeClass: 'campaign-status-badge campaign-status-badge--draft',
      desc: 'Short 1-line ask. Ultra clean and quick to read on mobile.',
      icon: '⚡',
      defaultMessage: `Hi {{name}}, quick favor from {{businessName}}! ⭐ Got 30 seconds to rate your experience with us today?`,
    },
    {
      key: 'thank_you',
      name: 'Customer Appreciation',
      badge: 'Soft & Friendly',
      badgeClass: 'campaign-status-badge campaign-status-badge--paused',
      desc: 'Thank you message focused on customer appreciation with a gentle review ask.',
      icon: '❤️',
      defaultMessage: `Hi {{name}}! Thank you so much for visiting {{businessName}}. We hope everything was great! If you have a moment, we would love your feedback:`,
    },
  ];

  const handleSelectTemplate = (t: TemplateOption) => {
    onChange({
      ...value,
      templateKey: t.key,
      customMessage:
        value.customMessage &&
        value.customMessage !== '' &&
        !templates.some((tmpl) => tmpl.defaultMessage === value.customMessage)
          ? value.customMessage
          : t.defaultMessage,
      buttonText: value.buttonText || '⭐ Leave a Google Review',
    });
  };

  const selectedTemplate = templates.find((t) => t.key === value.templateKey) || templates[0];
  const sampleName = 'Soham';
  const effectiveReviewUrl = reviewUrl || 'https://g.page/r/your-review-link';
  const buttonLabel = value.buttonText || '⭐ Leave a Google Review';
  const activeMessage = value.customMessage || selectedTemplate.defaultMessage;
  const displayMessage = activeMessage
    .replace(/\{\{businessName\}\}/g, businessName || 'RajBhog')
    .replace(/\{\{customerName\}\}/g, sampleName)
    .replace(/\{\{name\}\}/g, sampleName)
    .replace(/\{\{reviewUrl\}\}/g, '');

  return (
    <div style={{ background: '#fff', border: '1px solid #E3E1D9', borderRadius: '12px', padding: '20px', margin: 0 }}>
      {/* Header & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E3E1D9', paddingBottom: '14px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px 0' }}>
            WhatsApp Message Tone & Button
          </h3>
          <p style={{ fontSize: '12px', color: '#6B6B63', margin: 0 }}>
            Choose a tone preset with an interactive click button (with hidden link) for maximum conversions.
          </p>
        </div>

        <div style={{ display: 'flex', background: '#F3F2EE', borderRadius: '8px', padding: '3px', gap: '3px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'preview' ? '#fff' : 'transparent',
              color: activeTab === 'preview' ? '#1A1A1A' : '#6B6B63',
              boxShadow: activeTab === 'preview' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            👁️ Live WhatsApp Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'editor' ? '#fff' : 'transparent',
              color: activeTab === 'editor' ? '#1A1A1A' : '#6B6B63',
              boxShadow: activeTab === 'editor' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            ✏️ Customize Message & Button
          </button>
        </div>
      </div>

      {/* 4 Compact Tone Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {templates.map((t) => {
          const isSelected = value.templateKey === t.key;
          return (
            <div
              key={t.key}
              onClick={() => handleSelectTemplate(t)}
              style={{
                border: isSelected ? '2px solid #1A1A1A' : '1px solid #E3E1D9',
                borderRadius: '10px',
                padding: '12px 14px',
                cursor: 'pointer',
                background: isSelected ? '#F9F8F5' : '#fff',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{t.icon}</span> {t.name.split(' (')[0]}
                  </span>
                  <span className={t.badgeClass} style={{ fontSize: '10px', padding: '1px 6px' }}>{t.badge}</span>
                </div>
                <p style={{ fontSize: '11px', color: '#6B6B63', margin: 0, lineHeight: 1.4 }}>
                  {t.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Content: Preview Mode */}
      {activeTab === 'preview' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
          {/* Realistic WhatsApp Chat Device Preview */}
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              border: '1px solid #D1CDC7',
              background: '#E5DDD5',
            }}
          >
            {/* WhatsApp Header */}
            <div
              style={{
                background: '#075E54',
                color: '#fff',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#128C7E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '15px',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  flexShrink: 0,
                }}
              >
                {(businessName || 'R').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {businessName || 'RajBhog'}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)' }}>online</div>
              </div>
              <div style={{ display: 'flex', gap: '14px', opacity: 0.85 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </div>
            </div>

            {/* Chat Body Wallpaper */}
            <div
              style={{
                padding: '18px 14px',
                minHeight: '230px',
                backgroundImage: 'radial-gradient(#D5CDC2 1px, transparent 1px)',
                backgroundSize: '16px 16px',
                backgroundColor: '#EFEAE2',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Date pill */}
              <div style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.85)', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', color: '#54656F', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                TODAY
              </div>

              {/* Message Bubble */}
              <div
                style={{
                  alignSelf: 'flex-start',
                  width: '92%',
                  maxWidth: '380px',
                  background: '#FFFFFF',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '12px 14px 10px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                  position: 'relative',
                }}
              >
                {/* Title */}
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111B21', marginBottom: '6px' }}>
                  *{businessName || 'RajBhog'}*
                </div>

                {/* Message Body */}
                <div
                  style={{
                    fontSize: '13px',
                    color: '#111B21',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {displayMessage}
                </div>

                {/* Footer text */}
                <div
                  style={{
                    fontSize: '11px',
                    color: '#667781',
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  Reply STOP to unsubscribe
                </div>

                {/* WhatsApp Native Flow Interactive URL Button */}
                <div
                  style={{
                    marginTop: '10px',
                    borderTop: '1px solid rgba(0,0,0,0.08)',
                    paddingTop: '8px',
                  }}
                >
                  <div
                    style={{
                      background: '#F0F2F5',
                      border: '1px solid #00A884',
                      borderRadius: '8px',
                      padding: '9px 14px',
                      color: '#00A884',
                      fontSize: '13px',
                      fontWeight: 700,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    <span>{buttonLabel}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#667781', textAlign: 'center', marginTop: '4px' }}>
                    🔗 Direct link hidden inside button ({effectiveReviewUrl})
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px',
                    marginTop: '6px',
                    fontSize: '10px',
                    color: '#667781',
                  }}
                >
                  <span>10:42 AM</span>
                  <span style={{ color: '#53BDEB', fontWeight: 700 }}>✓✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Editor Mode */}
      {activeTab === 'editor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1A1A1A', marginBottom: '6px' }}>
              WhatsApp Message Text
            </label>
            <textarea
              rows={5}
              value={value.customMessage || selectedTemplate.defaultMessage}
              onChange={(e) => onChange({ ...value, customMessage: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #E3E1D9',
                fontSize: '13px',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
              placeholder="Enter custom message..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1A1A1A', marginBottom: '6px' }}>
              Button Text (Hidden Link)
            </label>
            <input
              type="text"
              value={value.buttonText || '⭐ Leave a Google Review'}
              onChange={(e) => onChange({ ...value, buttonText: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #E3E1D9',
                fontSize: '13px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              placeholder="e.g. ⭐ Leave a Google Review"
            />
            <span style={{ fontSize: '11px', color: '#6B6B63', display: 'block', marginTop: '4px' }}>
              This creates a professional WhatsApp interactive button. When clicked, it opens your Google Review page directly without showing the ugly long URL.
            </span>
          </div>

          <div style={{ background: '#F9F8F5', border: '1px solid #E3E1D9', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#6B6B63' }}>
            <strong>Available Placeholders:</strong> <code>{'{{name}}'}</code> (Customer Name), <code>{'{{businessName}}'}</code> (Business Name).
          </div>
        </div>
      )}
    </div>
  );
};
