import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  businessName?: string;
}

export default function DashboardLayout({ businessName }: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <Sidebar businessName={businessName} />
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}
