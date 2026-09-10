import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getRestaurantProfile } from "../../services/profileService";
import { getNotifications } from "../../services/restaurantService";
import type { RestaurantProfile } from "../../types/profile";

interface RestaurantLayoutProps {
  children: ReactNode;
}

export function RestaurantLayout({ children }: RestaurantLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [prof, notifs] = await Promise.all([
          getRestaurantProfile(),
          getNotifications(20),
        ]);
        if (isMounted) {
          setProfile(prof);
          const unread = notifs.filter((n) => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error("Failed to load restaurant layout data:", err);
      }
    }
    loadData();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinks = [
    { label: "Dashboard", path: "/restaurant/dashboard", icon: "📊" },
    { label: "Kitchen Profile", path: "/restaurant/profile", icon: "🍳" },
    { label: "Notifications", path: "/restaurant/notifications", icon: "🔔", badge: unreadCount > 0 ? unreadCount : undefined },
    { label: "Surplus Food", path: "/restaurant/food", icon: "🍲" },
    { label: "Orders", path: "/restaurant/orders", icon: "📦" },
  ];

  return (
    <div className="rst-layout">
      {/* TOP HEADER */}
      <header className="rst-header">
        <div className="rst-header-left">
          <button
            type="button"
            className="rst-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <Link to="/restaurant/dashboard" className="rst-brand">
            <img src="/savebite-logo.png" alt="SaveBite Logo" className="rst-brand-logo" />
            <span className="rst-brand-title">SaveBite</span>
          </Link>
          <span className="rst-portal-pill">Restaurant Owner</span>
          {profile && (
            <span className="rst-kitchen-name-pill">
              🍳 {profile.restaurantName}
            </span>
          )}
        </div>

        <div className="rst-header-right">
          <Link
            to="/restaurant/notifications"
            className="rst-notif-btn"
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && <span className="rst-notif-count">{unreadCount}</span>}
          </Link>

          <div className="rst-user-info">
            <span className="rst-user-greeting">
              Welcome, <strong>{user?.fullName}</strong>
            </span>
          </div>

          <button onClick={handleLogout} className="rst-signout-btn">
            Sign Out
          </button>
        </div>
      </header>

      {/* BODY (SIDEBAR + MAIN CONTENT) */}
      <div className="rst-body">
        {/* SIDEBAR NAVIGATION */}
        <aside className={`rst-sidebar ${mobileOpen ? "rst-sidebar--open" : ""}`}>
          <div className="rst-sidebar-section">
            <p className="rst-sidebar-subtitle">KITCHEN MANAGEMENT</p>
            <nav className="rst-nav">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`rst-nav-link ${isActive ? "rst-nav-link--active" : ""}`}
                  >
                    <span className="rst-nav-icon">{link.icon}</span>
                    <span className="rst-nav-label">{link.label}</span>
                    {link.badge !== undefined && (
                      <span className="rst-nav-badge">{link.badge}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* SIDEBAR STATUS FOOTER */}
          <div className="rst-sidebar-footer">
            <div className="rst-approval-widget">
              <span className="rst-approval-label">STATUS</span>
              {profile?.isApproved ? (
                <span className="rst-approval-badge rst-approval-badge--approved">
                  ✓ Verified & Approved
                </span>
              ) : (
                <span className="rst-approval-badge rst-approval-badge--pending">
                  ⏳ Awaiting Approval
                </span>
              )}
            </div>
            <p className="rst-sidebar-note">SaveBite v1.0 • Surplus Network</p>
          </div>
        </aside>

        {/* OVERLAY FOR MOBILE */}
        {mobileOpen && (
          <div
            className="rst-backdrop"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* CONTENT AREA */}
        <main className="rst-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export default RestaurantLayout;
