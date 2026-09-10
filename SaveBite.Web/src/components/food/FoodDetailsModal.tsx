import { Link } from "react-router-dom";
import type { FoodItem } from "../../types/restaurant";
import { CountdownTimer } from "./CountdownTimer";

interface FoodDetailsModalProps {
  item: FoodItem;
  onClose: () => void;
  onDelete: (item: FoodItem) => void;
}

export function FoodDetailsModal({
  item,
  onClose,
  onDelete,
}: FoodDetailsModalProps) {
  const mapUrl = item.location?.coordinates
    ? `https://www.google.com/maps?q=${item.location.coordinates[1]},${item.location.coordinates[0]}`
    : null;

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
              <span className="rst-cat-tag">{item.category}</span>
              <span className={`rst-status-pill rst-status-pill--${item.status.toLowerCase()}`}>
                {item.status}
              </span>
            </div>
            <h2 className="rst-modal-title">{item.name}</h2>
          </div>
          <button className="rst-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="rst-modal-body">
          {/* PRICING & QUANTITY CARDS */}
          <div className="rst-modal-grid">
            <div className="rst-modal-metric">
              <span className="rst-field-label">RESCUE PRICE</span>
              <p className="rst-modal-price">${item.price?.toFixed(2)}</p>
            </div>
            <div className="rst-modal-metric">
              <span className="rst-field-label">SURPLUS QUANTITY</span>
              <p className="rst-modal-metric-val">{item.quantity} portions available</p>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="rst-modal-section">
            <span className="rst-field-label">DESCRIPTION & ALLERGEN NOTES</span>
            <p className="rst-modal-desc">{item.description || "No description provided."}</p>
          </div>

          {/* AVAILABILITY & COUNTDOWN */}
          <div className="rst-modal-section">
            <span className="rst-field-label">AVAILABILITY WINDOW & LIVE TIMER</span>
            <div className="rst-modal-time-box">
              <div>
                <p style={{ fontSize: "12px", color: "var(--grey-600)", margin: 0 }}>From:</p>
                <strong>{new Date(item.availableFrom).toLocaleString()}</strong>
              </div>
              <div>
                <p style={{ fontSize: "12px", color: "var(--grey-600)", margin: 0 }}>Until:</p>
                <strong>{new Date(item.availableUntil).toLocaleString()}</strong>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <CountdownTimer availableUntil={item.availableUntil} />
              </div>
            </div>
          </div>

          {/* PICK-UP COORDINATES */}
          {item.location?.coordinates && (
            <div className="rst-modal-section">
              <span className="rst-field-label">PICK-UP LOCATION COORDINATES</span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--grey-100)", padding: "10px 14px", borderRadius: "8px" }}>
                <span className="rst-code">
                  Lat: {item.location.coordinates[1].toFixed(5)}, Lon: {item.location.coordinates[0].toFixed(5)}
                </span>
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rst-btn-outline"
                    style={{ padding: "4px 10px", fontSize: "11px" }}
                  >
                    📍 Open in Maps
                  </a>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--grey-400)", marginTop: "12px" }}>
            <span>Listed: {new Date(item.createdAt).toLocaleString()}</span>
            <span>ID: {item.id}</span>
          </div>
        </div>

        <div className="rst-modal-footer">
          <button
            type="button"
            className="rst-btn-danger"
            onClick={() => {
              onClose();
              onDelete(item);
            }}
          >
            🗑️ Delete Item
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" className="rst-btn-outline" onClick={onClose}>
              Close
            </button>
            <Link
              to={`/restaurant/food/${item.id}/edit`}
              className="rst-btn-solid"
            >
              ✏️ Edit Listing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FoodDetailsModal;

