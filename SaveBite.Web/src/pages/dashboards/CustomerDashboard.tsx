import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getCustomerProfile } from "../../services/profileService";
import type { CustomerProfile } from "../../types/profile";

export function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getCustomerProfile();
        setProfile(data);
      } catch (err) {
        console.error("Failed to load customer profile:", err);
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
          <span style={{ background: "var(--yellow, #f5c518)", color: "var(--black, #0f0f0f)", fontSize: "11px", fontWeight: 800, padding: "2px 8px", borderRadius: "12px", marginLeft: "6px" }}>Customer Portal</span>
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
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--black, #0f0f0f)", marginBottom: "4px" }}>Customer Dashboard</h2>
              <p style={{ color: "var(--grey-600, #555555)" }}>Milestone 5 complete: Profile information registered in MongoDB.</p>
            </div>
            <button
              onClick={() => navigate("/customer/profile-setup")}
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
              Update Profile
            </button>
          </div>

          {loading ? (
            <p style={{ color: "var(--grey-600, #555555)" }}>Loading profile...</p>
          ) : profile ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div style={{ background: "var(--yellow-light, #fef9e7)", border: "1.5px solid var(--yellow, #f5c518)", borderRadius: "12px", padding: "20px" }}>
                <h4 style={{ color: "var(--yellow-dark, #d4a900)", fontWeight: 800, marginBottom: "12px" }}>Delivery & Location</h4>
                <p style={{ margin: "6px 0", fontSize: "14px" }}><strong>Phone:</strong> {profile.phoneNumber}</p>
                <p style={{ margin: "6px 0", fontSize: "14px" }}><strong>Address:</strong> {profile.address}</p>
                <p style={{ margin: "6px 0", fontSize: "14px" }}>
                  <strong>GPS:</strong> {profile.location?.coordinates?.[1]?.toFixed(4)}°N, {profile.location?.coordinates?.[0]?.toFixed(4)}°W
                </p>
              </div>

              <div style={{ background: "var(--grey-100, #f4f4f4)", border: "1.5px solid var(--grey-200, #e0e0e0)", borderRadius: "12px", padding: "20px" }}>
                <h4 style={{ color: "var(--black, #0f0f0f)", fontWeight: 800, marginBottom: "12px" }}>Preferences</h4>
                <p style={{ margin: "6px 0", fontSize: "14px" }}><strong>Max Budget:</strong> ${profile.maximumBudget?.toFixed(2)}</p>
                <p style={{ margin: "6px 0", fontSize: "14px" }}><strong>Preferred Categories:</strong></p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                  {profile.preferredCategories?.map((c) => (
                    <span key={c} style={{ background: "white", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, border: "1px solid var(--grey-200, #e0e0e0)" }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: "#fef2f2", padding: "16px", borderRadius: "10px", marginBottom: "20px", color: "#b91c1c" }}>
              No customer profile found. Click "Update Profile" to create one.
            </div>
          )}

          <div style={{ background: "var(--grey-100, #f4f4f4)", borderRadius: "12px", padding: "20px", border: "1px solid var(--grey-200, #e0e0e0)" }}>
            <h4 style={{ color: "var(--black, #0f0f0f)", fontWeight: 700, marginBottom: "6px" }}>Next Up: Milestone 9 & 10</h4>
            <p style={{ fontSize: "14px", color: "var(--grey-600, #555555)" }}>
              Customer surplus food discovery, search filters by category & distance, and active order panel.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CustomerDashboard;
