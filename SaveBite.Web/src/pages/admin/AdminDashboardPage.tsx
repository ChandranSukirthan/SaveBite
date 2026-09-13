import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminKPIs,
  getPendingRestaurants,
  getAdminOrders,
  approveRestaurant,
  rejectRestaurant,
  type AdminKPIs,
  type AdminRestaurant,
  type AdminOrder,
} from "../../services/adminService";

export function AdminDashboardPage() {
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [pendingRestaurants, setPendingRestaurants] = useState<AdminRestaurant[]>([]);
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const [statsData, pendingData, ordersData] = await Promise.all([
        getAdminKPIs(),
        getPendingRestaurants(),
        getAdminOrders(),
      ]);
      setKpis(statsData);
      setPendingRestaurants(pendingData);
      setRecentOrders(ordersData.slice(0, 6));
    } catch (err) {
      console.error("Failed to load admin dashboard data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    try {
      setActionLoading(id);
      await approveRestaurant(id);
      setMessage({ text: `✓ ${name} has been approved successfully!`, type: "success" });
      await loadData();
    } catch (err) {
      setMessage({ text: "Failed to approve restaurant. Please try again.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to reject ${name}?`)) return;
    try {
      setActionLoading(id);
      await rejectRestaurant(id);
      setMessage({ text: `✕ ${name} application was rejected.`, type: "success" });
      await loadData();
    } catch (err) {
      setMessage({ text: "Failed to reject restaurant. Please try again.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="adm-dashboard-page">
      {/* PAGE HEADER */}
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Platform Administration</h1>
          <p className="adm-page-subtitle">Real-time overview of SaveBite ecosystem, operations, and AI coordination.</p>
        </div>
        <div className="adm-header-actions">
          <button onClick={loadData} className="adm-btn-secondary" title="Refresh data">
            🔄 Refresh Data
          </button>
          {pendingRestaurants.length > 0 && (
            <Link to="/admin/restaurants" className="adm-btn-primary">
              ⚡ Review {pendingRestaurants.length} Pending Kitchens
            </Link>
          )}
        </div>
      </div>

      {message && (
        <div className={`adm-alert-banner ${message.type === "success" ? "adm-alert-success" : "adm-alert-error"}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="adm-alert-close">×</button>
        </div>
      )}

      {loading ? (
        <div className="adm-loading-state">
          <div className="adm-spinner" />
          <p>Loading platform metrics and live telemetry...</p>
        </div>
      ) : (
        <>
          {/* 6 KPI CARDS */}
          <div className="adm-kpi-grid">
            {/* 1. USERS */}
            <div className="adm-kpi-card">
              <div className="adm-kpi-header">
                <span className="adm-kpi-icon">👥</span>
                <span className="adm-kpi-label">Total Users</span>
              </div>
              <div className="adm-kpi-value">{kpis?.users.total ?? 0}</div>
              <div className="adm-kpi-subtext">
                <span>{kpis?.users.customers ?? 0} Customers</span> •
                <span>{kpis?.users.restaurants ?? 0} Kitchens</span> •
                <span>{kpis?.users.deliveryPersons ?? 0} Couriers</span>
              </div>
              <Link to="/admin/users" className="adm-kpi-link">Manage Users →</Link>
            </div>

            {/* 2. RESTAURANTS */}
            <div className="adm-kpi-card">
              <div className="adm-kpi-header">
                <span className="adm-kpi-icon">🏪</span>
                <span className="adm-kpi-label">Restaurants</span>
              </div>
              <div className="adm-kpi-value">{kpis?.restaurants.total ?? 0}</div>
              <div className="adm-kpi-subtext">
                <span className="adm-text-success">{kpis?.restaurants.approved ?? 0} Approved</span> •
                <span className={kpis?.restaurants.pending ? "adm-text-amber" : ""}>{kpis?.restaurants.pending ?? 0} Pending</span>
              </div>
              <Link to="/admin/restaurants" className="adm-kpi-link">Review Kitchens →</Link>
            </div>

            {/* 3. ORDERS */}
            <div className="adm-kpi-card">
              <div className="adm-kpi-header">
                <span className="adm-kpi-icon">📦</span>
                <span className="adm-kpi-label">Total Orders</span>
              </div>
              <div className="adm-kpi-value">{kpis?.orders.total ?? 0}</div>
              <div className="adm-kpi-subtext">
                <span className="adm-text-blue">{kpis?.orders.active ?? 0} Active</span> •
                <span>{kpis?.orders.delivered ?? 0} Delivered</span> •
                <span>{kpis?.orders.pending ?? 0} Pending</span>
              </div>
              <Link to="/admin/orders" className="adm-kpi-link">Monitor Orders →</Link>
            </div>

            {/* 4. DELIVERIES */}
            <div className="adm-kpi-card">
              <div className="adm-kpi-header">
                <span className="adm-kpi-icon">🛵</span>
                <span className="adm-kpi-label">Deliveries</span>
              </div>
              <div className="adm-kpi-value">{kpis?.deliveries.total ?? 0}</div>
              <div className="adm-kpi-subtext">
                <span className="adm-text-purple">{kpis?.deliveries.active ?? 0} Active In-Transit</span> •
                <span>{kpis?.deliveries.completed ?? 0} Completed</span>
              </div>
              <Link to="/admin/deliveries" className="adm-kpi-link">Track Couriers →</Link>
            </div>

            {/* 5. RESCUE IMPACT & GMV */}
            <div className="adm-kpi-card">
              <div className="adm-kpi-header">
                <span className="adm-kpi-icon">🍲</span>
                <span className="adm-kpi-label">Rescued Meals & GMV</span>
              </div>
              <div className="adm-kpi-value">{kpis?.food.rescuedMeals ?? 0} Meals</div>
              <div className="adm-kpi-subtext">
                <span>GMV: <strong>${kpis?.finance.totalGMV.toFixed(2) ?? "0.00"}</strong></span> •
                <span>{kpis?.food.available ?? 0} Active Listings</span>
              </div>
              <span className="adm-kpi-badge-positive">🌱 Environmental Impact</span>
            </div>

            {/* 6. AI DISPATCH EFFICIENCY */}
            <div className="adm-kpi-card adm-kpi-card-ai">
              <div className="adm-kpi-header">
                <span className="adm-kpi-icon">🧠</span>
                <span className="adm-kpi-label">AI Autonomous Match Rate</span>
              </div>
              <div className="adm-kpi-value">{kpis?.ai.successRate ?? 100}%</div>
              <div className="adm-kpi-subtext">
                <span>{kpis?.ai.successfulMatches ?? 0} / {kpis?.ai.totalDispatches ?? 0} Dispatches</span> •
                <span>LangGraph Agent Active</span>
              </div>
              <Link to="/admin/ai-activity" className="adm-kpi-link">View AI Telemetry →</Link>
            </div>
          </div>

          {/* TWO COLUMN CONTENT: PENDING RESTAURANTS & RECENT ORDERS */}
          <div className="adm-dashboard-columns">
            {/* PENDING APPROVALS */}
            <div className="adm-card">
              <div className="adm-card-header">
                <div className="adm-card-title-group">
                  <h3 className="adm-card-title">Pending Restaurant Approvals</h3>
                  <span className="adm-counter-badge">{pendingRestaurants.length}</span>
                </div>
                <Link to="/admin/restaurants" className="adm-card-action-link">View All ({kpis?.restaurants.total ?? 0}) →</Link>
              </div>

              {pendingRestaurants.length === 0 ? (
                <div className="adm-empty-table-state">
                  <span className="adm-empty-icon">✅</span>
                  <h4>All caught up!</h4>
                  <p>There are no restaurants currently awaiting verification.</p>
                </div>
              ) : (
                <div className="adm-table-container">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Restaurant</th>
                        <th>Owner</th>
                        <th>Phone</th>
                        <th>Registered</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRestaurants.slice(0, 5).map((r) => (
                        <tr key={r.id}>
                          <td>
                            <div className="adm-table-cell-title">{r.restaurantName}</div>
                            <div className="adm-table-cell-sub">{r.address}</div>
                          </td>
                          <td>
                            <div>{r.ownerFullName}</div>
                            <div className="adm-table-cell-sub">{r.ownerEmail}</div>
                          </td>
                          <td>{r.phoneNumber || "N/A"}</td>
                          <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="adm-action-buttons">
                              <button
                                onClick={() => handleApprove(r.id, r.restaurantName)}
                                disabled={actionLoading === r.id}
                                className="adm-btn-action-approve"
                                title="Approve kitchen"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => handleReject(r.id, r.restaurantName)}
                                disabled={actionLoading === r.id}
                                className="adm-btn-action-reject"
                                title="Reject kitchen"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* RECENT PLATFORM ORDERS */}
            <div className="adm-card">
              <div className="adm-card-header">
                <div className="adm-card-title-group">
                  <h3 className="adm-card-title">Recent Platform Orders</h3>
                  <span className="adm-counter-badge">{kpis?.orders.total ?? 0}</span>
                </div>
                <Link to="/admin/orders" className="adm-card-action-link">All Orders →</Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="adm-empty-table-state">
                  <span className="adm-empty-icon">📦</span>
                  <h4>No orders yet</h4>
                  <p>Recent surplus food orders will appear here as they are placed.</p>
                </div>
              ) : (
                <div className="adm-table-container">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Food</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <span className="adm-id-code" title={o.id}>#{o.id.slice(-6)}</span>
                            <div className="adm-table-cell-sub">{o.restaurantName}</div>
                          </td>
                          <td>
                            <div>{o.foodName}</div>
                            <div className="adm-table-cell-sub">Qty: {o.quantity}</div>
                          </td>
                          <td className="adm-font-bold">${o.totalPrice.toFixed(2)}</td>
                          <td>
                            <span className={`adm-status-pill adm-status-${o.status.toLowerCase()}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="adm-table-cell-sub">
                            {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboardPage;

