import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import {
  getMyCustomerOrders,
  cancelCustomerOrder,
  getCustomerDeliveryEstimate,
} from "../../services/customerService";
import type { Order } from "../../types/restaurant";
import { OrderStatusStepper } from "../../components/orders/OrderStatusStepper";

type OrderFilterTab = "all" | "active" | "delivered" | "cancelled";

export function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [activeTab, setActiveTab] = useState<OrderFilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Cancel modal state
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Delivery Estimate modal / viewer
  const [estimateOrder, setEstimateOrder] = useState<Order | null>(null);
  const [estimateData, setEstimateData] = useState<any | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyCustomerOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load your orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async () => {
    if (!cancellingOrder) return;
    setCancelLoading(true);
    try {
      await cancelCustomerOrder(cancellingOrder.id);
      setCancelMsg({
        type: "success",
        text: `Order #${cancellingOrder.id} successfully cancelled. Food portions returned to stock.`,
      });
      setCancellingOrder(null);
      fetchOrders();
    } catch (err: any) {
      setCancelMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to cancel order.",
      });
    } finally {
      setCancelLoading(false);
      setTimeout(() => setCancelMsg(null), 6000);
    }
  };

  const handleViewEstimate = async (order: Order) => {
    setEstimateOrder(order);
    setEstimateLoading(true);
    setEstimateData(null);
    try {
      const data = await getCustomerDeliveryEstimate(order.id);
      setEstimateData(data);
    } catch (err: any) {
      setEstimateData({
        error:
          err.response?.data?.message ||
          "Could not retrieve live delivery estimate for this order.",
      });
    } finally {
      setEstimateLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      if (activeTab === "active") {
        const activeStatuses = ["Pending", "Confirmed", "Preparing", "ReadyForPickup", "OutForDelivery"];
        if (!activeStatuses.includes(o.status)) return false;
      } else if (activeTab === "delivered") {
        if (o.status !== "Delivered") return false;
      } else if (activeTab === "cancelled") {
        if (o.status !== "Cancelled") return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = o.id.toLowerCase().includes(q);
        const addrMatch = o.deliveryAddress?.toLowerCase().includes(q);
        const statusMatch = o.status.toLowerCase().includes(q);
        return idMatch || addrMatch || statusMatch;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Pending":
        return "co-badge-pending";
      case "Confirmed":
      case "Preparing":
        return "co-badge-preparing";
      case "ReadyForPickup":
      case "OutForDelivery":
        return "co-badge-ready";
      case "Delivered":
        return "co-badge-delivered";
      case "Cancelled":
        return "co-badge-cancelled";
      default:
        return "co-badge-default";
    }
  };

  return (
    <CustomerLayout>
      <div className="co-container">
        {/* Header */}
        <div className="co-header">
          <div>
            <span className="fd-badge">📦 ORDER MANAGEMENT</span>
            <h1 className="co-title">My Surplus Food Orders</h1>
            <p className="co-subtitle">
              Track active kitchen preparation, autonomous delivery dispatch, and purchase history.
            </p>
          </div>

          <div className="co-header-actions">
            <button
              type="button"
              className="fd-refresh-btn"
              onClick={fetchOrders}
              disabled={loading}
            >
              🔄 Refresh Status
            </button>
            <Link to="/customer/food" className="fd-btn-action" style={{ textDecoration: "none" }}>
              Explore Food ➔
            </Link>
          </div>
        </div>

        {/* Global Alert Notification */}
        {cancelMsg && (
          <div className={cancelMsg.type === "success" ? "cst-alert-success" : "cst-alert-danger"}>
            {cancelMsg.text}
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="co-controls-bar">
          {/* Status Tabs */}
          <div className="co-tabs">
            <button
              type="button"
              className={`co-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Orders ({orders.length})
            </button>
            <button
              type="button"
              className={`co-tab-btn ${activeTab === "active" ? "active" : ""}`}
              onClick={() => setActiveTab("active")}
            >
              Active ({orders.filter((o) => ["Pending", "Confirmed", "Preparing", "ReadyForPickup", "OutForDelivery"].includes(o.status)).length})
            </button>
            <button
              type="button"
              className={`co-tab-btn ${activeTab === "delivered" ? "active" : ""}`}
              onClick={() => setActiveTab("delivered")}
            >
              Completed ({orders.filter((o) => o.status === "Delivered").length})
            </button>
            <button
              type="button"
              className={`co-tab-btn ${activeTab === "cancelled" ? "active" : ""}`}
              onClick={() => setActiveTab("cancelled")}
            >
              Cancelled ({orders.filter((o) => o.status === "Cancelled").length})
            </button>
          </div>

          {/* Search Input */}
          <div className="co-search-wrap">
            <span className="fd-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by Order ID, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="co-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="fd-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="fd-loading-card">
            <div className="spinner-border text-warning" role="status" />
            <p>Loading your orders from database...</p>
          </div>
        )}

        {/* Error Alert */}
        {!loading && error && (
          <div className="cst-alert-danger">
            ⚠️ {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredOrders.length === 0 && (
          <div className="fd-empty-card">
            <span className="fd-empty-icon">🛍️</span>
            <h3>No Orders Found</h3>
            <p>
              {searchQuery
                ? `No orders matching "${searchQuery}".`
                : activeTab === "all"
                ? "You haven't placed any surplus food orders yet."
                : `You don't have any ${activeTab} orders right now.`}
            </p>
            <div className="fd-empty-actions">
              <Link to="/customer/food" className="fd-btn-action" style={{ textDecoration: "none" }}>
                Rescue Surplus Food Now
              </Link>
            </div>
          </div>
        )}

        {/* Orders List */}
        {!loading && filteredOrders.length > 0 && (
          <div className="co-list">
            {filteredOrders.map((order) => (
              <div key={order.id} className="co-order-card">
                {/* Order Top Bar */}
                <div className="co-order-top">
                  <div className="co-id-box">
                    <span className="co-order-id">Order #{order.id}</span>
                    <span className="co-order-date">
                      {new Date(order.createdAt).toLocaleDateString()} at{" "}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="co-status-wrap">
                    <span className={`co-status-pill ${getStatusBadgeClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Stepper Progression */}
                <div className="co-stepper-wrap">
                  <OrderStatusStepper status={order.status} />
                </div>

                {/* Order Details Body */}
                <div className="co-order-body">
                  <div className="co-body-col">
                    <span className="co-label">📦 Portions & Item</span>
                    <p className="co-val">
                      <strong>{order.quantity}x</strong> portion(s)
                      {order.unitPrice ? ` at $${order.unitPrice.toFixed(2)} each` : ""}
                    </p>
                    <span className="co-sub">Food ID: {order.foodItemId}</span>
                  </div>

                  <div className="co-body-col">
                    <span className="co-label">📍 Delivery Address</span>
                    <p className="co-val">{order.deliveryAddress}</p>
                    <span className="co-sub">Eco-friendly dispatch</span>
                  </div>

                  <div className="co-body-col">
                    <span className="co-label">💰 Total Paid</span>
                    <p className="co-price-val">${order.totalAmount.toFixed(2)}</p>
                    <span className="co-free-tag">✓ Free Rescue Delivery</span>
                  </div>
                </div>

                {/* Order Footer Actions */}
                <div className="co-order-footer">
                  <div className="co-footer-left">
                    <button
                      type="button"
                      className="co-btn-estimate"
                      onClick={() => handleViewEstimate(order)}
                    >
                      ⏱️ Delivery Estimate & ETA
                    </button>
                  </div>

                  <div className="co-footer-right">
                    {order.status === "Pending" && (
                      <button
                        type="button"
                        className="co-btn-cancel"
                        onClick={() => setCancellingOrder(order)}
                      >
                        Cancel Order
                      </button>
                    )}
                    {order.status === "Delivered" && (
                      <span className="co-completed-badge">✓ Delivered & Rescued</span>
                    )}
                    {order.status === "Cancelled" && (
                      <span className="co-cancelled-badge">Order Cancelled</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {cancellingOrder && (
          <div className="cst-modal-overlay" onClick={() => setCancellingOrder(null)}>
            <div
              className="cst-modal-card"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="cst-modal-header">
                <div>
                  <span className="cst-modal-badge" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                    CANCEL ORDER
                  </span>
                  <h2 className="cst-modal-title">Cancel Order #{cancellingOrder.id}?</h2>
                </div>
                <button
                  type="button"
                  className="cst-modal-close"
                  onClick={() => setCancellingOrder(null)}
                >
                  ✕
                </button>
              </div>

              <div className="cst-modal-body">
                <p>
                  Are you sure you want to cancel this surplus meal order?
                </p>
                <div className="cst-alert-warning" style={{ background: "#fef3c7", color: "#92400e", padding: "12px", borderRadius: "8px", margin: "12px 0" }}>
                  ⚠️ The <strong>{cancellingOrder.quantity}</strong> reserved portion(s) will be immediately returned to the restaurant's surplus listings so another customer can rescue them.
                </div>
              </div>

              <div className="cst-modal-footer">
                <button
                  type="button"
                  className="cst-btn-secondary"
                  onClick={() => setCancellingOrder(null)}
                  disabled={cancelLoading}
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  className="cst-btn-danger"
                  style={{ background: "#dc2626", color: "#ffffff", border: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
                  onClick={handleCancelOrder}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? "Cancelling..." : "Yes, Cancel Order"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Estimate Modal */}
        {estimateOrder && (
          <div className="cst-modal-overlay" onClick={() => setEstimateOrder(null)}>
            <div
              className="cst-modal-card"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="cst-modal-header">
                <div>
                  <span className="cst-modal-badge">DELIVERY TELEMETRY</span>
                  <h2 className="cst-modal-title">Delivery Estimate #{estimateOrder.id}</h2>
                </div>
                <button
                  type="button"
                  className="cst-modal-close"
                  onClick={() => setEstimateOrder(null)}
                >
                  ✕
                </button>
              </div>

              <div className="cst-modal-body">
                {estimateLoading && (
                  <div className="rd-loading-state">
                    <div className="spinner-border text-warning" role="status" />
                    <p>Calculating delivery distance and arrival time...</p>
                  </div>
                )}

                {!estimateLoading && estimateData?.error && (
                  <div className="cst-alert-danger">
                    ⚠️ {estimateData.error}
                  </div>
                )}

                {!estimateLoading && estimateData && !estimateData.error && (() => {
                  const est = estimateData.estimate || estimateData;
                  return (
                    <div className="co-estimate-box">
                      {estimateData.restaurant?.name && (
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--black)", marginBottom: "4px" }}>
                          🏪 Pickup: {estimateData.restaurant.name}
                        </div>
                      )}
                      <div className="co-estimate-grid">
                        <div className="co-estimate-item">
                          <span className="co-label">Transit Distance</span>
                          <p className="co-estimate-val">
                            📍 {est.distanceInKilometers ?? 0} km
                          </p>
                        </div>
                        <div className="co-estimate-item">
                          <span className="co-label">Estimated Delivery ETA</span>
                          <p className="co-estimate-val">
                            ⚡ {est.estimatedMinutes ?? 20} minutes
                          </p>
                        </div>
                        <div className="co-estimate-item">
                          <span className="co-label">Estimated Delivery Fee</span>
                          <p className="co-estimate-val">
                            ${(est.estimatedDeliveryFee ?? 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="co-estimate-item">
                          <span className="co-label">Estimated Total Amount</span>
                          <p className="co-estimate-total">
                            ${(est.estimatedTotalAmount ?? estimateOrder.totalAmount).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {estimateData.note && (
                        <p style={{ fontSize: "11px", color: "var(--grey-600)", margin: "8px 0 0" }}>
                          ℹ️ {estimateData.note}
                        </p>
                      )}

                      <div className="cst-alert-success" style={{ marginTop: "12px" }}>
                        🤖 AI Delivery Dispatch matches the nearest eco-friendly courier once the restaurant confirms preparation.
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="cst-modal-footer">
                <button
                  type="button"
                  className="cst-btn-secondary"
                  onClick={() => setEstimateOrder(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
