import type { DeliveryRequestItem } from "../../types/delivery";

interface AcceptDeliveryModalProps {
  request: DeliveryRequestItem;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function AcceptDeliveryModal({
  request,
  loading,
  onConfirm,
  onClose,
}: AcceptDeliveryModalProps) {
  const pickupLat = request.pickupLocation.coordinates[1];
  const pickupLng = request.pickupLocation.coordinates[0];
  const dropLat = request.deliveryLocation.coordinates[1];
  const dropLng = request.deliveryLocation.coordinates[0];

  return (
    <div className="cst-modal-overlay" onClick={onClose}>
      <div
        className="cst-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: "520px" }}
      >
        <div className="cst-modal-header">
          <div>
            <span
              className="cst-modal-badge"
              style={{ background: "#ecfdf5", color: "#065f46" }}
            >
              ACCEPT DISPATCH RUN
            </span>
            <h2 className="cst-modal-title">
              Accept Delivery #{request.id.slice(-6)}?
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
          {/* Payout & Transit Summary */}
          <div className="drc-modal-summary-grid">
            <div className="drc-modal-summary-item">
              <span className="drc-modal-label">Guaranteed Payout</span>
              <strong className="drc-modal-payout">
                +${request.deliveryFee.toFixed(2)}
              </strong>
            </div>
            <div className="drc-modal-summary-item">
              <span className="drc-modal-label">Transit Distance</span>
              <strong className="drc-modal-val">
                {request.distanceInKilometers} km
              </strong>
            </div>
            <div className="drc-modal-summary-item">
              <span className="drc-modal-label">Estimated Duration</span>
              <strong className="drc-modal-val">
                ~{request.estimatedMinutes} mins
              </strong>
            </div>
          </div>

          {/* Route Details */}
          <div className="drc-modal-route-box">
            <div className="drc-modal-route-node">
              <span className="drc-node-icon">🏪</span>
              <div>
                <span className="drc-node-tag">PICKUP KITCHEN</span>
                <strong className="drc-node-title">
                  {request.restaurant?.restaurantName || "Partner Restaurant"}
                </strong>
                <span className="drc-node-addr">
                  {request.restaurant?.address ||
                    `Coordinates: [${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}]`}
                </span>
              </div>
            </div>

            <div className="drc-modal-route-arrow">
              <span>↕ {request.distanceInKilometers} km direct route</span>
            </div>

            <div className="drc-modal-route-node">
              <span className="drc-node-icon">📍</span>
              <div>
                <span className="drc-node-tag">CUSTOMER DESTINATION</span>
                <strong className="drc-node-title">
                  {request.deliveryAddress || "Customer Delivery Address"}
                </strong>
                <span className="drc-node-addr">
                  Coordinates: [{dropLat.toFixed(4)}, {dropLng.toFixed(4)}]
                </span>
              </div>
            </div>
          </div>

          {/* Guidelines Notice */}
          <div className="drc-accept-notice">
            ⚡ <strong>Important:</strong> Once confirmed, the kitchen is immediately notified that you are en route. Please travel to the pickup restaurant promptly.
          </div>
        </div>

        <div className="cst-modal-footer">
          <button
            type="button"
            className="cst-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel / Go Back
          </button>
          <button
            type="button"
            className="drc-btn-modal-accept"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Confirming..." : "Confirm & Accept Run ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AcceptDeliveryModal;
