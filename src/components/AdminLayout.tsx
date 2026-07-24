import { Outlet } from "react-router-dom";
import AdminSidebar from "./admin/AdminSidebar";

export default function AdminLayout() {
  return (
    <div className="dashboard-layout">
      <AdminSidebar />
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}
