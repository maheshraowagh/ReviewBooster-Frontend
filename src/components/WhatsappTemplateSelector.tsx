import React, { useState, useEffect } from 'react';

export interface WhatsappTemplateConfig {
  templateKey: 'warm' | 'review_request' | 'direct' | 'thank_you';
  customMessage: string;
  buttonText?: string;
}

interface TemplateOption {
  key: WhatsappTemplateConfig['templateKey'];
  name: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  desc: string;
  icon: string;
  defaultMessage: string;
  defaultButtonText: string;
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
  // Two options: 'tone' (default) vs 'custom'
  const [activeOption, setActiveOption] = useState<'tone' | 'custom'>('tone');

  const templates: TemplateOption[] = [
    {
      key: 'warm',
      name: 'Friendly & Warm',
      badge: '★ Recommended',
      badgeBg: '#BAF7D0',
      badgeColor: '#065F46',
      desc: 'Personable & high response. Feels like a friendly personal text from the owner.',
      icon: '☀️',
      defaultMessage: `Hi {{name}}! 🙏 Thanks for visiting {{businessName}}. We would truly appreciate your feedback! Could you take 30 seconds to rate your experience with us?`,
      defaultButtonText: '⭐ Leave a Google Review',
    },
    {
      key: 'review_request',
      name: 'Clean & Professional',
      badge: 'Corporate',
      badgeBg: '#E0F2FE',
      badgeColor: '#0369A1',
      desc: 'Polite and formal tone. Ideal for B2B, clinics, consulting, and premium services.',
      icon: '🏛️',
      defaultMessage: `Hello {{name}}, thank you for choosing {{businessName}}. We strive for excellence and would greatly appreciate your feedback to help us serve you better:`,
      defaultButtonText: '⭐ Review Us on Google',
    },
    {
      key: 'direct',
      name: 'Quick & Direct',
      badge: 'Fast Ask',
      badgeBg: '#FED7AA',
      badgeColor: '#9A3412',
      desc: 'Short 1-line ask. Ultra clean, fast to read, and lowest friction on mobile.',
      icon: '⚡',
      defaultMessage: `Hi {{name}}, quick favor from {{businessName}}! ⭐ Got 30 seconds to rate your experience with us today?`,
      defaultButtonText: '⭐ Rate Your Experience',
    },
    {
      key: 'thank_you',
      name: 'Customer Appreciation',
      badge: 'Soft & Gentle',
      badgeBg: '#FCE7F3',
      badgeColor: '#9D174D',
      desc: 'Gratitude-first message. Highlights your care before asking for a gentle review.',
      icon: '❤️',
      defaultMessage: `Hi {{name}}! Thank you so much for visiting {{businessName}}. We hope everything was great! If you have a moment, we would love your feedback:`,
      defaultButtonText: '⭐ Share Your Feedback',
    },
  ];

  const selectedTemplate = templates.find((t) => t.key === value.templateKey) || templates[0];
  const sampleCustomerName = 'Rahul';
  const effectiveBusinessName = businessName || 'Your Business';
  const effectiveReviewUrl = reviewUrl || 'https://g.page/r/your-google-review-link';

  // Local draft states for customize mode
  const [draftMessage, setDraftMessage] = useState(
    value.customMessage !== undefined && value.customMessage !== ''
      ? value.customMessage
      : selectedTemplate.defaultMessage
  );
  const [draftButton, setDraftButton] = useState(
    value.buttonText?.trim() || selectedTemplate.defaultButtonText
  );
  const [flashUpdated, setFlashUpdated] = useState(false);

  // Keep draft in sync if template changes while in tone mode
  useEffect(() => {
    if (activeOption === 'tone') {
      setDraftMessage(value.customMessage || selectedTemplate.defaultMessage);
      setDraftButton(value.buttonText || selectedTemplate.defaultButtonText);
    }
  }, [value.templateKey, activeOption, selectedTemplate, value.customMessage, value.buttonText]);

  // Active message to show in preview
  const activeMessage = value.customMessage !== undefined && value.customMessage !== ''
    ? value.customMessage
    : selectedTemplate.defaultMessage;
  const buttonLabel = value.buttonText?.trim() || selectedTemplate.defaultButtonText;

  // Live dynamic replacement for preview
  const displayMessage = activeMessage
    .replace(/\{\{businessName\}\}/g, effectiveBusinessName)
    .replace(/\{\{customerName\}\}/g, sampleCustomerName)
    .replace(/\{\{name\}\}/g, sampleCustomerName);

