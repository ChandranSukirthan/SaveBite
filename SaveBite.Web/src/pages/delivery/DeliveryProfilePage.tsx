import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DeliveryLayout } from "../../components/layout/DeliveryLayout";
import { useAuth } from "../../hooks/useAuth";
import {
  getDeliveryPersonProfile,
  updateDeliveryLocation,
} from "../../services/deliveryService";
import type { DeliveryPersonProfile } from "../../types/profile";

export function DeliveryProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DeliveryPersonProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDeliveryPersonProfile();
      setProfile(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load delivery profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setDetectingGps(true);
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
          setSuccessMsg(`GPS dispatch base updated to ${lat}°N, ${lon}°W`);
          setTimeout(() => setSuccessMsg(null), 4000);
        } catch (err) {
          setError("Failed to update GPS dispatch location.");
        } finally {
          setDetectingGps(false);
        }
      },
      (err) => {
        setDetectingGps(false);
        alert(`Location detection failed: ${err.message}`);
      },
      { timeout: 10000 }
    );
  };

  const lat = profile?.location?.coordinates?.[1];
  const lng = profile?.location?.coordinates?.[0];

  return (
    <DeliveryLayout>
      <div className="rst-dashboard">
        {/* Header */}
        <div className="rst-page-header">
          <div>
            <span className="del-portal-pill">PROFILE & CREDENTIALS</span>
            <h1 className="rst-page-title">Driver Profile & Vehicle Specs</h1>
            <p className="rst-page-subtitle">
              Verified courier credentials, registered dispatch home base, and transport equipment.
            </p>
          </div>

          <div className="rst-page-actions">
            <Link to="/delivery/profile-setup" className="rst-btn-solid">
              ⚙️ Edit Vehicle & Settings
            </Link>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && <div className="cst-alert-success">{successMsg}</div>}
        {error && <div className="cst-alert-danger">⚠️ {error}</div>}

        {loading ? (
          <div className="fd-loading-card">
            <div className="spinner-border text-warning" role="status" />
            <p>Loading your rider credentials...</p>
          </div>
        ) : profile ? (
          <div className="rst-two-col">
            {/* Column 1: Rider Information */}
            <div className="rst-card">
              <div className="rst-card-header">
                <h3>Rider Account Information</h3>
                <span className="del-impact-badge">✓ Active Courier</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <span className="rst-field-label">Full Name</span>
                  <p className="rst-field-val">{user?.fullName || "SaveBite Courier"}</p>
                </div>

                <div>
                  <span className="rst-field-label">Email Address</span>
                  <p className="rst-field-val">{user?.email || "courier@savebite.com"}</p>
                </div>

                <div>
                  <span className="rst-field-label">Contact Phone</span>
                  <p className="rst-field-val">{profile.phoneNumber || "Not provided"}</p>
                </div>

                <div>
                  <span className="rst-field-label">Driver Status</span>
                  <p className="rst-field-val">
                    {profile.isAvailable ? (
                      <span className="del-status-badge-online">🟢 Online & Ready</span>
                    ) : (
                      <span className="del-status-badge-offline">🔴 Offline</span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="rst-field-label">Member Since</span>
                  <p className="rst-field-val">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Column 2: Vehicle Information */}
            <div className="rst-card">
              <div className="rst-card-header">
                <h3>Vehicle & Equipment</h3>
                <span className="rst-badge">{profile.vehicleType}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <span className="rst-field-label">Vehicle Type</span>
                  <p className="rst-field-val" style={{ fontSize: "16px", fontWeight: 800 }}>
                    🛵 {profile.vehicleType}
                  </p>
                </div>

                <div>
                  <span className="rst-field-label">Registration / Plate ID</span>
                  <p className="rst-field-val">
                    <span className="rst-code">{profile.vehicleNumber}</span>
                  </p>
                </div>

                <div>
                  <span className="rst-field-label">Eco-Impact Classification</span>
                  <p className="rst-field-val" style={{ color: "#15803d", fontWeight: 700 }}>
                    🌱 Zero-Emission Urban Food Courier
                  </p>
                </div>

                <div style={{ borderTop: "1px solid var(--grey-200)", paddingTop: "14px" }}>
                  <span className="rst-field-label">GPS Dispatch Coordinates</span>
                  <p className="rst-field-val">
                    {lat?.toFixed(6)}°N, {lng?.toFixed(6)}°W
                  </p>
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button
                      type="button"
                      className="rst-btn-outline"
                      onClick={handleUpdateGps}
                      disabled={detectingGps}
                    >
                      {detectingGps ? "Updating..." : "📍 Re-Calibrate GPS"}
                    </button>
                    {lat && lng && (
                      <a
                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rst-btn-outline"
                      >
                        Open on Maps ➔
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rst-empty-state">
            <span style={{ fontSize: "32px", marginBottom: "8px" }}>🛵</span>
            <p className="rst-empty-text">No delivery profile found.</p>
            <Link to="/delivery/profile-setup" className="rst-btn-solid" style={{ marginTop: "12px" }}>
              Complete Driver Setup
            </Link>
          </div>
        )}
      </div>
    </DeliveryLayout>
  );
}

export default DeliveryProfilePage;
