import { UserButton } from '@clerk/clerk-react';
import { useAppAuth } from '../providers/AuthProvider';

export default function DashboardPage() {
  const { appUser } = useAppAuth();

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>ReviewBoost</h1>
        </div>
        <div className="dashboard-header-right">
          <span className="user-greeting">
            {appUser?.name || appUser?.email || 'User'}
          </span>
          <span className="user-role-badge">{appUser?.role}</span>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <h2>Welcome to ReviewBoost 🚀</h2>
          <p>Your dashboard is being built. Phase 1 (Auth) is complete!</p>

          <div className="user-info-card">
            <h3>Your Account</h3>
            <dl>
              <dt>Email</dt>
              <dd>{appUser?.email}</dd>
              <dt>Role</dt>
              <dd>{appUser?.role}</dd>
              <dt>Business</dt>
              <dd>{appUser?.businessId ? 'Linked' : 'Not yet — onboarding needed'}</dd>
              <dt>User ID</dt>
              <dd className="monospace">{appUser?._id}</dd>
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}
