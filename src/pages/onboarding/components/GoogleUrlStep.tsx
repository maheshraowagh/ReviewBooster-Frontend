
import { colors, inputStyle, primaryBtnStyle, outlineBtnStyle } from '../sharedStyles';

interface GoogleUrlStepProps {
  googleReviewUrl: string;
  setGoogleReviewUrl: (val: string) => void;
  urlVerified: boolean;
  setUrlVerified: (val: boolean) => void;
  verifyUrl: () => void;
  showHelpModal: boolean;
  setShowHelpModal: (val: boolean) => void;
  error: string;
  isSubmitting: boolean;
  goBack: () => void;
  handleSubmit: () => void;
}

export function GoogleUrlStep({
  googleReviewUrl,
  setGoogleReviewUrl,
  urlVerified,
  setUrlVerified,
  verifyUrl,
  showHelpModal,
  setShowHelpModal,
  error,
  isSubmitting,
  goBack,
  handleSubmit,
}: GoogleUrlStepProps) {
  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, textAlign: 'center', marginBottom: '10px', color: colors.ink }}>
        Add your Google review link
      </h1>
      <p style={{ fontSize: '14px', color: colors.inkMuted, textAlign: 'center', marginBottom: '28px', lineHeight: 1.5 }}>
        This is where customers will post their reviews
      </p>

      <div className="mb-5">
        <input
          id="googleUrl"
          type="url"
          placeholder="Paste your Google review link"
          value={googleReviewUrl}
          onChange={(e) => {
            setGoogleReviewUrl(e.target.value);
            setUrlVerified(false);
          }}
          style={inputStyle}
        />
      </div>

      {!urlVerified && (
        <button
          style={{ ...outlineBtnStyle, width: '100%', marginBottom: '18px' }}
          onClick={verifyUrl}
          disabled={!googleReviewUrl.trim()}
        >
          Verify link
        </button>
      )}

      {urlVerified && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            background: colors.greenBg,
            color: colors.green,
            fontSize: '14px',
            fontWeight: 500,
            padding: '11px 16px',
            borderRadius: '8px',
            marginBottom: '18px',
          }}
        >
          <span>✓</span>
          <span>link verified</span>
        </div>
      )}

      <button
        style={{ fontSize: '14px', color: colors.inkMuted, background: 'none', border: 'none', padding: 0, marginBottom: '32px', cursor: 'pointer' }}
        onClick={() => setShowHelpModal(true)}
      >
        don't know your link? <span style={{ color: colors.link, textDecoration: 'underline' }}>find it here</span>
      </button>

      {/* Help modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,26,26,0.5)' }}
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="w-full max-w-md"
            style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '32px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: colors.ink }}>
              How to find your Google Review link
            </h3>
            <ol style={{ fontSize: '14px', color: colors.inkMuted, lineHeight: 1.8, paddingLeft: '20px', marginBottom: '20px' }}>
              <li>Search for your business on <strong style={{ color: colors.ink }}>Google Maps</strong></li>
              <li>Click your business listing</li>
              <li>Click <strong style={{ color: colors.ink }}>"Share"</strong></li>
              <li>Copy the link</li>
              <li>Paste it above!</li>
            </ol>
            <p style={{ fontSize: '13px', color: colors.inkFaint, marginBottom: '20px' }}>
              Tip: the link usually starts with <code>g.page/r/...</code> or <code>maps.app.goo.gl/...</code>
            </p>
            <button style={{ ...outlineBtnStyle, width: '100%' }} onClick={() => setShowHelpModal(false)}>
              Got it
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: colors.danger, fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>{error}</p>}

      <div className="flex justify-between items-center gap-3" style={{ marginTop: '20px' }}>
        <button style={outlineBtnStyle} onClick={goBack}>Back</button>
        <button
          style={{ ...primaryBtnStyle, flex: 1, opacity: !urlVerified || isSubmitting ? 0.5 : 1, cursor: !urlVerified || isSubmitting ? 'not-allowed' : 'pointer' }}
          disabled={!urlVerified || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Creating...' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