  const handleSelectTemplate = (t: TemplateOption) => {
    onChange({
      templateKey: t.key,
      customMessage: t.defaultMessage,
      buttonText: t.defaultButtonText,
    });
    setDraftMessage(t.defaultMessage);
    setDraftButton(t.defaultButtonText);
    setFlashUpdated(true);
    setTimeout(() => setFlashUpdated(false), 1500);
  };

  // Button handler: "Show changes in preview"
  const handleApplyPreview = () => {
    onChange({
      ...value,
      customMessage: draftMessage.trim(),
      buttonText: draftButton.trim() || selectedTemplate.defaultButtonText,
    });
    setFlashUpdated(true);
    setTimeout(() => setFlashUpdated(false), 2000);
  };

  const handleResetToDefault = () => {
    setDraftMessage(selectedTemplate.defaultMessage);
    setDraftButton(selectedTemplate.defaultButtonText);
    onChange({
      ...value,
      customMessage: selectedTemplate.defaultMessage,
      buttonText: selectedTemplate.defaultButtonText,
    });
    setFlashUpdated(true);
    setTimeout(() => setFlashUpdated(false), 1500);
  };

  const insertVariable = (token: string) => {
    setDraftMessage((prev) => `${prev} ${token}`);
  };

  const hasUnappliedChanges =
    draftMessage !== activeMessage || draftButton !== buttonLabel;

  return (
    <div className="wa-template-selector-container">
      <div className="wa-template-selector-layout">
        {/* ── LEFT COLUMN: Options (Tone vs Customize) ── */}
        <div className="wa-template-controls">
          {/* Top Two-Option Tabs */}
          <div className="wa-mode-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeOption === 'tone'}
              className={`wa-mode-tab ${activeOption === 'tone' ? 'wa-mode-tab--active' : ''}`}
              onClick={() => setActiveOption('tone')}
            >
              <span>☀️</span>
              <span>Select Message Tone</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeOption === 'custom'}
              className={`wa-mode-tab ${activeOption === 'custom' ? 'wa-mode-tab--active' : ''}`}
              onClick={() => setActiveOption('custom')}
            >
              <span>✏️</span>
              <span>Customize Message Tone</span>
            </button>
          </div>

