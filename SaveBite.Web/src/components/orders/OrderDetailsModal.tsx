import { useState } from "react";
import type { Order, OrderStatus } from "../../types/restaurant";
import { OrderStatusStepper } from "./OrderStatusStepper";

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onStatusUpdate: (orderId: string, nextStatus: OrderStatus) => Promise<void>;
}

export function OrderDetailsModal({
  order,
  onClose,
  onStatusUpdate,
}: OrderDetailsModalProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (nextStatus: OrderStatus) => {
    try {
      setUpdating(true);
      setError(null);
      await onStatusUpdate(order.id, nextStatus);
    } catch (err: any) {
      console.error("Order status update error:", err);
      setError(
        err.response?.data?.message ||
          `Failed to transition order to ${nextStatus}.`
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="rst-modal-backdrop" onClick={onClose}>
      <div
        className="rst-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="rst-modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="rst-code">Order #{order.id.slice(-8)}</span>
              <span className={`rst-status-pill rst-status-pill--${order.status.toLowerCase()}`}>
                {order.status}
              </span>
            </div>
            <h2 className="rst-modal-title">Order Details</h2>
          </div>
          <button className="rst-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="rst-modal-body">
          {error && (
            <div className="rst-banner rst-banner--warning" style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "13px", margin: 0 }}>⚠️ {error}</p>
            </div>
          )}

          {/* STATUS STEPPER */}
          <div style={{ marginBottom: "20px" }}>
            <span className="rst-field-label">ORDER LIFECYCLE</span>
            <OrderStatusStepper status={order.status} />
          </div>

          {/* AI DISPATCH BANNER IF READY */}
          {(order.status === "ReadyForPickup" ||
            order.status === "PickedUp" ||
            order.status === "OutForDelivery") && (
            <div className="rst-ai-active-box">
              <div className="rst-ai-dot" />
              <div>
                <strong style={{ fontSize: "13px", color: "#7e22ce" }}>
                  Autonomous LangGraph AI Delivery Active
                </strong>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--grey-600)" }}>
                  Delivery request generated ({order.deliveryRequestId ? `#${order.deliveryRequestId.slice(-8)}` : "Pending ID"}). Couriers are being routed via spatial 2dsphere indexing.
                </p>
              </div>
            </div>
          )}

          {/* FINANCIALS & ORDER SUMMARY */}
          <div className="rst-modal-grid">
            <div className="rst-modal-metric">
              <span className="rst-field-label">TOTAL ORDER AMOUNT</span>
              <p className="rst-modal-price">${order.totalAmount?.toFixed(2)}</p>
              <span style={{ fontSize: "11px", color: "var(--grey-600)" }}>
                Food: ${order.foodTotal?.toFixed(2)} | Delivery: ${order.deliveryFee?.toFixed(2)}
              </span>
            </div>
            <div className="rst-modal-metric">
              <span className="rst-field-label">QUANTITY ORDERED</span>
              <p className="rst-modal-metric-val">{order.quantity} portions</p>
              <span style={{ fontSize: "11px", color: "var(--grey-600)" }}>
                Unit Price: ${order.unitPrice?.toFixed(2)}
              </span>
            </div>
          </div>

          {/* CUSTOMER & DELIVERY ADDRESS */}
          <div className="rst-modal-section">
            <span className="rst-field-label">DESTINATION DELIVERY ADDRESS</span>
            <div style={{ background: "var(--grey-100)", padding: "12px 14px", borderRadius: "8px" }}>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                📍 {order.deliveryAddress || "Address provided at checkout"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--grey-400)", marginTop: "16px" }}>
            <span>Order Placed: {new Date(order.createdAt).toLocaleString()}</span>
            <span>Food Item ID: {order.foodItemId}</span>
          </div>
        </div>

        {/* MODAL FOOTER WITH STATUS ACTIONS */}
        <div className="rst-modal-footer">
          <button type="button" className="rst-btn-outline" onClick={onClose}>
            Close
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            {/* ACTION 1: FROM PENDING */}
            {order.status === "Pending" && (
              <>
                <button
                  type="button"
                  className="rst-btn-danger"
                  disabled={updating}
                  onClick={() => handleAction("Cancelled")}
                >
                  ✕ Reject
                </button>
                <button
                  type="button"
                  className="rst-btn-solid"
                  disabled={updating}
                  onClick={() => handleAction("Confirmed")}
                >
                  {updating ? "Confirming..." : "✓ Confirm Order"}
                </button>
              </>
            )}

            {/* ACTION 2: FROM CONFIRMED */}
            {order.status === "Confirmed" && (
              <>
                <button
                  type="button"
                  className="rst-btn-danger"
                  disabled={updating}
                  onClick={() => handleAction("Cancelled")}
                >
                  ✕ Cancel
                </button>
                <button
                  type="button"
                  className="rst-btn-solid"
                  disabled={updating}
                  onClick={() => handleAction("Preparing")}
                >
                  {updating ? "Updating..." : "👨‍🍳 Start Preparing"}
                </button>
              </>
            )}

            {/* ACTION 3: FROM PREPARING */}
            {order.status === "Preparing" && (
              <button
                type="button"
                className="rst-btn-ai-ready"
                disabled={updating}
                onClick={() => handleAction("ReadyForPickup")}
              >
                {updating ? "Dispatching AI..." : "🚀 Ready for Pickup & Activate AI"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsModal;

