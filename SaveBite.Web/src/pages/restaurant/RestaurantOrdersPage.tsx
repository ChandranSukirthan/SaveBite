import { useEffect, useState } from "react";
import { RestaurantLayout } from "../../components/layout/RestaurantLayout";
import {
  getRestaurantOrders,
  updateOrderStatus,
} from "../../services/restaurantService";
import type { Order, OrderStatus } from "../../types/restaurant";
import { OrderDetailsModal } from "../../components/orders/OrderDetailsModal";

export function RestaurantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setLoading(true);
      const data = await getRestaurantOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load restaurant orders:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const handleQuickStatusUpdate = async (
    orderId: string,
    nextStatus: OrderStatus
  ) => {
    try {
      setActionError(null);
      await updateOrderStatus(orderId, nextStatus);
      // Reload orders to reflect latest data & triggers
      await loadOrders();
      // If modal is open, update selected order
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: nextStatus } : null
        );
      }
    } catch (err: any) {
      console.error("Failed to update status:", err);
      setActionError(
        err.response?.data?.message ||
          `Failed to transition order status to ${nextStatus}.`
      );
      throw err;
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.deliveryAddress &&
        o.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.foodItemId &&
        o.foodItemId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "All" ||
      o.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const pendingCount = orders.filter((o) => o.status === "Pending").length;
  const preparingCount = orders.filter((o) => o.status === "Preparing" || o.status === "Confirmed").length;
  const readyCount = orders.filter((o) => o.status === "ReadyForPickup").length;

  return (
    <RestaurantLayout>
      <div className="rst-dashboard">
        {/* PAGE HEADER */}
        <div className="rst-page-header">
          <div>
            <h1 className="rst-page-title">Order Management</h1>
            <p className="rst-page-subtitle">
              Process customer rescue orders, track preparation stages, and dispatch autonomous AI couriers.
            </p>
          </div>
          <div className="rst-page-actions">
            <button
              type="button"
              className="rst-btn-outline"
              onClick={loadOrders}
            >
              🔄 Refresh Orders
            </button>
          </div>
        </div>

        {/* ATTENTION BANNER IF PENDING ORDERS */}
        {pendingCount > 0 && (
          <div className="rst-banner rst-banner--warning">
            <div className="rst-banner-icon">🔔</div>
            <div className="rst-banner-content">
              <strong>{pendingCount} order(s) awaiting kitchen confirmation!</strong>
              <p style={{ margin: 0, fontSize: "13px" }}>
                Confirm incoming orders so the customer knows food preparation has started.
              </p>
            </div>
            <button
              type="button"
              className="rst-btn-solid"
              style={{ fontSize: "12px", padding: "6px 12px" }}
              onClick={() => setStatusFilter("Pending")}
            >
              Review Pending ({pendingCount})
            </button>
          </div>
        )}

        {actionError && (
          <div className="rst-banner rst-banner--warning">
            <div className="rst-banner-icon">⚠️</div>
            <div className="rst-banner-content">{actionError}</div>
          </div>
        )}

        {/* SEARCH & FILTERS TOOLBAR */}
        <div className="rst-card" style={{ padding: "16px 20px" }}>
          <div className="rst-food-toolbar">
            {/* SEARCH */}
            <div className="rst-search-wrapper">
              <span className="rst-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by order ID or delivery address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rst-search-input"
              />
            </div>

            {/* STATUS FILTER BUTTONS */}
            <div className="rst-status-tabs">
              <button
                type="button"
                className={`rst-btn-tab ${statusFilter === "All" ? "rst-btn-tab--active" : ""}`}
                onClick={() => setStatusFilter("All")}
              >
                All ({orders.length})
              </button>
              <button
                type="button"
                className={`rst-btn-tab ${statusFilter === "Pending" ? "rst-btn-tab--active" : ""}`}
                onClick={() => setStatusFilter("Pending")}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                className={`rst-btn-tab ${statusFilter === "Confirmed" ? "rst-btn-tab--active" : ""}`}
                onClick={() => setStatusFilter("Confirmed")}
              >
                In Kitchen ({preparingCount})
              </button>
              <button
                type="button"
                className={`rst-btn-tab ${statusFilter === "ReadyForPickup" ? "rst-btn-tab--active" : ""}`}
                onClick={() => setStatusFilter("ReadyForPickup")}
              >
                Ready / AI ({readyCount})
              </button>
              <button
                type="button"
                className={`rst-btn-tab ${statusFilter === "Delivered" ? "rst-btn-tab--active" : ""}`}
                onClick={() => setStatusFilter("Delivered")}
              >
                Completed
              </button>
            </div>
          </div>
        </div>

        {/* ORDERS TABLE */}
        <div className="rst-card">
          <div className="rst-card-header">
            <h3>Orders ({filteredOrders.length})</h3>
            <span className="rst-badge">MongoDB Orders Collection</span>
          </div>

          {loading ? (
            <p className="rst-empty-text">Loading orders...</p>
          ) : filteredOrders.length === 0 ? (
            <div className="rst-empty-state">
              <span style={{ fontSize: "42px" }}>📦</span>
              <p style={{ fontWeight: 800, fontSize: "16px", margin: "8px 0 4px" }}>
                No orders match your criteria
              </p>
              <p className="rst-empty-text">
                Incoming customer orders will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="rst-table-wrapper">
              <table className="rst-table">
                <thead>
                  <tr>
                    <th>Order Ref</th>
                    <th>Placed</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Delivery Address</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong className="rst-code">#{o.id.slice(-8)}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--grey-600)" }}>
                          {new Date(o.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td>
                        <strong>{o.quantity} portions</strong>
                      </td>
                      <td>
                        <strong style={{ color: "var(--yellow-dark)", fontSize: "14px" }}>
                          ${o.totalAmount?.toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "12px",
                            maxWidth: "200px",
                            display: "inline-block",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                          }}
                          title={o.deliveryAddress}
                        >
                          📍 {o.deliveryAddress || "Standard delivery"}
                        </span>
                      </td>
                      <td>
                        <span className={`rst-status-pill rst-status-pill--${o.status.toLowerCase()}`}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {/* QUICK STATUS TRANSITION BUTTON */}
                          {o.status === "Pending" && (
                            <button
                              type="button"
                              className="rst-btn-solid"
                              style={{ padding: "5px 10px", fontSize: "11px" }}
                              onClick={() => handleQuickStatusUpdate(o.id, "Confirmed")}
                            >
                              ✓ Confirm
                            </button>
                          )}

                          {o.status === "Confirmed" && (
                            <button
                              type="button"
                              className="rst-btn-solid"
                              style={{ padding: "5px 10px", fontSize: "11px" }}
                              onClick={() => handleQuickStatusUpdate(o.id, "Preparing")}
                            >
                              👨‍🍳 Prepare
                            </button>
                          )}

                          {o.status === "Preparing" && (
                            <button
                              type="button"
                              className="rst-btn-ai-ready"
                              style={{ padding: "5px 10px", fontSize: "11px" }}
                              onClick={() => handleQuickStatusUpdate(o.id, "ReadyForPickup")}
                            >
                              🚀 Ready (AI)
                            </button>
                          )}

                          {/* VIEW DETAILS MODAL BUTTON */}
                          <button
                            type="button"
                            className="rst-btn-icon"
                            onClick={() => setSelectedOrder(o)}
                            title="Inspect full order details"
                          >
                            👁️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ORDER DETAILS MODAL */}
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onStatusUpdate={handleQuickStatusUpdate}
          />
        )}
      </div>
    </RestaurantLayout>
  );
}

export default RestaurantOrdersPage;

