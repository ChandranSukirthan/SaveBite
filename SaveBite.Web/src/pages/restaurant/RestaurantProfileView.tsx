import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RestaurantLayout } from "../../components/layout/RestaurantLayout";
import { getRestaurantProfile } from "../../services/profileService";
import type { RestaurantProfile } from "../../types/profile";

export function RestaurantProfileView() {
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getRestaurantProfile();
        setProfile(data);
      } catch (err) {
        console.error("Failed to load restaurant profile:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <RestaurantLayout>
      <div className="rst-dashboard">
        <div className="rst-page-header">
          <div>
            <h1 className="rst-page-title">Kitchen & Business Profile</h1>
            <p className="rst-page-subtitle">
              Verify your physical kitchen address, geo-coordinates, and operational status.
            </p>
          </div>
          <div className="rst-page-actions">
            <Link to="/restaurant/profile-setup" className="rst-btn-solid">
              ✏️ Edit Profile
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="rst-empty-text">Loading profile details...</p>
        ) : profile ? (
          <div className="rst-two-col">
            {/* CORE KITCHEN DETAILS */}
            <div className="rst-card">
              <div className="rst-card-header">
                <h3>Business Identification</h3>
                <span
                  style={{
                    background: profile.isApproved ? "#dcfce7" : "#fef3c7",
                    color: profile.isApproved ? "#166534" : "#92400e",
                    fontSize: "12px",
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: "20px",
                    border: `1px solid ${profile.isApproved ? "#bbf7d0" : "#fde68a"}`,
                  }}
                >
                  {profile.isApproved ? "Approved ✓" : "Pending Verification ⏳"}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
                <div>
                  <span className="rst-field-label">RESTAURANT NAME</span>
                  <p className="rst-field-val" style={{ fontSize: "18px", fontWeight: 800 }}>
                    {profile.restaurantName}
                  </p>
                </div>

                <div>
                  <span className="rst-field-label">CONTACT PHONE NUMBER</span>
                  <p className="rst-field-val">{profile.phoneNumber}</p>
                </div>

                <div>
                  <span className="rst-field-label">PHYSICAL ADDRESS</span>
                  <p className="rst-field-val">{profile.address}</p>
                </div>

                <div>
                  <span className="rst-field-label">DESCRIPTION</span>
                  <p className="rst-field-val" style={{ color: "var(--grey-600)" }}>
                    {profile.description || "No description provided."}
                  </p>
                </div>
              </div>
            </div>

            {/* LOCATION & DISPATCH METRICS */}
            <div className="rst-card">
              <div className="rst-card-header">
                <h3>Dispatch & Location</h3>
                <span className="rst-badge">MongoDB GeoJSON</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
                <div>
                  <span className="rst-field-label">LATITUDE</span>
                  <p className="rst-field-val">{profile.location?.coordinates?.[1]}</p>
                </div>

                <div>
                  <span className="rst-field-label">LONGITUDE</span>
                  <p className="rst-field-val">{profile.location?.coordinates?.[0]}</p>
                </div>

                <div>
                  <span className="rst-field-label">GEO-INDEX STATUS</span>
                  <p className="rst-field-val" style={{ color: "#166534", fontWeight: 700 }}>
                    ✓ 2dsphere Spatial Index Active
                  </p>
                </div>

                <div style={{ background: "var(--grey-100)", padding: "16px", borderRadius: "10px", marginTop: "8px" }}>
                  <p style={{ fontSize: "13px", color: "var(--grey-600)", margin: 0 }}>
                    📍 These coordinates define the central pick-up point used by the autonomous LangGraph delivery agent when calculating distance and matching available couriers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rst-card">
            <p className="rst-empty-text">No restaurant profile registered yet.</p>
            <Link to="/restaurant/profile-setup" className="rst-btn-solid" style={{ marginTop: "12px", display: "inline-block" }}>
              Complete Kitchen Setup
            </Link>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}

export default RestaurantProfileView;
