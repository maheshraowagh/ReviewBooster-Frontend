import { SignIn } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

export default function SignInPage() {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          afterSignInUrl="/dashboard"
        />
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '20px', fontSize: '0.8rem', color: '#6B6B63' }}>
          <Link to="/privacy" style={{ color: '#6B6B63' }}>Privacy</Link>
          <span>•</span>
          <Link to="/terms" style={{ color: '#6B6B63' }}>Terms</Link>
          <span>•</span>
          <Link to="/refund" style={{ color: '#6B6B63' }}>Refunds</Link>
          <span>•</span>
          <Link to="/contact" style={{ color: '#6B6B63' }}>Contact</Link>
        </div>
      </div>
    </div>
  );
}
