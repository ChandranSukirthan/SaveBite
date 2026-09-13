import React, { useState, useEffect, useMemo } from "react";
import { useSignalR } from "../../context/SignalRContext";

interface LocationPoint {
  latitude: number;
  longitude: number;
}

interface LiveDeliveryMapProps {
  orderId: string;
  orderStatus?: string;
  restaurant?: {
    name?: string;
    address?: string;
    location?: { coordinates: number[] };
  } | null;
  customer?: {
    address?: string;
    location?: { coordinates: number[] };
  } | null;
  driver?: {
    name?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    phoneNumber?: string;
  } | null;
  initialDriverLocation?: LocationPoint | null;
  height?: number | string;
  showDetails?: boolean;
}

// Haversine distance in kilometers
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export const LiveDeliveryMap: React.FC<LiveDeliveryMapProps> = ({
  orderId,
  orderStatus = "InTransit",
  restaurant,
  customer,
  driver,
  initialDriverLocation,
  height = 420,
  showDetails = true,
}) => {
  const {
    joinDeliveryGroup,
    leaveDeliveryGroup,
    onDriverLocationUpdated,
    onDeliveryStatusUpdated,
    onOrderStatusUpdated,
    connectionState,
  } = useSignalR();

  // Extract restaurant coordinates (Default: Lower Manhattan)
  const restLat = restaurant?.location?.coordinates?.[1] ?? 40.7128;
  const restLon = restaurant?.location?.coordinates?.[0] ?? -74.006;

  // Extract customer coordinates (Default: Midtown Manhattan)
  const custLat = customer?.location?.coordinates?.[1] ?? 40.7484;
  const custLon = customer?.location?.coordinates?.[0] ?? -73.9857;

  // Default driver starting halfway between restaurant and customer
  const defaultDriverLat = initialDriverLocation?.latitude ?? (restLat + custLat) / 2;
  const defaultDriverLon = initialDriverLocation?.longitude ?? (restLon + custLon) / 2;

  const [driverPos, setDriverPos] = useState<LocationPoint>({
    latitude: defaultDriverLat,
    longitude: defaultDriverLon,
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [receivedUpdateCount, setReceivedUpdateCount] = useState<number>(0);
  const [currentStatus, setCurrentStatus] = useState<string>(orderStatus);

  // Subscribe to SignalR room delivery-{orderId}
  useEffect(() => {
    if (!orderId) return;
    joinDeliveryGroup(orderId);

    const unsubLoc = onDriverLocationUpdated((data) => {
      if (data.orderId === orderId) {
        setDriverPos({
          latitude: data.latitude,
          longitude: data.longitude,
        });
        setLastUpdate(new Date(data.updatedAt || Date.now()));
        setSecondsAgo(0);
        setReceivedUpdateCount((c) => c + 1);
      }
    });

    const unsubDeliv = onDeliveryStatusUpdated((data) => {
      if (data.orderId === orderId && data.status) {
        setCurrentStatus(data.status);
      }
    });

    const unsubOrder = onOrderStatusUpdated((data) => {
      if (data.orderId === orderId && data.status) {
        setCurrentStatus(data.status);
      }
    });

    return () => {
      leaveDeliveryGroup(orderId);
      unsubLoc();
      unsubDeliv();
      unsubOrder();
    };
  }, [
    orderId,
    joinDeliveryGroup,
    leaveDeliveryGroup,
    onDriverLocationUpdated,
    onDeliveryStatusUpdated,
    onOrderStatusUpdated,
  ]);

  // Relative timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdate.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdate]);

  // Dynamic geospatial projection onto SVG viewport
  const viewWidth = 720;
  const viewHeight = 440;
  const padding = 70;

  const { restX, restY, custX, custY, driverX, driverY } = useMemo(() => {
    const lats = [restLat, custLat, driverPos.latitude];
    const lons = [restLon, custLon, driverPos.longitude];

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    // Prevent divide by zero if points are identical
    const latSpan = Math.max(maxLat - minLat, 0.005);
    const lonSpan = Math.max(maxLon - minLon, 0.005);

    const projectX = (lon: number) =>
      padding + ((lon - minLon) / lonSpan) * (viewWidth - 2 * padding);

    // Invert Y because SVG coordinates increase downwards
    const projectY = (lat: number) =>
      viewHeight - (padding + ((lat - minLat) / latSpan) * (viewHeight - 2 * padding));

    return {
      restX: projectX(restLon),
      restY: projectY(restLat),
      custX: projectX(custLon),
      custY: projectY(custLat),
      driverX: projectX(driverPos.longitude),
      driverY: projectY(driverPos.latitude),
    };
  }, [restLat, restLon, custLat, custLon, driverPos]);

  // Compute live remaining distance to customer
  const remainingKm = useMemo(() => {
    return calculateHaversineDistance(
      driverPos.latitude,
      driverPos.longitude,
      custLat,
      custLon
    );
  }, [driverPos, custLat, custLon]);

  // Dynamic ETA calculation (assuming average speed ~20 km/h)
  const dynamicEtaMins = useMemo(() => {
    if (currentStatus === "Delivered") return 0;
    const est = Math.ceil((remainingKm / 20) * 60) + 2;
    return Math.max(est, 1);
  }, [remainingKm, currentStatus]);

  // Driver vehicle icon
  const vehicleIcon = useMemo(() => {
    const v = (driver?.vehicleType || "").toLowerCase();
    if (v.includes("scooter") || v.includes("motor")) return "🛵";
    if (v.includes("car") || v.includes("van")) return "🚗";
    return "🚴";
  }, [driver?.vehicleType]);

  const isStale = secondsAgo > 35 && receivedUpdateCount > 0;

  return (
    <div className="ldm-container" style={{ height }}>
      {/* MAP TOP HUD / CONTROL OVERLAY */}
      <div className="ldm-hud">
        <div className="ldm-hud-left">
          <div className="ldm-live-pill">
            <span
              className={`ldm-live-dot ${
                connectionState === "Connected" && !isStale
                  ? "ldm-live-dot--active"
                  : "ldm-live-dot--warning"
              }`}
            />
            <span className="ldm-live-text">
              {currentStatus === "Delivered"
                ? "DELIVERY COMPLETE"
                : connectionState === "Connected"
                ? "LIVE SIGNALR TELEMETRY"
                : "RECONNECTING..."}
            </span>
          </div>

          <span className="ldm-timestamp">
            {currentStatus === "Delivered"
              ? "Completed"
              : secondsAgo === 0
              ? "Updated just now"
              : `Updated ${secondsAgo}s ago`}
          </span>
        </div>

        <div className="ldm-hud-right">
          <div className="ldm-metric-pill">
            <span className="ldm-metric-label">DISTANCE</span>
            <strong className="ldm-metric-val">
              {currentStatus === "Delivered" ? "Arrived" : `${remainingKm} km`}
            </strong>
          </div>

          <div className="ldm-metric-pill ldm-metric-pill--eta">
            <span className="ldm-metric-label">LIVE ETA</span>
            <strong className="ldm-metric-val">
              {currentStatus === "Delivered" ? "Delivered" : `~${dynamicEtaMins} mins`}
            </strong>
          </div>
        </div>
      </div>

      {/* STALE / GPS WARNING OVERLAY */}
      {isStale && currentStatus !== "Delivered" && (
        <div className="ldm-stale-banner">
          <span>⚠️</span>
          <span>
            Waiting for courier's newest GPS ping. Displaying last known location.
          </span>
        </div>
      )}

      {/* INTERACTIVE GEOSPATIAL VECTOR MAP STAGE */}
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        className="ldm-svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Live courier delivery route map"
      >
        <defs>
          {/* Subtle Grid Pattern for cartographic aesthetic */}
          <pattern
            id="ldmGrid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#262626"
              strokeWidth="0.8"
            />
          </pattern>

          {/* Linear gradient for trajectory path */}
          <linearGradient
            id="ldmRouteGrad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#f5c518" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
          </linearGradient>

          {/* Glow filter for driver marker */}
          <filter id="ldmGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Map Background */}
        <rect width={viewWidth} height={viewHeight} fill="#141414" />
        <rect width={viewWidth} height={viewHeight} fill="url(#ldmGrid)" />

        {/* City blocks / decorative neighborhood contours */}
        <path
          d={`M 30,80 Q 200,60 380,90 T 700,70 L 700,160 Q 450,140 260,180 Z`}
          fill="#1c1c1c"
          opacity="0.6"
        />
        <path
          d={`M 20,280 Q 240,240 480,260 T 710,290 L 710,400 Q 380,370 20,410 Z`}
          fill="#1c1c1c"
          opacity="0.6"
        />

        {/* ROUTE TRAJECTORY LINES */}
        {/* Full planned route: Restaurant to Customer */}
        <line
          x1={restX}
          y1={restY}
          x2={custX}
          y2={custY}
          className="ldm-route-line-bg"
        />

        {/* Active travel segment: Restaurant to Driver */}
        <line
          x1={restX}
          y1={restY}
          x2={driverX}
          y2={driverY}
          className="ldm-route-line-traveled"
        />

        {/* Remaining travel segment: Driver to Customer */}
        <line
          x1={driverX}
          y1={driverY}
          x2={custX}
          y2={custY}
          className="ldm-route-line-active"
        />

        {/* ============================================================
            1. RESTAURANT / KITCHEN ORIGIN MARKER
            ============================================================ */}
        <g className="ldm-pin-group ldm-pin-group--rest">
          <circle cx={restX} cy={restY} r="18" fill="rgba(245, 197, 24, 0.18)" />
          <circle
            cx={restX}
            cy={restY}
            r="12"
            fill="#1a1a1a"
            stroke="#f5c518"
            strokeWidth="2.5"
          />
          <text
            x={restX}
            y={restY + 4}
            textAnchor="middle"
            fontSize="12"
            fill="#ffffff"
          >
            🏪
          </text>
          <rect
            x={restX - 60}
            y={restY + 18}
            width="120"
            height="22"
            rx="5"
            fill="#1a1a1a"
            stroke="#333"
            strokeWidth="1"
          />
          <text
            x={restX}
            y={restY + 33}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#f5c518"
          >
            {restaurant?.name || "Surplus Kitchen"}
          </text>
        </g>

        {/* ============================================================
            2. CUSTOMER DESTINATION MARKER
            ============================================================ */}
        <g className="ldm-pin-group ldm-pin-group--cust">
          <circle
            cx={custX}
            cy={custY}
            r="22"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            className="ldm-target-pulse"
          />
          <circle
            cx={custX}
            cy={custY}
            r="14"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            x={custX}
            y={custY + 4}
            textAnchor="middle"
            fontSize="13"
            fill="#ffffff"
          >
            📍
          </text>
          <rect
            x={custX - 65}
            y={custY - 36}
            width="130"
            height="22"
            rx="5"
            fill="#1a1a1a"
            stroke="#10b981"
            strokeWidth="1"
          />
          <text
            x={custX}
            y={custY - 21}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#ffffff"
          >
            Your Delivery Address
          </text>
        </g>

        {/* ============================================================
            3. LIVE MOVING DRIVER COURIER MARKER (PULSE + SMOOTH GLIDE)
            ============================================================ */}
        <g className="ldm-driver-group">
          {/* Animated Outer Radar Wave */}
          <circle
            cx={driverX}
            cy={driverY}
            r="28"
            fill="none"
            stroke="#f5c518"
            strokeWidth="2"
            className="ldm-radar-wave"
          />

          {/* Vehicle Halo */}
          <circle
            cx={driverX}
            cy={driverY}
            r="20"
            fill="#f5c518"
            filter="url(#ldmGlow)"
            className="ldm-driver-halo"
          />

          {/* Vehicle Body Pin */}
          <circle
            cx={driverX}
            cy={driverY}
            r="17"
            fill="#0f0f0f"
            stroke="#f5c518"
            strokeWidth="3"
            className="ldm-driver-pin"
          />

          {/* Courier Vehicle Icon */}
          <text
            x={driverX}
            y={driverY + 6}
            textAnchor="middle"
            fontSize="17"
            className="ldm-driver-icon"
          >
            {vehicleIcon}
          </text>

          {/* Floating Driver Badge Pill */}
          <g transform={`translate(${driverX - 55}, ${driverY - 44})`}>
            <rect
              width="110"
              height="24"
              rx="12"
              fill="#0f0f0f"
              stroke="#f5c518"
              strokeWidth="1.5"
            />
            <text
              x="55"
              y="16"
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="800"
              fill="#ffffff"
            >
              {driver?.vehicleNumber || "COURIER EN ROUTE"}
            </text>
          </g>
        </g>
      </svg>

      {/* BOTTOM COURIER DETAIL CARD */}
      {showDetails && (
        <div className="ldm-footer-card">
          <div className="ldm-courier-profile">
            <div className="ldm-courier-avatar">{vehicleIcon}</div>
            <div className="ldm-courier-info">
              <div className="ldm-courier-name-row">
                <strong className="ldm-courier-name">
                  {driver?.name || "SaveBite Eco-Courier"}
                </strong>
                <span className="ldm-vehicle-tag">
                  {driver?.vehicleType || "Electric Bike"} •{" "}
                  {driver?.vehicleNumber || "ECO-BIKE"}
                </span>
              </div>
              <span className="ldm-coords-text">
                GPS: {driverPos.latitude.toFixed(4)}°N,{" "}
                {driverPos.longitude.toFixed(4)}°W (Updated via SignalR)
              </span>
            </div>
          </div>

          <div className="ldm-footer-actions">
            {driver?.phoneNumber && (
              <a
                href={`tel:${driver.phoneNumber}`}
                className="ldm-contact-btn"
                title="Call Driver"
              >
                📞 Call Driver
              </a>
            )}
            <div className="ldm-eta-box">
              <span className="ldm-eta-label">ESTIMATED ARRIVAL</span>
              <strong className="ldm-eta-val">
                {currentStatus === "Delivered" ? "Delivered" : `~${dynamicEtaMins} Mins`}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

