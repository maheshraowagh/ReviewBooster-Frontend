import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { MouseEvent, ReactNode, RefObject } from "react";
import "./campaigns.css";
import { useBilling } from "../lib/useBilling";
import {
  useBulkDeleteCampaigns,
  useCampaign,
  useCampaignAction,
  useCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useImportCsv,
  useRecipients,
  useValidateManual,
} from "../hooks/queries/useCampaigns";
import { useWhatsappStatusRaw } from "../hooks/queries/useWhatsapp";
import type { CampaignSummary, CsvPreview } from "../services/campaignService";

type ViewMode = "list" | "create" | "detail";
type ConfirmModal = {
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void | Promise<void>;
} | null;

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function CampaignsPage() {
  const [view, setView] = useState<ViewMode>("list");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { subscription, isLoading: planLoading } = useBilling();
  const isPlanBlocked = !planLoading && subscription?.plan === "free";

  const {
    data: campaignsData,
    isLoading: listLoading,
    isError: listError,
    refetch: refetchCampaigns,
    isFetching: listFetching,
  } = useCampaigns({ page, limit: rowsPerPage, status: statusFilter });
  const campaigns = campaignsData?.campaigns || [];
  const pagination = campaignsData?.pagination || {
    page,
    limit: rowsPerPage,
    total: campaigns.length,
    totalPages: Math.max(1, Math.ceil(campaigns.length / rowsPerPage)),
  };

  const { data: detail, refetch: refetchDetail } = useCampaign(
    selectedCampaignId || "",
    view === "detail" && !!selectedCampaignId
  );
  const [recipientPage, setRecipientPage] = useState(1);
  const { data: recipientsData } = useRecipients(selectedCampaignId || "", recipientPage);
  const recipients = recipientsData?.recipients || [];
  const recipientTotal = recipientsData?.total || 0;

  const { data: whatsappData, isLoading: whatsappChecking } = useWhatsappStatusRaw();
  const whatsappStatus =
    whatsappData?.liveStatus?.instance?.state ||
    whatsappData?.liveStatus?.state ||
    whatsappData?.status ||
    "disconnected";
  const isWhatsappConnected = whatsappStatus === "open" || whatsappStatus === "connected";

  const createCampaignMut = useCreateCampaign();
  const campaignActionMut = useCampaignAction();
  const deleteCampaignMut = useDeleteCampaign();
  const bulkDeleteMut = useBulkDeleteCampaigns();
  const importCsvMut = useImportCsv();
  const validateManualMut = useValidateManual();

  const [wizardStep, setWizardStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [templateKey, setTemplateKey] = useState("review_request");
  const [inputMode, setInputMode] = useState<"csv" | "manual">("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [manualNumbers, setManualNumbers] = useState("");
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleCampaigns = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return campaigns;
    return campaigns.filter((campaign) => campaign.name.toLowerCase().includes(term));
  }, [campaigns, search]);

  const stats = useMemo(() => {
    return {
      total: pagination.total,
      running: campaigns.filter((campaign) => campaign.status === "running").length,
      sent: campaigns.reduce((sum, campaign) => sum + (campaign.successCount || 0), 0),
      failed: campaigns.reduce((sum, campaign) => sum + (campaign.failedCount || 0), 0),
    };
  }, [campaigns, pagination.total]);

  const selectedVisibleIds = visibleCampaigns
    .map((campaign) => campaign._id)
    .filter((id) => selectedIds.includes(id));
  const allVisibleSelected = visibleCampaigns.length > 0 && selectedVisibleIds.length === visibleCampaigns.length;

  useEffect(() => {
    setSelectedIds([]);
    setOpenMenuId(null);
  }, [page, rowsPerPage, statusFilter]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 4000);
  };

  const resetWizard = () => {
    setWizardStep(1);
    setCampaignName("");
    setTemplateKey("review_request");
    setCsvFile(null);
    setManualNumbers("");
    setCsvPreview(null);
    setInputMode("csv");
  };

  const openDetail = (id: string) => {
    setSelectedCampaignId(id);
    setRecipientPage(1);
    setView("detail");
    setOpenMenuId(null);
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setCsvUploading(true);
    try {
      const data = await importCsvMut.mutateAsync(csvFile);
      setCsvPreview(data);
      setWizardStep(3);
    } catch (err: any) {
      showToast("error", err.message || "Upload failed");
    } finally {
      setCsvUploading(false);
    }
  };

  const handleManualUpload = async () => {
    const lines = manualNumbers.split(/\r?\n/).map((number) => number.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setCsvUploading(true);
    try {
      const data = await validateManualMut.mutateAsync(lines);
      setCsvPreview(data);
      setWizardStep(3);
    } catch (err: any) {
      showToast("error", err.message || "Validation failed");
    } finally {
      setCsvUploading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim() || !csvPreview) return;
    setCreating(true);
    try {
      const campaign = await createCampaignMut.mutateAsync({
        name: campaignName.trim(),
        templateKey,
        recipients: csvPreview.validRecords,
      });
      showToast("success", "Campaign created");
      resetWizard();
      setSelectedCampaignId(campaign._id);
      setView("detail");
    } catch (err: any) {
      showToast("error", err.message || "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (id: string, action: "start" | "pause" | "resume" | "cancel") => {
    setActionLoading(action);
    try {
      await campaignActionMut.mutateAsync({ id, action });
      showToast("success", `Campaign ${action} request completed`);
    } catch (err: any) {
      showToast("error", err.message || `Failed to ${action} campaign`);
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteCampaign = (id: string, name: string, event?: MouseEvent) => {
    event?.stopPropagation();
    setOpenMenuId(null);
    setConfirmModal({
      title: "Delete campaign?",
      message: `This will permanently delete "${name}". This action cannot be undone.`,
      confirmText: "Delete campaign",
      onConfirm: async () => {
        setActionLoading(`delete-${id}`);
        try {
          await deleteCampaignMut.mutateAsync(id);
          showToast("success", `Campaign "${name}" deleted`);
          setSelectedIds((prev) => prev.filter((item) => item !== id));
          if (selectedCampaignId === id && view === "detail") setView("list");
        } catch (err: any) {
          showToast("error", err.message || "Failed to delete campaign");
        } finally {
          setActionLoading("");
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      title: "Delete selected campaigns?",
      message: `This will permanently delete ${selectedIds.length} selected campaign(s) and their recipient records.`,
      confirmText: `Delete ${selectedIds.length} campaigns`,
      onConfirm: async () => {
        setActionLoading("bulk-delete");
        try {
          await bulkDeleteMut.mutateAsync(selectedIds);
          showToast("success", `Deleted ${selectedIds.length} campaign(s)`);
          setSelectedIds([]);
        } catch (err: any) {
          showToast("error", err.message || "Failed to delete campaigns");
        } finally {
          setActionLoading("");
        }
      },
    });
  };

  const toggleSelect = (id: string, event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    const visibleIds = visibleCampaigns.map((campaign) => campaign._id);
    setSelectedIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  if (!planLoading && isPlanBlocked) {
    return <PlanBlockedCard />;
  }

  return (
    <div className="campaigns-page animate-fade-in">
      <CampaignPageHeader
        view={view}
        onBack={() => setView("list")}
        onNewCampaign={() => {
          resetWizard();
          setView("create");
        }}
        canCreate={isWhatsappConnected}
      />

      {toast && <div className={`campaign-toast campaign-toast--${toast.type}`} role="status">{toast.msg}</div>}

      {view === "list" && (
        <>
          <WhatsAppConnectionCard
            status={whatsappStatus}
            checking={whatsappChecking}
            instancePhone={whatsappData?.instance?.connectedPhone}
          />

          <CampaignStats stats={stats} />

          <section className="campaign-panel" aria-labelledby="campaign-list-title">
            <CampaignToolbar
              total={pagination.total}
              search={search}
              statusFilter={statusFilter}
              selectedCount={selectedIds.length}
              refreshing={listFetching}
              onSearch={setSearch}
              onStatusFilter={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              onRefresh={() => refetchCampaigns()}
              onBulkDelete={handleBulkDelete}
              onClearSelection={() => setSelectedIds([])}
            />

            {listLoading ? (
              <CampaignTableSkeleton />
            ) : listError ? (
              <CampaignErrorState onRetry={() => refetchCampaigns()} />
            ) : campaigns.length === 0 && !search ? (
              <CampaignEmptyState onCreate={() => {
                resetWizard();
                setView("create");
              }} disabled={!isWhatsappConnected} />
            ) : visibleCampaigns.length === 0 ? (
              <CampaignSearchEmptyState onClear={clearFilters} />
            ) : (
              <>
                <CampaignTable
                  campaigns={visibleCampaigns}
                  selectedIds={selectedIds}
                  allVisibleSelected={allVisibleSelected}
                  openMenuId={openMenuId}
                  actionLoading={actionLoading}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                  onOpenDetail={openDetail}
                  onToggleMenu={(id) => setOpenMenuId((current) => (current === id ? null : id))}
                  onDelete={handleDeleteCampaign}
                />

                <CampaignMobileList
                  campaigns={visibleCampaigns}
                  selectedIds={selectedIds}
                  openMenuId={openMenuId}
                  actionLoading={actionLoading}
                  onToggleSelect={toggleSelect}
                  onOpenDetail={openDetail}
                  onToggleMenu={(id) => setOpenMenuId((current) => (current === id ? null : id))}
                  onDelete={handleDeleteCampaign}
                />

                <CampaignPagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  limit={rowsPerPage}
                  total={pagination.total}
                  shown={visibleCampaigns.length}
                  searchActive={search.trim().length > 0}
                  onPageChange={setPage}
                  onRowsPerPageChange={(limit) => {
                    setRowsPerPage(limit);
                    setPage(1);
                  }}
                />
              </>
            )}
          </section>
        </>
      )}

      {view === "create" && (
        <CreateCampaignWizard
          wizardStep={wizardStep}
          campaignName={campaignName}
          templateKey={templateKey}
          inputMode={inputMode}
          csvFile={csvFile}
          manualNumbers={manualNumbers}
          csvPreview={csvPreview}
          csvUploading={csvUploading}
          creating={creating}
          fileInputRef={fileInputRef}
          canCreate={isWhatsappConnected}
          onCampaignName={setCampaignName}
          onTemplateKey={setTemplateKey}
          onInputMode={setInputMode}
          onCsvFile={setCsvFile}
          onManualNumbers={setManualNumbers}
          onStep={setWizardStep}
          onCsvUpload={handleCsvUpload}
          onManualUpload={handleManualUpload}
          onCreate={handleCreateCampaign}
        />
      )}

      {view === "detail" && detail && (
        <CampaignDetail
          detail={detail}
          recipients={recipients}
          recipientPage={recipientPage}
          recipientTotal={recipientTotal}
          actionLoading={actionLoading}
          canSend={isWhatsappConnected}
          onAction={handleAction}
          onDelete={handleDeleteCampaign}
          onRefresh={() => refetchDetail()}
          onRecipientPage={setRecipientPage}
          onConfirm={setConfirmModal}
        />
      )}

      {confirmModal && (
        <DeleteCampaignDialog
          modal={confirmModal}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

function CampaignPageHeader({
  view,
  canCreate,
  onBack,
  onNewCampaign,
}: {
  view: ViewMode;
  canCreate: boolean;
  onBack: () => void;
  onNewCampaign: () => void;
}) {
  return (
    <header className="campaign-page-header">
      <div className="campaign-page-header__copy">
        {view !== "list" && (
          <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" onClick={onBack}>
            <ArrowLeftIcon /> Back to campaigns
          </button>
        )}
        <h1>WhatsApp Campaigns</h1>
        <p>Create, send and track WhatsApp review campaigns.</p>
      </div>
      {view !== "create" && canCreate && (
        <button
          className="campaign-btn campaign-btn--primary"
          onClick={onNewCampaign}
        >
          <PlusIcon /> New Campaign
        </button>
      )}
    </header>
  );
}

function WhatsAppConnectionCard({
  status,
  checking,
  instancePhone,
}: {
  status: string;
  checking: boolean;
  instancePhone?: string;
}) {
  const connected = status === "open" || status === "connected";
  const connecting = checking || status === "connecting" || status === "qr_generated";
  const tone = connected ? "connected" : connecting ? "connecting" : "disconnected";
  const label = connected ? "Connected" : connecting ? "Connecting" : "Disconnected";
  const body = connected
    ? instancePhone
      ? `Connected number: ${instancePhone}`
      : "Your WhatsApp account is ready for campaign sending."
    : connecting
      ? "We are checking the current WhatsApp session."
      : "Connect your account to create and send campaigns.";

  return (
    <section className={`campaign-connection campaign-connection--${tone}`} aria-label="WhatsApp connection status">
      <div className="campaign-connection__main">
        <div className="campaign-connection__icon" aria-hidden="true">
          <WhatsAppIcon />
        </div>
        <div>
          <div className="campaign-connection__eyebrow">
            <span className="campaign-status-dot" />
            WhatsApp
          </div>
          <h2>{label}</h2>
          <p>{body}</p>
        </div>
      </div>
      <Link to="/whatsapp" className="campaign-btn campaign-btn--dark">
        {connected ? "Manage connection" : "Connect WhatsApp"}
      </Link>
    </section>
  );
}

function CampaignStats({ stats }: { stats: { total: number; running: number; sent: number; failed: number } }) {
  return (
    <section className="campaign-stat-grid" aria-label="Campaign summary">
      <CampaignStatCard label="Total Campaigns" value={stats.total} hint="All time" icon={<InboxIcon />} />
      <CampaignStatCard label="Active / Running" value={stats.running} hint="Current page" icon={<ActivityIcon />} />
      <CampaignStatCard label="Messages Sent" value={stats.sent} hint="Current page" icon={<SendIcon />} />
      <CampaignStatCard label="Failed Deliveries" value={stats.failed} hint="Current page" icon={<AlertIcon />} danger />
    </section>
  );
}

function CampaignStatCard({
  label,
  value,
  hint,
  icon,
  danger = false,
}: {
  label: string;
  value: number;
  hint: string;
  icon: ReactNode;
  danger?: boolean;
}) {
  return (
    <article className={`campaign-stat-card${danger ? " campaign-stat-card--danger" : ""}`}>
      <div className="campaign-stat-card__icon" aria-hidden="true">{icon}</div>
      <div>
        <p className="campaign-stat-card__label">{label}</p>
        <strong>{value.toLocaleString()}</strong>
        <span>{hint}</span>
      </div>
    </article>
  );
}

function CampaignToolbar({
  total,
  search,
  statusFilter,
  selectedCount,
  refreshing,
  onSearch,
  onStatusFilter,
  onRefresh,
  onBulkDelete,
  onClearSelection,
}: {
  total: number;
  search: string;
  statusFilter: string;
  selectedCount: number;
  refreshing: boolean;
  onSearch: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onRefresh: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}) {
  return (
    <div className="campaign-panel__header">
      <div className="campaign-panel__title-row">
        <div>
          <h2 id="campaign-list-title">All Campaigns</h2>
          <p>{total.toLocaleString()} campaigns</p>
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="campaign-bulk-bar" role="region" aria-label="Bulk campaign actions">
          <span>{selectedCount} campaign{selectedCount === 1 ? "" : "s"} selected</span>
          <button className="campaign-btn campaign-btn--danger campaign-btn--sm" onClick={onBulkDelete}>
            Delete
          </button>
          <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" onClick={onClearSelection}>
            Clear selection
          </button>
        </div>
      ) : (
        <div className="campaign-toolbar">
          <label className="campaign-search">
            <SearchIcon />
            <span className="sr-only">Search campaigns</span>
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search campaigns..."
            />
            {search && (
              <button type="button" aria-label="Clear campaign search" onClick={() => onSearch("")}>
                <XIcon />
              </button>
            )}
          </label>
          <label className="campaign-select-wrap">
            <span className="sr-only">Filter by status</span>
            <select value={statusFilter} onChange={(event) => onStatusFilter(event.target.value)}>
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" onClick={onRefresh}>
            <RefreshIcon className={refreshing ? "is-spinning" : ""} /> Refresh
          </button>
        </div>
      )}
    </div>
  );
}

function CampaignTable({
  campaigns,
  selectedIds,
  allVisibleSelected,
  openMenuId,
  actionLoading,
  onToggleSelect,
  onToggleSelectAll,
  onOpenDetail,
  onToggleMenu,
  onDelete,
}: {
  campaigns: CampaignSummary[];
  selectedIds: string[];
  allVisibleSelected: boolean;
  openMenuId: string | null;
  actionLoading: string;
  onToggleSelect: (id: string, event: { stopPropagation: () => void }) => void;
  onToggleSelectAll: () => void;
  onOpenDetail: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onDelete: (id: string, name: string, event?: MouseEvent) => void;
}) {
  return (
    <div className="campaign-table-wrap">
      <table className="campaign-table">
        <thead>
          <tr>
            <th className="campaign-table__check">
              <input
                className="campaign-checkbox"
                type="checkbox"
                aria-label="Select all visible campaigns"
                checked={allVisibleSelected}
                onChange={onToggleSelectAll}
              />
            </th>
            <th>Campaign</th>
            <th>Status</th>
            <th>Recipients</th>
            <th>Delivery</th>
            <th>Created</th>
            <th className="campaign-table__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign._id} onClick={() => onOpenDetail(campaign._id)}>
              <td className="campaign-table__check" onClick={(event) => onToggleSelect(campaign._id, event)}>
                <input
                  className="campaign-checkbox"
                  type="checkbox"
                  aria-label={`Select campaign ${campaign.name}`}
                  checked={selectedIds.includes(campaign._id)}
                  onChange={() => undefined}
                />
              </td>
              <td>
                <span className="campaign-name">{campaign.name}</span>
                <span className="campaign-template">{formatTemplate(campaign.templateKey)}</span>
              </td>
              <td><CampaignStatusBadge status={campaign.status} /></td>
              <td className="campaign-number">{campaign.totalRecipients.toLocaleString()}</td>
              <td><DeliverySummary campaign={campaign} /></td>
              <td className="campaign-date" title={formatDateTime(campaign.createdAt)}>{formatDate(campaign.createdAt)}</td>
              <td className="campaign-table__actions" onClick={(event) => event.stopPropagation()}>
                <div className="campaign-row-actions">
                  <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" onClick={() => onOpenDetail(campaign._id)}>
                    View
                  </button>
                  <CampaignActionsMenu
                    campaign={campaign}
                    isOpen={openMenuId === campaign._id}
                    loading={actionLoading === `delete-${campaign._id}`}
                    onToggle={() => onToggleMenu(campaign._id)}
                    onOpenDetail={() => onOpenDetail(campaign._id)}
                    onDelete={(event) => onDelete(campaign._id, campaign.name, event)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampaignMobileList({
  campaigns,
  selectedIds,
  openMenuId,
  actionLoading,
  onToggleSelect,
  onOpenDetail,
  onToggleMenu,
  onDelete,
}: {
  campaigns: CampaignSummary[];
  selectedIds: string[];
  openMenuId: string | null;
  actionLoading: string;
  onToggleSelect: (id: string, event: { stopPropagation: () => void }) => void;
  onOpenDetail: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onDelete: (id: string, name: string, event?: MouseEvent) => void;
}) {
  return (
    <div className="campaign-mobile-list">
      {campaigns.map((campaign) => (
        <article className="campaign-mobile-card" key={campaign._id} onClick={() => onOpenDetail(campaign._id)}>
          <div className="campaign-mobile-card__top">
            <label onClick={(event) => event.stopPropagation()}>
              <input
                className="campaign-checkbox"
                type="checkbox"
                aria-label={`Select campaign ${campaign.name}`}
                checked={selectedIds.includes(campaign._id)}
                onChange={(event) => onToggleSelect(campaign._id, event)}
              />
            </label>
            <div>
              <h3>{campaign.name}</h3>
              <span>{formatDate(campaign.createdAt)}</span>
            </div>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <div className="campaign-mobile-card__metrics">
            <span><strong>{campaign.totalRecipients}</strong> Recipients</span>
            <span><strong>{campaign.successCount}</strong> Sent</span>
            <span><strong>{campaign.failedCount}</strong> Failed</span>
          </div>
          <div className="campaign-mobile-card__footer" onClick={(event) => event.stopPropagation()}>
            <DeliverySummary campaign={campaign} />
            <CampaignActionsMenu
              campaign={campaign}
              isOpen={openMenuId === campaign._id}
              loading={actionLoading === `delete-${campaign._id}`}
              onToggle={() => onToggleMenu(campaign._id)}
              onOpenDetail={() => onOpenDetail(campaign._id)}
              onDelete={(event) => onDelete(campaign._id, campaign.name, event)}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function CampaignActionsMenu({
  campaign,
  isOpen,
  loading,
  onToggle,
  onOpenDetail,
  onDelete,
}: {
  campaign: CampaignSummary;
  isOpen: boolean;
  loading: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
  onDelete: (event: MouseEvent) => void;
}) {
  return (
    <div className="campaign-actions-menu">
      <button
        className="campaign-icon-btn"
        type="button"
        aria-label={`Open actions for ${campaign.name}`}
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <MoreIcon />
      </button>
      {isOpen && (
        <div className="campaign-menu" role="menu">
          <button type="button" role="menuitem" onClick={onOpenDetail}>View details</button>
          <button
            type="button"
            role="menuitem"
            className="campaign-menu__danger"
            disabled={loading}
            onClick={onDelete}
          >
            {loading ? "Deleting..." : "Delete campaign"}
          </button>
        </div>
      )}
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  return (
    <span className={`campaign-status-badge campaign-status-badge--${status}`}>
      <span />
      {formatStatus(status)}
    </span>
  );
}

function DeliverySummary({ campaign }: { campaign: CampaignSummary }) {
  const total = Math.max(campaign.totalRecipients || 0, 0);
  const percent = total > 0 ? Math.round(((campaign.successCount || 0) / total) * 100) : 0;
  return (
    <div className="campaign-delivery">
      <div className="campaign-delivery__meta">
        <span>{campaign.successCount} / {total} sent</span>
        <span>{percent}%</span>
      </div>
      <div className="campaign-delivery__track" aria-hidden="true">
        <span className="campaign-delivery__success" style={{ width: `${percent}%` }} />
      </div>
      {campaign.failedCount > 0 && <span className="campaign-delivery__failed">{campaign.failedCount} failed</span>}
    </div>
  );
}

function CampaignPagination({
  page,
  totalPages,
  limit,
  total,
  shown,
  searchActive,
  onPageChange,
  onRowsPerPageChange,
}: {
  page: number;
  totalPages: number;
  limit: number;
  total: number;
  shown: number;
  searchActive: boolean;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (limit: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <footer className="campaign-pagination">
      <p>
        {searchActive
          ? `Showing ${shown} matching campaign${shown === 1 ? "" : "s"} on this page`
          : `Showing ${start}-${end} of ${total} campaigns`}
      </p>
      <div className="campaign-pagination__controls">
        <label>
          Rows per page
          <select value={limit} onChange={(event) => onRowsPerPageChange(Number(event.target.value))}>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </label>
        <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <span className="campaign-pagination__page">Page {page} of {Math.max(totalPages, 1)}</span>
        <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </footer>
  );
}

function CreateCampaignWizard({
  wizardStep,
  campaignName,
  templateKey,
  inputMode,
  csvFile,
  manualNumbers,
  csvPreview,
  csvUploading,
  creating,
  canCreate,
  fileInputRef,
  onCampaignName,
  onTemplateKey,
  onInputMode,
  onCsvFile,
  onManualNumbers,
  onStep,
  onCsvUpload,
  onManualUpload,
  onCreate,
}: {
  wizardStep: number;
  campaignName: string;
  templateKey: string;
  inputMode: "csv" | "manual";
  csvFile: File | null;
  manualNumbers: string;
  csvPreview: CsvPreview | null;
  csvUploading: boolean;
  creating: boolean;
  canCreate: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onCampaignName: (value: string) => void;
  onTemplateKey: (value: string) => void;
  onInputMode: (value: "csv" | "manual") => void;
  onCsvFile: (file: File | null) => void;
  onManualNumbers: (value: string) => void;
  onStep: (step: number) => void;
  onCsvUpload: () => void;
  onManualUpload: () => void;
  onCreate: () => void;
}) {
  return (
    <section className="campaign-panel campaign-form-panel">
      <div className="campaign-panel__header">
        <div>
          <h2>Create Campaign</h2>
          <p>Step {wizardStep} of 3</p>
        </div>
      </div>

      {wizardStep === 1 && (
        <div className="campaign-form">
          <label>
            <span>Campaign Name</span>
            <input type="text" placeholder="e.g. July Review Drive" value={campaignName} onChange={(event) => onCampaignName(event.target.value)} />
          </label>
          <label>
            <span>Message Template</span>
            <select value={templateKey} onChange={(event) => onTemplateKey(event.target.value)}>
              <option value="review_request">Review Request</option>
              <option value="thank_you">Thank You</option>
            </select>
          </label>
          <button className="campaign-btn campaign-btn--primary" disabled={!campaignName.trim()} onClick={() => onStep(2)}>
            Next: Upload Recipients
          </button>
        </div>
      )}

      {wizardStep === 2 && (
        <div className="campaign-form">
          <div className="campaign-segmented" role="group" aria-label="Recipient input type">
            <button className={inputMode === "csv" ? "active" : ""} onClick={() => onInputMode("csv")}>CSV File</button>
            <button className={inputMode === "manual" ? "active" : ""} onClick={() => onInputMode("manual")}>Manual Entry</button>
          </div>

          {inputMode === "csv" ? (
            <label>
              <span>Upload CSV File</span>
              <small>Only .csv files are allowed. Include a phone column. Name is optional.</small>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={(event) => onCsvFile(event.target.files?.[0] || null)} />
            </label>
          ) : (
            <label>
              <span>Enter Phone Numbers</span>
              <small>Enter one phone number per line, optionally followed by a comma and name.</small>
              <textarea
                rows={7}
                placeholder={"919876543210, John Doe\n919812345678, Priya"}
                value={manualNumbers}
                onChange={(event) => onManualNumbers(event.target.value)}
              />
            </label>
          )}

          <div className="campaign-form__actions">
            <button className="campaign-btn campaign-btn--secondary" onClick={() => onStep(1)}>Back</button>
            <button
              className="campaign-btn campaign-btn--primary"
              disabled={(inputMode === "csv" ? !csvFile : !manualNumbers.trim()) || csvUploading}
              onClick={inputMode === "csv" ? onCsvUpload : onManualUpload}
            >
              {csvUploading ? "Validating..." : "Validate & Preview"}
            </button>
          </div>
        </div>
      )}

      {wizardStep === 3 && csvPreview && (
        <div className="campaign-form">
          <div className="campaign-preview-grid">
            <PreviewStat label="Valid" value={csvPreview.valid} tone="success" />
            <PreviewStat label="Skipped" value={csvPreview.skipped} tone="warning" />
            <PreviewStat label="Invalid" value={csvPreview.invalid} tone="danger" />
            <PreviewStat label="Duplicate" value={csvPreview.duplicate} />
          </div>

          {csvPreview.reasons.length > 0 && (
            <details className="campaign-preview-errors">
              <summary>{csvPreview.reasons.length} skipped or invalid rows</summary>
              <div className="campaign-table-wrap">
                <table className="campaign-table campaign-table--compact">
                  <thead><tr><th>Row</th><th>Phone</th><th>Reason</th></tr></thead>
                  <tbody>
                    {csvPreview.reasons.slice(0, 20).map((reason, index) => (
                      <tr key={`${reason.row}-${index}`}>
                        <td>{reason.row}</td>
                        <td>{reason.phone}</td>
                        <td>{reason.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          <div className="campaign-summary-box">
            <p><strong>Campaign:</strong> {campaignName}</p>
            <p><strong>Template:</strong> {formatTemplate(templateKey)}</p>
            <p><strong>Recipients:</strong> {csvPreview.valid} customers will receive messages</p>
          </div>

          <div className="campaign-form__actions">
            <button className="campaign-btn campaign-btn--secondary" onClick={() => onStep(2)}>Back</button>
            <button
              className="campaign-btn campaign-btn--primary"
              disabled={creating || csvPreview.valid === 0 || !canCreate}
              onClick={onCreate}
            >
              {creating ? "Creating..." : `Create Campaign (${csvPreview.valid} recipients)`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function PreviewStat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" | "danger" }) {
  return (
    <div className={`campaign-preview-stat${tone ? ` campaign-preview-stat--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CampaignDetail({
  detail,
  recipients,
  recipientPage,
  recipientTotal,
  actionLoading,
  canSend,
  onAction,
  onDelete,
  onRefresh,
  onRecipientPage,
  onConfirm,
}: {
  detail: CampaignSummary;
  recipients: any[];
  recipientPage: number;
  recipientTotal: number;
  actionLoading: string;
  canSend: boolean;
  onAction: (id: string, action: "start" | "pause" | "resume" | "cancel") => void;
  onDelete: (id: string, name: string, event?: MouseEvent) => void;
  onRefresh: () => void;
  onRecipientPage: (page: number) => void;
  onConfirm: (modal: ConfirmModal) => void;
}) {
  return (
    <>
      <section className="campaign-panel">
        <div className="campaign-detail-header">
          <div>
            <h2>{detail.name}</h2>
            <p>Template: {formatTemplate(detail.templateKey)}</p>
          </div>
          <CampaignStatusBadge status={detail.status} />
        </div>

        {detail.pauseReason && <div className="campaign-paused-banner">{detail.pauseReason}</div>}

        <div className="campaign-preview-grid">
          <PreviewStat label="Total" value={detail.totalRecipients} />
          <PreviewStat label="Sent" value={detail.successCount} tone="success" />
          <PreviewStat label="Failed" value={detail.failedCount} tone="danger" />
          <PreviewStat label="Pending" value={detail.pendingCount} />
        </div>

        <DeliverySummary campaign={detail} />

        <div className="campaign-detail-actions">
          {["draft", "paused", "scheduled"].includes(detail.status) && (
            <button className="campaign-btn campaign-btn--primary" disabled={!!actionLoading || !canSend} onClick={() => onAction(detail._id, "start")}>
              {actionLoading === "start" ? "Starting..." : "Start Campaign"}
            </button>
          )}
          {detail.status === "running" && (
            <button className="campaign-btn campaign-btn--secondary" disabled={!!actionLoading} onClick={() => onAction(detail._id, "pause")}>
              {actionLoading === "pause" ? "Pausing..." : "Pause"}
            </button>
          )}
          {detail.status === "paused" && (
            <button className="campaign-btn campaign-btn--primary" disabled={!!actionLoading || !canSend} onClick={() => onAction(detail._id, "resume")}>
              {actionLoading === "resume" ? "Resuming..." : "Resume"}
            </button>
          )}
          {!["completed", "cancelled"].includes(detail.status) && (
            <button
              className="campaign-btn campaign-btn--danger"
              disabled={!!actionLoading}
              onClick={() => onConfirm({
                title: "Cancel campaign?",
                message: "Any unsent messages will be stopped immediately.",
                confirmText: "Cancel campaign",
                onConfirm: () => onAction(detail._id, "cancel"),
              })}
            >
              {actionLoading === "cancel" ? "Cancelling..." : "Cancel"}
            </button>
          )}
          <button className="campaign-btn campaign-btn--danger" disabled={!!actionLoading} onClick={() => onDelete(detail._id, detail.name)}>
            {actionLoading === `delete-${detail._id}` ? "Deleting..." : "Delete campaign"}
          </button>
          <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" onClick={onRefresh}>
            <RefreshIcon /> Refresh
          </button>
        </div>
      </section>

      <section className="campaign-panel">
        <div className="campaign-panel__header">
          <div>
            <h2>Recipients</h2>
            <p>{recipientTotal.toLocaleString()} total</p>
          </div>
        </div>
        {recipients.length === 0 ? (
          <p className="campaign-muted-empty">No recipients found.</p>
        ) : (
          <>
            <div className="campaign-table-wrap">
              <table className="campaign-table campaign-table--compact">
                <thead>
                  <tr><th>Customer</th><th>Phone</th><th>Status</th><th>Sent</th><th>Delivered</th><th>Error</th></tr>
                </thead>
                <tbody>
                  {recipients.map((recipient) => (
                    <tr key={recipient._id}>
                      <td>{recipient.customerId?.name || "-"}</td>
                      <td className="campaign-mono">{recipient.phoneNormalized}</td>
                      <td><CampaignStatusBadge status={recipient.status} /></td>
                      <td className="campaign-date">{recipient.sentAt ? formatTime(recipient.sentAt) : "-"}</td>
                      <td className="campaign-date">
                        {recipient.readAt ? `Read ${formatTime(recipient.readAt)}` : recipient.deliveredAt ? `Delivered ${formatTime(recipient.deliveredAt)}` : "-"}
                      </td>
                      <td className="campaign-error-text">{formatRecipientError(recipient.lastError || recipient.skipReason || "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recipientTotal > 20 && (
              <div className="campaign-pagination">
                <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" disabled={recipientPage <= 1} onClick={() => onRecipientPage(recipientPage - 1)}>Previous</button>
                <span className="campaign-pagination__page">Page {recipientPage} of {Math.ceil(recipientTotal / 20)}</span>
                <button className="campaign-btn campaign-btn--secondary campaign-btn--sm" disabled={recipientPage >= Math.ceil(recipientTotal / 20)} onClick={() => onRecipientPage(recipientPage + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

function DeleteCampaignDialog({ modal, onClose }: { modal: NonNullable<ConfirmModal>; onClose: () => void }) {
  return (
    <div className="campaign-dialog-overlay" onClick={onClose}>
      <div className="campaign-dialog" role="dialog" aria-modal="true" aria-labelledby="campaign-delete-title" onClick={(event) => event.stopPropagation()}>
        <div className="campaign-dialog__icon"><AlertIcon /></div>
        <h2 id="campaign-delete-title">{modal.title}</h2>
        <p>{modal.message}</p>
        <div className="campaign-dialog__actions">
          <button className="campaign-btn campaign-btn--secondary" onClick={onClose}>Cancel</button>
          <button
            className="campaign-btn campaign-btn--danger"
            onClick={() => {
              const onConfirm = modal.onConfirm;
              onClose();
              onConfirm();
            }}
          >
            {modal.confirmText || "Delete campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignTableSkeleton() {
  return (
    <div className="campaign-skeleton" aria-label="Loading campaigns">
      <div className="campaign-skeleton__toolbar" />
      {Array.from({ length: 7 }).map((_, index) => (
        <div className="campaign-skeleton__row" key={index}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function CampaignEmptyState({ onCreate, disabled }: { onCreate: () => void; disabled: boolean }) {
  return (
    <div className="campaign-empty">
      <div className="campaign-empty__icon"><InboxIcon /></div>
      <h2>No campaigns yet</h2>
      <p>Create your first WhatsApp campaign to start collecting customer reviews.</p>
      <button className="campaign-btn campaign-btn--primary" disabled={disabled} onClick={onCreate}>
        <PlusIcon /> Create Campaign
      </button>
    </div>
  );
}

function CampaignSearchEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="campaign-empty">
      <div className="campaign-empty__icon"><SearchIcon /></div>
      <h2>No campaigns found</h2>
      <p>Try changing your search or filters.</p>
      <button className="campaign-btn campaign-btn--secondary" onClick={onClear}>Clear filters</button>
    </div>
  );
}

function CampaignErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="campaign-empty campaign-empty--error">
      <div className="campaign-empty__icon"><AlertIcon /></div>
      <h2>Unable to load campaigns</h2>
      <p>We could not retrieve your campaigns.</p>
      <button className="campaign-btn campaign-btn--primary" onClick={onRetry}>Try again</button>
    </div>
  );
}

function PlanBlockedCard() {
  return (
    <div className="campaigns-page animate-fade-in">
      <header className="campaign-page-header">
        <div className="campaign-page-header__copy">
          <h1>WhatsApp Campaigns</h1>
          <p>Send bulk review requests to your customers.</p>
        </div>
      </header>
      <section className="campaign-panel campaign-plan-card">
        <div className="campaign-empty__icon"><LockIcon /></div>
        <h2>Campaigns require a paid plan</h2>
        <p>WhatsApp campaign management is available on the Starter plan and above.</p>
        <Link to="/billing" className="campaign-btn campaign-btn--primary">View Plans & Upgrade</Link>
      </section>
    </div>
  );
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTemplate(template: string) {
  return formatStatus(template);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatRecipientError(raw: string) {
  if (!raw) return "";
  if (raw.includes("[object Object]")) return "Send failed - invalid phone format";
  if (raw.toLowerCase().includes("phone") && raw.includes("400")) return "Invalid phone number - include country code";
  return raw;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16M3 12A9 9 0 0 1 18.4 5.6L21 8M3 21v-5h5M21 3v5h-5" /></svg>;
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>;
}

function InboxIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z" /><path d="m4 7 8 6 8-6" /></svg>;
}

function ActivityIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h4l3-7 4 14 3-7h2" /></svg>;
}

function SendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></svg>;
}

function AlertIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01" /><path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /></svg>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z" /><path d="M8.5 7.8c.2-.3.4-.3.7-.3h.5c.2 0 .4 0 .5.4.2.5.7 1.7.8 1.8.1.2.1.3 0 .5-.2.4-.4.6-.7.9-.1.1-.2.3-.1.5.3.5.8 1.2 1.4 1.7.8.7 1.5 1 2 .1.2-.3.4-.4.6-.3.2.1 1.5.7 1.7.8.3.1.4.2.5.3.1.2.1 1-.2 1.7-.3.8-1.5 1.4-2.1 1.4-1.7.1-4.9-1.4-6.4-4.1-1.1-1.9-1.1-3.3-.6-4.2.2-.4.6-.7.8-.9Z" /></svg>;
}

function XIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>;
}

function ArrowLeftIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
}
