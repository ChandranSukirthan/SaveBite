import { useEffect, useState } from "react";
import { getRestaurantDiscoveryDetails } from "../../services/customerService";
import type { DiscoveredRestaurantDetails, DiscoveredFoodItem } from "../../types/customer";

interface RestaurantDetailsModalProps {
  restaurantId: string | null;
  onClose: () => void;
  availableFoods?: DiscoveredFoodItem[];
  onSelectFood?: (item: DiscoveredFoodItem) => void;
}

export function RestaurantDetailsModal({
  restaurantId,
  onClose,
  availableFoods = [],
  onSelectFood,
}: RestaurantDetailsModalProps) {
  const [restaurant, setRestaurant] = useState<DiscoveredRestaurantDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getRestaurantDiscoveryDetails(restaurantId)
      .then((data) => {
        if (isMounted) {
          setRestaurant(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || "Failed to load restaurant profile.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  if (!restaurantId) return null;

  const restaurantFoods = availableFoods.filter(
    (f) => f.restaurant?.id === restaurantId
  );

  return (
    <div className="cst-modal-overlay" onClick={onClose}>
      <div
        className="cst-modal-card rd-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="cst-modal-header">
          <div className="rd-header-title-box">
            <span className="cst-modal-badge">🏪 RESTAURANT PROFILE</span>
            <h2 className="cst-modal-title">
              {loading ? "Loading..." : restaurant?.restaurantName || "Partner Restaurant"}
            </h2>
          </div>
          <button
            type="button"
            className="cst-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="cst-modal-body">
          {loading && (
            <div className="rd-loading-state">
              <div className="spinner-border text-warning" role="status" />
              <p>Fetching verified restaurant information...</p>
            </div>
          )}

          {error && (
            <div className="cst-alert-danger">
              ⚠️ {error}
            </div>
          )}

          {!loading && restaurant && (
            <div className="rd-content">
              <div className="rd-info-grid">
                <div className="rd-info-card">
                  <span className="rd-label">📍 Street Address</span>
                  <p className="rd-value">{restaurant.address}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      restaurant.address
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rd-map-link"
                  >
                    Open in Google Maps ↗
                  </a>
                </div>

                {restaurant.phoneNumber && (
                  <div className="rd-info-card">
                    <span className="rd-label">📞 Direct Telephone</span>
                    <p className="rd-value">
                      <a href={`tel:${restaurant.phoneNumber}`} className="rd-phone-link">
                        {restaurant.phoneNumber}
                      </a>
                    </p>
                  </div>
                )}

                <div className="rd-info-card">
                  <span className="rd-label">🛡️ Verification Status</span>
                  <div className="rd-badge-verified">
                    ✓ Verified Food Rescue Partner
                  </div>
                </div>
              </div>

              {restaurant.description && (
                <div className="rd-desc-box">
                  <span className="rd-label">About Restaurant</span>
                  <p className="rd-description">{restaurant.description}</p>
                </div>
              )}

              <div className="rd-food-section">
                <h4 className="rd-section-title">
                  🍲 Active Surplus Meals ({restaurantFoods.length})
                </h4>
                {restaurantFoods.length === 0 ? (
                  <p className="rd-no-food">No other surplus food listed right now.</p>
                ) : (
                  <div className="rd-food-list">
                    {restaurantFoods.map((food) => (
                      <div key={food.id} className="rd-food-row">
                        <div className="rd-food-info">
                          <span className="rd-food-title">{food.name}</span>
                          <span className="rd-food-category">
                            {food.category} • {food.quantity} left
                          </span>
                        </div>
                        <div className="rd-food-action">
                          <span className="rd-food-price">${food.price.toFixed(2)}</span>
                          {onSelectFood && (
                            <button
                              type="button"
                              className="rd-reserve-btn"
                              onClick={() => {
                                onSelectFood(food);
                                onClose();
                              }}
                            >
                              Reserve
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="cst-modal-footer">
          <button type="button" className="cst-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

