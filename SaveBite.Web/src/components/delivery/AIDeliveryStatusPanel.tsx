import React, { useState, useEffect } from "react";
import {
  optimizeDeliveryWithAI,
  retryDeliveryWithAI,
  getAIDeliveryTelemetry,
  type AIDeliveryCandidate,
  type AIDeliveryTelemetry,
} from "../../services/aiDeliveryService";

export interface AIDeliveryStatusPanelProps {
  deliveryRequestId?: string;
  orderId?: string;
  initialStatus?: string;
  compact?: boolean;
  autoTrigger?: boolean;
  onDriverAssigned?: (driver: AIDeliveryCandidate) => void;
}

type DispatchPhase = "searching" | "candidates" | "comparing" | "selected";

export const AIDeliveryStatusPanel: React.FC<AIDeliveryStatusPanelProps> = ({
  deliveryRequestId = "mock-req-001",
  orderId,
  initialStatus = "Searching",
  compact = false,
  autoTrigger = true,
  onDriverAssigned,
}) => {
  const [phase, setPhase] = useState<DispatchPhase>(
    initialStatus === "Assigned" ? "selected" : "searching"
  );
  const [telemetry, setTelemetry] = useState<AIDeliveryTelemetry | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showAllCandidates, setShowAllCandidates] = useState(true);

  const runDispatchCycle = async (retry = false, rejectedId?: string) => {
    setLoading(true);
    setPhase("searching");

    if (retry) {
      setIsRetrying(true);
    }

    try {
      // Step 1: Searching animation phase (simulate radar sweep)
      await new Promise((res) => setTimeout(res, 1200));

      const data = retry
        ? await retryDeliveryWithAI(deliveryRequestId, rejectedId)
        : await optimizeDeliveryWithAI(deliveryRequestId);

      setTelemetry(data);
      setPhase("candidates");

      // Step 2: Show candidates found for 1.4s
      await new Promise((res) => setTimeout(res, 1400));
      setPhase("comparing");

      // Step 3: Show AI comparison trade-offs for 1.2s
      await new Promise((res) => setTimeout(res, 1200));
      setPhase("selected");

      if (data.selectedDriver && onDriverAssigned) {
        onDriverAssigned(data.selectedDriver);
      }
    } catch (err) {
      console.error("AI Dispatch error:", err);
      // Even on error, establish candidate fallback
      const fallback = await getAIDeliveryTelemetry(deliveryRequestId);
      setTelemetry(fallback);
      setPhase("selected");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoTrigger) {
      runDispatchCycle();
    } else {
      getAIDeliveryTelemetry(deliveryRequestId).then((data) => {
        setTelemetry(data);
        setPhase(data.status === "Assigned" ? "selected" : "searching");
      });
    }
  }, [deliveryRequestId]);

  const handleSimulateRejection = () => {
    const rejectedId = telemetry?.selectedDriver?.id || "6aa3738fc44e97c5bcb8398d";
    runDispatchCycle(true, rejectedId);
  };

  const getVehicleIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes("bike") || lower.includes("bicycle")) return "🚴";
    if (lower.includes("scoot")) return "🛵";
    if (lower.includes("ev") || lower.includes("car")) return "🚗";
    return "⚡";
  };

  return (
    <div className={`aid-panel ${compact ? "aid-panel--compact" : ""}`}>
      {/* HEADER BAR */}
      <div className="aid-header">
        <div className="aid-header-left">
          <div className="aid-agent-badge">
            <span className="aid-pulse-dot" />
            <span>LangGraph Delivery Agent</span>
          </div>
          <span className="aid-request-id">
            Req #{deliveryRequestId.slice(-8)} {orderId ? `• Order #${orderId.slice(-8)}` : ""}
          </span>
        </div>

        <div className="aid-header-right">
          <button
            type="button"
            className="aid-btn-control"
            disabled={loading}
            onClick={() => runDispatchCycle(false)}
            title="Trigger real-time LangGraph dispatch optimization"
          >
            {loading ? "⚡ Optimizing..." : "⚡ Re-run AI Dispatch"}
          </button>
          <button
            type="button"
            className="aid-btn-control aid-btn-control--danger"
            disabled={loading}
            onClick={handleSimulateRejection}
            title="Simulate courier rejection and verify autonomous AI recovery"
          >
            ↺ Simulate Rejection & Recovery
          </button>
        </div>
      </div>

      {/* REJECTION RECOVERY BANNER */}
      {isRetrying && (
        <div className="aid-alert-retry">
          <div className="aid-alert-retry-icon">⚠️</div>
          <div className="aid-alert-retry-text">
            <strong>Autonomous AI Rejection Recovery Active</strong>
            <p>
              Previous courier declined the dispatch request. The LangGraph agent excluded that driver and is
              re-routing to the next optimal candidate in the live pool.
            </p>
          </div>
        </div>
      )}

      {/* PHASE 1: DRIVER SEARCH ANIMATION */}
      {phase === "searching" && (
        <div className="aid-phase-box aid-fade-in">
          <div className="aid-radar-wrap">
            <div className="aid-radar-ring aid-radar-ring--1" />
            <div className="aid-radar-ring aid-radar-ring--2" />
            <div className="aid-radar-ring aid-radar-ring--3" />
            <div className="aid-radar-sweep" />
            <div className="aid-radar-center">🤖</div>
          </div>

          <div className="aid-phase-text-box">
            <h3 className="aid-phase-title">AI is finding the best delivery partner...</h3>
            <p className="aid-phase-desc">
              Scanning 10km radius using MongoDB 2dsphere spatial indexing • Querying online status, vehicle types, and route feasibility
            </p>
          </div>

          <div className="aid-progress-bar-wrap">
            <div className="aid-progress-bar aid-progress-bar--animated" />
          </div>
        </div>
      )}

      {/* PHASE 2 & 3: CANDIDATE DRIVER DISPLAY & AI COMPARISON */}
      {(phase === "candidates" || phase === "comparing") && (
        <div className="aid-phase-box aid-fade-in">
          <div className="aid-phase-header">
            <div className="aid-phase-status-pill">
              {phase === "candidates" ? "✓ CANDIDATES DISCOVERED" : "⚖️ AI TRADE-OFF EVALUATION"}
            </div>
            <h3 className="aid-phase-title">
              {telemetry?.candidatesFoundMessage || "4 nearby delivery partners found."}
            </h3>
            <p className="aid-phase-desc">
              {phase === "candidates"
                ? "Autonomous agent evaluated real-time courier telemetry in your delivery zone."
                : "Comparing proximity, travel ETA, vehicle carbon rating, and reliability scores..."}
            </p>
          </div>

          {/* CANDIDATES GRID */}
          <div className="aid-candidates-grid">
            {telemetry?.candidates.map((driver, index) => (
              <div
                key={driver.id}
                className={`aid-candidate-card ${
                  phase === "comparing" && index === 0 ? "aid-candidate-card--leading" : ""
                }`}
              >
                <div className="aid-card-top">
                  <div className="aid-driver-avatar">
                    <span>{getVehicleIcon(driver.vehicleType)}</span>
                  </div>
                  <div className="aid-driver-info">
                    <h4 className="aid-driver-name">{driver.name}</h4>
                    <span className="aid-driver-vehicle">{driver.vehicleType}</span>
                  </div>
                  <div className="aid-score-badge">
                    <span className="aid-score-num">{driver.matchScore}%</span>
                    <span className="aid-score-lbl">Match</span>
                  </div>
                </div>

                <div className="aid-metrics-row">
                  <div className="aid-metric">
                    <span className="aid-metric-label">DISTANCE</span>
                    <span className="aid-metric-val">📍 {driver.distanceInKilometers} km</span>
                  </div>
                  <div className="aid-metric">
                    <span className="aid-metric-label">EST. ARRIVAL</span>
                    <span className="aid-metric-val">⏱️ {driver.estimatedMinutes} mins</span>
                  </div>
                  <div className="aid-metric">
                    <span className="aid-metric-label">RATING</span>
                    <span className="aid-metric-val">★ {driver.rating}</span>
                  </div>
                </div>

                <div className="aid-notes-box">
                  <span className="aid-notes-text">{driver.comparisonNotes}</span>
                </div>
              </div>
            ))}
          </div>

          {phase === "comparing" && (
            <div className="aid-comparing-callout">
              <div className="aid-comparing-spinner" />
              <span>Analyzing optimal courier trade-offs via LangGraph decision tree...</span>
            </div>
          )}
        </div>
      )}

      {/* PHASE 4: SELECTED DRIVER & ASSIGNMENT STATUS */}
      {phase === "selected" && telemetry && (
        <div className="aid-phase-box aid-fade-in">
          <div className="aid-phase-header">
            <div className="aid-selection-banner">
              <span className="aid-selection-icon">🎯</span>
              <h3 className="aid-phase-title">
                {telemetry.selectionMessage || "AI selected the most suitable partner."}
              </h3>
            </div>
            <p className="aid-phase-desc">
              Autonomous selection optimized for speed, eco-efficiency, and verified courier rating.
            </p>
          </div>

          {/* WINNER SPOTLIGHT CARD */}
          {telemetry.selectedDriver && (
            <div className="aid-winner-card">
              <div className="aid-winner-badge">
                <span>✓ AI OPTIMAL DISPATCH</span>
              </div>

              <div className="aid-winner-content">
                <div className="aid-winner-left">
                  <div className="aid-winner-icon">
                    {getVehicleIcon(telemetry.selectedDriver.vehicleType)}
                  </div>
                  <div>
                    <h3 className="aid-winner-name">{telemetry.selectedDriver.name}</h3>
                    <p className="aid-winner-vehicle">
                      {telemetry.selectedDriver.vehicleType} • Plate:{" "}
                      {telemetry.selectedDriver.vehicleNumber || "Verified Courier"}
                    </p>
                    {telemetry.selectedDriver.phoneNumber && (
                      <p className="aid-winner-phone">
                        📞 {telemetry.selectedDriver.phoneNumber}
                      </p>
                    )}
                  </div>
                </div>

                <div className="aid-winner-metrics">
                  <div className="aid-wmetric">
                    <span className="aid-wmetric-val">
                      {telemetry.selectedDriver.distanceInKilometers} km
                    </span>
                    <span className="aid-wmetric-lbl">Pickup Distance</span>
                  </div>
                  <div className="aid-wmetric">
                    <span className="aid-wmetric-val">
                      ~{telemetry.selectedDriver.estimatedMinutes} Mins
                    </span>
                    <span className="aid-wmetric-lbl">Arrival ETA</span>
                  </div>
                  <div className="aid-wmetric">
                    <span className="aid-wmetric-val">
                      {telemetry.selectedDriver.rating} ★
                    </span>
                    <span className="aid-wmetric-lbl">Courier Score</span>
                  </div>
                  <div className="aid-wmetric aid-wmetric--score">
                    <span className="aid-wmetric-val">
                      {telemetry.selectedDriver.matchScore}%
                    </span>
                    <span className="aid-wmetric-lbl">AI Confidence</span>
                  </div>
                </div>
              </div>

              {/* AI REASONING BOX */}
              <div className="aid-reasoning-box">
                <div className="aid-reasoning-head">
                  <span className="aid-brain-icon">🧠</span>
                  <strong>Autonomous Selection Rationale:</strong>
                </div>
                <p className="aid-reasoning-text">
                  {telemetry.aiReasoning ||
                    `AI selected ${telemetry.selectedDriver.vehicleType} courier (${telemetry.selectedDriver.vehicleNumber}) with highest weighted combination of rapid pickup (${telemetry.selectedDriver.distanceInKilometers} km) and eco-friendly vehicle performance.`}
                </p>
              </div>

              {/* ASSIGNMENT STATUS FOOTER */}
              <div className="aid-status-footer">
                <div className="aid-status-indicator">
                  <span className="aid-status-dot-green" />
                  <span>
                    Status: <strong>{telemetry.status}</strong>
                  </span>
                </div>
                <span className="aid-timestamp">
                  Dispatched via LangGraph Agent • Attempt #{telemetry.retryCount + 1}
                </span>
              </div>
            </div>
          )}

          {/* EXPANDABLE CANDIDATE COMPARISON TRAY */}
          <div className="aid-candidates-tray">
            <button
              type="button"
              className="aid-tray-toggle"
              onClick={() => setShowAllCandidates(!showAllCandidates)}
            >
              <span>
                {showAllCandidates ? "▲ Hide" : "▼ Show"} Candidate Evaluation Matrix (
                {telemetry.candidates.length} Evaluated)
              </span>
            </button>

            {showAllCandidates && (
              <div className="aid-tray-grid">
                {telemetry.candidates.map((c, i) => {
                  const isWinner = c.id === telemetry.selectedDriver?.id;
                  return (
                    <div
                      key={c.id}
                      className={`aid-tray-item ${isWinner ? "aid-tray-item--winner" : ""}`}
                    >
                      <div className="aid-tray-item-top">
                        <span className="aid-tray-rank">#{i + 1}</span>
                        <span className="aid-tray-icon">{getVehicleIcon(c.vehicleType)}</span>
                        <div style={{ flex: 1 }}>
                          <strong className="aid-tray-name">{c.name}</strong>
                          <span className="aid-tray-vtype">{c.vehicleType}</span>
                        </div>
                        <span className="aid-tray-score">{c.matchScore}%</span>
                      </div>
                      <div className="aid-tray-sub">
                        <span>📍 {c.distanceInKilometers} km</span>
                        <span>⏱️ ~{c.estimatedMinutes}m</span>
                        <span>★ {c.rating}</span>
                        {isWinner && <span className="aid-tray-winner-tag">Selected</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
