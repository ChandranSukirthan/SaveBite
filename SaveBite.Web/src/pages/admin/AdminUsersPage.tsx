import { useEffect, useState } from "react";
import { getAdminUsers, type AdminUser } from "../../services/adminService";

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getAdminUsers(activeRole, searchQuery);
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [activeRole]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case "Customer":
        return "adm-role-customer";
      case "RestaurantOwner":
        return "adm-role-restaurant";
      case "DeliveryPerson":
        return "adm-role-delivery";
      case "Admin":
        return "adm-role-admin";
      default:
        return "";
    }
  };

  const roleDisplayName = (role: string) => {
    switch (role) {
      case "Customer":
        return "🛒 Customer";
      case "RestaurantOwner":
        return "🍳 Kitchen Owner";
      case "DeliveryPerson":
        return "🚴 Delivery Courier";
      case "Admin":
        return "🛡️ Administrator";
      default:
        return role;
    }
  };

  return (
    <div className="adm-users-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">User Management</h1>
          <p className="adm-page-subtitle">Directory of all registered accounts across customers, restaurant owners, couriers, and administrators.</p>
        </div>
        <button onClick={loadUsers} className="adm-btn-secondary">
          🔄 Refresh Directory
        </button>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="adm-filter-toolbar">
        <div className="adm-tabs">
          <button
            onClick={() => setActiveRole("all")}
            className={`adm-tab-btn ${activeRole === "all" ? "active" : ""}`}
          >
            All Users
          </button>
          <button
            onClick={() => setActiveRole("Customer")}
            className={`adm-tab-btn ${activeRole === "Customer" ? "active" : ""}`}
          >
            Customers
          </button>
          <button
            onClick={() => setActiveRole("RestaurantOwner")}
            className={`adm-tab-btn ${activeRole === "RestaurantOwner" ? "active" : ""}`}
          >
            Restaurant Owners
          </button>
          <button
            onClick={() => setActiveRole("DeliveryPerson")}
            className={`adm-tab-btn ${activeRole === "DeliveryPerson" ? "active" : ""}`}
          >
            Couriers
          </button>
          <button
            onClick={() => setActiveRole("Admin")}
            className={`adm-tab-btn ${activeRole === "Admin" ? "active" : ""}`}
          >
            Admins
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="adm-search-box">
          <span className="adm-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="adm-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                loadUsers();
              }}
              className="adm-search-clear"
            >
              ×
            </button>
          )}
        </form>
      </div>

      {/* USERS TABLE */}
      {loading ? (
        <div className="adm-loading-state">
          <div className="adm-spinner" />
          <p>Loading user directory...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="adm-card adm-empty-state">
          <span className="adm-empty-icon">👥</span>
          <h3>No users found</h3>
          <p>
            {searchQuery
              ? `No user records matching "${searchQuery}".`
              : "No users registered under this role."}
          </p>
        </div>
      ) : (
        <div className="adm-card">
          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="adm-user-cell">
                        <div className="adm-user-avatar">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="adm-table-cell-title">{u.fullName}</div>
                          <div className="adm-table-cell-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`adm-role-badge ${roleBadgeClass(u.role)}`}>
                        {roleDisplayName(u.role)}
                      </span>
                    </td>
                    <td>
                      <span className="adm-status-pill adm-status-active">
                        ● {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="adm-table-cell-sub">
                      {new Date(u.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="adm-btn-action-view"
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USER DETAILS MODAL */}
      {selectedUser && (
        <div className="adm-modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="adm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div className="adm-user-cell">
                <div className="adm-user-avatar large">
                  {selectedUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="adm-modal-title">{selectedUser.fullName}</h3>
                  <span className="adm-table-cell-sub">{selectedUser.email}</span>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="adm-modal-close">×</button>
            </div>

            <div className="adm-modal-body">
              <div className="adm-detail-grid">
                <div className="adm-detail-item">
                  <span className="adm-detail-label">Account Role</span>
                  <div>
                    <span className={`adm-role-badge ${roleBadgeClass(selectedUser.role)}`}>
                      {roleDisplayName(selectedUser.role)}
                    </span>
                  </div>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Account Status</span>
                  <div>
                    <span className="adm-status-pill adm-status-active">
                      ● {selectedUser.isActive ? "Active Account" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">User ID</span>
                  <span className="adm-detail-value" style={{ fontFamily: "monospace", fontSize: "12px" }}>
                    {selectedUser.id}
                  </span>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Registration Date</span>
                  <span className="adm-detail-value">
                    {new Date(selectedUser.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="adm-modal-footer">
              <button onClick={() => setSelectedUser(null)} className="adm-btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsersPage;

