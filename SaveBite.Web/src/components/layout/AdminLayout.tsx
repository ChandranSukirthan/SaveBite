import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getPendingRestaurants } from "../../services/adminService";
import { NotificationBellDropdown } from "../notifications/NotificationBellDropdown";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadPendingCount() {
      try {
        const pending = await getPendingRestaurants();
        if (isMounted) {
          setPendingCount(pending.length);
        }
      } catch (err) {
        // Silently handle
      }
    }
    loadPendingCount();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const navLinks = [
    { label: "Dashboard", path: "/admin/dashboard", icon: "📊" },
    {
      label: "Restaurants",
      path: "/admin/restaurants",
      icon: "🏪",
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { label: "Users", path: "/admin/users", icon: "👥" },
    { label: "Orders", path: "/admin/orders", icon: "📦" },
    { label: "Deliveries", path: "/admin/deliveries", icon: "🛵" },
    { label: "AI Activity", path: "/admin/ai-activity", icon: "🧠" },
  ];

  return (
    <div className="adm-layout">
      {/* HEADER */}
      <header className="adm-header">
        <div className="adm-header-left">
          <button
            type="button"
            className="adm-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <Link to="/admin/dashboard" className="adm-brand">
            <span className="adm-brand-logo">🌱</span>
            <span className="adm-brand-title">SaveBite</span>
          </Link>
          <span className="adm-portal-badge">🛡️ Admin Portal</span>
          {pendingCount > 0 && (
            <Link to="/admin/restaurants?tab=pending" className="adm-header-alert-pill">
              ⚡ {pendingCount} Pending Approvals
            </Link>
          )}
        </div>

        <div className="adm-header-right">
          <NotificationBellDropdown role="Admin" />

          <div className="adm-user-info">
            <span className="adm-user-greeting">
              Administrator: <strong>{user?.fullName || "Admin"}</strong>
            </span>
          </div>

          <button onClick={handleLogout} className="adm-signout-btn">
            Sign Out
          </button>
        </div>
      </header>

      {/* BODY (SIDEBAR + MAIN CONTENT) */}
      <div className="adm-body">
        {/* SIDEBAR */}
        <aside className={`adm-sidebar ${mobileOpen ? "open" : ""}`}>
          <div className="adm-sidebar-section-title">PLATFORM CONTROL</div>
          <nav className="adm-nav">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`adm-nav-link ${isActive ? "active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="adm-nav-icon">{link.icon}</span>
                  <span className="adm-nav-label">{link.label}</span>
                  {link.badge !== undefined && (
                    <span className="adm-nav-badge">{link.badge}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="adm-sidebar-footer">
            <div className="adm-system-pill">
              <span className="adm-pulse-dot" />
              <span>Core System Online</span>
            </div>
          </div>
        </aside>

        {/* MOBILE OVERLAY */}
        {mobileOpen && (
          <div
            className="adm-overlay"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* MAIN VIEWPORT */}
        <main className="adm-main">
          {children}
        </main>
      </div>
    </div>
  );
}
export default AdminLayout;

