import { useState, useEffect, useCallback } from "react";
import { adminApi, PaginatedResponse } from "../../lib/adminApi";
import { AppUser } from "../../types";

type RoleFilter = "all" | "owner" | "admin" | "staff";

export default function AdminUsersPage() {
  const [data, setData] = useState<PaginatedResponse<AppUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const fetchUsers = useCallback(async (p: number, s: string) => {
    setLoading(true);
    setError("");
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
  }, []);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search);
  };

  // Client-side role filter
  const filteredItems = data?.items.filter((u) => {
    if (roleFilter === "all") return true;
    return u.role === roleFilter;
  });

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Users</h1>
          <p className="admin-page-subtitle">
            Manage all platform users
            {data && <> · <strong>{data.total}</strong> total</>}
          </p>
        </div>
      </div>

      {error && (
        <div className="db-error">
          <span>{error}</span>
          <button className="db-error-retry" onClick={() => fetchUsers(page, search)}>
            Retry
          </button>
        </div>
      )}

      <div className="admin-table-card">
        {/* Toolbar */}
        <div className="admin-table-toolbar">
          <form onSubmit={handleSearch} className="admin-search-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              className="admin-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <button
            className={`admin-filter-btn${roleFilter === "all" ? " active" : ""}`}
            onClick={() => setRoleFilter("all")}
          >
            All
          </button>
          <button
            className={`admin-filter-btn${roleFilter === "owner" ? " active" : ""}`}
            onClick={() => setRoleFilter("owner")}
          >
            Owners
          </button>
          <button
            className={`admin-filter-btn${roleFilter === "admin" ? " active" : ""}`}
            onClick={() => setRoleFilter("admin")}
          >
            Admins
          </button>
          <button
            className={`admin-filter-btn${roleFilter === "staff" ? " active" : ""}`}
            onClick={() => setRoleFilter("staff")}
          >
            Staff
          </button>
        </div>

        {/* Table */}
        {loading && !data ? (
          <div style={{ padding: "1rem" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="admin-skeleton admin-skeleton-row" />
            ))}
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Business</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems && filteredItems.length > 0 ? (
                  filteredItems.map((user) => (
                    <tr key={user._id}>
                      <td style={{ fontWeight: 500 }}>
                        {user.name || "—"}
                      </td>
                      <td style={{ color: "var(--color-text-muted)" }}>
                        {user.email}
                      </td>
                      <td>
                        <span className={`admin-status-badge admin-status-badge--${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        {user.businessId
                          ? typeof user.businessId === "object"
                            ? (user.businessId as any).name
                            : "Yes"
                          : <span style={{ color: "var(--color-text-muted)" }}>None</span>}
                      </td>
                      <td style={{ color: "var(--color-text-muted)" }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="admin-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        <p>No users found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="admin-pagination">
                <span className="admin-pagination-info">
                  Page {data.page} of {data.pages} · {data.total} results
                </span>
                <div className="admin-pagination-controls">
                  <button
                    className="admin-pagination-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </button>
                  <span className="admin-pagination-current">{page}</span>
                  <button
                    className="admin-pagination-btn"
                    disabled={page === data.pages}
                    onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
