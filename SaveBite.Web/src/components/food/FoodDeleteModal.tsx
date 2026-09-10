import { useState } from "react";
import type { FoodItem } from "../../types/restaurant";

interface FoodDeleteModalProps {
  item: FoodItem;
  onClose: () => void;
  onSuccess: () => void;
  onDeleteApi: (id: string) => Promise<void>;
}

export function FoodDeleteModal({
  item,
  onClose,
  onSuccess,
  onDeleteApi,
}: FoodDeleteModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      setError(null);
      await onDeleteApi(item.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to delete food item:", err);
      setError(
        err.response?.data?.message ||
          "Failed to delete food listing. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rst-modal-backdrop" onClick={onClose}>
      <div
        className="rst-modal rst-modal--small"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="rst-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>⚠️</span>
            <h2 className="rst-modal-title">Delete Surplus Listing</h2>
          </div>
          <button className="rst-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="rst-modal-body">
          <p style={{ fontSize: "14px", color: "var(--grey-800)", marginBottom: "12px" }}>
            Are you sure you want to permanently delete <strong>{item.name}</strong>?
          </p>
          <div style={{ background: "var(--grey-100)", padding: "12px", borderRadius: "8px", fontSize: "13px" }}>
            <div><strong>Portions:</strong> {item.quantity} portions remaining</div>
            <div><strong>Category:</strong> {item.category}</div>
            <div><strong>Price:</strong> ${item.price?.toFixed(2)}</div>
          </div>
          <p style={{ fontSize: "12px", color: "#b91c1c", marginTop: "12px" }}>
            This action cannot be undone and will immediately remove the listing from customer discovery.
          </p>

          {error && (
            <div className="rst-banner rst-banner--warning" style={{ marginTop: "12px" }}>
              <p style={{ fontSize: "13px", margin: 0 }}>{error}</p>
            </div>
          )}
        </div>

        <div className="rst-modal-footer">
          <button
            type="button"
            className="rst-btn-outline"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rst-btn-danger"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FoodDeleteModal;

