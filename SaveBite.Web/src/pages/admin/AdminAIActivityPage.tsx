import { useEffect, useState } from "react";
import {
  getAdminAIActivity,
  retryAIOptimization,
  type AdminAIActivity,
} from "../../services/adminService";

export function AdminAIActivityPage() {
  const [activities, setActivities] = useState<AdminAIActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function loadActivity() {
    try {
      setLoading(true);
      const data = await getAdminAIActivity();
      setActivities(data);
    } catch (err) {
      console.error("Failed to load AI activity", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
  }, []);

  const handleRetryOptimization = async (deliveryRequestId: string) => {
    try {
      setOptimizingId(deliveryRequestId);
      await retryAIOptimization(deliveryRequestId);
      setMessage({
        text: `✓ Autonomous AI Agent re-dispatched for delivery #${deliveryRequestId.slice(-6)}.`,
        type: "success",
      });
      await loadActivity();
    } catch (err) {
      setMessage({
        text: "Failed to trigger AI optimization retry.",
        type: "error",
      });
    } finally {
      setOptimizingId(null);
    }
  };

  const searchingCount = activities.filter((a) => a.status === "Searching").length;
  const assignedCount = activities.filter((a) => a.status === "Assigned" || a.status === "Accepted").length;
  const inTransitCount = activities.filter((a) => a.status === "PickedUp" || a.status === "InTransit").length;

  return (
    <div className="adm-ai-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">LangGraph AI Activity & Telemetry</h1>
          <p className="adm-page-subtitle">
            Inspect autonomous delivery agent decisions, multi-criteria candidate rankings, dispatch rationales, and self-healing retries.
          </p>
        </div>
        <button onClick={loadActivity} className="adm-btn-secondary">
          🔄 Refresh Telemetry
        </button>
      </div>

      {message && (
        <div className={`adm-alert-banner ${message.type === "success" ? "adm-alert-success" : "adm-alert-error"}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="adm-alert-close">×</button>
        </div>
      )}

      {/* AI SYSTEM HEALTH METRICS */}
      <div className="adm-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="adm-kpi-card adm-kpi-card-ai">
          <div className="adm-kpi-header">
            <span className="adm-kpi-icon">🧠</span>
            <span className="adm-kpi-label">LangGraph Agent</span>
          </div>
          <div className="adm-kpi-value">Autonomous</div>
          <div className="adm-kpi-subtext">Delivery coordination graph online</div>
        </div>

        <div className="adm-kpi-card">
          <div className="adm-kpi-header">
            <span className="adm-kpi-icon">🎯</span>
            <span className="adm-kpi-label">Candidate Matching</span>
          </div>
          <div className="adm-kpi-value">{assignedCount + inTransitCount} Dispatches</div>
          <div className="adm-kpi-subtext">Active assignments verified</div>
        </div>

        <div className="adm-kpi-card">
          <div className="adm-kpi-header">
            <span className="adm-kpi-icon">🔎</span>
            <span className="adm-kpi-label">Autonomous Scanning</span>
          </div>
          <div className="adm-kpi-value">{searchingCount} Searching</div>
          <div className="adm-kpi-subtext">Nearby couriers being evaluated</div>
        </div>

        <div className="adm-kpi-card">
          <div className="adm-kpi-header">
            <span className="adm-kpi-icon">⚡</span>
            <span className="adm-kpi-label">Self-Healing</span>
          </div>
          <div className="adm-kpi-value">Active</div>
          <div className="adm-kpi-subtext">Automated rejection recovery enabled</div>
        </div>
      </div>

      {/* AI DISPATCH LOG TABLE */}
      {loading ? (
        <div className="adm-loading-state">
          <div className="adm-spinner" />
          <p>Analyzing LangGraph decision logs and telemetry...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="adm-card adm-empty-state">
          <span className="adm-empty-icon">🤖</span>
          <h3>No AI activity records yet</h3>
          <p>As orders reach "ReadyForPickup", autonomous courier matching decisions will populate here.</p>
        </div>
      ) : (
        <div className="adm-card">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Autonomous Decision Log</h3>
            <span className="adm-counter-badge">{activities.length} Recorded Cycles</span>
          </div>

          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Delivery</th>
                  <th>Origin Kitchen</th>
                  <th>Decision Rationale</th>
                  <th>Selected Partner</th>
                  <th>AI Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="adm-id-code" title={a.id}>#{a.id.slice(-6)}</span>
                      <div className="adm-table-cell-sub">{a.distanceInKilometers.toFixed(1)} km</div>
                    </td>
                    <td>
                      <div className="adm-table-cell-title">{a.restaurantName}</div>
                    </td>
                    <td style={{ maxWidth: "300px" }}>
                      <div className="adm-ai-rationale">{a.decisionRationale}</div>
                    </td>
                    <td>
                      <div className="adm-font-bold">{a.selectedCourier}</div>
                      <div className="adm-table-cell-sub">Vehicle: {a.vehicleType}</div>
                    </td>
                    <td>
                      <div className="adm-score-bar-container">
                        <div
                          className="adm-score-bar-fill"
                          style={{ width: `${Math.min(100, Math.max(20, a.candidateScore))}%` }}
                        />
                      </div>
                      <span className="adm-score-text">{a.candidateScore}% Suitability</span>
                    </td>
                    <td>
                      <span className={`adm-status-pill adm-status-${a.status.toLowerCase()}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      {a.status === "Searching" ? (
                        <button
                          onClick={() => handleRetryOptimization(a.id)}
                          disabled={optimizingId === a.id}
                          className="adm-btn-action-retry"
                          title="Re-trigger autonomous dispatch"
                        >
                          {optimizingId === a.id ? "Optimizing..." : "⚡ Re-Optimize"}
                        </button>
                      ) : (
                        <span className="adm-table-cell-sub">Coordinated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAIActivityPage;

