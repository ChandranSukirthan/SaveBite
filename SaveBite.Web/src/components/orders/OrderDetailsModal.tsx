import { useState, useEffect } from "react";
import type { Order, OrderStatus } from "../../types/restaurant";
import { OrderStatusStepper } from "./OrderStatusStepper";
import { AIDeliveryStatusPanel } from "../delivery/AIDeliveryStatusPanel";
import { useSignalR } from "../../context/SignalRContext";

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
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    joinDeliveryGroup,
    onOrderStatusUpdated,
    onDeliveryStatusUpdated,
    onDriverAssigned,
  } = useSignalR();

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  useEffect(() => {
    if (!order.id) return;
    joinDeliveryGroup(order.id);

    const unsubOrder = onOrderStatusUpdated((data) => {
      if (data.orderId === order.id) {
        setCurrentOrder((prev) => ({ ...prev, status: data.status as any }));
      }
    });

    const unsubDelivery = onDeliveryStatusUpdated((data) => {
      if (data.orderId === order.id) {
        setCurrentOrder((prev) => ({
          ...prev,
          deliveryRequestId: data.deliveryRequestId,
        }));
      }
    });

    const unsubDriver = onDriverAssigned((data) => {
      if (data.orderId === order.id) {
        setCurrentOrder((prev) => ({
          ...prev,
          deliveryPersonId: data.deliveryPersonId,
          deliveryRequestId: data.deliveryRequestId,
        }));
      }
    });

    return () => {
      unsubOrder();
      unsubDelivery();
      unsubDriver();
    };
  }, [order.id]);

  const handleAction = async (nextStatus: OrderStatus) => {
    try {
      setUpdating(true);
      setError(null);
      await onStatusUpdate(currentOrder.id, nextStatus);
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
              <span className="rst-code">Order #{currentOrder.id.slice(-8)}</span>
              <span className={`rst-status-pill rst-status-pill--${currentOrder.status.toLowerCase()}`}>
                {currentOrder.status}
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
            <OrderStatusStepper status={currentOrder.status} />
          </div>

          {/* AI AUTONOMOUS DISPATCH STATUS PANEL */}
          {(currentOrder.status === "ReadyForPickup" ||
            currentOrder.status === "PickedUp" ||
            currentOrder.status === "OutForDelivery") && (
            <AIDeliveryStatusPanel
              deliveryRequestId={
                currentOrder.deliveryRequestId ||
                `req-${currentOrder.id.slice(-6)}`
              }
              orderId={currentOrder.id}
              initialStatus={currentOrder.status}
              compact
            />
          )}

          {/* FINANCIALS & ORDER SUMMARY */}
          <div className="rst-modal-grid">
            <div className="rst-modal-metric">
              <span className="rst-field-label">TOTAL ORDER AMOUNT</span>
              <p className="rst-modal-price">${currentOrder.totalAmount?.toFixed(2)}</p>
              <span style={{ fontSize: "11px", color: "var(--grey-600)" }}>
                Food: ${currentOrder.foodTotal?.toFixed(2)} | Delivery: ${currentOrder.deliveryFee?.toFixed(2)}
              </span>
            </div>
            <div className="rst-modal-metric">
              <span className="rst-field-label">QUANTITY ORDERED</span>
              <p className="rst-modal-metric-val">{currentOrder.quantity} portions</p>
              <span style={{ fontSize: "11px", color: "var(--grey-600)" }}>
                Unit Price: ${currentOrder.unitPrice?.toFixed(2)}
              </span>
            </div>
          </div>

          {/* CUSTOMER & DELIVERY ADDRESS */}
          <div className="rst-modal-section">
            <span className="rst-field-label">DESTINATION DELIVERY ADDRESS</span>
            <div style={{ background: "var(--grey-100)", padding: "12px 14px", borderRadius: "8px" }}>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                📍 {currentOrder.deliveryAddress || "Address provided at checkout"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--grey-400)", marginTop: "16px" }}>
            <span>Order Placed: {new Date(currentOrder.createdAt).toLocaleString()}</span>
            <span>Food Item ID: {currentOrder.foodItemId}</span>
          </div>
        </div>

        {/* MODAL FOOTER WITH STATUS ACTIONS */}
        <div className="rst-modal-footer">
          <button type="button" className="rst-btn-outline" onClick={onClose}>
            Close
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            {/* ACTION 1: FROM PENDING */}
            {currentOrder.status === "Pending" && (
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
            {currentOrder.status === "Confirmed" && (
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
            {currentOrder.status === "Preparing" && (
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

