import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { DeliveryLayout } from "../../components/layout/DeliveryLayout";
import {
  getMyDeliveryRequests,
  respondToDelivery,
  markDeliveryPickedUp,
  startDelivery,
  completeDelivery,
} from "../../services/deliveryService";
import type { DeliveryRequestItem } from "../../types/delivery";
import { DeliveryRequestCard } from "../../components/delivery/DeliveryRequestCard";
import { AcceptDeliveryModal } from "../../components/delivery/AcceptDeliveryModal";
import { RejectDeliveryModal } from "../../components/delivery/RejectDeliveryModal";

type TabFilter = "pending" | "active" | "completed" | "all";

export function DeliveryRequestsPage() {
  const [requests, setRequests] = useState<DeliveryRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>("pending");
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modal states
  const [acceptingRequest, setAcceptingRequest] = useState<DeliveryRequestItem | null>(
    null
  );
  const [rejectingRequest, setRejectingRequest] = useState<DeliveryRequestItem | null>(
    null
  );
  const [modalLoading, setModalLoading] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getMyDeliveryRequests();
      setRequests(data);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to load delivery requests.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleConfirmAccept = async () => {
    if (!acceptingRequest) return;
    setModalLoading(true);
    try {
      const res = await respondToDelivery(acceptingRequest.id, true);
      setStatusMsg({
        type: "success",
        text: `🎉 ${res.message} You can now track and progress this run on your dashboard!`,
      });
      setAcceptingRequest(null);
      await loadRequests();
      setActiveTab("active");
      setTimeout(() => setStatusMsg(null), 6000);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to accept delivery request.",
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    setModalLoading(true);
    try {
      const res = await respondToDelivery(rejectingRequest.id, false);
      setStatusMsg({
        type: "success",
        text: res.message,
      });
      setRejectingRequest(null);
      await loadRequests();
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to decline delivery request.",
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleMarkPickedUp = async (req: DeliveryRequestItem) => {
    setActionLoading(req.id);
    try {
      const res = await markDeliveryPickedUp(req.id);
      setStatusMsg({ type: "success", text: res.message });
      await loadRequests();
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to update pickup status.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartTransit = async (req: DeliveryRequestItem) => {
    setActionLoading(req.id);
    try {
      const res = await startDelivery(req.id);
      setStatusMsg({ type: "success", text: res.message });
      await loadRequests();
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to start delivery transit.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteDelivery = async (req: DeliveryRequestItem) => {
    setActionLoading(req.id);
    try {
      const res = await completeDelivery(req.id);
      setStatusMsg({
        type: "success",
        text: `🎉 ${res.message} Delivery payout added to your balance!`,
      });
      await loadRequests();
      setActiveTab("completed");
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to complete delivery.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "Assigned").length,
    [requests]
  );
  const activeCount = useMemo(
    () =>
      requests.filter((r) =>
        ["Accepted", "PickedUp", "InTransit"].includes(r.status)
      ).length,
    [requests]
  );
  const completedCount = useMemo(
    () => requests.filter((r) => r.status === "Delivered").length,
    [requests]
  );

  const filteredRequests = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return requests.filter((r) => r.status === "Assigned");
      case "active":
        return requests.filter((r) =>
          ["Accepted", "PickedUp", "InTransit"].includes(r.status)
        );
      case "completed":
        return requests.filter((r) => r.status === "Delivered");
      case "all":
      default:
        return requests;
    }
  }, [requests, activeTab]);

  return (
    <DeliveryLayout>
      <div className="rst-dashboard">
        {/* Header */}
        <div className="rst-page-header">
          <div>
            <span className="del-portal-pill">DISPATCH CENTER</span>
            <h1 className="rst-page-title">Delivery Requests & Runs</h1>
            <p className="rst-page-subtitle">
              Review and respond to AI-assigned surplus food deliveries with transparent restaurant telemetry.
            </p>
          </div>

          <div className="rst-page-actions">
            <button
              type="button"
              className="rst-btn-outline"
              onClick={loadRequests}
              disabled={loading}
            >
              🔄 Refresh Requests
            </button>
            <Link to="/delivery/dashboard" className="rst-btn-solid">
              🚴 Driver Dashboard
            </Link>
          </div>
        </div>

        {/* Global Notifications */}
        {statusMsg && (
          <div
            className={
              statusMsg.type === "success" ? "cst-alert-success" : "cst-alert-danger"
            }
          >
            {statusMsg.text}
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="rst-card-header" style={{ marginBottom: "16px", padding: 0, border: "none" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button
              type="button"
              className={`rst-btn-tab ${activeTab === "pending" ? "rst-btn-tab--active" : ""}`}
              onClick={() => setActiveTab("pending")}
            >
              ⚡ Pending Requests ({pendingCount})
            </button>
            <button
              type="button"
              className={`rst-btn-tab ${activeTab === "active" ? "rst-btn-tab--active" : ""}`}
              onClick={() => setActiveTab("active")}
            >
              🚴 Active Runs ({activeCount})
            </button>
            <button
              type="button"
              className={`rst-btn-tab ${activeTab === "completed" ? "rst-btn-tab--active" : ""}`}
              onClick={() => setActiveTab("completed")}
            >
              ✓ Completed ({completedCount})
            </button>
            <button
              type="button"
              className={`rst-btn-tab ${activeTab === "all" ? "rst-btn-tab--active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Requests ({requests.length})
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="fd-loading-card">
            <div className="spinner-border text-warning" role="status" />
            <p>Querying delivery requests from dispatch engine...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rst-empty-state" style={{ background: "var(--white)", borderRadius: "14px", border: "1px solid var(--grey-200)" }}>
            <span style={{ fontSize: "36px", marginBottom: "10px" }}>🛵</span>
            <h3>No {activeTab} delivery requests</h3>
            <p className="rst-empty-text">
              {activeTab === "pending"
                ? "No pending dispatches waiting for your review. Keep your status Online to receive incoming runs."
                : activeTab === "active"
                ? "You don't have any deliveries in transit right now."
                : "No delivery requests found under this category."}
            </p>
            <div style={{ marginTop: "16px" }}>
              <Link to="/delivery/dashboard" className="rst-btn-solid">
                Go to Control Dashboard ➔
              </Link>
            </div>
          </div>
        ) : (
          <div className="drc-grid">
            {filteredRequests.map((req) => (
              <DeliveryRequestCard
                key={req.id}
                request={req}
                onAccept={(r) => setAcceptingRequest(r)}
                onReject={(r) => setRejectingRequest(r)}
                onMarkPickedUp={handleMarkPickedUp}
                onStartTransit={handleStartTransit}
                onCompleteDelivery={handleCompleteDelivery}
                actionLoading={actionLoading === req.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Accept Confirmation Dialog */}
      {acceptingRequest && (
        <AcceptDeliveryModal
          request={acceptingRequest}
          loading={modalLoading}
          onConfirm={handleConfirmAccept}
          onClose={() => setAcceptingRequest(null)}
        />
      )}

      {/* Reject Confirmation Dialog */}
      {rejectingRequest && (
        <RejectDeliveryModal
          request={rejectingRequest}
          loading={modalLoading}
          onConfirm={handleConfirmReject}
          onClose={() => setRejectingRequest(null)}
        />
      )}
    </DeliveryLayout>
  );
}

export default DeliveryRequestsPage;
