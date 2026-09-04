import React, { useState, useEffect } from 'react';

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
  badgeBg: string;
  badgeColor: string;
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
  // Two options: 'tone' (default) vs 'custom'
  const [activeOption, setActiveOption] = useState<'tone' | 'custom'>('tone');

  const templates: TemplateOption[] = [
    {
      key: 'personal',
      name: 'Personal & Direct',
      badge: '★ Recommended',
      badgeBg: '#BAF7D0',
      badgeColor: '#065F46',
      desc: '1-to-1 owner email. Feels genuine, casual, and achieves the highest click-through rate.',
      icon: '✉️',
      defaultSubject: 'Quick favor for {{businessName}}?',
      defaultGreeting: 'Hi {{name}},',
      defaultBody: `Thanks for choosing {{businessName}}! As a local business, customer reviews mean the world to our team. Could you take 30 seconds to share your experience with us?`,
      defaultButton: '⭐ Leave a Google Review →',
    },
    {
      key: 'clean',
      name: 'Clean & Professional',
      badge: 'Corporate',
      badgeBg: '#E0F2FE',
      badgeColor: '#0369A1',
      desc: 'Structured formal layout with logo header. Ideal for clinics, law, and premium B2B.',
      icon: '🏛️',
      defaultSubject: 'How was your recent experience with {{businessName}}?',
      defaultGreeting: 'Dear {{name}},',
      defaultBody: `Thank you for trusting {{businessName}}. We strive for excellence and would greatly appreciate your feedback to help us continue improving our service.`,
      defaultButton: 'Rate Your Experience',
    },
    {
      key: 'warm',
      name: 'Warm & Friendly',
      badge: 'High Engagement',
      badgeBg: '#FEF08A',
      badgeColor: '#854D0E',
      desc: 'Enthusiastic and gratitude-first. Uses warm emojis and friendly appreciation.',
      icon: '☀️',
      defaultSubject: 'We hope you loved your experience at {{businessName}}! 🌟',
      defaultGreeting: 'Hey {{name}}! 😊',
      defaultBody: `Thank you so much for stopping by! We loved serving you. If you had a great time, could you share the love with a quick 30-second Google review?`,
      defaultButton: 'Share the Love ❤️',
    },
    {
      key: 'minimal',
      name: 'Quick & Direct',
      badge: 'Fast Ask',
      badgeBg: '#FED7AA',
      badgeColor: '#9A3412',
      desc: 'Concise 2-sentence ask. Zero fluff, lightning-fast to read on mobile.',
      icon: '⚡',
      defaultSubject: '30 seconds for {{businessName}}?',
      defaultGreeting: 'Hi {{name}},',
      defaultBody: `Your honest feedback helps us grow. Tap below to let our team know how we did today.`,
      defaultButton: 'Review in 30 Seconds →',
    },
  ];

  const selectedTemplate = templates.find((t) => t.key === value.templateKey) || templates[0];
  const sampleName = 'Rahul';
  const effectiveBusinessName = businessName || 'ReviewBooster Business';

  // Local draft states for customize mode
  const [draftSubject, setDraftSubject] = useState(
    value.subject || selectedTemplate.defaultSubject
  );
  const [draftGreeting, setDraftGreeting] = useState(
    value.greeting || selectedTemplate.defaultGreeting
  );
  const [draftBody, setDraftBody] = useState(
    value.customMessage || selectedTemplate.defaultBody
  );
  const [draftButton, setDraftButton] = useState(
    value.buttonText || selectedTemplate.defaultButton
  );
  const [flashUpdated, setFlashUpdated] = useState(false);

  // Sync draft when template key changes in tone mode
  useEffect(() => {
    if (activeOption === 'tone') {
      setDraftSubject(value.subject || selectedTemplate.defaultSubject);
      setDraftGreeting(value.greeting || selectedTemplate.defaultGreeting);
      setDraftBody(value.customMessage || selectedTemplate.defaultBody);
      setDraftButton(value.buttonText || selectedTemplate.defaultButton);
    }
  }, [value.templateKey, activeOption, selectedTemplate, value.subject, value.greeting, value.customMessage, value.buttonText]);

  // Token replacement for preview
  const parseTokens = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\{\{businessName\}\}/gi, effectiveBusinessName)
      .replace(/\{\{business_name\}\}/gi, effectiveBusinessName)
      .replace(/\{\{name\}\}/gi, sampleName)
      .replace(/\{\{customerName\}\}/gi, sampleName);
  };

  const activeSubject = value.subject || selectedTemplate.defaultSubject;
  const activeGreeting = value.greeting || selectedTemplate.defaultGreeting;
  const activeBody = value.customMessage || selectedTemplate.defaultBody;
  const activeButton = value.buttonText || selectedTemplate.defaultButton;

  const displaySubject = parseTokens(activeSubject);
  const displayGreeting = parseTokens(activeGreeting);
  const displayBody = parseTokens(activeBody);
  const displayButton = parseTokens(activeButton);

  const handleSelectTemplate = (t: TemplateOption) => {
    onChange({
      templateKey: t.key,
      subject: t.defaultSubject,
      greeting: t.defaultGreeting,
      customMessage: t.defaultBody,
      buttonText: t.defaultButton,
    });
    setDraftSubject(t.defaultSubject);
    setDraftGreeting(t.defaultGreeting);
    setDraftBody(t.defaultBody);
    setDraftButton(t.defaultButton);
    setFlashUpdated(true);
    setTimeout(() => setFlashUpdated(false), 1500);
  };

  const handleApplyPreview = () => {
    onChange({
      ...value,
      subject: draftSubject.trim() || selectedTemplate.defaultSubject,
      greeting: draftGreeting.trim() || selectedTemplate.defaultGreeting,
      customMessage: draftBody.trim() || selectedTemplate.defaultBody,
      buttonText: draftButton.trim() || selectedTemplate.defaultButton,
    });
    setFlashUpdated(true);
    setTimeout(() => setFlashUpdated(false), 2000);
  };

  const handleResetToDefault = () => {
    setDraftSubject(selectedTemplate.defaultSubject);
    setDraftGreeting(selectedTemplate.defaultGreeting);
    setDraftBody(selectedTemplate.defaultBody);
    setDraftButton(selectedTemplate.defaultButton);
    onChange({
      templateKey: selectedTemplate.key,
      subject: selectedTemplate.defaultSubject,
      greeting: selectedTemplate.defaultGreeting,
      customMessage: selectedTemplate.defaultBody,
      buttonText: selectedTemplate.defaultButton,
    });
    setFlashUpdated(true);
    setTimeout(() => setFlashUpdated(false), 1500);
  };

  const insertVariable = (token: string) => {
    setDraftBody((prev) => `${prev} ${token}`);
  };

  const hasUnappliedChanges =
    draftSubject !== activeSubject ||
    draftGreeting !== activeGreeting ||
    draftBody !== activeBody ||
    draftButton !== activeButton;

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
              <span>✉️</span>
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
                <h3 className="wa-section-heading__title">Select Email Tone & Style</h3>
                <p className="wa-section-heading__desc">
                  Choose a proven email template tone. The live email preview on the right instantly reflects the layout and wording.
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
                <span>💡 Want to edit the subject line, greeting, or button? Switch to <strong>"Customize Message Tone"</strong> above.</span>
              </div>
            </div>
          )}

          {/* ── OPTION 2: Customize Message Tone ── */}
          {activeOption === 'custom' && (
            <div className="wa-custom-view">
              <div className="wa-section-heading">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <h3 className="wa-section-heading__title">Customize Email Content</h3>
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
                  Edit the subject, greeting, body, and CTA button below, then click <strong>"Show Changes in Preview"</strong> to update the email mockup.
                </p>
              </div>

              <div className="wa-customizer-box">
                {/* Email Subject Line */}
                <div className="wa-field">
                  <label htmlFor="ec-subject-input" className="wa-field__label">
                    Subject Line
                  </label>
                  <input
                    id="ec-subject-input"
                    type="text"
                    className="wa-input"
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    placeholder="e.g. Quick question from {{businessName}}"
                    maxLength={100}
                  />
                </div>

                {/* Greeting Line */}
                <div className="wa-field" style={{ marginTop: '12px' }}>
                  <label htmlFor="ec-greeting-input" className="wa-field__label">
                    Greeting Line
                  </label>
                  <input
                    id="ec-greeting-input"
                    type="text"
                    className="wa-input"
                    value={draftGreeting}
                    onChange={(e) => setDraftGreeting(e.target.value)}
                    placeholder="e.g. Hi {{name}},"
                    maxLength={50}
                  />
                </div>

                {/* Message Body Field */}
                <div className="wa-field" style={{ marginTop: '12px' }}>
                  <div className="wa-field__label-row">
                    <label htmlFor="ec-body-textarea" className="wa-field__label">
                      Email Message Body
                    </label>
                    <span className="wa-field__hint">
                      {draftBody.length} characters
                    </span>
                  </div>
                  <textarea
                    id="ec-body-textarea"
                    rows={4}
                    className="wa-textarea"
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    placeholder="Type your review request email message..."
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

                {/* Action Button Text */}
                <div className="wa-field" style={{ marginTop: '12px' }}>
                  <div className="wa-field__label-row">
                    <label htmlFor="ec-button-input" className="wa-field__label">
                      Review Button Text
                    </label>
                    <span className="wa-field__badge-green">Direct Link</span>
                  </div>
                  <input
                    id="ec-button-input"
                    type="text"
                    className="wa-input"
                    value={draftButton}
                    onChange={(e) => setDraftButton(e.target.value)}
                    placeholder="e.g. ⭐ Leave a Google Review →"
                    maxLength={40}
                  />
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

        {/* ── RIGHT COLUMN: Sticky Live Desktop Email Client Preview ── */}
        <div className="wa-template-preview-col">
          <div className="wa-preview-sticky">
            <div className="wa-preview-header">
              <span className="wa-preview-header__title">
                📧 Live Email Inbox Preview
              </span>
              <span className={`wa-preview-header__indicator ${flashUpdated ? 'wa-preview-header__indicator--flash' : ''}`}>
                <span className="wa-preview-dot" />
                {flashUpdated ? '✓ Preview Updated!' : 'Real-Time'}
              </span>
            </div>

            {/* Realistic Email Client Frame Mockup */}
            <div className="ec-email-frame">
              {/* Email Client Header Bar */}
              <div className="ec-email-topbar">
                <div className="ec-email-window-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <div className="ec-email-client-badge">Inbox • Rahul</div>
              </div>

              {/* Subject & Sender Meta */}
              <div className="ec-email-meta">
                <div className="ec-email-subject-line">
                  <span className="ec-email-subject-label">Subject:</span>
                  <strong>{displaySubject}</strong>
                </div>
                <div className="ec-email-sender-line">
                  <div className="ec-email-avatar">
                    {effectiveBusinessName.charAt(0).toUpperCase()}
                  </div>
                  <div className="ec-email-sender-info">
                    <span className="ec-email-sender-name">{effectiveBusinessName}</span>
                    <span className="ec-email-sender-to">to rahul@example.com</span>
                  </div>
                  <span className="ec-email-time">Just now</span>
                </div>
              </div>

              {/* Email Content Body */}
              <div className={`ec-email-body ${flashUpdated ? 'wa-chat-bubble--flash' : ''}`}>
                {/* Business Logo or Header */}
                <div className="ec-email-brand-header">
                  {logoUrl ? (
                    <img src={logoUrl} alt={effectiveBusinessName} className="ec-email-logo-img" />
                  ) : (
                    <div className="ec-email-logo-fallback">
                      <span>{effectiveBusinessName}</span>
                    </div>
                  )}
                </div>

                {/* Email Greeting */}
                <p className="ec-email-greeting">{displayGreeting}</p>

                {/* Email Body */}
                <p className="ec-email-message">{displayBody}</p>

                {/* Big Direct Review Button */}
                <div className="ec-email-btn-wrap">
                  <div className="ec-email-cta-btn">
                    <span>{displayButton}</span>
                  </div>
                </div>

                {/* Professional Footer */}
                <div className="ec-email-footer">
                  <p>Sent with pride on behalf of <strong>{effectiveBusinessName}</strong></p>
                  <p className="ec-email-unsubscribe">Click here to unsubscribe • ReviewBooster Verified</p>
                </div>
              </div>
            </div>

            <div className="wa-preview-footer-note">
              💡 <strong>Deliverability Ready:</strong> Mobile-responsive HTML email that renders beautifully across Gmail, Apple Mail, and Outlook.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
