import type { DeliveryRequestItem } from "../../types/delivery";

interface DeliveryRequestCardProps {
  request: DeliveryRequestItem;
  onAccept?: (request: DeliveryRequestItem) => void;
  onReject?: (request: DeliveryRequestItem) => void;
  actionLoading?: boolean;
}

export function DeliveryRequestCard({
  request,
  onAccept,
  onReject,
  actionLoading = false,
}: DeliveryRequestCardProps) {
  const pickupLat = request.pickupLocation.coordinates[1];
  const pickupLng = request.pickupLocation.coordinates[0];
  const dropLat = request.deliveryLocation.coordinates[1];
  const dropLng = request.deliveryLocation.coordinates[0];

  const isAssigned = request.status === "Assigned";
  const isDelivered = request.status === "Delivered";

  const mapsPickupUrl = `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}`;
  const mapsDropUrl = `https://www.google.com/maps/dir/?api=1&destination=${dropLat},${dropLng}`;

  return (
    <div className={`drc-card ${isAssigned ? "drc-card-assigned" : ""}`}>
      {/* Top Header */}
      <div className="drc-header">
        <div className="drc-id-stack">
          {isAssigned ? (
            <span className="drc-badge-assigned">
              <span className="drc-dot-pulse" />
              ⚡ INCOMING DISPATCH
            </span>
          ) : (
            <span className={`drc-badge-status ${request.status.toLowerCase()}`}>
              {isDelivered ? "✓ DELIVERED" : request.status.toUpperCase()}
            </span>
          )}
          <strong className="drc-order-ref">
            Dispatch #{request.id.slice(-6)} • Order #{request.orderId.slice(-6)}
          </strong>
        </div>

        <div className="drc-payout-pill">
          <span className="drc-payout-label">Payout</span>
          <span className="drc-payout-val">+${request.deliveryFee.toFixed(2)}</span>
        </div>
      </div>

      {/* Trajectory Locations Grid */}
      <div className="drc-trajectory-grid">
        {/* Origin Restaurant */}
        <div className="drc-location-node origin">
          <div className="drc-node-icon-box origin">🏪</div>
          <div className="drc-node-details">
            <span className="drc-node-type">PICKUP KITCHEN</span>
            <strong className="drc-node-name">
              {request.restaurant?.restaurantName || "Partner Restaurant"}
            </strong>
            <p className="drc-node-street">
              {request.restaurant?.address || "Pickup address registered"}
            </p>
            {request.restaurant?.phoneNumber && (
              <span className="drc-node-phone">
                📞 {request.restaurant.phoneNumber}
              </span>
            )}
            <a
              href={mapsPickupUrl}
              target="_blank"
              rel="noreferrer"
              className="drc-map-link"
            >
              Google Maps Navigation ➔
            </a>
          </div>
        </div>

        {/* Distance Divider */}
        <div className="drc-transit-bar">
          <div className="drc-transit-line" />
          <div className="drc-transit-badge">
            ↕ {request.distanceInKilometers} km transit • ~{request.estimatedMinutes} mins
          </div>
          <div className="drc-transit-line" />
        </div>

        {/* Destination Customer */}
        <div className="drc-location-node dest">
          <div className="drc-node-icon-box dest">📍</div>
          <div className="drc-node-details">
            <span className="drc-node-type">CUSTOMER DESTINATION</span>
            <strong className="drc-node-name">
              {request.deliveryAddress || "Customer Delivery Address"}
            </strong>
            <p className="drc-node-street">
              Coordinates: [{dropLat.toFixed(4)}, {dropLng.toFixed(4)}]
            </p>
            <a
              href={mapsDropUrl}
              target="_blank"
              rel="noreferrer"
              className="drc-map-link"
            >
              Google Maps Navigation ➔
            </a>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="drc-metrics-row">
        <div className="drc-metric-item">
          <span className="drc-metric-label">Assigned At</span>
          <span className="drc-metric-val">
            {new Date(request.requestedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="drc-metric-item">
          <span className="drc-metric-label">Transit Distance</span>
          <span className="drc-metric-val">{request.distanceInKilometers} km</span>
        </div>
        <div className="drc-metric-item">
          <span className="drc-metric-label">Estimated Delivery Time</span>
          <span className="drc-metric-val">~{request.estimatedMinutes} mins</span>
        </div>
        <div className="drc-metric-item">
          <span className="drc-metric-label">Eco Metric</span>
          <span className="drc-metric-val" style={{ color: "#15803d" }}>
            🌱 ~2.5 kg CO₂ Saved
          </span>
        </div>
      </div>

      {/* Action Buttons for Pending Requests */}
      {isAssigned && onAccept && onReject && (
        <div className="drc-actions-footer">
          <button
            type="button"
            className="drc-btn-accept"
            onClick={() => onAccept(request)}
            disabled={actionLoading}
          >
            ✓ Review & Accept Run
          </button>
          <button
            type="button"
            className="drc-btn-decline"
            onClick={() => onReject(request)}
            disabled={actionLoading}
          >
            ✕ Decline
          </button>
        </div>
      )}
    </div>
  );
}

export default DeliveryRequestCard;
