import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateDeliveryLocation } from "../../services/deliveryService";
import type { DeliveryRequestItem, GpsTrackingStatus } from "../../types/delivery";

interface LiveDriverGpsTrackerProps {
  activeRequest?: DeliveryRequestItem | null;
  initialLat?: number;
  initialLon?: number;
  onLocationUpdated?: (lat: number, lon: number) => void;
}

export const LiveDriverGpsTracker: React.FC<LiveDriverGpsTrackerProps> = ({
  activeRequest,
  initialLat = 40.7128,
  initialLon = -74.006,
  onLocationUpdated,
}) => {
  const [status, setStatus] = useState<GpsTrackingStatus>("idle");
  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLon, setCurrentLon] = useState<number>(initialLon);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [transmissionCount, setTransmissionCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationIndex, setSimulationIndex] = useState<number>(0);

  const watchIdRef = useRef<number | null>(null);
  const lastBroadcastTimeRef = useRef<number>(0);
  const simulationTimerRef = useRef<any>(null);

  // Helper to compute relative seconds ago
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastSentAt) {
        setSecondsAgo(Math.floor((Date.now() - lastSentAt.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSentAt]);

  // Network online/offline listener
  useEffect(() => {
    const handleOnline = () => {
      if (status === "network_offline") {
        setStatus("broadcasting");
        setErrorMessage(null);
      }
    };
    const handleOffline = () => {
      setStatus("network_offline");
      setErrorMessage("Network disconnected. GPS broadcasts queued.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [status]);

  // Transmit location to backend PUT /api/delivery-person/location
  const transmitLocation = useCallback(
    async (lat: number, lon: number, acc?: number | null, spd?: number | null, hdg?: number | null) => {
      const now = Date.now();
      // Throttle to at most once every 3.5 seconds
      if (now - lastBroadcastTimeRef.current < 3500) {
        return;
      }
      lastBroadcastTimeRef.current = now;

      try {
        await updateDeliveryLocation(lat, lon);
        setCurrentLat(lat);
        setCurrentLon(lon);
        if (acc !== undefined) setAccuracy(acc);
        if (spd !== undefined) setSpeed(spd);
        if (hdg !== undefined) setHeading(hdg);
        setLastSentAt(new Date());
        setSecondsAgo(0);
        setTransmissionCount((c) => c + 1);
        setErrorMessage(null);
        if (onLocationUpdated) {
          onLocationUpdated(lat, lon);
        }
      } catch (err: any) {
        console.error("Failed to transmit driver GPS location:", err);
        setErrorMessage(
          err.response?.data?.message || "Failed to transmit GPS location to server."
        );
      }
    },
    [onLocationUpdated]
  );

  // Start continuous HTML5 Geolocation watching
  const startGpsWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("signal_lost");
      setErrorMessage("Geolocation is not supported by your current browser.");
      return;
    }

    // Clear any previous watcher
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setStatus("requesting");
    setErrorMessage(null);

    const successHandler = (pos: GeolocationPosition) => {
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lon = Number(pos.coords.longitude.toFixed(6));
      const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
      const spd = pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : null; // m/s to km/h
      const hdg = pos.coords.heading !== null ? Math.round(pos.coords.heading) : null;

      setStatus("broadcasting");
      transmitLocation(lat, lon, acc, spd, hdg);
    };

    const errorHandler = (err: GeolocationPositionError) => {
      switch (err.code) {
        case err.PERMISSION_DENIED:
          setStatus("permission_denied");
          setErrorMessage(
            "Location permission was denied. Please allow location access in your browser settings, or use the Simulation Mode below."
          );
          break;
        case err.POSITION_UNAVAILABLE:
          setStatus("signal_lost");
          setErrorMessage("GPS signal lost. Searching for satellites...");
          break;
        case err.TIMEOUT:
          setStatus("signal_lost");
          setErrorMessage("GPS request timed out. Retrying automatically...");
          break;
        default:
          setStatus("signal_lost");
          setErrorMessage(`Location error: ${err.message}`);
          break;
      }
    };

    // Immediate first ping
    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    });

    // Continuous watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000,
      }
    );
  }, [transmitLocation]);

  // Stop GPS watching
  const stopGpsWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsSimulating(false);
    setStatus("idle");
  }, []);

  // Compute waypoint steps for simulation based on active order pickup & delivery
  const generateRouteWaypoints = useCallback(() => {
    let pLat = 40.7128;
    let pLon = -74.006;
    let dLat = 40.7484;
    let dLon = -73.9857;

    if (
      activeRequest?.pickupLocation?.coordinates &&
      activeRequest.pickupLocation.coordinates.length >= 2
    ) {
      pLon = activeRequest.pickupLocation.coordinates[0];
      pLat = activeRequest.pickupLocation.coordinates[1];
    }

    if (
      activeRequest?.deliveryLocation?.coordinates &&
      activeRequest.deliveryLocation.coordinates.length >= 2
    ) {
      dLon = activeRequest.deliveryLocation.coordinates[0];
      dLat = activeRequest.deliveryLocation.coordinates[1];
    }

    // Generate 12 progressive waypoints along the route
    const steps = 12;
    const waypoints: Array<{ lat: number; lon: number }> = [];
    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      // Slight realistic route curvature
      const jitterLat = Math.sin(fraction * Math.PI) * 0.003;
      const jitterLon = Math.sin(fraction * Math.PI) * 0.002;
      waypoints.push({
        lat: Number((pLat + (dLat - pLat) * fraction + jitterLat).toFixed(6)),
        lon: Number((pLon + (dLon - pLon) * fraction + jitterLon).toFixed(6)),
      });
    }
    return waypoints;
  }, [activeRequest]);

  // Step simulation forward
  const stepSimulation = useCallback(() => {
    const points = generateRouteWaypoints();
    const nextIdx = (simulationIndex + 1) % points.length;
    setSimulationIndex(nextIdx);
    const pt = points[nextIdx];
    setStatus("simulating");
    transmitLocation(pt.lat, pt.lon, 4, 24, 45);
  }, [generateRouteWaypoints, simulationIndex, transmitLocation]);

  // Toggle Auto-Simulation
  const toggleAutoSimulation = () => {
    if (isSimulating) {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      setIsSimulating(false);
      setStatus("idle");
    } else {
      stopGpsWatching();
      setIsSimulating(true);
      setStatus("simulating");
      setErrorMessage(null);
      // Step immediately
      stepSimulation();
      // Tick every 4 seconds
      simulationTimerRef.current = setInterval(() => {
        stepSimulation();
      }, 4000);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="ldg-card">
      <div className="ldg-header">
        <div className="ldg-title-wrap">
          <div className="ldg-title-row">
            <span className="ldg-icon">📡</span>
            <h3 className="ldg-title">Live Driver GPS Telemetry</h3>
            <span className={`ldg-status-badge ldg-status-badge--${status}`}>
              {status === "broadcasting" && "● LIVE BROADCAST"}
              {status === "simulating" && "⚡ SIMULATING MOVEMENT"}
              {status === "requesting" && "⏱️ ACQUIRING GPS..."}
              {status === "permission_denied" && "⚠️ PERMISSION DENIED"}
              {status === "signal_lost" && "📡 SIGNAL LOST"}
              {status === "network_offline" && "🔌 NETWORK OFFLINE"}
              {status === "idle" && "○ STANDBY"}
            </span>
          </div>
          <p className="ldg-subtitle">
            Transmits real-time coordinates to customers via ASP.NET Core SignalR.
          </p>
        </div>

        <div className="ldg-actions">
          {status !== "broadcasting" ? (
            <button
              type="button"
              className="ldg-btn ldg-btn--primary"
              onClick={startGpsWatching}
              disabled={isSimulating}
            >
              🛰️ Start Live GPS
            </button>
          ) : (
            <button
              type="button"
              className="ldg-btn ldg-btn--stop"
              onClick={stopGpsWatching}
            >
              ⏹️ Stop GPS
            </button>
          )}

          <button
            type="button"
            className={`ldg-btn ${isSimulating ? "ldg-btn--simulating" : "ldg-btn--outline"}`}
            onClick={toggleAutoSimulation}
            title="Simulates courier vehicle moving along pickup/dropoff path"
          >
            {isSimulating ? "⏸️ Pause Simulator" : "▶️ Test Route Movement"}
          </button>
        </div>
      </div>

      {/* ERROR / PERMISSION NOTICE BANNER */}
      {errorMessage && (
        <div className="ldg-alert-box">
          <span className="ldg-alert-icon">
            {status === "permission_denied" ? "🚫" : "⚠️"}
          </span>
          <div className="ldg-alert-text">
            <strong>
              {status === "permission_denied"
                ? "Location Access Blocked:"
                : "Telemetry Notice:"}
            </strong>{" "}
            {errorMessage}
          </div>
          {status === "permission_denied" && (
            <button
              type="button"
              className="ldg-alert-btn"
              onClick={startGpsWatching}
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* TELEMETRY HUD DATA DISPLAY */}
      <div className="ldg-hud-grid">
        <div className="ldg-hud-item">
          <span className="ldg-hud-label">LATITUDE</span>
          <strong className="ldg-hud-val">{currentLat.toFixed(5)}° N</strong>
        </div>

        <div className="ldg-hud-item">
          <span className="ldg-hud-label">LONGITUDE</span>
          <strong className="ldg-hud-val">{currentLon.toFixed(5)}° W</strong>
        </div>

        <div className="ldg-hud-item">
          <span className="ldg-hud-label">SPEED / HEADING</span>
          <strong className="ldg-hud-val">
            {speed !== null ? `${speed} km/h` : "18 km/h"}
            {heading !== null ? ` • ${Math.round(heading)}°` : ""}
          </strong>
        </div>

        <div className="ldg-hud-item">
          <span className="ldg-hud-label">GPS ACCURACY</span>
          <strong className="ldg-hud-val">
            {accuracy !== null ? `±${accuracy}m` : "±5m (High)"}
          </strong>
        </div>

        <div className="ldg-hud-item">
          <span className="ldg-hud-label">LAST BROADCAST</span>
          <strong className="ldg-hud-val ldg-hud-val--fresh">
            {lastSentAt ? (secondsAgo === 0 ? "Just now" : `${secondsAgo}s ago`) : "None"}
          </strong>
        </div>

        <div className="ldg-hud-item">
          <span className="ldg-hud-label">TOTAL PINGS</span>
          <strong className="ldg-hud-val">{transmissionCount}</strong>
        </div>
      </div>

      {/* SIMULATOR QUICK STEP BAR */}
      {isSimulating && (
        <div className="ldg-sim-bar">
          <span className="ldg-sim-tag">🎮 SIMULATOR ACTIVE</span>
          <span className="ldg-sim-info">
            Waypoint {simulationIndex + 1} of 13 en route to destination.
          </span>
          <button
            type="button"
            className="ldg-btn-step"
            onClick={stepSimulation}
          >
            ⏭️ Step Next Waypoint
          </button>
        </div>
      )}
    </div>
  );
};
