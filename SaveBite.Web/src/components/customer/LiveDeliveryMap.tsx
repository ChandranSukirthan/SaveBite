import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSignalR } from "../../context/SignalRContext";
import {
  getDeliveryRoute,
  type DeliveryRoute,
  type RouteWaypoint,
} from "../../services/routeService";

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
  onRouteSelected?: (routeId: string) => void;
}


export const LiveDeliveryMap: React.FC<LiveDeliveryMapProps> = ({
  orderId,
  orderStatus = "InTransit",
  restaurant,
  customer,
  driver,
  initialDriverLocation,
  height = 460,
  showDetails = true,
  onRouteSelected,
}) => {
  const {
    joinDeliveryGroup,
    leaveDeliveryGroup,
    onDriverLocationUpdated,
    onDeliveryStatusUpdated,
    onOrderStatusUpdated,
    onRouteUpdated,
    onETAUpdated,
    onTrafficUpdated,
    onRouteRecalculationStarted,
    onRouteRecalculationCompleted,
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

  // Route state
  const [currentRoute, setCurrentRoute] = useState<DeliveryRoute | null>(null);
  const [activeRouteId, setActiveRouteId] = useState<string>("route-B");
  const [trafficCondition, setTrafficCondition] = useState<string>("Moderate");
  const [liveEta, setLiveEta] = useState<number>(14);
  const [liveDistance, setLiveDistance] = useState<number>(4.0);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [recalcReason, setRecalcReason] = useState<string>("");
  const [selectedRouteReason, setSelectedRouteReason] = useState<string>("");

  // Load initial route from backend
  const loadRouteData = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await getDeliveryRoute(orderId);
      if (data && data.route) {
        setCurrentRoute(data.route);
        setActiveRouteId(data.route.routeId);
        setTrafficCondition(data.route.trafficCondition);
        setLiveEta(data.route.estimatedMinutes);
        setLiveDistance(data.route.distanceInKilometers);
        setSelectedRouteReason(data.route.selectionReason);
      }
    } catch {
      // Fallback baseline when route not yet assigned
    }
  }, [orderId]);

  useEffect(() => {
    loadRouteData();
  }, [loadRouteData]);

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

    const unsubRoute = onRouteUpdated((data) => {
      if (data.orderId === orderId && data.selectedRoute) {
        setActiveRouteId(data.selectedRoute.routeId);
        setTrafficCondition(data.selectedRoute.trafficCondition);
        setLiveEta(data.selectedRoute.estimatedMinutes);
        setLiveDistance(data.selectedRoute.distanceInKilometers);
        if (data.selectedRoute.reason) {
          setSelectedRouteReason(data.selectedRoute.reason);
        }
        setIsRecalculating(false);
        loadRouteData();
      }
    });

    const unsubEta = onETAUpdated((data) => {
      if (data.orderId === orderId) {
        setLiveEta(data.estimatedMinutes);
        setLiveDistance(data.distanceInKilometers);
      }
    });

    const unsubTraffic = onTrafficUpdated((data) => {
      if (data.orderId === orderId) {
        setTrafficCondition(data.trafficCondition);
      }
    });

    const unsubRecalcStart = onRouteRecalculationStarted((data) => {
      if (data.orderId === orderId) {
        setIsRecalculating(true);
        setRecalcReason(data.reason || "Autonomous route optimization in progress...");
      }
    });

    const unsubRecalcEnd = onRouteRecalculationCompleted((data) => {
      if (data.orderId === orderId) {
        setIsRecalculating(false);
        setActiveRouteId(data.selectedRouteId);
        setLiveEta(data.newEta);
        if (data.reason) {
          setSelectedRouteReason(data.reason);
        }
        loadRouteData();
      }
    });

    return () => {
      leaveDeliveryGroup(orderId);
      unsubLoc();
      unsubDeliv();
      unsubOrder();
      unsubRoute();
      unsubEta();
      unsubTraffic();
      unsubRecalcStart();
      unsubRecalcEnd();
    };
  }, [
    orderId,
    joinDeliveryGroup,
    leaveDeliveryGroup,
    onDriverLocationUpdated,
    onDeliveryStatusUpdated,
    onOrderStatusUpdated,
    onRouteUpdated,
    onETAUpdated,
    onTrafficUpdated,
    onRouteRecalculationStarted,
    onRouteRecalculationCompleted,
    loadRouteData,
  ]);

  // Relative timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdate.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdate]);

  // Dynamic geospatial projection onto SVG viewport
  const viewWidth = 760;
  const viewHeight = 460;
  const padding = 75;

  // Collect all coordinate points from origin, dest, driver, and route waypoints to frame bounding box
  const allPoints = useMemo(() => {
    const pts: Array<[number, number]> = [
      [restLat, restLon],
      [custLat, custLon],
      [driverPos.latitude, driverPos.longitude],
    ];

    if (currentRoute?.waypoints) {
      currentRoute.waypoints.forEach((w) => pts.push([w.latitude, w.longitude]));
    }
    if (currentRoute?.alternativeRoutes) {
      currentRoute.alternativeRoutes.forEach((alt) => {
        alt.waypoints?.forEach((w) => pts.push([w.latitude, w.longitude]));
      });
    }

    return pts;
  }, [restLat, restLon, custLat, custLon, driverPos, currentRoute]);

  const { projectX, projectY, restX, restY, custX, custY, driverX, driverY } = useMemo(() => {
    const lats = allPoints.map((p) => p[0]);
    const lons = allPoints.map((p) => p[1]);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latSpan = Math.max(maxLat - minLat, 0.008);
    const lonSpan = Math.max(maxLon - minLon, 0.008);

    const pX = (lon: number) =>
      padding + ((lon - minLon) / lonSpan) * (viewWidth - 2 * padding);

    const pY = (lat: number) =>
      viewHeight - (padding + ((lat - minLat) / latSpan) * (viewHeight - 2 * padding));

    return {
      projectX: pX,
      projectY: pY,
      restX: pX(restLon),
      restY: pY(restLat),
      custX: pX(custLon),
      custY: pY(custLat),
      driverX: pX(driverPos.longitude),
      driverY: pY(driverPos.latitude),
    };
  }, [allPoints, restLat, restLon, custLat, custLon, driverPos]);

  // Format waypoints into SVG polyline points string
  const formatPolylinePoints = useCallback(
    (waypoints?: RouteWaypoint[] | null) => {
      if (!waypoints || waypoints.length === 0) return "";
      return waypoints
        .map((w) => {
          const lat = w.latitude;
          const lon = w.longitude;
          return `${projectX(lon).toFixed(1)},${projectY(lat).toFixed(1)}`;
        })
        .join(" ");
    },
    [projectX, projectY]
  );

  // Recommended route polyline string
  const recommendedPolyline = useMemo(() => {
    if (currentRoute?.waypoints && currentRoute.waypoints.length > 0) {
      return formatPolylinePoints(currentRoute.waypoints);
    }
    // Fallback baseline curve between restaurant and customer
    const midX = (restX + custX) / 2 - 40;
    const midY = (restY + custY) / 2 + 30;
    return `${restX},${restY} ${midX},${midY} ${custX},${custY}`;
  }, [currentRoute, formatPolylinePoints, restX, restY, custX, custY]);

  // Alternative route polyline strings
  const alternativePolylines = useMemo(() => {
    if (!currentRoute?.alternativeRoutes) return [];
    return currentRoute.alternativeRoutes.map((alt) => ({
      ...alt,
      polylineStr: formatPolylinePoints(alt.waypoints),
    }));
  }, [currentRoute, formatPolylinePoints]);

  // Driver vehicle icon
  const vehicleIcon = useMemo(() => {
    const v = (driver?.vehicleType || "").toLowerCase();
    if (v.includes("scooter") || v.includes("motor")) return "🛵";
    if (v.includes("car") || v.includes("ev") || v.includes("van")) return "🚗";
    return "🚴";
  }, [driver?.vehicleType]);

  const trafficBadgeColor = useMemo(() => {
    const t = (trafficCondition || "").toLowerCase();
    if (t.includes("severe") || t.includes("heavy")) return "#ef4444";
    if (t.includes("mod")) return "#f59e0b";
    return "#10b981";
  }, [trafficCondition]);

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
                ? "LIVE SIGNALR NAVIGATION"
                : "RECONNECTING..."}
            </span>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "20px",
              background: "rgba(30, 30, 30, 0.85)",
              border: `1px solid ${trafficBadgeColor}`,
              fontSize: "11px",
              fontWeight: 600,
              color: trafficBadgeColor,
            }}
          >
            <span>🚦 Traffic:</span>
            <span>{trafficCondition}</span>
          </div>

          <span className="ldm-timestamp">
            {currentStatus === "Delivered"
              ? "Completed"
              : secondsAgo === 0
              ? "GPS updated just now"
              : `GPS updated ${secondsAgo}s ago`}
          </span>
        </div>

        <div className="ldm-hud-right">
          <div className="ldm-metric-pill">
            <span className="ldm-metric-label">ROUTE</span>
            <strong className="ldm-metric-val" style={{ color: "#10b981" }}>
              {activeRouteId} (v{currentRoute?.routeVersion || 1})
            </strong>
          </div>

          <div className="ldm-metric-pill">
            <span className="ldm-metric-label">DISTANCE</span>
            <strong className="ldm-metric-val">
              {currentStatus === "Delivered" ? "Arrived" : `${liveDistance} km`}
            </strong>
          </div>

          <div className="ldm-metric-pill ldm-metric-pill--eta">
            <span className="ldm-metric-label">LIVE ETA</span>
            <strong className="ldm-metric-val">
              {currentStatus === "Delivered" ? "Delivered" : `~${liveEta} mins`}
            </strong>
          </div>
        </div>
      </div>

      {/* RECALCULATING NOTIFICATION BANNER */}
      {isRecalculating && (
        <div
          style={{
            position: "absolute",
            top: "68px",
            left: "20px",
            right: "20px",
            zIndex: 15,
            background: "linear-gradient(90deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95))",
            color: "#000",
            padding: "8px 16px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            fontWeight: 600,
            fontSize: "12px",
          }}
        >
          <span style={{ fontSize: "16px", animation: "spin 1.5s linear infinite" }}>🔄</span>
          <span><strong>AI Route Recalculation:</strong> {recalcReason}</span>
        </div>
      )}

      {/* STALE / GPS WARNING OVERLAY */}
      {isStale && currentStatus !== "Delivered" && !isRecalculating && (
        <div className="ldm-stale-banner">
          <span>⚠️</span>
          <span>Waiting for courier's newest GPS ping. Displaying last known location.</span>
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

          <linearGradient
            id="ldmRouteGradRecommended"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#f5c518" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#10b981" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#059669" stopOpacity="1" />
          </linearGradient>

          <filter id="ldmGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
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
          d={`M 30,80 Q 200,60 380,90 T 740,70 L 740,160 Q 450,140 260,180 Z`}
          fill="#1c1c1c"
          opacity="0.6"
        />
        <path
          d={`M 20,280 Q 240,240 480,260 T 750,290 L 750,420 Q 380,390 20,430 Z`}
          fill="#1c1c1c"
          opacity="0.6"
        />

        {/* ============================================================
            ALTERNATIVE ROUTES (Dashed, subtle, clickable)
            ============================================================ */}
        {alternativePolylines.map((alt) => (
          <g
            key={alt.routeId}
            style={{ cursor: "pointer" }}
            onClick={() => onRouteSelected?.(alt.routeId)}
          >
            <polyline
              points={alt.polylineStr}
              fill="none"
              stroke="#6b7280"
              strokeWidth="4"
              strokeDasharray="6 5"
              opacity="0.55"
            />
            {/* Label along alternative path */}
            {alt.waypoints && alt.waypoints.length > 3 && (
              <text
                x={projectX(alt.waypoints[Math.floor(alt.waypoints.length / 2)].longitude)}
                y={projectY(alt.waypoints[Math.floor(alt.waypoints.length / 2)].latitude) - 8}
                fill="#9ca3af"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                {alt.routeId}: {alt.estimatedMinutes}m ({alt.distanceInKilometers}km)
              </text>
            )}
          </g>
        ))}

        {/* ============================================================
            RECOMMENDED ROUTE (Glowing emerald/gold line)
            ============================================================ */}
        {/* Outer Glow Line */}
        <polyline
          points={recommendedPolyline}
          fill="none"
          stroke="#10b981"
          strokeWidth="9"
          strokeOpacity="0.25"
          filter="url(#ldmGlow)"
        />
        {/* Main Route Polyline */}
        <polyline
          points={recommendedPolyline}
          fill="none"
          stroke="url(#ldmRouteGradRecommended)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
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
            Delivery Destination
          </text>
        </g>

        {/* ============================================================
            3. LIVE DRIVER MARKER (Animated with SignalR updates)
            ============================================================ */}
        <g className="ldm-pin-group ldm-pin-group--driver">
          <circle
            cx={driverX}
            cy={driverY}
            r="28"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            className="ldm-driver-pulse"
          />
          <circle
            cx={driverX}
            cy={driverY}
            r="17"
            fill="#111827"
            stroke="#10b981"
            strokeWidth="2.5"
            filter="url(#ldmGlow)"
          />
          <text
            x={driverX}
            y={driverY + 5}
            textAnchor="middle"
            fontSize="15"
          >
            {vehicleIcon}
          </text>
          <rect
            x={driverX - 55}
            y={driverY + 22}
            width="110"
            height="20"
            rx="5"
            fill="#111827"
            stroke="#10b981"
            strokeWidth="1"
          />
          <text
            x={driverX}
            y={driverY + 36}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#10b981"
          >
            {driver?.name || "Live Courier"}
          </text>
        </g>
      </svg>

      {/* MAP BOTTOM FOOTER WITH REASON & ROUTE COMPARISON */}
      {showDetails && (
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "14px",
            right: "14px",
            background: "rgba(20, 20, 20, 0.92)",
            backdropFilter: "blur(8px)",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#e5e7eb",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px" }}>🤖</span>
            <span>
              <strong>AI Route Optimization:</strong>{" "}
              {selectedRouteReason || "Route B selected with lower expected traffic delay."}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "3px",
                background: "#10b981",
                borderRadius: "2px",
              }}
            />
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>Recommended</span>
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "3px",
                background: "#6b7280",
                borderTop: "2px dashed #9ca3af",
              }}
            />
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>Alternative</span>
          </div>
        </div>
      )}
    </div>
  );
};
