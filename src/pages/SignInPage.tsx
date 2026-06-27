import { SignIn } from '@clerk/clerk-react';

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
      </div>
    </div>
  );
}
