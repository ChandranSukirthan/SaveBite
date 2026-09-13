import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import {
  getCustomerDeliveryEstimate,
  getCustomerOrderById,
  type DeliveryEstimateResponse,
} from "../../services/customerService";
import type { Order } from "../../types/restaurant";
import { LiveDeliveryMap } from "../../components/customer/LiveDeliveryMap";
import { OrderStatusStepper } from "../../components/orders/OrderStatusStepper";
import { AIDeliveryStatusPanel } from "../../components/delivery/AIDeliveryStatusPanel";
import { useSignalR } from "../../context/SignalRContext";

export function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [estimateData, setEstimateData] = useState<DeliveryEstimateResponse | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    joinDeliveryGroup,
    leaveDeliveryGroup,
    onOrderStatusUpdated,
    onDeliveryStatusUpdated,
    onDriverAssigned,
  } = useSignalR();

  const loadData = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const [estRes, orderRes] = await Promise.all([
        getCustomerDeliveryEstimate(orderId),
        getCustomerOrderById(orderId).catch(() => null),
      ]);
      setEstimateData(estRes);
      if (orderRes) setOrder(orderRes);
    } catch (err: any) {
      console.error("Failed to load delivery tracking details:", err);
      setError(
        err.response?.data?.message || "Failed to load active delivery tracking information."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates
  useEffect(() => {
    if (!orderId) return;
    joinDeliveryGroup(orderId);

    const unsubOrder = onOrderStatusUpdated((data) => {
      if (data.orderId === orderId) {
        setOrder((prev: Order | null) =>
          prev ? { ...prev, status: data.status as any } : prev
        );
      }
    });

    const unsubDelivery = onDeliveryStatusUpdated((data) => {
      if (data.orderId === orderId) {
        setOrder((prev: Order | null) =>
          prev ? { ...prev, status: data.status as any } : prev
        );
      }
    });

    const unsubDriver = onDriverAssigned((data) => {
      if (data.orderId === orderId) {
        loadData();
      }
    });

    return () => {
      leaveDeliveryGroup(orderId);
      unsubOrder();
      unsubDelivery();
      unsubDriver();
    };
  }, [
    orderId,
    joinDeliveryGroup,
    leaveDeliveryGroup,
    onOrderStatusUpdated,
    onDeliveryStatusUpdated,
    onDriverAssigned,
    loadData,
  ]);

  const restaurant = estimateData?.restaurant;
  const est = estimateData?.estimate;

  return (
    <CustomerLayout>
      <div className="co-container">
        {/* Navigation Breadcrumb */}
        <div className="de-breadcrumb">
          <Link to="/customer/orders" className="de-back-link">
            ← Back to Orders
          </Link>
          <span className="de-breadcrumb-sep">/</span>
          <span className="de-breadcrumb-curr">Live Delivery Tracking</span>
        </div>

        {/* Header */}
        <div className="co-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="fd-badge">🛰️ LIVE GPS TELEMETRY</span>
              <span className="rst-code">Order #{orderId?.slice(-8)}</span>
            </div>
            <h1 className="co-title">Live Courier Tracking</h1>
            <p className="co-subtitle">
              Follow your food rescue courier in real-time as they travel from the partner kitchen to your door.
            </p>
          </div>

          <div className="co-header-actions">
            <button
              type="button"
              className="fd-refresh-btn"
              onClick={loadData}
              disabled={loading}
            >
              🔄 Refresh Tracking
            </button>
            <Link
              to={`/customer/orders/${orderId}/estimate`}
              className="de-btn-outline"
              style={{ textDecoration: "none" }}
            >
              📊 Pricing Breakdown
            </Link>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="fd-loading-card">
            <div className="spinner-border text-warning" role="status" />
            <p>Connecting to courier GPS telemetry and SignalR dispatch...</p>
          </div>
        )}

        {!loading && error && (
          <div className="de-error-card">
            <span className="de-error-icon">⚠️</span>
            <h3>Unable to Access Live Tracking</h3>
            <p>{error}</p>
            <div className="de-error-actions">
              <button type="button" className="fd-btn-action" onClick={loadData}>
                Retry Tracking
              </button>
              <button
                type="button"
                className="de-btn-outline"
                onClick={() => navigate("/customer/orders")}
              >
                Return to Orders
              </button>
            </div>
          </div>
        )}

        {/* Loaded Content */}
        {!loading && !error && orderId && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Live Delivery Map */}
            <LiveDeliveryMap
              orderId={orderId}
              orderStatus={order?.status || "InTransit"}
              restaurant={{
                name: restaurant?.name || "Partner Kitchen",
                address: order?.deliveryAddress || "Kitchen Location",
                location: {
                  coordinates: [-74.006, 40.7128],
                },
              }}
              customer={{
                address: order?.deliveryAddress || "Customer Destination",
                location: {
                  coordinates: [-73.9857, 40.7484],
                },
              }}
              driver={{
                name: "SaveBite Eco-Courier",
                vehicleType: "Electric Bike",
                vehicleNumber: "ECO-BIKE-09",
              }}
              height={460}
              showDetails={true}
            />

            {/* Stepper Progression Card */}
            <div className="de-main-card">
              <h3 className="de-section-title" style={{ marginBottom: "16px" }}>
                Delivery Lifecycle Progression
              </h3>
              <OrderStatusStepper status={(order?.status as any) || "ReadyForPickup"} />
            </div>

            {/* Trajectory & AI Dispatch Grid */}
            <div className="de-grid">
              {/* Route Summary */}
              <div className="de-main-card">
                <h3 className="de-section-title">Route Specification</h3>
                <div className="de-summary-box">
                  <div className="de-summary-row">
                    <span className="de-summary-label">Pickup Kitchen</span>
                    <span className="de-summary-val">
                      {restaurant?.name || "Surplus Kitchen Partner"}
                    </span>
                  </div>
                  <div className="de-summary-row">
                    <span className="de-summary-label">Dropoff Address</span>
                    <span className="de-summary-val">{order?.deliveryAddress}</span>
                  </div>
                  <div className="de-summary-row">
                    <span className="de-summary-label">Transit Distance</span>
                    <span className="de-summary-val">
                      {est?.distanceInKilometers ?? 3.4} km
                    </span>
                  </div>
                  <div className="de-summary-row">
                    <span className="de-summary-label">Estimated Delivery Fee</span>
                    <span className="de-summary-val">
                      ${est?.estimatedDeliveryFee?.toFixed(2) ?? "3.50"}
                    </span>
                  </div>
                  <div className="de-summary-divider" />
                  <div className="de-summary-row de-summary-total">
                    <span className="de-summary-total-label">Current Status</span>
                    <span className="de-summary-total-val" style={{ color: "var(--yellow)" }}>
                      {order?.status || "In Transit"}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Dispatch Telemetry Panel */}
              <div>
                <AIDeliveryStatusPanel
                  deliveryRequestId={
                    order?.deliveryRequestId || `req-${orderId.slice(-6)}`
                  }
                  orderId={orderId}
                  initialStatus={order?.status || "InTransit"}
                  compact={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
