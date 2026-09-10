import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getRestaurantProfile } from "../../services/profileService";
import type { RestaurantProfile } from "../../types/profile";

export function RestaurantDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getRestaurantProfile();
        setProfile(data);
      } catch (err) {
        console.error("Failed to load restaurant profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--grey-100, #f4f4f4)", fontFamily: "var(--font-family, sans-serif)" }}>
      <header style={{ background: "var(--black, #0f0f0f)", color: "white", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid var(--yellow, #f5c518)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "24px" }}>🌱</span>
          <span style={{ fontSize: "20px", fontWeight: 800, color: "white" }}>SaveBite</span>
          <span style={{ background: "var(--yellow, #f5c518)", color: "var(--black, #0f0f0f)", fontSize: "11px", fontWeight: 800, padding: "2px 8px", borderRadius: "12px", marginLeft: "6px" }}>Restaurant Owner</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "14px", color: "var(--grey-400, #888888)" }}>Welcome, <strong style={{ color: "white" }}>{user?.fullName}</strong></span>
          <button onClick={handleLogout} style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,0.3)", color: "white", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 24px" }}>
        <div style={{ background: "white", borderRadius: "16px", padding: "32px", border: "1.5px solid var(--grey-200, #e0e0e0)", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--black, #0f0f0f)", marginBottom: "4px" }}>Restaurant Portal</h2>
              <p style={{ color: "var(--grey-600, #555555)" }}>Milestone 5 complete: Kitchen & business profile registered in MongoDB.</p>
            </div>
            <button
              onClick={() => navigate("/restaurant/profile-setup")}
              style={{
                background: "var(--yellow-light, #fef9e7)",
                border: "1.5px solid var(--yellow, #f5c518)",
                color: "var(--black, #0f0f0f)",
                fontWeight: 700,
                fontSize: "13px",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Update Kitchen
            </button>
          </div>

          {loading ? (
            <p style={{ color: "var(--grey-600, #555555)" }}>Loading kitchen profile...</p>
          ) : profile ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div style={{ background: "var(--yellow-light, #fef9e7)", border: "1.5px solid var(--yellow, #f5c518)", borderRadius: "12px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 900, color: "var(--black, #0f0f0f)" }}>{profile.restaurantName}</h3>
                  <span
                    style={{
                      background: profile.isApproved ? "#dcfce7" : "#fef3c7",
                      color: profile.isApproved ? "#166534" : "#92400e",
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "3px 10px",
                      borderRadius: "12px",
                      border: `1px solid ${profile.isApproved ? "#bbf7d0" : "#fde68a"}`,
                    }}
                  >
                    {profile.isApproved ? "Approved ✓" : "Pending Approval ⏳"}
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--grey-600, #555555)", marginBottom: "12px" }}>{profile.description || "No description provided."}</p>
                <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Phone:</strong> {profile.phoneNumber}</p>
                <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Address:</strong> {profile.address}</p>
              </div>

              <div style={{ background: "var(--grey-100, #f4f4f4)", border: "1.5px solid var(--grey-200, #e0e0e0)", borderRadius: "12px", padding: "20px" }}>
                <h4 style={{ color: "var(--black, #0f0f0f)", fontWeight: 800, marginBottom: "12px" }}>Kitchen Coordinates</h4>
                <p style={{ margin: "4px 0", fontSize: "14px" }}>
                  <strong>Latitude:</strong> {profile.location?.coordinates?.[1]}
                </p>
                <p style={{ margin: "4px 0", fontSize: "14px" }}>
                  <strong>Longitude:</strong> {profile.location?.coordinates?.[0]}
                </p>
                <p style={{ margin: "12px 0 0 0", fontSize: "12px", color: "var(--grey-600, #555555)" }}>
                  These coordinates will be used by our LangGraph delivery dispatch agent to match nearby drivers.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ background: "#fef2f2", padding: "16px", borderRadius: "10px", marginBottom: "20px", color: "#b91c1c" }}>
              No restaurant profile found. Click "Update Kitchen" to register your details.
            </div>
          )}

          <div style={{ background: "var(--grey-100, #f4f4f4)", borderRadius: "12px", padding: "20px", border: "1px solid var(--grey-200, #e0e0e0)" }}>
            <h4 style={{ color: "var(--black, #0f0f0f)", fontWeight: 700, marginBottom: "6px" }}>Next Up: Milestone 6 & 7</h4>
            <p style={{ fontSize: "14px", color: "var(--grey-600, #555555)" }}>
              Full restaurant dashboard KPI cards, surplus food listing CRUD (create, edit, delete, quantity & discounted price), and order tracking.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default RestaurantDashboard;
