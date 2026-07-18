import { useState, useEffect } from "react";
import { adminApi, AdminBusiness, PaginatedResponse } from "../../lib/adminApi";

export default function AdminBusinessesPage() {
  const [data, setData] = useState<PaginatedResponse<AdminBusiness> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchBusinesses = async (p = page, s = search) => {
    setLoading(true);
    try {
      const res = await adminApi.getBusinesses(p, 10, s);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError("Failed to fetch businesses");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch businesses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses(page, search);
  }, [page]); // Re-fetch on page change

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBusinesses(1, search);
  };

  const handleToggleStatus = async (business: AdminBusiness) => {
    const newStatus = !business.isActive;
    const confirmMsg = newStatus 
      ? `Are you sure you want to enable "${business.name}"?` 
      : `Are you sure you want to suspend "${business.name}"? They will lose dashboard and public QR access.`;
      
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await adminApi.updateBusinessStatus(business._id, newStatus);
      if (res.data.success) {
        // Optimistic update
        if (data) {
          setData({
            ...data,
            items: data.items.map(b => b._id === business._id ? { ...b, isActive: newStatus } : b)
          });
        }
      }
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Businesses</h1>
          <p className="page-subtitle">Manage all businesses on the platform</p>
        </div>
        
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem" }}>
          <input 
            type="text" 
            placeholder="Search name or code..."
            className="wa-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="wa-btn wa-btn-secondary">Search</button>
        </form>
      </div>

      {error ? (
        <p className="text-danger">{error}</p>
      ) : loading && !data ? (
        <p>Loading businesses...</p>
      ) : (
        <div className="table-wrapper">
          <table className="inbox-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-surface-200)" }}>
                <th style={{ padding: "0.75rem" }}>Business Name</th>
                <th style={{ padding: "0.75rem" }}>Code</th>
                <th style={{ padding: "0.75rem" }}>Owner</th>
                <th style={{ padding: "0.75rem" }}>Status</th>
                <th style={{ padding: "0.75rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(business => (
                <tr key={business._id} style={{ borderBottom: "1px solid var(--color-surface-100)" }}>
                  <td style={{ padding: "0.75rem", fontWeight: "500" }}>{business.name}</td>
                  <td style={{ padding: "0.75rem", color: "var(--color-surface-400)" }}>{business.businessCode}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <div>{business.ownerId?.name || "No name"}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-surface-400)" }}>{business.ownerId?.email}</div>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <span style={{ 
                      padding: "0.25rem 0.5rem", 
                      borderRadius: "1rem", 
                      fontSize: "0.75rem",
                      backgroundColor: business.isActive ? "#dcfce7" : "#fee2e2",
                      color: business.isActive ? "#166534" : "#991b1b"
                    }}>
                      {business.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <button 
                      className={`wa-btn ${business.isActive ? "wa-btn-secondary" : "wa-btn-primary"}`}
                      style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }}
                      onClick={() => handleToggleStatus(business)}
                    >
                      {business.isActive ? "Suspend" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--color-surface-400)" }}>
                    No businesses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {data && data.pages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
              <button 
                className="wa-btn wa-btn-secondary" 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: "0.9rem" }}>Page {page} of {data.pages}</span>
              <button 
                className="wa-btn wa-btn-secondary" 
                disabled={page === data.pages}
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
