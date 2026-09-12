import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { DeliveryLayout } from "../../components/layout/DeliveryLayout";
import {
  getMyDeliveryRequests,
  getDeliveryPersonProfile,
  updateDeliveryAvailability,
  updateDeliveryLocation,
  respondToDelivery,
  markDeliveryPickedUp,
  startDelivery,
  completeDelivery,
} from "../../services/deliveryService";
import type { DeliveryRequestItem } from "../../types/delivery";
import type { DeliveryPersonProfile } from "../../types/profile";
import { DeliveryRequestCard } from "../../components/delivery/DeliveryRequestCard";
import { DeliveryStatusStepper } from "../../components/delivery/DeliveryStatusStepper";
import { AcceptDeliveryModal } from "../../components/delivery/AcceptDeliveryModal";
import { RejectDeliveryModal } from "../../components/delivery/RejectDeliveryModal";

export function DeliveryDashboard() {
  const [profile, setProfile] = useState<DeliveryPersonProfile | null>(null);
  const [requests, setRequests] = useState<DeliveryRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [acceptingRequest, setAcceptingRequest] = useState<DeliveryRequestItem | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<DeliveryRequestItem | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [detectingGps, setDetectingGps] = useState(false);
  const [historyTab, setHistoryTab] = useState<"completed" | "all">("completed");

  const loadData = async () => {
    setLoading(true);
    try {
      const [prof, reqs] = await Promise.all([
        getDeliveryPersonProfile(),
        getMyDeliveryRequests(),
      ]);
      setProfile(prof);
      setRequests(reqs);
    } catch (err: any) {
      console.error("Failed to load driver dashboard:", err);
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to load dashboard data.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Availability Toggle
  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      setActionLoading("toggle");
      const newStatus = !profile.isAvailable;
      const res = await updateDeliveryAvailability(newStatus);
      setProfile((prev) => (prev ? { ...prev, isAvailable: res.isAvailable } : null));
      setStatusMsg({
        type: "success",
        text: res.message,
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to update availability.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // GPS Update
  const handleUpdateGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        try {
          await updateDeliveryLocation(lat, lon);
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  location: { type: "Point", coordinates: [lon, lat] },
                }
              : null
          );
          setStatusMsg({
            type: "success",
            text: `GPS coordinates updated to ${lat}°N, ${lon}°W`,
          });
          setTimeout(() => setStatusMsg(null), 4000);
        } catch (err: any) {
          setStatusMsg({
            type: "error",
            text: err.response?.data?.message || "Failed to update GPS location.",
          });
        } finally {
          setDetectingGps(false);
        }
      },
      (err) => {
        setDetectingGps(false);
        alert(`Location detection failed: ${err.message}`);
      },
      { timeout: 10000 }
    );
  };

  // Accept / Reject Handlers
  const handleConfirmAccept = async () => {
    if (!acceptingRequest) return;
    try {
      setActionLoading(acceptingRequest.id);
      const res = await respondToDelivery(acceptingRequest.id, true);
      setStatusMsg({
        type: "success",
        text: `🎉 ${res.message} Delivery accepted! You are now en route to the kitchen.`,
      });
      setAcceptingRequest(null);
      await loadData();
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to accept delivery.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    try {
      setActionLoading(rejectingRequest.id);
      const res = await respondToDelivery(rejectingRequest.id, false);
      setStatusMsg({
        type: "success",
        text: res.message,
      });
      setRejectingRequest(null);
      await loadData();
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to decline delivery.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Progression: Picked Up
  const handleMarkPickedUp = async (id: string) => {
    try {
      setActionLoading(id);
      const res = await markDeliveryPickedUp(id);
      setStatusMsg({ type: "success", text: res.message });
      await loadData();
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

  // Progression: Start Transit
  const handleStartTransit = async (id: string) => {
    try {
      setActionLoading(id);
      const res = await startDelivery(id);
      setStatusMsg({ type: "success", text: res.message });
      await loadData();
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

  // Progression: Complete Delivery
  const handleCompleteDelivery = async (id: string) => {
    try {
      setActionLoading(id);
      const res = await completeDelivery(id);
      setStatusMsg({
        type: "success",
        text: `🎉 ${res.message} Delivery payout added to your earnings!`,
      });
      await loadData();
      setTimeout(() => setStatusMsg(null), 6000);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to complete delivery.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Derived KPI Metrics
  const earningsSummary = useMemo(() => {
    const delivered = requests.filter((r) => r.status === "Delivered");
    const totalEarnings = delivered.reduce((sum, r) => sum + (r.deliveryFee || 0), 0);
    const totalDistanceKm = delivered.reduce(
      (sum, r) => sum + (r.distanceInKilometers || 0),
      0
    );
    const completedCount = delivered.length;
    const activeCount = requests.filter((r) =>
      ["Accepted", "PickedUp", "InTransit"].includes(r.status)
    ).length;
    const co2SavedKg = Number((completedCount * 2.5).toFixed(1));

    return {
      totalEarnings,
      completedCount,
      totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
      activeCount,
      co2SavedKg,
    };
  }, [requests]);

  // Request categorization
  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "Assigned"),
    [requests]
  );

  const activeDelivery = useMemo(
    () => requests.find((r) => ["Accepted", "PickedUp", "InTransit"].includes(r.status)),
    [requests]
  );

  const completedRequests = useMemo(
    () => requests.filter((r) => r.status === "Delivered"),
    [requests]
  );

  const lat = profile?.location?.coordinates?.[1];
  const lng = profile?.location?.coordinates?.[0];

  return (
    <DeliveryLayout
      onAvailabilityChange={(isAvail) =>
        setProfile((prev) => (prev ? { ...prev, isAvailable: isAvail } : null))
      }
      onLocationUpdate={(newLat, newLon) =>
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                location: { type: "Point", coordinates: [newLon, newLat] },
              }
            : null
        )
      }
    >
      <div className="rst-dashboard">
        {/* Page Header */}
        <div className="rst-page-header">
          <div>
            <span className="del-portal-pill">RIDER CONTROL PANEL</span>
            <h1 className="rst-page-title">Delivery Partner Dashboard</h1>
            <p className="rst-page-subtitle">
              Manage live AI delivery assignments, active runs, real-time GPS telemetry, and earnings.
            </p>
          </div>

          <div className="rst-page-actions">
            <button
              type="button"
              className="rst-btn-outline"
              onClick={loadData}
              disabled={loading}
            >
              🔄 Refresh Runs
            </button>
            <Link to="/delivery/profile" className="rst-btn-solid">
              👤 Driver Profile
            </Link>
          </div>
        </div>

        {/* Global Notification Banner */}
        {statusMsg && (
          <div
            className={
              statusMsg.type === "success" ? "cst-alert-success" : "cst-alert-danger"
            }
          >
            {statusMsg.text}
          </div>
        )}

        {/* AVAILABILITY & DISPATCH HERO CARD */}
        {profile && (
          <div
            className={`del-availability-card ${profile.isAvailable ? "online" : "offline"}`}
          >
            <div className="del-avail-left">
              <div className="del-avail-indicator">
                <span className="del-avail-dot" />
                <span className="del-avail-tag">
                  {profile.isAvailable ? "ONLINE & READY FOR DISPATCH" : "CURRENTLY OFFLINE"}
                </span>
              </div>
              <h2 className="del-avail-title">
                {profile.isAvailable
                  ? "AI Dispatch Agent is Actively Scanning For Runs"
                  : "Go Online to Receive Surplus Food Deliveries"}
              </h2>
              <p className="del-avail-desc">
                {profile.isAvailable
                  ? "When restaurants prepare surplus meals, our LangGraph dispatch algorithm selects you based on proximity and vehicle fitness."
                  : "Switch to Online mode whenever you are ready to accept pickup requests in your territory."}
              </p>

              {/* Location Badge */}
              <div className="del-avail-loc-bar">
                <span>
                  📍 <strong>Dispatch Base:</strong> {lat?.toFixed(4) ?? "N/A"}°N,{" "}
                  {lng?.toFixed(4) ?? "N/A"}°W
                </span>
                <button
                  type="button"
                  className="del-btn-gps"
                  onClick={handleUpdateGps}
                  disabled={detectingGps}
                >
                  {detectingGps ? "Calibrating GPS..." : "📍 Update Current GPS"}
                </button>
              </div>
            </div>

            <div className="del-avail-right">
              <button
                type="button"
                className={`del-btn-toggle ${profile.isAvailable ? "to-offline" : "to-online"}`}
                onClick={handleToggleAvailability}
                disabled={actionLoading === "toggle"}
              >
                {actionLoading === "toggle"
                  ? "Updating..."
                  : profile.isAvailable
                  ? "Switch Offline"
                  : "⚡ Go Online Now"}
              </button>
            </div>
          </div>
        )}

        {/* KPI & EARNINGS GRID */}
        <div className="rst-kpi-grid">
          <div className="rst-kpi-card">
            <div className="rst-kpi-header">
              <span className="rst-kpi-title">Total Earnings</span>
              <span className="rst-kpi-icon">💰</span>
            </div>
            <div className="rst-kpi-value">
              ${earningsSummary.totalEarnings.toFixed(2)}
            </div>
            <p className="rst-kpi-note">Calculated from completed deliveries</p>
          </div>

          <div className="rst-kpi-card">
            <div className="rst-kpi-header">
              <span className="rst-kpi-title">Completed Deliveries</span>
              <span className="rst-kpi-icon">📦</span>
            </div>
            <div className="rst-kpi-value">{earningsSummary.completedCount}</div>
            <p className="rst-kpi-note">Surplus meals safely rescued</p>
          </div>

          <div className="rst-kpi-card">
            <div className="rst-kpi-header">
              <span className="rst-kpi-title">Distance Traveled</span>
              <span className="rst-kpi-icon">🛣️</span>
            </div>
            <div className="rst-kpi-value">{earningsSummary.totalDistanceKm} km</div>
            <p className="rst-kpi-note">Transit distance across deliveries</p>
          </div>

          <div className="rst-kpi-card">
            <div className="rst-kpi-header">
              <span className="rst-kpi-title">CO₂ Emissions Saved</span>
              <span className="rst-kpi-icon">🌱</span>
            </div>
            <div className="rst-kpi-value">{earningsSummary.co2SavedKg} kg</div>
            <p className="rst-kpi-note">~2.5 kg CO₂ prevented per meal</p>
          </div>
        </div>

        {/* PENDING DISPATCH REQUESTS (status === "Assigned") */}
        {pendingRequests.length > 0 && (
          <div className="del-pending-section">
            <div className="del-section-header">
              <div className="del-urgent-badge">
                ⚡ NEW INCOMING DISPATCH ({pendingRequests.length})
              </div>
              <h3>Action Required: Respond to Delivery Assignment</h3>
            </div>

            <div className="drc-grid">
              {pendingRequests.map((req) => (
                <DeliveryRequestCard
                  key={req.id}
                  request={req}
                  onAccept={(r) => setAcceptingRequest(r)}
                  onReject={(r) => setRejectingRequest(r)}
                  actionLoading={actionLoading === req.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* ACTIVE IN-FLIGHT DELIVERY (Accepted, PickedUp, InTransit) */}
        {activeDelivery && (
          <div className="del-active-section">
            <div className="del-active-header">
              <div className="del-active-badge">
                <span className="del-active-dot" />
                <span>ACTIVE DELIVERY IN PROGRESS</span>
              </div>
              <span className="del-payout-hero">
                Payout: ${activeDelivery.deliveryFee.toFixed(2)}
              </span>
            </div>

            {/* 5-Stage Stepper Progression */}
            <div className="del-stepper-box">
              <DeliveryStatusStepper status={activeDelivery.status} />
            </div>

            {/* Trajectory Details */}
            <div className="del-active-body">
              <div className="del-active-col">
                <span className="co-label">Pickup Kitchen</span>
                <strong className="del-active-node-title">
                  {activeDelivery.restaurant?.restaurantName || "Partner Restaurant"}
                </strong>
                <p className="co-val">
                  {activeDelivery.restaurant?.address ||
                    `Coordinates: [${activeDelivery.pickupLocation.coordinates[1].toFixed(4)}, ${activeDelivery.pickupLocation.coordinates[0].toFixed(4)}]`}
                </p>
                {activeDelivery.restaurant?.phoneNumber && (
                  <span className="del-node-phone">
                    📞 {activeDelivery.restaurant.phoneNumber}
                  </span>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.pickupLocation.coordinates[1]},${activeDelivery.pickupLocation.coordinates[0]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="del-map-link"
                >
                  🗺️ Navigate to Kitchen ➔
                </a>
              </div>

              <div className="del-active-col">
                <span className="co-label">Customer Dropoff</span>
                <strong className="del-active-node-title">
                  {activeDelivery.deliveryAddress || "Customer Delivery Destination"}
                </strong>
                <p className="co-val">
                  📍 Coordinates: [
                  {activeDelivery.deliveryLocation.coordinates[1].toFixed(4)},{" "}
                  {activeDelivery.deliveryLocation.coordinates[0].toFixed(4)}]
                </p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.deliveryLocation.coordinates[1]},${activeDelivery.deliveryLocation.coordinates[0]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="del-map-link"
                >
                  🗺️ Navigate to Customer ➔
                </a>
              </div>

              <div className="del-active-col">
                <span className="co-label">Transit Metrics</span>
                <p className="co-val">
                  {activeDelivery.distanceInKilometers} km total distance
                </p>
                <span className="co-sub">ETA: ~{activeDelivery.estimatedMinutes} mins</span>
                <span className="del-co2-metric" style={{ color: "#15803d", fontSize: "11px", fontWeight: 700, marginTop: "4px" }}>
                  🌱 ~2.5 kg CO₂ Saved
                </span>
              </div>
            </div>

            {/* Lifecycle Action Footer */}
            <div className="del-active-footer">
              <div className="del-active-status-note">
                {activeDelivery.status === "Accepted" &&
                  "🚴 Travel to the restaurant and confirm meal receipt."}
                {activeDelivery.status === "PickedUp" &&
                  "📦 Meal secured! Click below to notify customer and begin delivery."}
                {activeDelivery.status === "InTransit" &&
                  "🚀 En route to customer. Hand over portion to complete run."}
              </div>

              <div className="del-active-btn-wrap">
                {activeDelivery.status === "Accepted" && (
                  <button
                    type="button"
                    className="del-btn-step"
                    onClick={() => handleMarkPickedUp(activeDelivery.id)}
                    disabled={actionLoading === activeDelivery.id}
                  >
                    {actionLoading === activeDelivery.id
                      ? "Updating..."
                      : "Confirm Meal Picked Up 📦"}
                  </button>
                )}

                {activeDelivery.status === "PickedUp" && (
                  <button
                    type="button"
                    className="del-btn-step"
                    onClick={() => handleStartTransit(activeDelivery.id)}
                    disabled={actionLoading === activeDelivery.id}
                  >
                    {actionLoading === activeDelivery.id
                      ? "Updating..."
                      : "Start Delivery Run 🚀"}
                  </button>
                )}

                {activeDelivery.status === "InTransit" && (
                  <button
                    type="button"
                    className="del-btn-complete"
                    onClick={() => handleCompleteDelivery(activeDelivery.id)}
                    disabled={actionLoading === activeDelivery.id}
                  >
                    {actionLoading === activeDelivery.id
                      ? "Completing..."
                      : "Complete Delivery & Collect Payout 🎉"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DELIVERIES HISTORY SECTION */}
        <div className="rst-card">
          <div className="rst-card-header">
            <div>
              <h3>Delivery Runs & Activity</h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--grey-600)" }}>
                Audit log of all assigned and completed surplus food runs.
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className={`rst-btn-tab ${historyTab === "completed" ? "rst-btn-tab--active" : ""}`}
                onClick={() => setHistoryTab("completed")}
              >
                Completed ({completedRequests.length})
              </button>
              <button
                type="button"
                className={`rst-btn-tab ${historyTab === "all" ? "rst-btn-tab--active" : ""}`}
                onClick={() => setHistoryTab("all")}
              >
                All Runs ({requests.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="fd-loading-card">
              <div className="spinner-border text-warning" role="status" />
              <p>Loading your delivery history...</p>
            </div>
          ) : (historyTab === "completed" ? completedRequests : requests).length === 0 ? (
            <div className="rst-empty-state">
              <span style={{ fontSize: "32px", marginBottom: "8px" }}>🛵</span>
              <p className="rst-empty-text">
                {historyTab === "completed"
                  ? "No completed deliveries yet. Accept an incoming dispatch above to start earning!"
                  : "No delivery requests found on your account."}
              </p>
            </div>
          ) : (
            <div className="rst-table-wrapper">
              <table className="rst-table">
                <thead>
                  <tr>
                    <th>Dispatch ID</th>
                    <th>Order Reference</th>
                    <th>Date & Time</th>
                    <th>Distance</th>
                    <th>Fee Earned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyTab === "completed" ? completedRequests : requests).map(
                    (req) => (
                      <tr key={req.id}>
                        <td>
                          <span className="rst-code">#{req.id.slice(-6)}</span>
                        </td>
                        <td>
                          <span className="rst-code">Order #{req.orderId.slice(-6)}</span>
                        </td>
                        <td>
                          {new Date(req.requestedAt).toLocaleDateString()} at{" "}
                          {new Date(req.requestedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td>
                          <strong>{req.distanceInKilometers} km</strong>
                        </td>
                        <td>
                          <strong style={{ color: "#15803d" }}>
                            +${req.deliveryFee.toFixed(2)}
                          </strong>
                        </td>
                        <td>
                          <span
                            className={`rst-status-pill ${
                              req.status === "Delivered"
                                ? "rst-status-pill--completed"
                                : req.status === "Assigned"
                                ? "rst-status-pill--pending"
                                : "rst-status-pill--preparing"
                            }`}
                          >
                            {req.status === "Delivered" ? "✓ Delivered" : req.status}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {acceptingRequest && (
        <AcceptDeliveryModal
          request={acceptingRequest}
          loading={actionLoading === acceptingRequest.id}
          onConfirm={handleConfirmAccept}
          onClose={() => setAcceptingRequest(null)}
        />
      )}

      {rejectingRequest && (
        <RejectDeliveryModal
          request={rejectingRequest}
          loading={actionLoading === rejectingRequest.id}
          onConfirm={handleConfirmReject}
          onClose={() => setRejectingRequest(null)}
        />
      )}
    </DeliveryLayout>
  );
}

export default DeliveryDashboard;
