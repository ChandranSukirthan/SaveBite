import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  getDeliveryPersonProfile,
  updateDeliveryAvailability,
} from "../../services/profileService";
import type { DeliveryPersonProfile } from "../../types/profile";

export function DeliveryDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DeliveryPersonProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getDeliveryPersonProfile();
        setProfile(data);
      } catch (err) {
        console.error("Failed to load delivery profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      setToggling(true);
      setStatusMsg("");
      const newStatus = !profile.isAvailable;
      const res = await updateDeliveryAvailability(newStatus);
      setProfile((prev) => (prev ? { ...prev, isAvailable: res.isAvailable } : null));
      setStatusMsg(res.message);
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (err: any) {
      console.error("Availability toggle failed:", err);
      setStatusMsg("Failed to update availability status.");
    } finally {
      setToggling(false);
    }
  };

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
          <span style={{ background: "var(--yellow, #f5c518)", color: "var(--black, #0f0f0f)", fontSize: "11px", fontWeight: 800, padding: "2px 8px", borderRadius: "12px", marginLeft: "6px" }}>Delivery Partner</span>
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
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--black, #0f0f0f)", marginBottom: "4px" }}>Rider Control Panel</h2>
              <p style={{ color: "var(--grey-600, #555555)" }}>Milestone 5 complete: Driver vehicle & status registered in MongoDB.</p>
            </div>
            <button
              onClick={() => navigate("/delivery/profile-setup")}
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
              Update Vehicle
            </button>
          </div>

          {statusMsg && (
            <div style={{ background: "#ecfdf5", border: "1.5px solid #10b981", color: "#065f46", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }}>
              {statusMsg}
            </div>
          )}

          {loading ? (
            <p style={{ color: "var(--grey-600, #555555)" }}>Loading rider profile...</p>
          ) : profile ? (
            <div>
              {/* Availability Banner */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: profile.isAvailable ? "#ecfdf5" : "#fef2f2",
                  border: `2px solid ${profile.isAvailable ? "#10b981" : "#ef4444"}`,
                  borderRadius: "14px",
                  padding: "20px 24px",
                  marginBottom: "24px",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: profile.isAvailable ? "#065f46" : "#991b1b", marginBottom: "4px" }}>
                    {profile.isAvailable ? "🟢 You are Online & Available" : "🔴 You are Offline"}
                  </h3>
                  <p style={{ fontSize: "13px", color: profile.isAvailable ? "#047857" : "#b91c1c" }}>
                    {profile.isAvailable
                      ? "Autonomous AI dispatch agent can route nearby surplus food orders to you."
                      : "Switch online whenever you are ready to accept delivery runs."}
                  </p>
                </div>
                <button
                  onClick={handleToggleAvailability}
                  disabled={toggling}
                  style={{
                    background: profile.isAvailable ? "var(--black, #0f0f0f)" : "var(--yellow, #f5c518)",
                    color: profile.isAvailable ? "white" : "var(--black, #0f0f0f)",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "10px",
                    fontWeight: 800,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  {toggling
                    ? "Updating..."
                    : profile.isAvailable
                    ? "Go Offline"
                    : "Go Online"}
                </button>
              </div>

              {/* Rider Details Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                <div style={{ background: "var(--yellow-light, #fef9e7)", border: "1.5px solid var(--yellow, #f5c518)", borderRadius: "12px", padding: "20px" }}>
                  <h4 style={{ color: "var(--yellow-dark, #d4a900)", fontWeight: 800, marginBottom: "12px" }}>Vehicle Information</h4>
                  <p style={{ margin: "6px 0", fontSize: "14px" }}><strong>Vehicle Type:</strong> {profile.vehicleType}</p>
                  <p style={{ margin: "6px 0", fontSize: "14px" }}><strong>Registration / ID:</strong> {profile.vehicleNumber}</p>
                  <p style={{ margin: "6px 0", fontSize: "14px" }}><strong>Contact Phone:</strong> {profile.phoneNumber}</p>
                </div>

                <div style={{ background: "var(--grey-100, #f4f4f4)", border: "1.5px solid var(--grey-200, #e0e0e0)", borderRadius: "12px", padding: "20px" }}>
                  <h4 style={{ color: "var(--black, #0f0f0f)", fontWeight: 800, marginBottom: "12px" }}>GPS Dispatch Base</h4>
                  <p style={{ margin: "6px 0", fontSize: "14px" }}>
                    <strong>Latitude:</strong> {profile.location?.coordinates?.[1]}
                  </p>
                  <p style={{ margin: "6px 0", fontSize: "14px" }}>
                    <strong>Longitude:</strong> {profile.location?.coordinates?.[0]}
                  </p>
                  <p style={{ margin: "12px 0 0 0", fontSize: "12px", color: "var(--grey-600, #555555)" }}>
                    Used by the delivery agent to calculate ETA and distance from surplus food pick-up locations.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: "#fef2f2", padding: "16px", borderRadius: "10px", marginBottom: "20px", color: "#b91c1c" }}>
              No driver profile found. Click "Update Vehicle" to configure your vehicle and starting location.
            </div>
          )}

          <div style={{ background: "var(--grey-100, #f4f4f4)", borderRadius: "12px", padding: "20px", border: "1px solid var(--grey-200, #e0e0e0)" }}>
            <h4 style={{ color: "var(--black, #0f0f0f)", fontWeight: 700, marginBottom: "6px" }}>Next Up: Milestone 14, 15 & 16</h4>
            <p style={{ fontSize: "14px", color: "var(--grey-600, #555555)" }}>
              Incoming AI delivery requests, Accept/Reject actions, and order status lifecycle stepper (Assigned → Accepted → Picked Up → In Transit → Delivered).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DeliveryDashboard;
