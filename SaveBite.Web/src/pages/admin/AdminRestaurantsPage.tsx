import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getAllRestaurants,
  approveRestaurant,
  rejectRestaurant,
  type AdminRestaurant,
} from "../../services/adminService";

export function AdminRestaurantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all";

  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<AdminRestaurant | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function loadRestaurants() {
    try {
      setLoading(true);
      const data = await getAllRestaurants(activeTab);
      setRestaurants(data);
    } catch (err) {
      console.error("Failed to load restaurants", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRestaurants();
  }, [activeTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleApprove = async (id: string, name: string) => {
    try {
      setActionLoading(id);
      await approveRestaurant(id);
      setMessage({ text: `✓ ${name} has been approved successfully!`, type: "success" });
      await loadRestaurants();
      if (selectedRestaurant?.id === id) {
        setSelectedRestaurant((prev) => prev ? { ...prev, isApproved: true } : null);
      }
    } catch (err) {
      setMessage({ text: "Failed to approve restaurant.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to reject ${name}?`)) return;
    try {
      setActionLoading(id);
      await rejectRestaurant(id);
      setMessage({ text: `✕ ${name} was rejected.`, type: "success" });
      await loadRestaurants();
      if (selectedRestaurant?.id === id) {
        setSelectedRestaurant((prev) => prev ? { ...prev, isApproved: false } : null);
      }
    } catch (err) {
      setMessage({ text: "Failed to reject restaurant.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRestaurants = restaurants.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.restaurantName.toLowerCase().includes(q) ||
      r.ownerFullName.toLowerCase().includes(q) ||
      r.ownerEmail.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q) ||
      r.phoneNumber.toLowerCase().includes(q)
    );
  });

  const pendingCount = restaurants.filter((r) => !r.isApproved).length;

  return (
    <div className="adm-restaurants-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Restaurant Management</h1>
          <p className="adm-page-subtitle">Verify partner kitchens, inspect business locations, and oversee food providers.</p>
        </div>
        <button onClick={loadRestaurants} className="adm-btn-secondary">
          🔄 Refresh
        </button>
      </div>

      {message && (
        <div className={`adm-alert-banner ${message.type === "success" ? "adm-alert-success" : "adm-alert-error"}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="adm-alert-close">×</button>
        </div>
      )}

      {/* FILTER TABS & SEARCH BAR */}
      <div className="adm-filter-toolbar">
        <div className="adm-tabs">
          <button
            onClick={() => handleTabChange("all")}
            className={`adm-tab-btn ${activeTab === "all" ? "active" : ""}`}
          >
            All Restaurants
          </button>
          <button
            onClick={() => handleTabChange("pending")}
            className={`adm-tab-btn ${activeTab === "pending" ? "active" : ""}`}
          >
            Pending Approvals {pendingCount > 0 && <span className="adm-tab-badge">{pendingCount}</span>}
          </button>
          <button
            onClick={() => handleTabChange("approved")}
            className={`adm-tab-btn ${activeTab === "approved" ? "active" : ""}`}
          >
            Approved
          </button>
        </div>

        <div className="adm-search-box">
          <span className="adm-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by restaurant, owner, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="adm-search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="adm-search-clear">×</button>
          )}
        </div>
      </div>

      {/* RESTAURANTS TABLE */}
      {loading ? (
        <div className="adm-loading-state">
          <div className="adm-spinner" />
          <p>Loading restaurant listings...</p>
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="adm-card adm-empty-state">
          <span className="adm-empty-icon">🏪</span>
          <h3>No restaurants found</h3>
          <p>
            {searchQuery
              ? `No restaurants matching "${searchQuery}".`
              : activeTab === "pending"
              ? "Great job! There are no pending restaurant approvals."
              : "No restaurants found in this view."}
          </p>
        </div>
      ) : (
        <div className="adm-card">
          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Restaurant</th>
                  <th>Owner</th>
                  <th>Phone</th>
                  <th>Listings</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRestaurants.map((r) => (
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
                    <td>
                      <span className="adm-pill-count">{r.foodCount ?? 0} items</span>
                    </td>
                    <td>
                      {r.isApproved ? (
                        <span className="adm-status-pill adm-status-approved">✓ Approved</span>
                      ) : (
                        <span className="adm-status-pill adm-status-pending">⏳ Pending</span>
                      )}
                    </td>
                    <td className="adm-table-cell-sub">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="adm-action-buttons">
                        <button
                          onClick={() => setSelectedRestaurant(r)}
                          className="adm-btn-action-view"
                          title="View Details"
                        >
                          👁️ View
                        </button>
                        {!r.isApproved ? (
                          <>
                            <button
                              onClick={() => handleApprove(r.id, r.restaurantName)}
                              disabled={actionLoading === r.id}
                              className="adm-btn-action-approve"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleReject(r.id, r.restaurantName)}
                              disabled={actionLoading === r.id}
                              className="adm-btn-action-reject"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleReject(r.id, r.restaurantName)}
                            disabled={actionLoading === r.id}
                            className="adm-btn-action-revoke"
                            title="Revoke approval"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RESTAURANT DETAILS MODAL */}
      {selectedRestaurant && (
        <div className="adm-modal-backdrop" onClick={() => setSelectedRestaurant(null)}>
          <div className="adm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div>
                <h3 className="adm-modal-title">{selectedRestaurant.restaurantName}</h3>
                <span className="adm-table-cell-sub">ID: {selectedRestaurant.id}</span>
              </div>
              <button onClick={() => setSelectedRestaurant(null)} className="adm-modal-close">×</button>
            </div>

            <div className="adm-modal-body">
              <div className="adm-detail-grid">
                <div className="adm-detail-item">
                  <span className="adm-detail-label">Approval Status</span>
                  <div>
                    {selectedRestaurant.isApproved ? (
                      <span className="adm-status-pill adm-status-approved">✓ Approved</span>
                    ) : (
                      <span className="adm-status-pill adm-status-pending">⏳ Pending Review</span>
                    )}
                  </div>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Registered Date</span>
                  <span className="adm-detail-value">{new Date(selectedRestaurant.createdAt).toLocaleString()}</span>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Owner Full Name</span>
                  <span className="adm-detail-value">{selectedRestaurant.ownerFullName}</span>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Owner Email</span>
                  <span className="adm-detail-value">{selectedRestaurant.ownerEmail}</span>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Contact Phone</span>
                  <span className="adm-detail-value">{selectedRestaurant.phoneNumber || "Not provided"}</span>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Surplus Meals Listed</span>
                  <span className="adm-detail-value">{selectedRestaurant.foodCount ?? 0} active listings</span>
                </div>
              </div>

              <div className="adm-detail-block">
                <span className="adm-detail-label">Physical Address</span>
                <p className="adm-detail-text">{selectedRestaurant.address}</p>
                {selectedRestaurant.location?.coordinates && (
                  <div className="adm-geo-link">
                    <span>📍 Coordinates: {selectedRestaurant.location.coordinates[1]}, {selectedRestaurant.location.coordinates[0]}</span>
                    <a
                      href={`https://www.google.com/maps?q=${selectedRestaurant.location.coordinates[1]},${selectedRestaurant.location.coordinates[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="adm-link"
                    >
                      Open in Maps ↗
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="adm-modal-footer">
              {!selectedRestaurant.isApproved ? (
                <>
                  <button
                    onClick={() => handleReject(selectedRestaurant.id, selectedRestaurant.restaurantName)}
                    disabled={actionLoading === selectedRestaurant.id}
                    className="adm-btn-danger"
                  >
                    ✕ Reject Application
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRestaurant.id, selectedRestaurant.restaurantName)}
                    disabled={actionLoading === selectedRestaurant.id}
                    className="adm-btn-primary"
                  >
                    ✓ Approve Kitchen
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleReject(selectedRestaurant.id, selectedRestaurant.restaurantName)}
                  disabled={actionLoading === selectedRestaurant.id}
                  className="adm-btn-danger"
                >
                  Revoke Approval
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRestaurantsPage;

