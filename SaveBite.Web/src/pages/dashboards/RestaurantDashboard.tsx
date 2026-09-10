import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RestaurantLayout } from "../../components/layout/RestaurantLayout";
import { getRestaurantProfile } from "../../services/profileService";
import {
  getRestaurantOrders,
  getMyFood,
  getNotifications,
} from "../../services/restaurantService";
import type { RestaurantProfile } from "../../types/profile";
import type { Order, FoodItem, AppNotification } from "../../types/restaurant";

export function RestaurantDashboard() {
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [prof, ords, food, notifs] = await Promise.all([
          getRestaurantProfile(),
          getRestaurantOrders(),
          getMyFood(),
          getNotifications(5),
        ]);
        setProfile(prof);
        setOrders(ords);
        setFoodItems(food);
        setNotifications(notifs);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // Calculate KPIs
  const activeFoodCount = foodItems.filter(
    (f) => f.status === "Available" || f.status === "Draft"
  ).length;

  const totalRevenue = orders.reduce((sum, o) => {
    return o.status !== "Cancelled" && o.status !== "Failed"
      ? sum + (o.foodTotal || 0)
      : sum;
  }, 0);

  const pendingOrdersCount = orders.filter((o) => o.status === "Pending").length;

  return (
    <RestaurantLayout>
      <div className="rst-dashboard">
        {/* WELCOME / GREETING BAR */}
        <div className="rst-page-header">
          <div>
            <h1 className="rst-page-title">
              {profile ? profile.restaurantName : "Restaurant"} Overview
            </h1>
            <p className="rst-page-subtitle">
              Monitor surplus food listings, manage incoming customer orders, and observe automated AI dispatch.
            </p>
          </div>
          <div className="rst-page-actions">
            <Link to="/restaurant/food/new" className="rst-btn-solid">
              ➕ Add Surplus Food
            </Link>
            <Link to="/restaurant/orders" className="rst-btn-outline">
              📦 View Orders
            </Link>
          </div>
        </div>

        {/* RESTAURANT APPROVAL STATUS BANNER */}
        {profile && !profile.isApproved && (
          <div className="rst-banner rst-banner--warning">
            <div className="rst-banner-icon">⏳</div>
            <div className="rst-banner-content">
              <h4>Kitchen Awaiting Verification</h4>
              <p>
                Your kitchen profile is submitted and currently under review by our administration team.
                Once approved, surplus food listings will become instantly purchasable by nearby customers.
              </p>
            </div>
            <div className="rst-banner-tag">Status: Pending</div>
          </div>
        )}

        {profile && profile.isApproved && (
          <div className="rst-banner rst-banner--success">
            <div className="rst-banner-icon">✓</div>
            <div className="rst-banner-content">
              <h4>Kitchen Verified & Active</h4>
              <p>
                Your kitchen is approved. Nearby customers can discover and purchase your surplus meals in real-time.
              </p>
            </div>
            <div className="rst-banner-tag">Status: Active</div>
          </div>
        )}

        {/* KPI CARDS */}
        <div className="rst-kpi-grid">
          <div className="rst-kpi-card">
            <div className="rst-kpi-header">
              <span className="rst-kpi-title">Active Food Items</span>
              <span className="rst-kpi-icon">🍲</span>
            </div>
            <div className="rst-kpi-value">{loading ? "..." : activeFoodCount}</div>
            <p className="rst-kpi-note">Total listings: {foodItems.length}</p>
          </div>

          <div className="rst-kpi-card">
            <div className="rst-kpi-header">
              <span className="rst-kpi-title">Total Orders</span>
              <span className="rst-kpi-icon">📦</span>
            </div>
            <div className="rst-kpi-value">{loading ? "..." : orders.length}</div>
            <p className="rst-kpi-note">
              {pendingOrdersCount > 0
                ? `⚡ ${pendingOrdersCount} pending confirmation`
                : "All orders processed"}
            </p>
          </div>

          <div className="rst-kpi-card">
            <div className="rst-kpi-header">
              <span className="rst-kpi-title">Surplus Revenue</span>
              <span className="rst-kpi-icon">💰</span>
            </div>
            <div className="rst-kpi-value">
              ${loading ? "..." : totalRevenue.toFixed(2)}
            </div>
            <p className="rst-kpi-note">Earned from rescued food</p>
          </div>

          <div className="rst-kpi-card">
            <div className="rst-kpi-header">
              <span className="rst-kpi-title">Kitchen Status</span>
              <span className="rst-kpi-icon">🛡️</span>
            </div>
            <div className="rst-kpi-value" style={{ fontSize: "20px", marginTop: "4px" }}>
              {profile?.isApproved ? "Approved" : "Pending"}
            </div>
            <p className="rst-kpi-note">Admin platform verification</p>
          </div>
        </div>

        {/* 2-COLUMN SECTION: RECENT ORDERS + AI ACTIVITY */}
        <div className="rst-two-col">
          {/* RECENT ORDERS */}
          <div className="rst-card">
            <div className="rst-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3>Recent Orders</h3>
                <span className="rst-badge">{orders.length} total</span>
              </div>
              <Link to="/restaurant/orders" className="rst-btn-outline" style={{ padding: "4px 10px", fontSize: "11px" }}>
                Manage All Orders →
              </Link>
            </div>

            {loading ? (
              <p className="rst-empty-text">Loading orders...</p>
            ) : orders.length === 0 ? (
              <div className="rst-empty-state">
                <span style={{ fontSize: "32px" }}>📦</span>
                <p style={{ fontWeight: 700, margin: "8px 0 4px" }}>No orders received yet</p>
                <p className="rst-empty-text">
                  Customer orders will automatically appear here as surplus food is reserved.
                </p>
              </div>
            ) : (
              <div className="rst-table-wrapper">
                <table className="rst-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id}>
                        <td>
                          <span className="rst-code">#{order.id.slice(-6)}</span>
                        </td>
                        <td>{order.quantity}</td>
                        <td>
                          <strong>${order.foodTotal?.toFixed(2)}</strong>
                        </td>
                        <td>
                          <span className={`rst-status-pill rst-status-pill--${order.status.toLowerCase()}`}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--grey-600)" }}>
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AI AGENT AUTOMATION & ACTIVITY PANEL */}
          <div className="rst-card">
            <div className="rst-card-header">
              <h3>Autonomous AI Activity</h3>
              <span className="rst-ai-badge">LangGraph Active</span>
            </div>

            <div className="rst-ai-panel">
              <div className="rst-ai-item">
                <div className="rst-ai-dot" />
                <div className="rst-ai-body">
                  <h5>AI Delivery Dispatcher</h5>
                  <p>
                    Continuously listens for ReadyForPickup status to evaluate nearby drivers and optimize delivery routing.
                  </p>
                </div>
              </div>

              <div className="rst-ai-item">
                <div className="rst-ai-dot rst-ai-dot--idle" />
                <div className="rst-ai-body">
                  <h5>Surplus Demand Predictor</h5>
                  <p>
                    Analyzing customer reservation patterns to recommend optimal surplus discount pricing (Milestone 7).
                  </p>
                </div>
              </div>

              <div className="rst-ai-item">
                <div className="rst-ai-dot" />
                <div className="rst-ai-body">
                  <h5>Automated SignalR Gateway</h5>
                  <p>
                    Real-time status updates broadcast to customers and riders without manual dashboard refresh.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-COLUMN SECTION: FOOD SUMMARY + RECENT NOTIFICATIONS */}
        <div className="rst-two-col" style={{ marginTop: "24px" }}>
          {/* FOOD LISTING SUMMARY */}
          <div className="rst-card">
            <div className="rst-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3>Food Listings Summary</h3>
                <span className="rst-badge">{foodItems.length} listed</span>
              </div>
              <Link to="/restaurant/food" className="rst-btn-outline" style={{ padding: "4px 10px", fontSize: "11px" }}>
                View All Listings →
              </Link>
            </div>

            {loading ? (
              <p className="rst-empty-text">Loading food listings...</p>
            ) : foodItems.length === 0 ? (
              <div className="rst-empty-state">
                <span style={{ fontSize: "32px" }}>🍲</span>
                <p style={{ fontWeight: 700, margin: "8px 0 4px" }}>No food listed yet</p>
                <p className="rst-empty-text">
                  Publish unsold portions from your daily batch before they expire.
                </p>
                <Link to="/restaurant/food/new" className="rst-btn-solid" style={{ marginTop: "12px", display: "inline-block" }}>
                  ➕ Create First Listing
                </Link>
              </div>
            ) : (
              <div className="rst-table-wrapper">
                <table className="rst-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodItems.slice(0, 5).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td>
                          <span className="rst-cat-tag">{item.category}</span>
                        </td>
                        <td>{item.quantity} portions</td>
                        <td>
                          <strong style={{ color: "var(--yellow-dark)" }}>
                            ${item.price?.toFixed(2)}
                          </strong>
                        </td>
                        <td>
                          <span className={`rst-status-pill rst-status-pill--${item.status.toLowerCase()}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* NOTIFICATION PANEL PREVIEW */}
          <div className="rst-card">
            <div className="rst-card-header">
              <h3>Recent Notifications</h3>
              <Link to="/restaurant/notifications" className="rst-link">
                View All →
              </Link>
            </div>

            {loading ? (
              <p className="rst-empty-text">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <div className="rst-empty-state">
                <span style={{ fontSize: "32px" }}>🔔</span>
                <p style={{ fontWeight: 700, margin: "8px 0 4px" }}>No new notifications</p>
                <p className="rst-empty-text">
                  Alerts for new orders, driver pickups, and status updates will be delivered here.
                </p>
              </div>
            ) : (
              <div className="rst-notif-list">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`rst-notif-item ${!notif.isRead ? "rst-notif-item--unread" : ""}`}
                  >
                    <div className="rst-notif-title-row">
                      <span className="rst-notif-title">{notif.title}</span>
                      <span className="rst-notif-time">
                        {new Date(notif.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="rst-notif-msg">{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </RestaurantLayout>
  );
}

export default RestaurantDashboard;
