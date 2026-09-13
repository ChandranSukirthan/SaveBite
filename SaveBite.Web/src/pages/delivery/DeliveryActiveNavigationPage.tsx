import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DeliveryLayout } from "../../components/layout/DeliveryLayout";
import api from "../../services/api";
import {
  getDeliveryRoute,
  recalculateDeliveryRoute,
  getDeliveryTraffic,
  type DeliveryRoute,
  type TrafficInfo,
} from "../../services/routeService";
import { LiveDeliveryMap } from "../../components/customer/LiveDeliveryMap";
import { useSignalR } from "../../context/SignalRContext";

interface ActiveDeliveryOrder {
  id: string;
  orderId: string;
  status: string;
  distanceInKilometers: number;
  deliveryFee: number;
  estimatedMinutes: number;
  deliveryAddress: string;
  pickupLocation?: { coordinates: number[] };
  deliveryLocation?: { coordinates: number[] };
  restaurant?: {
    id: string;
    restaurantName: string;
    address: string;
    phoneNumber?: string;
  };
}

export function DeliveryActiveNavigationPage() {
  const navigate = useNavigate();
  const [activeDelivery, setActiveDelivery] = useState<ActiveDeliveryOrder | null>(null);
  const [routeData, setRouteData] = useState<DeliveryRoute | null>(null);
  const [trafficData, setTrafficData] = useState<TrafficInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  // GPS Simulation / live coordinates
  const [currentLat, setCurrentLat] = useState<number>(40.7135);
  const [currentLon, setCurrentLon] = useState<number>(-74.0050);
  const [simStep, setSimStep] = useState<number>(0);

  const {
    joinDeliveryGroup,
    leaveDeliveryGroup,
    onRouteUpdated,
    onETAUpdated,
    onTrafficUpdated,
    onRouteRecalculationCompleted,
  } = useSignalR();

  // Load driver's active orders
  const loadActiveDelivery = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<ActiveDeliveryOrder[]>("/api/delivery-person/orders");
      const orders = res.data || [];
      // Find active delivery that is not Delivered or Cancelled
      const active = orders.find(
        (o) =>
          o.status === "Assigned" ||
          o.status === "Accepted" ||
          o.status === "PickedUp" ||
          o.status === "InTransit"
      );

      if (active) {
        setActiveDelivery(active);
        const [rData, tData] = await Promise.all([
          getDeliveryRoute(active.id).catch(() => null),
          getDeliveryTraffic(active.id).catch(() => null),
        ]);
        if (rData?.route) setRouteData(rData.route);
        if (tData) setTrafficData(tData);
      } else {
        setActiveDelivery(null);
      }
    } catch (err: any) {
      console.error("Failed to load active delivery:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActiveDelivery();
  }, [loadActiveDelivery]);

  // SignalR realtime subscriptions
  useEffect(() => {
    if (!activeDelivery) return;
    joinDeliveryGroup(activeDelivery.orderId);

    const unsubRoute = onRouteUpdated((data) => {
      if (data.deliveryRequestId === activeDelivery.id) {
        loadActiveDelivery();
        setMessage({
          text: `Route updated to ${data.selectedRoute?.routeId || "AI optimized path"}. Version ${data.routeVersion}`,
          type: "info",
        });
      }
    });

    const unsubRecalc = onRouteRecalculationCompleted((data) => {
      if (data.orderId === activeDelivery.orderId) {
        loadActiveDelivery();
        setMessage({
          text: `Recalculation complete! Route: ${data.selectedRouteId} (ETA: ${data.newEta}m). Reason: ${data.reason}`,
          type: "success",
        });
      }
    });

    const unsubETA = onETAUpdated((data) => {
      if (data.orderId === activeDelivery.orderId) {
        setMessage({
          text: `Live ETA Update: ${data.estimatedMinutes} mins remaining (${data.distanceInKilometers} km)`,
          type: "info",
        });
      }
    });

    const unsubTraffic = onTrafficUpdated((data) => {
      if (data.orderId === activeDelivery.orderId) {
        setTrafficData((prev) => ({
          overallTrafficLevel: data.trafficCondition,
          congestionFactor: prev?.congestionFactor ?? 1.0,
          averageDelayMinutes: data.delayMinutes,
          bottleneckArea: prev?.bottleneckArea ?? "Current Corridor",
          timestamp: data.updatedAt || new Date().toISOString(),
        }));
      }
    });

    return () => {
      leaveDeliveryGroup(activeDelivery.orderId);
      unsubRoute();
      unsubRecalc();
      unsubETA();
      unsubTraffic();
    };
  }, [activeDelivery, joinDeliveryGroup, leaveDeliveryGroup, onRouteUpdated, onRouteRecalculationCompleted, onETAUpdated, onTrafficUpdated, loadActiveDelivery]);

  // Handle Manual Route Recalculation
  const handleRecalculate = async (simulateSpike: boolean = false) => {
    if (!activeDelivery) return;
    try {
      setRecalcLoading(true);
      setMessage({
        text: "Autonomous LangGraph route agent evaluating updated traffic conditions...",
        type: "info",
      });
      await recalculateDeliveryRoute(
        activeDelivery.id,
        simulateSpike
          ? "Heavy congestion detected on primary corridor (+12m delay)"
          : "Courier requested manual route recalculation",
        simulateSpike
      );
      // Wait for async processing
      setTimeout(() => {
        loadActiveDelivery();
        setRecalcLoading(false);
      }, 1800);
    } catch (err: any) {
      setRecalcLoading(false);
      setMessage({ text: err.response?.data?.message || "Recalculation failed", type: "error" });
    }
  };

  // Transmit Live GPS update to C# backend
  const sendLocationUpdate = async (lat: number, lon: number) => {
    try {
      await api.put("/api/delivery-person/location", {
        latitude: lat,
        longitude: lon,
      });
      setCurrentLat(lat);
      setCurrentLon(lon);
    } catch (err) {
      console.error("GPS update error:", err);
    }
  };

  // Step courier closer along waypoints for demo
  const handleSimulateGpsStep = () => {
    if (!routeData?.waypoints || routeData.waypoints.length === 0) return;
    const nextStep = (simStep + 1) % routeData.waypoints.length;
    setSimStep(nextStep);
    const targetWp = routeData.waypoints[nextStep];
    const lat = targetWp.latitude;
    const lon = targetWp.longitude;
    sendLocationUpdate(lat, lon);
    setMessage({
      text: `Live GPS Ping Transmitted: [${lat.toFixed(4)}, ${lon.toFixed(4)}] -> Waypoint ${nextStep + 1}/${routeData.waypoints.length}`,
      type: "info",
    });
  };

  // Lifecycle Action Handlers
  const handlePickup = async () => {
    if (!activeDelivery) return;
    try {
      setActionLoading(true);
      await api.post(`/api/delivery-person/orders/${activeDelivery.id}/pickup`);
      setMessage({ text: "Food marked as picked up from kitchen!", type: "success" });
      await loadActiveDelivery();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || "Failed to mark picked up", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDelivery = async () => {
    if (!activeDelivery) return;
    try {
      setActionLoading(true);
      await api.post(`/api/delivery-person/orders/${activeDelivery.id}/start`);
      setMessage({ text: "Delivery started! In transit to customer.", type: "success" });
      await loadActiveDelivery();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || "Failed to start delivery", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!activeDelivery) return;
    try {
      setActionLoading(true);
      await api.post(`/api/delivery-person/orders/${activeDelivery.id}/complete`);
      setMessage({ text: "Delivery completed successfully! Route history recorded.", type: "success" });
      setTimeout(() => {
        navigate("/delivery/requests");
      }, 1500);
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || "Failed to complete delivery", type: "error" });
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DeliveryLayout>
        <div style={{ padding: "30px", textAlign: "center", color: "#9ca3af" }}>
          Loading active navigation session...
        </div>
      </DeliveryLayout>
    );
  }

  if (!activeDelivery) {
    return (
      <DeliveryLayout>
        <div className="co-container" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚴</div>
          <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#f9fafb", marginBottom: "8px" }}>
            No Active Delivery Run
          </h2>
          <p style={{ color: "#9ca3af", maxWidth: "450px", margin: "0 auto 24px auto" }}>
            You do not currently have an assigned delivery in progress. Check available delivery requests to accept a surplus food dispatch.
          </p>
          <Link to="/delivery/requests" className="de-btn-primary" style={{ textDecoration: "none" }}>
            Browse Delivery Requests
          </Link>
        </div>
      </DeliveryLayout>
    );
  }

  return (
    <DeliveryLayout>
      <div className="co-container">
        {/* Header HUD */}
        <div className="co-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="fd-badge">🛰️ LIVE NAVIGATION ACTIVE</span>
              <span className="rst-code">Order #{activeDelivery.orderId.slice(-8)}</span>
              <span
                style={{
                  background: "#10b981",
                  color: "#000",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                {activeDelivery.status.toUpperCase()}
              </span>
            </div>
            <h1 className="co-title">Live Courier Navigation</h1>
            <p className="co-subtitle">
              Turn-by-turn routing with dynamic traffic avoidance and continuous GPS telemetry.
            </p>
          </div>

          <div className="co-header-actions">
            <button
              type="button"
              className="fd-refresh-btn"
              onClick={() => handleRecalculate(false)}
              disabled={recalcLoading}
            >
              {recalcLoading ? "⏳ Recalculating..." : "🔄 Recalculate Route"}
            </button>
            <button
              type="button"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid #ef4444",
                color: "#ef4444",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => handleRecalculate(true)}
              disabled={recalcLoading}
              title="Simulates traffic spike on Route A to trigger AI re-routing to Route B"
            >
              ⚡ Test Traffic Spike
            </button>
          </div>
        </div>

        {/* Banner Messages */}
        {message && (
          <div
            style={{
              background: message.type === "error" ? "#ef4444" : message.type === "success" ? "#10b981" : "#3b82f6",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{message.text}</span>
            <button
              type="button"
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
              onClick={() => setMessage(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* Map Stage */}
        <div style={{ marginBottom: "20px" }}>
          <LiveDeliveryMap
            orderId={activeDelivery.orderId}
            orderStatus={activeDelivery.status}
            restaurant={activeDelivery.restaurant}
            customer={{ address: activeDelivery.deliveryAddress }}
            driver={{
              name: "You (Courier)",
              vehicleType: "Bicycle",
            }}
            initialDriverLocation={{
              latitude: currentLat,
              longitude: currentLon,
            }}
            height={460}
            showDetails={true}
          />
        </div>

        {/* ============================================================
            NAVIGATION OVERVIEW & CONTROLS (Section 17 Requirements)
            ============================================================ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {/* PICKUP LOCATION */}
          <div style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "12px", padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>
              1. PICKUP RESTAURANT
            </div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#f5c518", margin: "4px 0" }}>
              {activeDelivery.restaurant?.restaurantName || "SaveBite Partner Kitchen"}
            </div>
            <div style={{ fontSize: "13px", color: "#d1d5db" }}>
              {activeDelivery.restaurant?.address || "Commercial Kitchen Street"}
            </div>
          </div>

          {/* DROP-OFF DESTINATION */}
          <div style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "12px", padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>
              2. DROP-OFF CUSTOMER
            </div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#10b981", margin: "4px 0" }}>
              Customer Residence
            </div>
            <div style={{ fontSize: "13px", color: "#d1d5db" }}>
              {activeDelivery.deliveryAddress}
            </div>
          </div>

          {/* TELEMETRY METRICS */}
          <div style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>ETA:</span>
              <strong style={{ color: "#10b981", fontSize: "15px" }}>
                {routeData?.estimatedMinutes ?? activeDelivery.estimatedMinutes} mins
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>Distance:</span>
              <strong style={{ color: "#f9fafb", fontSize: "13px" }}>
                {routeData?.distanceInKilometers ?? activeDelivery.distanceInKilometers} km
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>Traffic Condition:</span>
              <strong style={{ color: "#f59e0b", fontSize: "13px" }}>
                {trafficData?.overallTrafficLevel ?? routeData?.trafficCondition ?? "Moderate"}
              </strong>
            </div>
          </div>
        </div>

        {/* ============================================================
            ACTION BUTTONS BAR
            ============================================================ */}
        <div
          style={{
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {/* Start Delivery */}
            <button
              type="button"
              className="de-btn-outline"
              disabled={actionLoading || activeDelivery.status === "InTransit"}
              onClick={handleStartDelivery}
              style={{
                opacity: activeDelivery.status === "InTransit" ? 0.5 : 1,
                cursor: activeDelivery.status === "InTransit" ? "default" : "pointer",
              }}
            >
              🚀 Start Delivery
            </button>

            {/* Arrived at Pickup / Picked Up */}
            <button
              type="button"
              className="de-btn-outline"
              disabled={actionLoading || activeDelivery.status === "PickedUp"}
              onClick={handlePickup}
              style={{
                opacity: activeDelivery.status === "PickedUp" ? 0.5 : 1,
              }}
            >
              📦 Arrived at Pickup
            </button>

            {/* Simulate Move / Step along route */}
            <button
              type="button"
              style={{
                background: "#374151",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={handleSimulateGpsStep}
            >
              📍 Step GPS Along Route
            </button>
          </div>

          {/* Complete Delivery */}
          <button
            type="button"
            className="de-btn-primary"
            disabled={actionLoading}
            onClick={handleCompleteDelivery}
            style={{ background: "#10b981", color: "#000", fontWeight: "bold" }}
          >
            ✓ Complete Delivery
          </button>
        </div>
      </div>
    </DeliveryLayout>
  );
}
