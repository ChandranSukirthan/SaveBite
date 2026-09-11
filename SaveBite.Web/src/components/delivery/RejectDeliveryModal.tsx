import type { DeliveryRequestItem } from "../../types/delivery";

interface RejectDeliveryModalProps {
  request: DeliveryRequestItem;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function RejectDeliveryModal({
  request,
  loading,
  onConfirm,
  onClose,
}: RejectDeliveryModalProps) {
  return (
    <div className="cst-modal-overlay" onClick={onClose}>
      <div
        className="cst-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: "480px" }}
      >
        <div className="cst-modal-header">
          <div>
            <span
              className="cst-modal-badge"
              style={{ background: "#fee2e2", color: "#b91c1c" }}
            >
              DECLINE DISPATCH
            </span>
            <h2 className="cst-modal-title">
              Decline Run #{request.id.slice(-6)}?
            </h2>
          </div>
          <button
            type="button"
            className="cst-modal-close"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="cst-modal-body">
          <p style={{ fontSize: "14px", color: "var(--grey-800)", margin: "0 0 12px" }}>
            Are you sure you want to decline this delivery run for{" "}
            <strong>
              {request.restaurant?.restaurantName || "Partner Restaurant"}
            </strong>
            ?
          </p>

          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "10px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              margin: "12px 0",
            }}
          >
            <strong style={{ fontSize: "13px", color: "#92400e" }}>
              🤖 Autonomous AI Re-Routing
            </strong>
            <p style={{ fontSize: "12px", color: "#78350f", margin: 0, lineHeight: 1.4 }}>
              Declining will immediately return this order to SaveBite's LangGraph dispatch engine to find another active courier. Your online status will remain active for future requests.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--grey-50)",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid var(--grey-200)",
              fontSize: "13px",
            }}
          >
            <span style={{ color: "var(--grey-600)" }}>Passed Run Payout:</span>
            <strong style={{ color: "#991b1b" }}>
              ${request.deliveryFee.toFixed(2)}
            </strong>
          </div>
        </div>

        <div className="cst-modal-footer">
          <button
            type="button"
            className="cst-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Keep Delivery
          </button>
          <button
            type="button"
            className="drc-btn-modal-decline"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Declining..." : "Yes, Decline Request ✕"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RejectDeliveryModal;
