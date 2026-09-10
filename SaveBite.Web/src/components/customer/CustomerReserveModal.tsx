import { useState } from "react";
import type { DiscoveredFoodItem } from "../../types/customer";
import type { CustomerProfile } from "../../types/profile";
import { createCustomerOrder } from "../../services/customerService";

interface CustomerReserveModalProps {
  food: DiscoveredFoodItem;
  customerProfile: CustomerProfile | null;
  onClose: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export function CustomerReserveModal({
  food,
  customerProfile,
  onClose,
  onOrderSuccess,
}: CustomerReserveModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryAddress, setDeliveryAddress] = useState<string>(
    customerProfile?.address || "789 Elm Street, New York, NY"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitPrice = food.price || 0;
  const foodTotal = quantity * unitPrice;
  const deliveryFee = 0; // free rescue
  const grandTotal = foodTotal + deliveryFee;

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      setError("Please specify a delivery destination address.");
      return;
    }
    if (quantity <= 0 || quantity > food.quantity) {
      setError(`Please select between 1 and ${food.quantity} portions.`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const lat = customerProfile?.location?.coordinates?.[1] || 40.7135;
      const lon = customerProfile?.location?.coordinates?.[0] || -74.005;

      const order = await createCustomerOrder({
        foodItemId: food.id,
        quantity,
        deliveryAddress: deliveryAddress.trim(),
        latitude: lat,
        longitude: lon,
      });

      onOrderSuccess(order.id);
      onClose();
    } catch (err: any) {
      console.error("Order creation failed:", err);
      setError(
        err.response?.data?.message ||
          "Failed to place surplus food order. Please try again."
      );
    } finally {
      setSubmitting(false);
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
            <span className="rst-cat-tag">{food.category}</span>
            <h2 className="rst-modal-title" style={{ marginTop: "4px" }}>
              Reserve Surplus Meal
            </h2>
          </div>
          <button className="rst-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleConfirmOrder}>
          <div className="rst-modal-body">
            {error && (
              <div className="rst-banner rst-banner--warning">
                <p style={{ fontSize: "13px", margin: 0 }}>⚠️ {error}</p>
              </div>
            )}

            {/* ITEM SUMMARY CARD */}
            <div style={{ background: "var(--grey-100)", padding: "14px 16px", borderRadius: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>{food.name}</h3>
                  <p style={{ fontSize: "12px", color: "var(--grey-600)", margin: "2px 0 0" }}>
                    by {food.restaurant?.restaurantName} • 📍 {food.distanceInKilometers} km away
                  </p>
                </div>
                <strong style={{ fontSize: "18px", color: "var(--black)" }}>
                  ${unitPrice.toFixed(2)}
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--grey-600)" }}>/portion</span>
                </strong>
              </div>
              <p style={{ fontSize: "12px", color: "var(--grey-600)", marginTop: "8px", marginBottom: 0 }}>
                {food.description || "Fresh surplus prepared food ready for immediate kitchen rescue."}
              </p>
            </div>

            {/* QUANTITY PICKER */}
            <div className="rst-form-group">
              <label className="rst-form-label">SELECT PORTIONS (MAX: {food.quantity})</label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  type="button"
                  className="rst-btn-outline"
                  style={{ width: "38px", height: "38px", padding: 0, justifyContent: "center" }}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span style={{ fontSize: "16px", fontWeight: 800, minWidth: "30px", textAlign: "center" }}>
                  {quantity}
                </span>
                <button
                  type="button"
                  className="rst-btn-outline"
                  style={{ width: "38px", height: "38px", padding: 0, justifyContent: "center" }}
                  onClick={() => setQuantity((q) => Math.min(food.quantity, q + 1))}
                  disabled={quantity >= food.quantity}
                >
                  +
                </button>
                <span style={{ fontSize: "12px", color: "var(--grey-600)" }}>
                  ({food.quantity - quantity} portions remaining in kitchen)
                </span>
              </div>
            </div>

            {/* DELIVERY ADDRESS */}
            <div className="rst-form-group">
              <label className="rst-form-label">DELIVERY DESTINATION ADDRESS *</label>
              <input
                type="text"
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="rst-input"
                placeholder="e.g. 123 Main Street, Apt 4B, New York, NY"
              />
            </div>

            {/* BILL BREAKDOWN */}
            <div style={{ background: "var(--yellow-light)", border: "1px solid var(--yellow)", padding: "14px 16px", borderRadius: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                <span>Surplus Meals ({quantity}x):</span>
                <span>${foodTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                <span>Delivery Fee:</span>
                <span style={{ color: "#166534", fontWeight: 700 }}>FREE (Eco Rescue)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 900, borderTop: "1px solid rgba(0,0,0,0.1)", paddingTop: "8px" }}>
                <span>Total Amount:</span>
                <span style={{ color: "var(--black)" }}>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="rst-modal-footer">
            <button
              type="button"
              className="rst-btn-outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rst-btn-solid"
            >
              {submitting ? "Placing Order..." : "🛍️ Place Rescue Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomerReserveModal;

