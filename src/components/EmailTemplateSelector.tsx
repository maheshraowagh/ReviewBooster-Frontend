import React, { useState } from 'react';

export interface EmailTemplateConfig {
  templateKey: 'personal' | 'clean' | 'warm' | 'minimal';
  subject: string;
  greeting: string;
  customMessage: string;
  buttonText: string;
}

interface TemplateOption {
  key: EmailTemplateConfig['templateKey'];
  name: string;
  badge: string;
  badgeClass: string;
  desc: string;
  icon: string;
  defaultSubject: string;
  defaultGreeting: string;
  defaultBody: string;
  defaultButton: string;
}

interface EmailTemplateSelectorProps {
  businessName: string;
  logoUrl?: string;
  value: EmailTemplateConfig;
  onChange: (val: EmailTemplateConfig) => void;
}

export const EmailTemplateSelector: React.FC<EmailTemplateSelectorProps> = ({
  businessName,
  logoUrl,
  value,
  onChange,
}) => {
  // Default to Preview tab as requested by user
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('preview');

  const templates: TemplateOption[] = [
    {
      key: 'personal',
      name: 'Personal (Recommended)',
      badge: '★ Highest Response',
      badgeClass: 'ec-status-badge running',
      desc: '1-to-1 owner email. Asks for a quick 30-sec favor.',
      icon: '✉️',
      defaultSubject: `Quick question from ${businessName || 'our business'}`,
      defaultGreeting: 'Hi {{name}},',
      defaultBody: `Thanks for visiting ${businessName || 'us'}! As a small local business, customer feedback means everything to us. Could you leave a quick 30-second review?`,
      defaultButton: 'Leave a Review →',
    },
    {
      key: 'clean',
      name: 'Clean & Professional',
      badge: 'Formal Card',
      badgeClass: 'ec-status-badge draft',
      desc: 'Formal structured card with logo and corporate tone.',
      icon: '🏛️',
      defaultSubject: `How was your experience at ${businessName || 'our business'}?`,
      defaultGreeting: 'Dear {{name}},',
      defaultBody: `Thank you for choosing ${businessName || 'us'}. We strive for excellence and would greatly appreciate your feedback to help us serve you better.`,
      defaultButton: 'Rate Your Experience',
    },
    {
      key: 'warm',
      name: 'Warm & Friendly',
      badge: 'Soft & Friendly',
      badgeClass: 'ec-status-badge paused',
      desc: 'Enthusiastic tone with soft warm card design & emojis.',
      icon: '☀️',
      defaultSubject: `We hope you loved your visit to ${businessName || 'us'}! 🌟`,
      defaultGreeting: 'Hey {{name}}! 😊',
      defaultBody: `Thank you so much for dropping by! We loved having you. If you had a great experience, could you share the love with a quick Google review?`,
      defaultButton: 'Share the Love ❤️',
    },
    {
      key: 'minimal',
      name: 'Quick & Direct',
      badge: 'Minimalist',
      badgeClass: 'ec-status-badge draft',
      desc: 'Concise 1-line ask. Ultra clean & fast to read.',
      icon: '⚡',
      defaultSubject: `30 seconds for ${businessName || 'us'}?`,
      defaultGreeting: 'Hi {{name}},',
      defaultBody: `Your feedback helps us grow. Tap below to let us know how we did today.`,
      defaultButton: 'Review Us in 30 Seconds →',
    },
  ];

  // Select a template option & auto-populate tone/preset text if empty or matching another template
  const handleSelectTemplate = (t: TemplateOption) => {
    onChange({
      templateKey: t.key,
      subject: value.subject && value.subject !== '' && !templates.some(tmpl => tmpl.defaultSubject === value.subject)
        ? value.subject
        : t.defaultSubject,
      greeting: value.greeting && value.greeting !== '' && !templates.some(tmpl => tmpl.defaultGreeting === value.greeting)
        ? value.greeting
        : t.defaultGreeting,
      customMessage: value.customMessage && value.customMessage !== '' && !templates.some(tmpl => tmpl.defaultBody === value.customMessage)
        ? value.customMessage
        : t.defaultBody,
      buttonText: value.buttonText && value.buttonText !== '' && !templates.some(tmpl => tmpl.defaultButton === value.buttonText)
        ? value.buttonText
        : t.defaultButton,
    });
  };

  const updateField = <K extends keyof EmailTemplateConfig>(field: K, val: EmailTemplateConfig[K]) => {
    onChange({ ...value, [field]: val });
  };

  const selectedTemplate = templates.find((t) => t.key === value.templateKey) || templates[0];
  const sampleName = 'John';
  const activeGreeting = value.greeting || selectedTemplate.defaultGreeting;
  const displayGreeting = activeGreeting.replace(/\{\{name\}\}/g, sampleName);
  const activeBody = value.customMessage || selectedTemplate.defaultBody;
  const displayBody = activeBody.replace(/\{\{businessName\}\}/g, businessName || 'our business').replace(/\{\{name\}\}/g, sampleName);
  const displayButton = value.buttonText || selectedTemplate.defaultButton;
  const displaySubject = value.subject || selectedTemplate.defaultSubject;

  return (
    <div className="ec-panel" style={{ padding: '20px', margin: '0' }}>
      {/* Header & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E3E1D9', paddingBottom: '14px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px 0' }}>Email Design & Tone</h3>
          <p style={{ fontSize: '12px', color: '#6B6B63', margin: 0 }}>
            Select a style tone to auto-fill different wording, then preview or customize.
          </p>
        </div>

        <div className="ec-import-tabs" style={{ marginBottom: 0 }}>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`ec-import-tab ${activeTab === 'preview' ? 'active' : ''}`}
          >
            👁️ Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`ec-import-tab ${activeTab === 'editor' ? 'active' : ''}`}
          >
            ✏️ Customize Text
          </button>
        </div>
      </div>

      {/* Template Chooser Grid — COMPACT 2x2 cards that do NOT take up vertical space */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {templates.map((t) => {
          const isSelected = value.templateKey === t.key;
          return (
            <div
              key={t.key}
              onClick={() => handleSelectTemplate(t)}
              style={{
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: '8px',
                border: isSelected ? '2px solid #1A1A1A' : '1px solid #E3E1D9',
                background: isSelected ? '#F9F8F5' : '#fff',
                transition: 'all 0.12s ease',
                boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{t.icon}</span> {t.name}
                </span>
                <span className={t.badgeClass} style={{ fontSize: '9px', padding: '1px 6px', height: 'auto', lineHeight: '1.4' }}>
                  {t.badge}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#6B6B63', margin: 0, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* 👁️ Preview Tab (OPEN BY DEFAULT) */}
      {activeTab === 'preview' && (
        <div style={{ background: '#F9F8F5', border: '1px solid #E3E1D9', borderRadius: '10px', padding: '16px' }}>
          {/* Subject Line Preview Bar */}
          <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E3E1D9', marginBottom: '16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: '#6B6B63', flexShrink: 0 }}>Subject:</span>
            <span style={{ fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displaySubject}
            </span>
          </div>

          {/* Clean Card Preview */}
          {value.templateKey === 'clean' && (
            <div style={{ maxWidth: '400px', margin: '0 auto', background: '#fff', borderRadius: '10px', border: '1px solid #E3E1D9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #F3F2EE' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt={businessName} style={{ height: '32px', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontWeight: 700, fontSize: '16px', color: '#1A1A1A' }}>{businessName || 'Your Business'}</span>
                )}
              </div>
              <div style={{ padding: '20px', fontSize: '13px', color: '#1A1A1A', lineHeight: 1.6 }}>
                <p style={{ fontWeight: 600, margin: '0 0 12px 0' }}>{displayGreeting}</p>
                <p style={{ color: '#6B6B63', margin: '0 0 16px 0' }}>{displayBody}</p>
                <div>
                  <span style={{ display: 'inline-block', background: '#3F7D45', color: '#fff', fontWeight: 600, padding: '9px 18px', borderRadius: '6px', fontSize: '12px' }}>
                    {displayButton}
                  </span>
                </div>
              </div>
              <div style={{ background: '#F9F8F5', padding: '12px 20px', borderTop: '1px solid #F3F2EE', fontSize: '10px', color: '#A3A39A' }}>
                Sent on behalf of {businessName || 'Your Business'} • <span style={{ textDecoration: 'underline' }}>Unsubscribe</span>
              </div>
            </div>
          )}

          {/* Warm & Friendly Preview */}
          {value.templateKey === 'warm' && (
            <div style={{ maxWidth: '400px', margin: '0 auto', background: '#fff', borderRadius: '16px', border: '1px solid #F3E5D8', boxShadow: '0 4px 12px rgba(139,115,85,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '24px 24px', fontSize: '13px', color: '#1A1A1A', lineHeight: 1.6 }}>
                {logoUrl && <img src={logoUrl} alt={businessName} style={{ height: '28px', objectFit: 'contain', marginBottom: '12px' }} />}
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#3A3226', margin: '0 0 12px 0' }}>{businessName || 'Your Business'}</h3>
                <p style={{ fontWeight: 600, color: '#3A3226', margin: '0 0 12px 0' }}>{displayGreeting}</p>
                <p style={{ color: '#6B6B63', margin: '0 0 18px 0' }}>{displayBody}</p>
                <div>
                  <span style={{ display: 'inline-block', background: '#D35400', color: '#fff', fontWeight: 600, padding: '9px 20px', borderRadius: '99px', fontSize: '12px', boxShadow: '0 3px 8px rgba(211,84,0,0.2)' }}>
                    {displayButton}
                  </span>
                </div>
              </div>
              <div style={{ background: '#FDF9F3', padding: '12px 24px', borderTop: '1px solid #F3E5D8', fontSize: '10px', color: '#8B7355', opacity: 0.8 }}>
                Sent on behalf of {businessName || 'Your Business'} • <span style={{ textDecoration: 'underline' }}>Unsubscribe</span>
              </div>
            </div>
          )}

          {/* Quick & Minimal Preview */}
          {value.templateKey === 'minimal' && (
            <div style={{ maxWidth: '400px', margin: '0 auto', background: '#fff', borderRadius: '8px', border: '1px solid #E3E1D9', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', padding: '20px', fontSize: '13px', color: '#1A1A1A', lineHeight: 1.5 }}>
              <p style={{ fontWeight: 600, margin: '0 0 10px 0' }}>{displayGreeting}</p>
              <p style={{ color: '#4A4A43', margin: '0 0 14px 0' }}>{displayBody}</p>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ display: 'inline-block', background: '#2563EB', color: '#fff', fontWeight: 600, padding: '7px 14px', borderRadius: '6px', fontSize: '12px' }}>
                  {displayButton}
                </span>
              </div>
              <p style={{ fontSize: '10px', color: '#A3A39A', paddingTop: '12px', borderTop: '1px solid #F3F2EE', margin: 0 }}>
                Sent by {businessName || 'Your Business'}. <span style={{ textDecoration: 'underline' }}>Unsubscribe</span>
              </p>
            </div>
          )}

          {/* Personal Preview */}
          {value.templateKey === 'personal' && (
            <div style={{ maxWidth: '400px', margin: '0 auto', background: '#fff', borderRadius: '8px', border: '1px solid #E3E1D9', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', padding: '20px', fontSize: '13px', color: '#1A1A1A', lineHeight: 1.6 }}>
              <p style={{ fontWeight: 600, margin: '0 0 12px 0' }}>{displayGreeting}</p>
              <p style={{ color: '#1A1A1A', margin: '0 0 16px 0' }}>{displayBody}</p>
              <div style={{ marginBottom: '18px' }}>
                <span style={{ display: 'inline-block', background: '#1A1A1A', color: '#fff', fontWeight: 600, padding: '8px 16px', borderRadius: '6px', fontSize: '12px' }}>
                  {displayButton}
                </span>
              </div>
              <p style={{ fontSize: '10px', color: '#A3A39A', paddingTop: '12px', borderTop: '1px solid #F3F2EE', margin: 0 }}>
                Sent by {businessName || 'Your Business'}. <span style={{ textDecoration: 'underline' }}>Unsubscribe</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ✏️ Editor Tab */}
      {activeTab === 'editor' && (
        <div>
          <div className="ec-field">
            <label className="ec-label">
              Subject Line <span style={{ color: '#C0392B' }}>*</span>
            </label>
            <input
              type="text"
              value={value.subject}
              onChange={(e) => updateField('subject', e.target.value)}
              placeholder={selectedTemplate.defaultSubject}
              className="ec-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div className="ec-field" style={{ marginBottom: 0 }}>
              <label className="ec-label">Greeting Line</label>
              <input
                type="text"
                value={value.greeting}
                onChange={(e) => updateField('greeting', e.target.value)}
                placeholder={selectedTemplate.defaultGreeting}
                className="ec-input"
              />
              <span className="ec-label-hint" style={{ display: 'block', marginTop: '4px', marginLeft: 0 }}>Use {"{{name}}"} for recipient name.</span>
            </div>

            <div className="ec-field" style={{ marginBottom: 0 }}>
              <label className="ec-label">CTA Button Text</label>
              <input
                type="text"
                value={value.buttonText}
                onChange={(e) => updateField('buttonText', e.target.value)}
                placeholder={selectedTemplate.defaultButton}
                className="ec-input"
              />
            </div>
          </div>

          <div className="ec-field" style={{ marginBottom: 0 }}>
            <label className="ec-label">Custom Body Message</label>
            <textarea
              rows={3}
              value={value.customMessage}
              onChange={(e) => updateField('customMessage', e.target.value)}
              placeholder={selectedTemplate.defaultBody}
              className="ec-input ec-textarea"
            />
            <span className="ec-label-hint" style={{ display: 'block', marginTop: '4px', marginLeft: 0 }}>
              Available tags: {"{{name}}"}, {"{{businessName}}"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
