import React, { useState, useEffect } from 'react';
import { getGoogleAuthUrl, GmailStatus } from '../services/googleAuthService';
import { useGmailStatus, useDisconnectGmail } from '../hooks/queries/useGoogleAuth';
import { HoverGifIcon } from './HoverGifIcon';

interface GmailConnectCardProps {
  onStatusChange?: (status: GmailStatus) => void;
}

export const GmailConnectCard: React.FC<GmailConnectCardProps> = ({ onStatusChange }) => {
  const { data: status, isLoading: loading, error: queryError } = useGmailStatus();
  const disconnectMut = useDisconnectGmail();
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status && onStatusChange) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  const handleConnect = async () => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const authUrl = await getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize Google login');
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Gmail account? Active Gmail campaigns will pause.')) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await disconnectMut.mutateAsync();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disconnect Gmail');
    } finally {
      setActionLoading(false);
    }
  };

  const combinedError = errorMsg || (queryError instanceof Error ? queryError.message : null);

  if (loading) {
    return (
      <div className="ec-panel" style={{ padding: '24px', textAlign: 'center', color: '#6B6B63', fontSize: '13px' }}>
        Checking Gmail connection status...
      </div>
    );
  }

  const isConnected = status?.connected && status?.email;

  return (
    <div className="ec-panel" style={{ padding: '24px', margin: '0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
        {/* Left Info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '240px' }}>
          {/* Google Icon Box */}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: '#F9F8F5',
            border: '1px solid #E3E1D9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            padding: '6px'
          }}>
            <HoverGifIcon
              src="/icons8-gmail-logo.gif"
              alt="Gmail"
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                Gmail / Google Workspace Integration
              </h3>
              {isConnected ? (
                <span className="ec-status-badge running" style={{ fontSize: '11px' }}>
                  Connected as {status.email}
                </span>
              ) : (
                <span className="ec-status-badge draft" style={{ fontSize: '11px' }}>
                  Not Connected
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#6B6B63', margin: '4px 0 0', lineHeight: 1.5 }}>
              {isConnected
                ? `Review request emails send directly from ${status.email}. Customer replies land in your Gmail inbox.`
                : 'Connect your Gmail account to send review requests directly from your personal or business email address.'}
            </p>
          </div>
        </div>

        {/* Right Action */}
        <div style={{ flexShrink: 0 }}>
          {isConnected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={actionLoading}
              className="ec-btn ec-btn-secondary"
              style={{ color: '#C0392B', borderColor: '#E3E1D9', fontSize: '13px' }}
            >
              {actionLoading ? 'Disconnecting...' : 'Disconnect Gmail'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={actionLoading}
              className="ec-btn ec-btn-primary"
              style={{
                fontSize: '13px',
                padding: '10px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: actionLoading ? 'not-allowed' : 'pointer'
              }}
            >
              <HoverGifIcon
                src="/icons8-gmail-logo.gif"
                alt="Gmail"
                style={{ width: '20px', height: '20px', objectFit: 'contain' }}
              />
              {actionLoading ? 'Connecting...' : 'Connect with Gmail'}
            </button>
          )}
        </div>
      </div>

      {combinedError && (
        <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', background: '#FDF2F2', border: '1px solid #F8D7DA', color: '#C0392B', fontSize: '12px' }}>
          ⚠️ {combinedError}
        </div>
      )}

      {/* Footer Info */}
      {isConnected && status.connectedAt && (
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #E3E1D9', display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: '#A3A39A' }}>
          <span>Connected {new Date(status.connectedAt).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
};
