import React, { useState, useEffect } from 'react';
import { getGoogleAuthUrl, GmailStatus } from '../services/googleAuthService';
import { useGmailStatus, useDisconnectGmail } from '../hooks/queries/useGoogleAuth';

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
            padding: '10px'
          }}>
            <svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%' }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
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
              style={{ fontSize: '13px', padding: '10px 20px' }}
            >
              {actionLoading ? 'Connecting...' : 'Connect with Google →'}
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
