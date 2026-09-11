import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  getDeliveryPersonProfile,
  updateDeliveryAvailability,
  updateDeliveryLocation,
} from "../../services/deliveryService";
import type { DeliveryPersonProfile } from "../../types/profile";

interface DeliveryLayoutProps {
  children: ReactNode;
  onAvailabilityChange?: (isAvailable: boolean) => void;
  onLocationUpdate?: (lat: number, lon: number) => void;
}

export function DeliveryLayout({
  children,
  onAvailabilityChange,
  onLocationUpdate,
}: DeliveryLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<DeliveryPersonProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const prof = await getDeliveryPersonProfile();
        if (isMounted && prof) {
          setProfile(prof);
        }
      } catch (err) {
        console.error("Failed to load delivery profile:", err);
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

  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      setTogglingAvailability(true);
      const newStatus = !profile.isAvailable;
      const res = await updateDeliveryAvailability(newStatus);
      setProfile((prev) => (prev ? { ...prev, isAvailable: res.isAvailable } : null));
      if (onAvailabilityChange) {
        onAvailabilityChange(res.isAvailable);
      }
    } catch (err: any) {
      console.error("Failed to toggle availability:", err);
      alert("Could not update availability. Please try again.");
    } finally {
      setTogglingAvailability(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        try {
          await updateDeliveryLocation(lat, lon);
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  location: { type: "Point", coordinates: [lon, lat] },
                }
              : null
          );
          if (onLocationUpdate) {
            onLocationUpdate(lat, lon);
          }
          alert(`GPS Updated: ${lat}°N, ${lon}°W`);
        } catch (err) {
          console.error("Failed to persist GPS location:", err);
          alert("Retrieved GPS but failed to update backend.");
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setDetectingLocation(false);
        alert(`Location detection failed: ${err.message}`);
      },
      { timeout: 10000 }
    );
  };

  const navLinks = [
    { label: "Dashboard", path: "/delivery/dashboard", icon: "🚴" },
    { label: "Requests", path: "/delivery/requests", icon: "⚡" },
    { label: "Rider Profile", path: "/delivery/profile", icon: "👤" },
    { label: "Vehicle Setup", path: "/delivery/profile-setup", icon: "⚙️" },
  ];

  const lat = profile?.location?.coordinates?.[1];
  const lng = profile?.location?.coordinates?.[0];

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
          <Link to="/delivery/dashboard" className="rst-brand">
            <img src="/savebite-logo.png" alt="SaveBite Logo" className="rst-brand-logo" />
            <span className="rst-brand-title">SaveBite</span>
          </Link>
          <span className="del-portal-pill">Delivery Partner</span>

          {profile && (
            <div className="del-header-status-wrap">
              {/* Online/Offline Pill */}
              <button
                type="button"
                className={`del-status-pill ${profile.isAvailable ? "online" : "offline"}`}
                onClick={handleToggleAvailability}
                disabled={togglingAvailability}
                title="Click to toggle availability"
              >
                <span className="del-status-dot" />
                <span>
                  {togglingAvailability
                    ? "Updating..."
                    : profile.isAvailable
                    ? "Online & Ready"
                    : "Offline"}
                </span>
              </button>

              {/* Location Pill */}
              {lat !== undefined && lng !== undefined && (
                <div className="cst-location-pill" title="Registered driver GPS base">
                  <span>
                    📍 {lat.toFixed(4)}, {lng.toFixed(4)}
                  </span>
                  <button
                    type="button"
                    className="cst-gps-btn"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    title="Detect and update GPS"
                  >
                    {detectingLocation ? "..." : "Detect GPS"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rst-header-right">
          <div className="rst-user-info">
            <span className="rst-user-greeting">
              Hi, <strong>{user?.fullName?.split(" ")[0]}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rst-signout-btn"
            title="Sign Out"
          >
            Sign Out
          </button>
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
            <div className="rst-sidebar-subtitle">Driver Navigation</div>
            <nav className="rst-nav">
              {navLinks.map((item) => {
                const isActive = location.pathname === item.path;
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

          {/* DRIVER VEHICLE WIDGET */}
          {profile && (
            <div className="del-sidebar-vehicle-widget">
              <div className="del-widget-header">
                <span className="rst-field-label">ASSIGNED VEHICLE</span>
                <Link to="/delivery/profile-setup" className="cst-pref-edit-link">
                  Edit
                </Link>
              </div>
              <div className="del-vehicle-details">
                <div className="del-vehicle-row">
                  <span className="del-vehicle-icon">🛵</span>
                  <div>
                    <strong className="del-vehicle-name">{profile.vehicleType}</strong>
                    <span className="del-vehicle-plate">{profile.vehicleNumber}</span>
                  </div>
                </div>
                <div className="del-vehicle-sub">
                  <span>Phone: {profile.phoneNumber}</span>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER IMPACT WIDGET */}
          <div className="rst-sidebar-footer">
            <div className="rst-approval-widget">
              <span className="rst-approval-label">Eco-Impact</span>
              <span className="del-impact-badge">🌱 Eco-Courier</span>
            </div>
            <p className="rst-sidebar-note">
              Delivering surplus meals prevents food waste and cuts neighborhood emissions.
            </p>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="rst-main">{children}</main>
      </div>
    </div>
  );
}

export default DeliveryLayout;
