/**
 * NetworkError — full-screen overlay shown when an API call fails
 * due to network issues. Shows a retry button.
 */
export default function NetworkError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="network-error-overlay">
      <div className="network-error-icon">📡</div>
      <h2 className="network-error-title">Connection lost</h2>
      <p className="network-error-subtitle">
        Please check your internet connection and try again.
      </p>
      <button className="network-error-btn" onClick={onRetry}>
        Tap to retry
      </button>
    </div>
  );
}
