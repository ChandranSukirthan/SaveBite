import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function DeliveryDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--black, #0f0f0f)", marginBottom: "8px" }}>Delivery Partner Dashboard</h2>
          <p style={{ color: "var(--grey-600, #555555)", marginBottom: "24px" }}>Authentication verified successfully! You are logged in as DeliveryPerson.</p>

          <div style={{ background: "var(--yellow-light, #fef9e7)", border: "1.5px solid var(--yellow, #f5c518)", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
            <h4 style={{ color: "var(--yellow-dark, #d4a900)", fontWeight: 800, marginBottom: "8px" }}>Account Details</h4>
            <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>ID:</strong> {user?.id}</p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Full Name:</strong> {user?.fullName}</p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Email:</strong> {user?.email}</p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Role:</strong> {user?.role}</p>
          </div>

          <div style={{ background: "var(--grey-100, #f4f4f4)", borderRadius: "12px", padding: "20px", border: "1px solid var(--grey-200, #e0e0e0)" }}>
            <h4 style={{ color: "var(--black, #0f0f0f)", fontWeight: 700, marginBottom: "6px" }}>Milestone 4 Status</h4>
            <p style={{ fontSize: "14px", color: "var(--grey-600, #555555)" }}>Role-based authentication & route protection active. Milestone 5 (Driver Profile Setup) and Milestone 14 (Driver Dashboard) are prepared.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DeliveryDashboard;
