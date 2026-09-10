import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getCustomerProfile } from "../../services/profileService";
import { getNotifications } from "../../services/restaurantService";
import type { CustomerProfile } from "../../types/profile";

interface CustomerLayoutProps {
  children: React.ReactNode;
  onLocationUpdate?: (lat: number, lon: number) => void;
}

export function CustomerLayout({ children, onLocationUpdate }: CustomerLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [prof, notifs] = await Promise.all([
          getCustomerProfile().catch(() => null),
          getNotifications(20).catch(() => []),
        ]);
        if (prof) setProfile(prof);
        const unread = notifs.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Failed to load customer layout data:", err);
      }
    }
    loadData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingLocation(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        if (onLocationUpdate) {
          onLocationUpdate(lat, lon);
        }
        alert(`Location detected: ${lat}°N, ${lon}°W`);
      },
      (err) => {
        setDetectingLocation(false);
        alert("Failed to retrieve GPS location: " + err.message);
      }
    );
  };

  const navLinks = [
    { label: "Dashboard", path: "/customer/dashboard", icon: "🏠" },
    { label: "Explore Food", path: "/customer/food", icon: "🍲" },
    { label: "My Orders", path: "/customer/dashboard#orders", icon: "📦" },
    { label: "Preferences", path: "/customer/profile-setup", icon: "⚙️" },
  ];

  return (
    <div className="cst-layout">
      {/* TOP HEADER */}
      <header className="cst-header">
        <div className="cst-header-left">
          <button
            type="button"
            className="rst-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <Link to="/customer/dashboard" className="rst-brand">
            <img src="/savebite-logo.png" alt="SaveBite Logo" className="rst-brand-logo" />
            <span className="rst-brand-title">SaveBite</span>
          </Link>
          <span className="cst-portal-pill">Customer</span>

          {profile && (
            <div className="cst-location-pill" title="Current delivery address">
              <span>📍 {profile.address || "New York, NY"}</span>
              <button
                type="button"
                className="cst-gps-btn"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                title="Detect GPS location"
              >
                {detectingLocation ? "..." : "Detect GPS"}
              </button>
            </div>
          )}
        </div>

        <div className="cst-header-right">
          <button
            type="button"
            className="rst-notif-btn"
            title="Notifications"
            onClick={() => {
              const el = document.getElementById("customer-notifications-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            🔔
            {unreadCount > 0 && <span className="rst-notif-count">{unreadCount}</span>}
          </button>

          <div className="rst-user-info">
            <span className="rst-user-greeting">Hi, {user?.fullName?.split(" ")[0]}</span>
            <button
              type="button"
              className="rst-signout-btn"
              onClick={handleLogout}
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="rst-body">
        {/* MOBILE BACKDROP */}
        {mobileOpen && (
          <div
            className="rst-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* SIDEBAR */}
        <aside className={`rst-sidebar ${mobileOpen ? "rst-sidebar--open" : ""}`}>
          <div className="rst-sidebar-section">
            <div className="rst-sidebar-subtitle">Navigation</div>
            <nav className="rst-nav">
              {navLinks.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path.includes("#") && location.hash === item.path.split("#")[1]);
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={`rst-nav-link ${isActive ? "rst-nav-link--active" : ""}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="rst-nav-icon">{item.icon}</span>
                    <span className="rst-nav-label">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* PREFERENCES WIDGET */}
          {profile && (
            <div className="cst-sidebar-pref-widget">
              <div className="cst-pref-header">
                <span className="rst-field-label">SAVED PREFERENCES</span>
                <Link to="/customer/profile-setup" className="cst-pref-edit-link">
                  Edit
                </Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "var(--grey-600)" }}>Max Meal Budget:</span>
                  <strong>${profile.maximumBudget?.toFixed(2) || "25.00"}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--grey-600)", display: "block", marginBottom: "4px" }}>
                    Preferred Categories:
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {profile.preferredCategories?.slice(0, 4).map((cat) => (
                      <span key={cat} className="cst-pref-tag">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rst-sidebar-footer">
            <div className="rst-approval-widget">
              <span className="rst-approval-label">Eco-Impact</span>
              <span className="cst-impact-badge">🌱 Meal Rescuer</span>
            </div>
            <p className="rst-sidebar-note">
              Every surplus meal saved prevents ~2.5 kg of CO₂ emission.
            </p>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="cst-main">{children}</main>
      </div>
    </div>
  );
}

export default CustomerLayout;

