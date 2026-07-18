import { useState, useEffect } from "react";
import { adminApi, AdminStats } from "../../lib/adminApi";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.getStats()
      .then(res => {
        if (res.data.success) {
          setStats(res.data.data);
        } else {
          setError("Failed to load stats");
        }
      })
      .catch(err => {
        setError(err.message || "Failed to load stats");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Admin Dashboard</h1>
        </div>
        <p>Loading stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Admin Dashboard</h1>
        </div>
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Platform overview and usage statistics</p>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <p className="stat-label">Total Users</p>
          <p className="stat-value">{stats?.totalUsers || 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Businesses</p>
          <p className="stat-value">{stats?.totalBusinesses || 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active Businesses</p>
          <p className="stat-value" style={{ color: "var(--color-brand)" }}>{stats?.activeBusinesses || 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Suspended Businesses</p>
          <p className="stat-value text-danger">{stats?.suspendedBusinesses || 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Feedback Events</p>
          <p className="stat-value">{stats?.totalFeedback || 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total QR Scans</p>
          <p className="stat-value">{stats?.totalQRCodeScans || 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Avg Platform Rating</p>
          <p className="stat-value">{stats?.averagePlatformRating || 0} ★</p>
        </div>
      </div>
    </div>
  );
}
