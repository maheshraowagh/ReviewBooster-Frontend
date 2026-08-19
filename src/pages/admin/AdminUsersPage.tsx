import { useState, useEffect, useCallback } from "react";
import { adminApi, PaginatedResponse } from "../../lib/adminApi";
import { AppUser, AdminUserBusiness } from "../../types";

type RoleFilter = "all" | "owner" | "admin" | "staff";
type PlanFilter = "all" | "free" | "starter" | "professional" | "enterprise";

const PLAN_QUOTAS: Record<string, string> = {
  free: "0 messages / month",
  starter: "1,000 messages / month",
  professional: "2,000 messages / month",
  enterprise: "Unlimited messages",
};

const PLAN_NUMERIC_QUOTAS: Record<string, number> = {
  free: 0,
  starter: 1000,
  professional: 2000,
  enterprise: 999999,
};

export default function AdminUsersPage() {
  const [data, setData] = useState<PaginatedResponse<AppUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");

  // Modal state for editing plan
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [forceOverride, setForceOverride] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>("");
  const [hasActiveSubConflict, setHasActiveSubConflict] = useState<boolean>(false);

  const fetchUsers = useCallback(async (p: number, s: string, pf: PlanFilter) => {
    setLoading(true);
    setError("");
    try {
      const planParam = pf === "all" ? "" : pf;
      const res = await adminApi.getUsers(p, 10, s, planParam);
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
    fetchUsers(page, search, planFilter);
  }, [page, search, planFilter, fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search, planFilter);
  };

  const openEditPlanModal = (user: AppUser) => {
    if (!user.businessId || typeof user.businessId !== "object") return;
    const business = user.businessId as AdminUserBusiness;
    setEditingUser(user);
    setSelectedPlan(business.plan || "free");
    setSelectedStatus(business.planStatus || "active");
    setForceOverride(false);
    setHasActiveSubConflict(false);
    setModalError("");
  };

  const handleSavePlan = async () => {
    if (!editingUser || !editingUser.businessId || typeof editingUser.businessId !== "object") return;
    const business = editingUser.businessId as AdminUserBusiness;

    setSaving(true);
    setModalError("");

    try {
      const res = await adminApi.updateBusinessPlan(business._id, {
        plan: selectedPlan,
        planStatus: selectedStatus,
        forceOverride,
      });

      if (res.data.success) {
        // Refresh users list
        await fetchUsers(page, search, planFilter);
        setEditingUser(null);
      }
    } catch (err: any) {
      const responseData = err.response?.data;
      if (err.response?.status === 409 || responseData?.code === "CONFLICT" || responseData?.details?.hasActiveSubscription) {
        setHasActiveSubConflict(true);
        setModalError("This business has an active Razorpay subscription. Check 'Force Override' below to apply changes anyway.");
      } else {
        setModalError(err.response?.data?.message || err.message || "Failed to update plan");
      }
    } finally {
      setSaving(false);
    }
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
            Manage all platform users & subscription plans
            {data && <> · <strong>{data.total}</strong> total</>}
          </p>
        </div>
      </div>

      {error && (
        <div className="db-error">
          <span>{error}</span>
          <button className="db-error-retry" onClick={() => fetchUsers(page, search, planFilter)}>
            Retry
          </button>
        </div>
      )}

      <div className="admin-table-card">
        {/* Toolbar */}
        <div className="admin-table-toolbar" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
          <form onSubmit={handleSearch} className="admin-search-wrapper" style={{ minWidth: 260 }}>
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

          {/* Role filters */}
          <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginRight: "0.25rem" }}>Role:</span>
            {(["all", "owner", "admin", "staff"] as RoleFilter[]).map((rf) => (
              <button
                key={rf}
                className={`admin-filter-btn${roleFilter === rf ? " active" : ""}`}
                onClick={() => setRoleFilter(rf)}
                style={{ textTransform: "capitalize" }}
              >
                {rf}
              </button>
            ))}
          </div>

          {/* Plan filters */}
          <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginRight: "0.25rem" }}>Plan:</span>
            {(["all", "free", "starter", "professional", "enterprise"] as PlanFilter[]).map((pf) => (
              <button
                key={pf}
                className={`admin-filter-btn${planFilter === pf ? " active" : ""}`}
                onClick={() => {
                  setPlanFilter(pf);
                  setPage(1);
                }}
                style={{ textTransform: "capitalize" }}
              >
                {pf}
              </button>
            ))}
          </div>
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
                  <th>Plan</th>
                  <th>Plan Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems && filteredItems.length > 0 ? (
                  filteredItems.map((user) => {
                    const bus = user.businessId && typeof user.businessId === "object"
                      ? (user.businessId as AdminUserBusiness)
                      : null;

                    return (
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
                          {bus ? (
                            <div>
                              <div style={{ fontWeight: 500 }}>{bus.name}</div>
                              <code style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                                {bus.businessCode}
                              </code>
                            </div>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>None</span>
                          )}
                        </td>
                        <td>
                          {bus ? (
                            <span className={`admin-status-badge admin-status-badge--${bus.plan || 'free'}`}>
                              {bus.plan ? bus.plan.charAt(0).toUpperCase() + bus.plan.slice(1) : 'Free'}
                            </span>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          {bus ? (
                            <span className={`admin-status-badge admin-status-badge--${bus.planStatus || 'active'}`}>
                              <span className="admin-status-badge-dot" />
                              {bus.planStatus || 'active'}
                            </span>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>—</span>
                          )}
                        </td>
                        <td style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          {bus ? (
                            <button
                              className="admin-action-btn admin-action-btn--view"
                              onClick={() => openEditPlanModal(user)}
                            >
                              Edit Plan
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8}>
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

      {/* Edit Plan Modal */}
      {editingUser && editingUser.businessId && typeof editingUser.businessId === "object" && (
        <div className="admin-modal-overlay" onClick={() => !saving && setEditingUser(null)}>
          <div className="admin-modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-modal-title">Edit Subscription Plan</h3>
            <p className="admin-modal-body" style={{ marginBottom: "1rem" }}>
              Update subscription plan and status for <strong>{editingUser.name || editingUser.email}</strong>
              {" ("}<strong>{(editingUser.businessId as AdminUserBusiness).name}</strong>{")"}.
            </p>

            {/* Current Quota Info */}
            <div style={{ background: "var(--color-surface)", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.8125rem", border: "1px solid var(--color-border-subtle)" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Current Messaging Quota Usage</div>
              <div style={{ color: "var(--color-text-muted)" }}>
                WhatsApp: <strong>{(editingUser.businessId as AdminUserBusiness).whatsappMsgUsed || 0}</strong> /{" "}
                {(editingUser.businessId as AdminUserBusiness).whatsappMsgQuota === 999999 ? "∞" : (editingUser.businessId as AdminUserBusiness).whatsappMsgQuota || 0} used
              </div>
            </div>

            {/* Form inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Select Plan
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid var(--color-border)", background: "white", fontSize: "0.875rem" }}
                >
                  <option value="free">Free — Pilot Program (0 msgs/mo)</option>
                  <option value="starter">Starter — ₹2,499/mo (1,000 msgs/mo)</option>
                  <option value="professional">Professional — ₹6,499/mo (2,000 msgs/mo)</option>
                  <option value="enterprise">Enterprise — Custom (Unlimited msgs)</option>
                </select>
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "2px", display: "block" }}>
                  New Quota: {PLAN_QUOTAS[selectedPlan]}
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Select Subscription Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid var(--color-border)", background: "white", fontSize: "0.875rem" }}
                >
                  <option value="active">active</option>
                  <option value="trialing">trialing</option>
                  <option value="pending">pending</option>
                  <option value="authenticated">authenticated</option>
                  <option value="past_due">past_due</option>
                  <option value="paused">paused</option>
                  <option value="cancel_at_period_end">cancel_at_period_end</option>
                  <option value="cancelled">cancelled</option>
                  <option value="completed">completed</option>
                  <option value="expired">expired</option>
                </select>
              </div>

              {/* Downgrade quota warning */}
              {((editingUser.businessId as AdminUserBusiness).whatsappMsgUsed || 0) > PLAN_NUMERIC_QUOTAS[selectedPlan] && (
                <div style={{ padding: "0.625rem 0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#991b1b", fontSize: "0.75rem" }}>
                  <strong>Quota Warning:</strong> User has already used {(editingUser.businessId as AdminUserBusiness).whatsappMsgUsed} messages, which exceeds the new plan quota ({PLAN_NUMERIC_QUOTAS[selectedPlan]}). They will be capped until the next renewal period.
                </div>
              )}

              {/* Active Razorpay Subscription Warning */}
              {((editingUser.businessId as AdminUserBusiness).razorpaySubscriptionId || hasActiveSubConflict) && (
                <div style={{ padding: "0.75rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, color: "#92400e", fontSize: "0.75rem" }}>
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>⚠️ Active Razorpay Subscription Detected</div>
                  <div>This business has an active subscription. Manual changes may be overwritten on the next Razorpay billing cycle unless forced.</div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", cursor: "pointer", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={forceOverride}
                      onChange={(e) => setForceOverride(e.target.checked)}
                    />
                    Force Override Razorpay Subscription
                  </label>
                </div>
              )}
            </div>

            {modalError && (
              <div style={{ color: "#dc2626", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
                {modalError}
              </div>
            )}

            <div className="admin-modal-actions">
              <button
                className="admin-modal-btn"
                onClick={() => setEditingUser(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="admin-modal-btn admin-modal-btn--success"
                onClick={handleSavePlan}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Plan Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
