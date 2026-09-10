import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import {
  getFoodDiscoveryDetails,
  createCustomerOrder,
} from "../../services/customerService";
import { getCustomerProfile } from "../../services/profileService";
import type { CustomerProfile } from "../../types/profile";
import type { Order } from "../../types/restaurant";
import { CountdownTimer } from "../../components/food/CountdownTimer";
import { OrderStatusStepper } from "../../components/orders/OrderStatusStepper";

interface FoodDetailsData {
  food: {
    id: string;
    name: string;
    description: string;
    category: string;
    quantity: number;
    price: number;
    availableFrom: string;
    availableUntil: string;
    location?: {
      type: string;
      coordinates: [number, number];
    };
  };
  restaurant: {
    id: string;
    restaurantName: string;
    description?: string;
    address: string;
    phoneNumber?: string;
    location?: {
      type: string;
      coordinates: [number, number];
    };
  };
}

export function FoodDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [details, setDetails] = useState<FoodDetailsData | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Order state
  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    Promise.all([getFoodDiscoveryDetails(id), getCustomerProfile()])
      .then(([foodData, profileData]) => {
        setDetails(foodData);
        if (profileData) {
          setProfile(profileData);
          setDeliveryAddress(profileData.address || "123 Main St, New York, NY");
        }
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            "Failed to load food item details. The listing may have expired or is no longer available."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const food = details?.food;
  const restaurant = details?.restaurant;

  const unitPrice = food?.price || 0;
  const availableStock = food?.quantity || 0;
  const foodTotal = quantity * unitPrice;
  const deliveryFee = 0; // Free rescue delivery
  const estimatedTotal = foodTotal + deliveryFee;

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > availableStock) return availableStock;
      return next;
    });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!food || !id) return;

    if (!deliveryAddress.trim()) {
      setOrderError("Please provide a valid delivery address.");
      return;
    }

    if (quantity < 1 || quantity > availableStock) {
      setOrderError(`Requested quantity must be between 1 and ${availableStock}.`);
      return;
    }

    setIsSubmitting(true);
    setOrderError(null);

    const lat = profile?.location?.coordinates?.[1] || 40.7135;
    const lng = profile?.location?.coordinates?.[0] || -74.0050;

    try {
      const order = await createCustomerOrder({
        foodItemId: food.id,
        quantity,
        deliveryAddress: deliveryAddress.trim(),
        latitude: lat,
        longitude: lng,
      });
      setCreatedOrder(order);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Could not place order. The quantity may have been reserved by another customer.";
      setOrderError(msg);
      // Re-fetch food details to sync available quantity
      getFoodDiscoveryDetails(id)
        .then((updated) => setDetails(updated))
        .catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Bakery":
        return "🥐";
      case "Prepared Meals":
        return "🍲";
      case "Fresh Produce":
        return "🥦";
      case "Groceries":
        return "🥫";
      case "Desserts":
        return "🍰";
      case "Dairy & Drinks":
        return "🥛";
      case "Beverages":
        return "☕";
      default:
        return "🍽️";
    }
  };

  return (
    <CustomerLayout>
      <div className="fdp-container">
        {/* Breadcrumb Navigation */}
        <div className="fdp-breadcrumb">
          <Link to="/customer/food" className="fdp-back-link">
            ← Back to Food Discovery
          </Link>
          <span className="fdp-crumb-sep">/</span>
          <span className="fdp-crumb-current">
            {loading ? "Loading..." : food?.name || "Food Details"}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="fd-loading-card">
            <div className="spinner-border text-warning" role="status" />
            <p>Loading surplus meal and kitchen details...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="fd-empty-card">
            <span className="fd-empty-icon">⚠️</span>
            <h3>Item Unavailable</h3>
            <p>{error}</p>
            <div className="fd-empty-actions">
              <Link to="/customer/food" className="fd-btn-action">
                Browse Active Surplus Food
              </Link>
            </div>
          </div>
        )}

        {/* Success Confirmation View */}
        {!loading && createdOrder && food && restaurant && (
          <div className="fdp-success-card">
            <div className="fdp-success-banner">
              <span className="fdp-success-icon">🎉</span>
              <div className="fdp-success-title-box">
                <span className="cst-modal-badge">ORDER CONFIRMED</span>
                <h2>Meal Successfully Rescued!</h2>
                <p>
                  Order <strong>#{createdOrder.id}</strong> has been sent to{" "}
                  <strong>{restaurant.restaurantName}</strong>.
                </p>
              </div>
            </div>

            {/* Stepper */}
            <div className="fdp-success-stepper">
              <OrderStatusStepper status={createdOrder.status} />
            </div>

            {/* Order Summary Grid */}
            <div className="fdp-receipt-grid">
              <div className="fdp-receipt-col">
                <span className="fdp-label">Rescued Meal</span>
                <p className="fdp-val">{food.name}</p>
                <span className="fdp-subval">
                  {quantity} portion(s) • ${unitPrice.toFixed(2)} each
                </span>
              </div>
              <div className="fdp-receipt-col">
                <span className="fdp-label">Pickup Kitchen</span>
                <p className="fdp-val">{restaurant.restaurantName}</p>
                <span className="fdp-subval">{restaurant.address}</span>
              </div>
              <div className="fdp-receipt-col">
                <span className="fdp-label">Delivery Destination</span>
                <p className="fdp-val">{createdOrder.deliveryAddress}</p>
                <span className="fdp-subval">Estimated arrival: 20-35 mins</span>
              </div>
              <div className="fdp-receipt-col">
                <span className="fdp-label">Total Amount</span>
                <p className="fdp-total-val">${createdOrder.totalAmount.toFixed(2)}</p>
                <span className="fdp-badge-free">✓ Free Rescue Delivery</span>
              </div>
            </div>

            {/* Actions */}
            <div className="fdp-success-actions">
              <button
                type="button"
                className="cst-btn-primary"
                onClick={() => navigate("/customer/orders")}
              >
                Track in My Orders ➔
              </button>
              <Link to="/customer/food" className="cst-btn-secondary">
                Discover More Surplus Food
              </Link>
            </div>
          </div>
        )}

        {/* Main Food Details & Checkout View */}
        {!loading && !error && !createdOrder && food && restaurant && (
          <div className="fdp-layout-grid">
            {/* Left Column: Food & Restaurant Info */}
            <div className="fdp-main-col">
              <div className="fdp-card">
                <div className="fdp-card-header">
                  <div className="fdp-badge-row">
                    <span className="fd-badge">
                      {getCategoryIcon(food.category)} {food.category}
                    </span>
                    <span className="fdp-stock-pill">
                      {availableStock > 0 ? `📦 ${availableStock} portions left` : "Out of Stock"}
                    </span>
                  </div>
                  <h1 className="fdp-food-title">{food.name}</h1>
                </div>

                <p className="fdp-food-desc">{food.description}</p>

                {/* Pickup Window & Countdown Timer */}
                <div className="fdp-timer-panel">
                  <div className="fdp-timer-text">
                    <span className="fdp-timer-title">⏰ Pickup & Rescue Window</span>
                    <span className="fdp-timer-sub">
                      Listing expires at {new Date(food.availableUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <CountdownTimer availableUntil={food.availableUntil} />
                </div>
              </div>

              {/* Restaurant Card */}
              <div className="fdp-card">
                <div className="fdp-card-header">
                  <span className="fdp-section-tag">PREPARING KITCHEN</span>
                  <h3 className="fdp-rest-title">{restaurant.restaurantName}</h3>
                </div>

                <div className="fdp-rest-grid">
                  <div className="fdp-rest-item">
                    <span className="fdp-label">📍 Street Address</span>
                    <p className="fdp-val">{restaurant.address}</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        restaurant.address
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rd-map-link"
                    >
                      Open Directions in Google Maps ↗
                    </a>
                  </div>

                  {restaurant.phoneNumber && (
                    <div className="fdp-rest-item">
                      <span className="fdp-label">📞 Telephone</span>
                      <p className="fdp-val">
                        <a href={`tel:${restaurant.phoneNumber}`} className="rd-phone-link">
                          {restaurant.phoneNumber}
                        </a>
                      </p>
                    </div>
                  )}

                  <div className="fdp-rest-item">
                    <span className="fdp-label">🛡️ Kitchen Trust</span>
                    <div className="rd-badge-verified">
                      ✓ SaveBite Verified Kitchen
                    </div>
                  </div>
                </div>

                {restaurant.description && (
                  <p className="fdp-rest-desc">{restaurant.description}</p>
                )}
              </div>
            </div>

            {/* Right Column: Order Summary & Checkout Card */}
            <div className="fdp-checkout-col">
              <div className="fdp-checkout-card">
                <h3 className="fdp-checkout-title">Order Summary</h3>

                {orderError && (
                  <div className="cst-alert-danger">
                    ⚠️ {orderError}
                  </div>
                )}

                <form onSubmit={handlePlaceOrder} className="fdp-order-form">
                  {/* Quantity Selector */}
                  <div className="fdp-field-group">
                    <label className="fdp-field-label">Select Quantity</label>
                    <div className="fdp-qty-selector">
                      <button
                        type="button"
                        className="fdp-qty-btn"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1 || availableStock === 0}
                      >
                        -
                      </button>
                      <span className="fdp-qty-display">{quantity}</span>
                      <button
                        type="button"
                        className="fdp-qty-btn"
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= availableStock || availableStock === 0}
                      >
                        +
                      </button>
                      <span className="fdp-qty-max">
                        (max {availableStock})
                      </span>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="fdp-field-group">
                    <label htmlFor="delivery-address-input" className="fdp-field-label">
                      Delivery Address
                    </label>
                    <input
                      id="delivery-address-input"
                      type="text"
                      className="cst-input"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Enter street address, Apt / Suite..."
                      required
                    />
                    <span className="fdp-field-hint">
                      Pre-filled from your customer profile.
                    </span>
                  </div>

                  {/* Price Calculation Breakdown */}
                  <div className="fdp-breakdown">
                    <div className="fdp-breakdown-row">
                      <span>Rescue Meal ({quantity}x)</span>
                      <span>${foodTotal.toFixed(2)}</span>
                    </div>
                    <div className="fdp-breakdown-row">
                      <span>Eco-Delivery Fee</span>
                      <span className="fdp-free-text">FREE</span>
                    </div>
                    <div className="fdp-breakdown-row">
                      <span>Estimated Arrival Time</span>
                      <span className="fdp-eta-text">⚡ 20 - 35 mins</span>
                    </div>
                    <div className="fdp-breakdown-total">
                      <span>Total Due</span>
                      <span className="fdp-grand-total">${estimatedTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="fdp-submit-btn"
                    disabled={isSubmitting || availableStock === 0}
                  >
                    {isSubmitting
                      ? "Reserving Meal..."
                      : availableStock === 0
                      ? "Out of Stock"
                      : `Confirm & Rescue (${quantity} for $${estimatedTotal.toFixed(2)}) ➔`}
                  </button>

                  <p className="fdp-guarantee">
                    🌱 By rescuing this surplus portion, you prevent edible food waste and help our planet.
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

