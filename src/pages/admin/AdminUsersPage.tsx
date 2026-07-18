import { useState, useEffect } from "react";
import { adminApi, PaginatedResponse } from "../../lib/adminApi";
import { AppUser } from "../../types";

export default function AdminUsersPage() {
  const [data, setData] = useState<PaginatedResponse<AppUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchUsers = async (p = page, s = search) => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers(p, 10, s);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError("Failed to fetch users");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page, search);
  }, [page]); // Re-fetch on page change

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search);
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage all users on the platform</p>
        </div>
        
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem" }}>
          <input 
            type="text" 
            placeholder="Search name or email..."
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
        <p>Loading users...</p>
      ) : (
        <div className="table-wrapper">
          <table className="inbox-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-surface-200)" }}>
                <th style={{ padding: "0.75rem" }}>Name</th>
                <th style={{ padding: "0.75rem" }}>Email</th>
                <th style={{ padding: "0.75rem" }}>Role</th>
                <th style={{ padding: "0.75rem" }}>Business Owned</th>
                <th style={{ padding: "0.75rem" }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(user => (
                <tr key={user._id} style={{ borderBottom: "1px solid var(--color-surface-100)" }}>
                  <td style={{ padding: "0.75rem", fontWeight: "500" }}>{user.name || "-"}</td>
                  <td style={{ padding: "0.75rem", color: "var(--color-surface-400)" }}>{user.email}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <span style={{ 
                      padding: "0.25rem 0.5rem", 
                      borderRadius: "1rem", 
                      fontSize: "0.75rem",
                      backgroundColor: user.role === 'admin' ? "#dbeafe" : "#f3f4f6",
                      color: user.role === 'admin' ? "#1e40af" : "#374151"
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    {/* @ts-ignore - populated businessId object */}
                    {user.businessId ? (typeof user.businessId === 'object' ? user.businessId.name : "Yes") : "None"}
                  </td>
                  <td style={{ padding: "0.75rem", color: "var(--color-surface-400)" }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--color-surface-400)" }}>
                    No users found.
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