          {/* ── OPTION 1: Select Message Tone (Default) ── */}
          {activeOption === 'tone' && (
            <div className="wa-tone-view">
              <div className="wa-section-heading">
                <h3 className="wa-section-heading__title">Select Message Tone</h3>
                <p className="wa-section-heading__desc">
                  Pick a pre-tested tone. The phone preview on the right instantly reflects how your message will appear to customers.
                </p>
              </div>

              {/* 4 Tone Cards (2x2 Grid) */}
              <div className="wa-tone-grid">
                {templates.map((t) => {
                  const isSelected = value.templateKey === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      className={`wa-tone-card ${isSelected ? 'wa-tone-card--active' : ''}`}
                      onClick={() => handleSelectTemplate(t)}
                    >
                      <div className="wa-tone-card__top">
                        <span className="wa-tone-card__icon">{t.icon}</span>
                        <span
                          className="wa-tone-card__badge"
                          style={{ background: t.badgeBg, color: t.badgeColor }}
                        >
                          {t.badge}
                        </span>
                      </div>
                      <div className="wa-tone-card__name">
                        {t.name}
                        {isSelected && <span className="wa-tone-card__check">✓ Active</span>}
                      </div>
                      <p className="wa-tone-card__desc">{t.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="wa-tone-info-box">
                <span>💡 Want to tweak the text or CTA button? Switch to <strong>"Customize Message Tone"</strong> above.</span>
              </div>
            </div>
          )}

          {/* ── OPTION 2: Customize Message Tone ── */}
          {activeOption === 'custom' && (
            <div className="wa-custom-view">
              <div className="wa-section-heading">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <h3 className="wa-section-heading__title">Customize Message Tone</h3>
                  <button
                    type="button"
                    className="wa-reset-btn"
                    onClick={handleResetToDefault}
                    title="Reset to tone default message"
                  >
                    ↺ Reset to Default
                  </button>
                </div>
                <p className="wa-section-heading__desc">
                  Edit the message body and action button below, then click <strong>"Show Changes in Preview"</strong> to update the phone preview.
                </p>
              </div>

              <div className="wa-customizer-box">
                {/* Message Body Field */}
                <div className="wa-field">
                  <div className="wa-field__label-row">
                    <label htmlFor="wa-message-textarea" className="wa-field__label">
                      Message Body
                    </label>
                    <span className="wa-field__hint">
                      {draftMessage.length} characters
                    </span>
                  </div>
                  <textarea
                    id="wa-message-textarea"
                    rows={5}
                    className="wa-textarea"
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    placeholder="Type your WhatsApp message..."
                  />
                  {/* Token quick tags */}
                  <div className="wa-token-bar">
                    <span className="wa-token-bar__label">Insert:</span>
                    <button
                      type="button"
                      className="wa-token-chip"
                      onClick={() => insertVariable('{{name}}')}
                    >
                      + {'{{name}}'}
                    </button>
                    <button
                      type="button"
                      className="wa-token-chip"
                      onClick={() => insertVariable('{{businessName}}')}
                    >
                      + {'{{businessName}}'}
                    </button>
                  </div>
                </div>

                {/* WhatsApp Action Button Text */}
                <div className="wa-field" style={{ marginTop: '14px' }}>
                  <div className="wa-field__label-row">
                    <label htmlFor="wa-button-input" className="wa-field__label">
                      Action Button Text
                    </label>
                    <span className="wa-field__badge-green">Interactive CTA</span>
                  </div>
                  <input
                    id="wa-button-input"
                    type="text"
                    className="wa-input"
                    value={draftButton}
                    onChange={(e) => setDraftButton(e.target.value)}
                    placeholder="e.g. ⭐ Leave a Google Review"
                    maxLength={45}
                  />
                  <p className="wa-field__subhint">
                    🔗 Direct 1-tap link: {effectiveReviewUrl}
                  </p>
                </div>

                {/* THE BUTTON: Show changes in preview */}
                <button
                  type="button"
                  className={`wa-update-preview-btn ${hasUnappliedChanges ? 'wa-update-preview-btn--pending' : ''}`}
                  onClick={handleApplyPreview}
                >
                  <span>👁️</span>
                  <span>Show Changes in Preview</span>
                  {hasUnappliedChanges && <span className="wa-update-pill">● Click to Apply</span>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Sticky Live WhatsApp Preview Device ── */}
        <div className="wa-template-preview-col">
          <div className="wa-preview-sticky">
            <div className="wa-preview-header">
              <span className="wa-preview-header__title">
                📱 WhatsApp Live Preview
              </span>
              <span className={`wa-preview-header__indicator ${flashUpdated ? 'wa-preview-header__indicator--flash' : ''}`}>
                <span className="wa-preview-dot" />
                {flashUpdated ? '✓ Preview Updated!' : 'Real-Time'}
              </span>
            </div>

            {/* Realistic WhatsApp Chat Device Mockup */}
            <div className="wa-phone-frame">
              {/* WhatsApp Top Bar */}
              <div className="wa-phone-topbar">
                <div className="wa-phone-avatar">
                  {effectiveBusinessName.charAt(0).toUpperCase()}
                </div>
                <div className="wa-phone-contact">
                  <span className="wa-phone-contact__name" title={effectiveBusinessName}>
                    {effectiveBusinessName}
                  </span>
                  <span className="wa-phone-contact__status">online</span>
                </div>
                <div className="wa-phone-actions">
                  <span>📞</span>
                  <span>⋮</span>
                </div>
              </div>

              {/* Chat Pattern Wallpaper Body */}
              <div className="wa-phone-body">
                {/* Today Pill */}
                <div className="wa-today-pill">TODAY</div>

                {/* Message Bubble */}
                <div className={`wa-chat-bubble ${flashUpdated ? 'wa-chat-bubble--flash' : ''}`}>
                  {/* Sender title in bold */}
                  <div className="wa-chat-bubble__header">
                    *{effectiveBusinessName}*
                  </div>

                  {/* Live message content */}
                  <div className="wa-chat-bubble__text">
                    {displayMessage}
                  </div>

                  {/* Legal/compliance footer */}
                  <div className="wa-chat-bubble__compliance">
                    Reply STOP to unsubscribe
                  </div>

                  {/* Official WhatsApp Interactive CTA Button */}
                  <div className="wa-chat-bubble__button-wrap">
                    <div className="wa-chat-cta-btn">
                      <span>{buttonLabel}</span>
                    </div>
                  </div>

                  {/* Message Timestamp & Double Blue Ticks */}
                  <div className="wa-chat-bubble__meta">
                    <span>10:42 AM</span>
                    <span className="wa-blue-ticks">✓✓</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="wa-preview-footer-note">
              💡 <strong>Direct Review Action:</strong> The interactive button lets customers rate you on Google with a single tap from WhatsApp.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
