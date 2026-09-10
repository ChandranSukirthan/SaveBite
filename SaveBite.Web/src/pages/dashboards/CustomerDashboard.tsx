import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { getCustomerProfile } from "../../services/profileService";
import {
  searchNearbyFood,
  getMyCustomerOrders,
} from "../../services/customerService";
import { getNotifications, markNotificationRead } from "../../services/restaurantService";
import type { CustomerProfile } from "../../types/profile";
import type { DiscoveredFoodItem, AIRecommendation } from "../../types/customer";
import type { Order, AppNotification } from "../../types/restaurant";
import { CountdownTimer } from "../../components/food/CountdownTimer";
import { OrderStatusStepper } from "../../components/orders/OrderStatusStepper";
import { CustomerReserveModal } from "../../components/customer/CustomerReserveModal";

const CATEGORIES = [
  "All",
  "Bakery",
  "Prepared Meals",
  "Fresh Produce",
  "Groceries",
  "Desserts",
  "Dairy & Drinks",
  "Beverages",
];

export function CustomerDashboard() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [discoveredFood, setDiscoveredFood] = useState<DiscoveredFoodItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

  // Order modal
  const [selectedFoodForOrder, setSelectedFoodForOrder] = useState<DiscoveredFoodItem | null>(null);
  const [orderSuccessMessage, setOrderSuccessMessage] = useState<string | null>(null);

  // Dynamic greeting based on hour
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  async function loadDashboardData() {
    try {
      setLoading(true);
      const prof = await getCustomerProfile().catch(() => null);
      if (prof) {
        setProfile(prof);
        if (prof.maximumBudget && maxPrice === undefined) {
          setMaxPrice(prof.maximumBudget);
        }
      }

      const lat = prof?.location?.coordinates?.[1] || 40.7135;
      const lon = prof?.location?.coordinates?.[0] || -74.005;

      const [foodList, ords, notifs] = await Promise.all([
        searchNearbyFood({
          latitude: lat,
          longitude: lon,
          radiusInKilometers: radiusKm,
        }).catch(() => []),
        getMyCustomerOrders().catch(() => []),
        getNotifications(10).catch(() => []),
      ]);

      setDiscoveredFood(foodList);
      setOrders(ords);
      setNotifications(notifs);
    } catch (err) {
      console.error("Failed to load customer dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [radiusKm]);

  // Find single active in-flight order
  const activeOrder = orders.find(
    (o) =>
      o.status === "Pending" ||
      o.status === "Confirmed" ||
      o.status === "Preparing" ||
      o.status === "ReadyForPickup" ||
      o.status === "PickedUp" ||
      o.status === "OutForDelivery"
  );

  // Compute AI Recommendations
  const aiRecommendations: AIRecommendation[] = discoveredFood
    .map((item) => {
      let score = 50; // base score
      let reason = "Affordable local surplus meal";
      let badge = "✨ AI Suggested";

      // 1. Matches preferred category
      const prefersCategory = profile?.preferredCategories?.some(
        (c) => c.toLowerCase() === item.category.toLowerCase()
      );
      if (prefersCategory) {
        score += 30;
        reason = `Matches your preference for ${item.category}`;
        badge = "🎯 Preference Match";
      }

      // 2. Fits customer maximum budget
      if (profile?.maximumBudget && item.price <= profile.maximumBudget) {
        score += 15;
        const discountPct = Math.round(
          ((profile.maximumBudget - item.price) / profile.maximumBudget) * 100
        );
        if (discountPct > 20) {
          reason = `${discountPct}% below your $${profile.maximumBudget.toFixed(0)} budget`;
          badge = "💰 Budget Winner";
        }
      }

      // 3. Proximity bonus (< 3 km)
      if (item.distanceInKilometers <= 3) {
        score += 20;
        if (!prefersCategory) {
          reason = `Only ${item.distanceInKilometers} km from your door`;
          badge = "📍 Super Close";
        }
      }

      return {
        food: item,
        matchScore: score,
        reason,
        badge,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3); // top 3 recommendations

  // Filter food items
  const filteredFood = discoveredFood.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.restaurant?.restaurantName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      item.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesPrice = maxPrice === undefined || item.price <= maxPrice;

    return matchesSearch && matchesCategory && matchesPrice;
  });

  const handleOrderSuccess = (orderId: string) => {
    setOrderSuccessMessage(
      `Order #${orderId.slice(-8)} placed successfully! The kitchen has been notified.`
    );
    loadDashboardData();
  };

  const handleMarkNotification = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  return (
    <CustomerLayout>
      <div className="cst-dashboard">
        {/* WELCOME / GREETING HERO */}
        <div className="cst-hero-greeting">
          <div className="cst-hero-text">
            <h1 className="cst-greeting-title">
              {greeting}, {user?.fullName?.split(" ")[0]} 👋
            </h1>
            <p className="cst-greeting-sub">
              Discover verified local surplus meals, rescue food before it expires, and save up to 70%.
            </p>
          </div>

          <div className="cst-stats-row">
            <div className="cst-stat-card">
              <span className="cst-stat-icon">🌱</span>
              <div>
                <strong>{orders.filter((o) => o.status === "Delivered").length}</strong>
                <span>Meals Saved</span>
              </div>
            </div>
            <div className="cst-stat-card">
              <span className="cst-stat-icon">🎯</span>
              <div>
                <strong>{profile?.preferredCategories?.length || 0}</strong>
                <span>Favorites</span>
              </div>
            </div>
            <div className="cst-stat-card">
              <span className="cst-stat-icon">💵</span>
              <div>
                <strong>${profile?.maximumBudget?.toFixed(0) || "25"}</strong>
                <span>Max Budget</span>
              </div>
            </div>
          </div>
        </div>

        {orderSuccessMessage && (
          <div className="rst-banner rst-banner--success" style={{ animation: "fadeIn 0.3s" }}>
            <div className="rst-banner-icon">🎉</div>
            <div className="rst-banner-content">
              <strong>Order Confirmed!</strong> {orderSuccessMessage}
            </div>
            <button
              type="button"
              className="rst-modal-close"
              onClick={() => setOrderSuccessMessage(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* ACTIVE IN-FLIGHT ORDER TRACKER */}
        {activeOrder && (
          <div className="cst-active-order-box">
            <div className="cst-active-order-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "22px" }}>🛵</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>
                    Active Order in Progress (Ref: #{activeOrder.id.slice(-8)})
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--grey-600)" }}>
                    {activeOrder.quantity} portions • Total: ${activeOrder.totalAmount?.toFixed(2)}
                  </p>
                </div>
              </div>
              <span className={`rst-status-pill rst-status-pill--${activeOrder.status.toLowerCase()}`}>
                {activeOrder.status}
              </span>
            </div>

            <div style={{ marginTop: "16px" }}>
              <OrderStatusStepper status={activeOrder.status} />
            </div>

            {/* AI DISPATCH BADGE IF READY OR OUT FOR DELIVERY */}
            {(activeOrder.status === "ReadyForPickup" ||
              activeOrder.status === "PickedUp" ||
              activeOrder.status === "OutForDelivery") && (
              <div className="rst-ai-active-box" style={{ marginTop: "14px" }}>
                <div className="rst-ai-dot" />
                <div>
                  <strong style={{ fontSize: "13px", color: "#7e22ce" }}>
                    LangGraph Autonomous Delivery Active
                  </strong>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--grey-600)" }}>
                    Courier has been routed to the restaurant for rapid eco-friendly pick-up and delivery.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI RECOMMENDATIONS SECTION */}
        {aiRecommendations.length > 0 && (
          <section className="cst-section">
            <div className="cst-section-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="rst-ai-badge">🤖 AI Recommendation Engine</span>
                  <h2 className="cst-section-title">Smart Meal Rescues For You</h2>
                </div>
                <p className="cst-section-subtitle">
                  Personalized picks based on your saved food preferences, budget target, and live GPS proximity.
                </p>
              </div>
            </div>

            <div className="cst-recommend-grid">
              {aiRecommendations.map((rec) => (
                <div key={rec.food.id} className="cst-recommend-card">
                  <div className="cst-recommend-badge">{rec.badge}</div>
                  <div className="cst-recommend-header">
                    <div>
                      <span className="rst-cat-tag">{rec.food.category}</span>
                      <h3 className="cst-recommend-food-title">{rec.food.name}</h3>
                      <p className="cst-recommend-restaurant">
                        🍳 {rec.food.restaurant?.restaurantName} • 📍 {rec.food.distanceInKilometers} km away
                      </p>
                    </div>
                    <div className="cst-recommend-price-box">
                      <span className="cst-recommend-price">${rec.food.price?.toFixed(2)}</span>
                      <span className="cst-recommend-stock">{rec.food.quantity} left</span>
                    </div>
                  </div>

                  <div className="cst-recommend-reason-pill">
                    💡 {rec.reason}
                  </div>

                  <div className="cst-recommend-footer">
                    <CountdownTimer availableUntil={rec.food.availableUntil} />
                    <button
                      type="button"
                      className="rst-btn-solid"
                      style={{ padding: "7px 14px", fontSize: "12px" }}
                      onClick={() => setSelectedFoodForOrder(rec.food)}
                    >
                      ⚡ Reserve Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SEARCH & FILTER BAR */}
        <section id="explore" className="cst-section">
          <div className="rst-card" style={{ padding: "18px 20px" }}>
            <div className="cst-search-bar-row">
              <div className="rst-search-wrapper" style={{ flex: 2 }}>
                <span className="rst-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search meals, bakeries, groceries, or restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rst-search-input"
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                <span className="rst-field-label" style={{ margin: 0 }}>Radius:</span>
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="rst-filter-select"
                >
                  <option value={5}>Within 5 km</option>
                  <option value={10}>Within 10 km</option>
                  <option value={15}>Within 15 km</option>
                  <option value={25}>Within 25 km</option>
                  <option value={50}>Within 50 km</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="rst-field-label" style={{ margin: 0 }}>Max $:</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Max $"
                  value={maxPrice ?? ""}
                  onChange={(e) =>
                    setMaxPrice(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="rst-input"
                  style={{ width: "90px", padding: "8px 10px" }}
                />
              </div>
            </div>

            {/* CATEGORY CHIPS */}
            <div className="cst-category-chips">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`cst-chip ${selectedCategory === cat ? "cst-chip--active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* NEARBY SURPLUS FOOD GRID */}
        <section className="cst-section">
          <div className="cst-section-header">
            <div>
              <h2 className="cst-section-title">Nearby Surplus Food ({filteredFood.length})</h2>
              <p className="cst-section-subtitle">
                Available portions from verified kitchens within {radiusKm} km of your delivery location.
              </p>
            </div>
            <Link
              to="/customer/food"
              className="cst-btn-secondary"
              style={{ padding: "8px 16px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <span>🛰️ Open Map & Filters</span>
              <span>➔</span>
            </Link>
          </div>

          {loading ? (
            <p className="rst-empty-text">Searching nearby restaurants for surplus meals...</p>
          ) : filteredFood.length === 0 ? (
            <div className="rst-card">
              <div className="rst-empty-state">
                <span style={{ fontSize: "44px" }}>🍲</span>
                <p style={{ fontWeight: 800, fontSize: "16px", margin: "8px 0 4px" }}>
                  No surplus food found nearby
                </p>
                <p className="rst-empty-text">
                  Try expanding your search radius or changing the category filter.
                </p>
                <button
                  type="button"
                  className="rst-btn-outline"
                  style={{ marginTop: "14px" }}
                  onClick={() => {
                    setSelectedCategory("All");
                    setSearchQuery("");
                    setRadiusKm(25);
                  }}
                >
                  Expand Search Radius to 25 km
                </button>
              </div>
            </div>
          ) : (
            <div className="cst-food-grid">
              {filteredFood.map((food) => (
                <div key={food.id} className="cst-food-card">
                  <div className="cst-food-card-top">
                    <span className="rst-cat-tag">{food.category}</span>
                    <span className="cst-distance-pill">📍 {food.distanceInKilometers} km</span>
                  </div>

                  <h3 className="cst-food-title">{food.name}</h3>
                  <p className="cst-food-restaurant">
                    by <strong>{food.restaurant?.restaurantName}</strong>
                  </p>
                  <p className="cst-food-address">{food.restaurant?.address}</p>

                  <p className="cst-food-desc">
                    {food.description || "Fresh surplus prepared food ready for pickup."}
                  </p>

                  <div className="cst-food-price-row">
                    <div>
                      <span className="cst-price-val">${food.price?.toFixed(2)}</span>
                      <span className="cst-portion-tag">{food.quantity} portions left</span>
                    </div>
                    <CountdownTimer availableUntil={food.availableUntil} />
                  </div>

                  <div className="cst-food-card-action">
                    <button
                      type="button"
                      className="rst-btn-solid"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => setSelectedFoodForOrder(food)}
                    >
                      🛍️ Reserve Meal (${food.price?.toFixed(2)})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2-COLUMN SECTION: RECENT ORDERS & NOTIFICATIONS */}
        <div className="rst-two-col">
          {/* RECENT ORDERS */}
          <section id="orders" className="rst-card">
            <div className="rst-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>📦</span>
                <h3>My Recent Orders</h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="rst-badge">{orders.length} total</span>
                <Link to="/customer/orders" style={{ fontSize: "12px", fontWeight: 700, color: "var(--black)", textDecoration: "none" }}>
                  View All ➔
                </Link>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="rst-empty-state">
                <span style={{ fontSize: "32px" }}>🛍️</span>
                <p style={{ fontWeight: 700, margin: "8px 0 4px" }}>No orders placed yet</p>
                <p className="rst-empty-text">
                  When you reserve a surplus meal, track its preparation and delivery here.
                </p>
              </div>
            ) : (
              <div className="rst-table-wrapper">
                <table className="rst-table">
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Quantity</th>
                      <th>Total</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id}>
                        <td>
                          <span className="rst-code">#{o.id.slice(-6)}</span>
                        </td>
                        <td>{o.quantity} portions</td>
                        <td>
                          <strong>${o.totalAmount?.toFixed(2)}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: "11px", color: "var(--grey-600)" }}>
                            {new Date(o.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </td>
                        <td>
                          <span className={`rst-status-pill rst-status-pill--${o.status.toLowerCase()}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* NOTIFICATIONS */}
          <section id="customer-notifications-section" className="rst-card">
            <div className="rst-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>🔔</span>
                <h3>Notifications</h3>
              </div>
              <span className="rst-badge">
                {notifications.filter((n) => !n.isRead).length} unread
              </span>
            </div>

            {notifications.length === 0 ? (
              <div className="rst-empty-state">
                <span style={{ fontSize: "32px" }}>🔕</span>
                <p style={{ fontWeight: 700, margin: "8px 0 4px" }}>No notifications</p>
                <p className="rst-empty-text">Updates regarding orders and deliveries will appear here.</p>
              </div>
            ) : (
              <div className="rst-notif-list">
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className={`rst-notif-item ${!n.isRead ? "rst-notif-item--unread" : ""}`}
                  >
                    <div className="rst-notif-title-row">
                      <span className="rst-notif-title">{n.title}</span>
                      <span className="rst-notif-time">
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="rst-notif-msg">{n.message}</p>
                    {!n.isRead && (
                      <button
                        type="button"
                        className="rst-btn-mark-read"
                        style={{ alignSelf: "flex-end", marginTop: "4px" }}
                        onClick={() => handleMarkNotification(n.id)}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ORDER RESERVATION MODAL */}
        {selectedFoodForOrder && (
          <CustomerReserveModal
            food={selectedFoodForOrder}
            customerProfile={profile}
            onClose={() => setSelectedFoodForOrder(null)}
            onOrderSuccess={handleOrderSuccess}
          />
        )}
      </div>
    </CustomerLayout>
  );
}

export default CustomerDashboard;
