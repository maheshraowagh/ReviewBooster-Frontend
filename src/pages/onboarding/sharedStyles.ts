import React from 'react';

export const colors = {
  pageBg: '#F2F0EA',
  cardBg: '#FFFFFF',
  border: '#E3E1D9',
  borderActive: '#1A1A1A',
  ink: '#1A1A1A',
  inkMuted: '#6B6B63',
  inkFaint: '#A3A39A',
  green: '#3F7D45',
  greenBg: '#E9F2E7',
  link: '#2D5DA1',
  danger: '#B3433A',
};

export const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: '15px',
  color: colors.ink,
  background: colors.cardBg,
  border: `1px solid ${colors.border}`,
  borderRadius: '7px',
  padding: '13px 15px',
  outline: 'none',
};

export const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: colors.ink,
  fontWeight: 500,
  marginBottom: '8px',
  display: 'block',
};

export const primaryBtnStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  borderRadius: '8px',
  padding: '14px 28px',
  background: colors.ink,
  color: '#fff',
  border: `1px solid ${colors.ink}`,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  cursor: 'pointer',
};

export const outlineBtnStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  borderRadius: '8px',
  padding: '14px 28px',
  background: '#fff',
  color: colors.ink,
  border: `1px solid ${colors.border}`,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  cursor: 'pointer',
};
