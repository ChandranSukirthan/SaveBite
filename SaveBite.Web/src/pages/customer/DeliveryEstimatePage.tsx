import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import {
  getCustomerDeliveryEstimate,
  getCustomerOrderById,
  type DeliveryEstimateResponse,
} from "../../services/customerService";
import type { Order } from "../../types/restaurant";
import { AIDeliveryStatusPanel } from "../../components/delivery/AIDeliveryStatusPanel";

export function DeliveryEstimatePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [estimateData, setEstimateData] = useState<DeliveryEstimateResponse | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEstimate = async () => {
    if (!orderId) {
      setError("No order ID was provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [estRes, orderRes] = await Promise.all([
        getCustomerDeliveryEstimate(orderId),
        getCustomerOrderById(orderId).catch(() => null),
      ]);
      setEstimateData(estRes);
      if (orderRes) setOrder(orderRes);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to retrieve delivery estimate for this order.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimate();
  }, [orderId]);

  const est = estimateData?.estimate;
  const pricing = estimateData?.pricing;
  const restaurant = estimateData?.restaurant;

  return (
    <CustomerLayout>
      <div className="de-container">
        {/* Navigation Breadcrumb */}
        <div className="de-breadcrumb">
          <Link to="/customer/orders" className="de-back-link">
            ← Back to Orders
          </Link>
          <span className="de-breadcrumb-sep">/</span>
          <span className="de-breadcrumb-curr">Delivery Estimate #{orderId}</span>
        </div>

        {/* Page Header */}
        <div className="de-header">
          <div>
            <span className="de-badge">⚡ DYNAMIC ECO-LOGISTICS</span>
            <h1 className="de-title">Delivery Pricing & ETA Estimate</h1>
            <p className="de-subtitle">
              Real-time route calculation, per-kilometer pricing breakdown, and courier telemetry.
            </p>
          </div>

          <div className="de-header-actions">
            <button
              type="button"
              className="fd-refresh-btn"
              onClick={fetchEstimate}
              disabled={loading}
            >
              🔄 Refresh Estimate
            </button>
            <button
              type="button"
              className="fd-btn-action"
              onClick={() => navigate("/customer/orders")}
            >
              View Order Tracking
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="fd-loading-card">
            <div className="spinner-border text-warning" role="status" />
            <p>Computing dynamic route telemetry and delivery fee...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="de-error-card">
            <span className="de-error-icon">⚠️</span>
            <h3>Unable to Compute Delivery Estimate</h3>
            <p>{error}</p>
            <div className="de-error-actions">
              <button
                type="button"
                className="fd-btn-action"
                onClick={fetchEstimate}
              >
                Retry Calculation
              </button>
              <Link to="/customer/orders" className="de-btn-outline">
                Return to Orders
              </Link>
            </div>
          </div>
        )}

        {/* Success / Loaded Content */}
        {!loading && !error && est && (
          <div className="de-grid">
            {/* Primary Delivery Fee Card */}
            <div className="de-main-card">
              <div className="de-card-top">
                <div className="de-fee-stack">
                  <span className="de-fee-label">ESTIMATED DELIVERY FEE</span>
                  <div className="de-fee-hero">
                    ${est.estimatedDeliveryFee.toFixed(2)}
                  </div>
                  <span className="de-fee-sub">
                    Calculated for {est.distanceInKilometers} km distance
                  </span>
                </div>

                <div className="de-eta-pill-box">
                  <div className="de-eta-badge">
                    <span className="de-eta-icon">⏱️</span>
                    <span className="de-eta-val">{est.estimatedMinutes} Mins</span>
                  </div>
                  <span className="de-eta-caption">Estimated Arrival Time</span>
                </div>
              </div>

              {/* Total Order Summary Box */}
              <div className="de-summary-box">
                <div className="de-summary-row">
                  <span className="de-summary-label">Surplus Food Subtotal</span>
                  <span className="de-summary-val">${est.foodTotal.toFixed(2)}</span>
                </div>
                <div className="de-summary-row">
                  <span className="de-summary-label">
                    Estimated Courier Delivery Fee
                  </span>
                  <span className="de-summary-val">
                    +${est.estimatedDeliveryFee.toFixed(2)}
                  </span>
                </div>
                <div className="de-summary-divider" />
                <div className="de-summary-row de-summary-total">
                  <span className="de-summary-total-label">Estimated Total</span>
                  <span className="de-summary-total-val">
                    ${est.estimatedTotalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Fare Formula Breakdown */}
              <div className="de-breakdown-card">
                <h3 className="de-section-title">Transparent Pricing Structure</h3>
                <div className="de-table-wrap">
                  <table className="de-table">
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Rate / Unit</th>
                        <th>Applied Value</th>
                        <th style={{ textAlign: "right" }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <strong>Base Dispatch Fee</strong>
                          <div className="de-table-sub">Standard urban pickup allocation</div>
                        </td>
                        <td>Fixed base rate</td>
                        <td>1 trip</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          ${(pricing?.baseFee ?? 100).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Distance Transit Rate</strong>
                          <div className="de-table-sub">
                            ${(pricing?.perKilometer ?? 50).toFixed(2)} / km
                          </div>
                        </td>
                        <td>Per-km transit charge</td>
                        <td>{est.distanceInKilometers} km</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          ${((pricing?.perKilometer ?? 50) * est.distanceInKilometers).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pricing Explanation Note */}
              <div className="de-explanation-box">
                <div className="de-explanation-header">
                  <span className="de-eco-icon">🌱</span>
                  <h4>Dynamic Eco-Pricing Rationale</h4>
                </div>
                <p className="de-explanation-text">
                  SaveBite uses route telemetry and Haversine geospatial calculations to establish transparent delivery estimates.
                  Couriers are routed dynamically to pick up surplus meals before expiry, consolidating neighborhood trips to minimize carbon footprints.
                </p>
                {estimateData?.note && (
                  <div className="de-system-note">
                    ℹ️ <strong>System Notice:</strong> {estimateData.note}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Telemetry & Route Details */}
            <div className="de-side-col">
              {/* Route Trajectory Card */}
              <div className="de-route-card">
                <h3 className="de-section-title">Route Telemetry</h3>

                <div className="de-timeline">
                  {/* Origin: Restaurant */}
                  <div className="de-timeline-node">
                    <div className="de-node-dot origin">🏪</div>
                    <div className="de-node-content">
                      <span className="de-node-type">PICKUP LOCATION</span>
                      <strong className="de-node-name">
                        {restaurant?.name || "Partner Kitchen"}
                      </strong>
                      <span className="de-node-addr">
                        Order #{orderId?.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* Distance Connector */}
                  <div className="de-timeline-connector">
                    <span className="de-distance-tag">
                      ↕ {est.distanceInKilometers} km transit
                    </span>
                  </div>

                  {/* Destination: Customer */}
                  <div className="de-timeline-node">
                    <div className="de-node-dot dest">📍</div>
                    <div className="de-node-content">
                      <span className="de-node-type">DELIVERY DESTINATION</span>
                      <strong className="de-node-name">
                        {order?.deliveryAddress || "Customer Delivery Address"}
                      </strong>
                      <span className="de-node-addr">
                        Estimated arrival in ~{est.estimatedMinutes} mins
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Autonomous Dispatch Panel */}
              <AIDeliveryStatusPanel
                deliveryRequestId={
                  order?.deliveryRequestId ||
                  `req-${orderId?.slice(-6) || "active"}`
                }
                orderId={orderId}
                initialStatus={order?.status || "Searching"}
                compact={false}
              />

              {/* Quick Actions */}
              <div className="de-actions-card">
                <Link to="/customer/orders" className="de-btn-primary">
                  Track All My Orders
                </Link>
                <Link to="/customer/food" className="de-btn-secondary">
                  Rescue Another Meal
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

export default DeliveryEstimatePage;
