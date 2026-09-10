import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { getCustomerProfile } from "../../services/profileService";
import {
  getAIFoodRecommendations,
  type AgentRecommendationItem,
} from "../../services/customerService";
import type { CustomerProfile } from "../../types/profile";
import type { DiscoveredFoodItem } from "../../types/customer";
import { CountdownTimer } from "../../components/food/CountdownTimer";
import { CustomerReserveModal } from "../../components/customer/CustomerReserveModal";

const CATEGORIES = [
  "All",
  "Bakery",
  "Prepared Meals",
  "Fresh Produce",
  "Groceries",
  "Desserts",
  "Dairy & Drinks",
  "Beverages",
];

const LOADING_STEPS = [
  { step: 1, title: "Understanding preferences", desc: "Reading your favorite categories & budget threshold" },
  { step: 2, title: "Searching nearby food", desc: "Querying verified kitchens within your radius" },
  { step: 3, title: "Analyzing availability", desc: "Checking real-time portion stock & expiration deadlines" },
  { step: 4, title: "Comparing options", desc: "Evaluating proximity, freshness, and match fitness" },
];

export function AIRecommendationsPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [recommendations, setRecommendations] = useState<AgentRecommendationItem[]>([]);
  const [agentMessage, setAgentMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [radiusKm, setRadiusKm] = useState(15);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [maxPrice, setMaxPrice] = useState(30);

  // Modal
  const [reserveItem, setReserveItem] = useState<DiscoveredFoodItem | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    getCustomerProfile()
      .then((data) => {
        if (data) {
          setProfile(data);
          if (data.maximumBudget && data.maximumBudget > 0) {
            setMaxPrice(Math.ceil(data.maximumBudget));
          }
        }
      })
      .catch(() => {});
  }, []);

  const runAIAgent = async () => {
    setLoading(true);
    setLoadingStep(1);
    setError(null);

    // Simulate animated phased progression through steps
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 700);

    const lat = profile?.location?.coordinates?.[1] || 40.7135;
    const lng = profile?.location?.coordinates?.[0] || -74.0050;
    const customerId = profile?.id || "6aa281a3015a3ad8337f7683";

    try {
      const response = await getAIFoodRecommendations({
        customerId,
        latitude: lat,
        longitude: lng,
        radiusKm,
        category: selectedCategory,
        maxPrice,
      });

      // Ensure animation shows all steps
      setTimeout(() => {
        clearInterval(stepInterval);
        setRecommendations(response.recommendations || []);
        setAgentMessage(response.message || "");
        setLoading(false);
      }, 2400);
    } catch (err: any) {
      clearInterval(stepInterval);
      setError("AI Matching agent encountered an issue. Please retry.");
      setLoading(false);
    }
  };

  useEffect(() => {
    runAIAgent();
  }, [profile]);

  const handleOrderSuccess = () => {
    setSuccessMsg("🎉 Portion successfully reserved! Check preparation in My Orders.");
    setReserveItem(null);
    runAIAgent();
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Bakery":
        return "🥐";
      case "Prepared Meals":
        return "🍲";
      case "Fresh Produce":
        return "🥦";
      case "Groceries":
        return "🥫";
      case "Desserts":
        return "🍰";
      case "Dairy & Drinks":
        return "🥛";
      case "Beverages":
        return "☕";
      default:
        return "🍽️";
    }
  };

  // Convert recommendation item to DiscoveredFoodItem for reservation modal
  const toFoodItem = (rec: AgentRecommendationItem): DiscoveredFoodItem => ({
    id: rec.foodId,
    name: rec.name,
    description: rec.description,
    category: rec.category,
    quantity: rec.quantity,
    price: rec.price,
    availableFrom: new Date().toISOString(),
    availableUntil: rec.availableUntil,
    distanceInKilometers: rec.distanceInKilometers,
    restaurant: {
      id: rec.restaurant.id,
      restaurantName: rec.restaurant.restaurantName,
      address: rec.restaurant.address,
    },
  });

  return (
    <CustomerLayout>
      <div className="air-container">
        {/* Header */}
        <div className="air-header">
          <div className="air-header-left">
            <span className="air-badge">🤖 GEMINI + LANGGRAPH AGENT</span>
            <h1 className="air-title">AI Smart Food Recommendations</h1>
            <p className="air-subtitle">
              Our autonomous food matching agent analyzes your saved culinary preferences, budget cap,
              and nearby rescue opportunities in real time.
            </p>
          </div>

          <div className="air-header-actions">
            <button
              type="button"
              className="air-btn-refresh"
              onClick={runAIAgent}
              disabled={loading}
            >
              ✨ Re-Run AI Matching Agent
            </button>
          </div>
        </div>

        {/* Global Notification */}
        {successMsg && (
          <div className="cst-alert-success">
            {successMsg}
          </div>
        )}

        {/* Controls Toolbar */}
        <div className="air-controls-bar">
          <div className="air-filter-item">
            <label htmlFor="air-cat-select" className="air-label">
              Category
            </label>
            <select
              id="air-cat-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="fd-select"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="air-filter-item">
            <label htmlFor="air-radius-select" className="air-label">
              Radius: <strong>{radiusKm} km</strong>
            </label>
            <select
              id="air-radius-select"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="fd-select"
            >
              <option value={3}>Within 3 km</option>
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={15}>Within 15 km</option>
              <option value={25}>Within 25 km</option>
              <option value={50}>Within 50 km</option>
            </select>
          </div>

          <div className="air-filter-item">
            <label htmlFor="air-budget-range" className="air-label">
              Max Budget: <strong>${maxPrice}</strong>
            </label>
            <input
              id="air-budget-range"
              type="range"
              min="5"
              max="50"
              step="1"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="fd-range-slider"
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="cst-alert-danger">
            ⚠️ {error}
          </div>
        )}

        {/* 4-STAGE PHASED LOADING ANIMATION */}
        {loading && (
          <div className="air-loader-card">
            <div className="air-loader-top">
              <div className="spinner-border text-warning" role="status" />
              <h3>LangGraph Agent is Reasoning...</h3>
              <p>Evaluating surplus inventory against your profile metrics.</p>
            </div>

            <div className="air-steps-grid">
              {LOADING_STEPS.map((s) => {
                const isComplete = loadingStep > s.step;
                const isCurrent = loadingStep === s.step;
                return (
                  <div
                    key={s.step}
                    className={`air-step-box ${isComplete ? "complete" : isCurrent ? "current" : "pending"}`}
                  >
                    <div className="air-step-indicator">
                      {isComplete ? "✓" : isCurrent ? "⚡" : s.step}
                    </div>
                    <div className="air-step-body">
                      <span className="air-step-name">"{s.title}"</span>
                      <span className="air-step-desc">{s.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RESULTS VIEW */}
        {!loading && (
          <>
            {/* Agent Verdict Banner */}
            {agentMessage && (
              <div className="air-verdict-banner">
                <span className="air-verdict-icon">💡</span>
                <div className="air-verdict-content">
                  <span className="air-verdict-tag">AGENT VERDICT</span>
                  <p className="air-verdict-text">{agentMessage}</p>
                </div>
              </div>
            )}

            {recommendations.length === 0 ? (
              <div className="fd-empty-card">
                <span className="fd-empty-icon">🤖</span>
                <h3>No Recommendations Available</h3>
                <p>
                  No surplus items matched your exact preferences within {radiusKm} km. Try expanding
                  your search radius or budget slider.
                </p>
                <div className="fd-empty-actions">
                  <button
                    type="button"
                    className="fd-btn-action"
                    onClick={() => {
                      setRadiusKm(50);
                      setMaxPrice(50);
                      setSelectedCategory("All");
                    }}
                  >
                    Reset Filters & Re-Analyze
                  </button>
                </div>
              </div>
            ) : (
              <div className="air-cards-grid">
                {recommendations.map((rec) => (
                  <div key={rec.foodId} className="air-rec-card">
                    {/* Card Top */}
                    <div className="air-card-top">
                      <span className="air-match-badge">
                        🎯 {rec.matchScore}% Match
                      </span>
                      <span className="air-badge-tag">{rec.badge}</span>
                    </div>

                    {/* AI Reason Callout */}
                    <div className="air-reason-box">
                      <span className="air-reason-label">🤖 Why the AI recommended this:</span>
                      <p className="air-reason-text">"{rec.reason}"</p>
                    </div>

                    {/* Food Info */}
                    <div className="air-food-info">
                      <div className="air-food-title-row">
                        <span className="air-cat-icon">{getCategoryIcon(rec.category)}</span>
                        <h3 className="air-food-name">{rec.name}</h3>
                      </div>
                      <p className="air-food-desc">{rec.description}</p>
                    </div>

                    {/* Restaurant Info */}
                    <div className="air-rest-box">
                      <span className="fd-rest-icon">🏪</span>
                      <div className="fd-rest-details">
                        <span className="fd-rest-name">{rec.restaurant.restaurantName}</span>
                        <span className="fd-rest-addr">
                          📍 {rec.restaurant.address} • {rec.distanceInKilometers} km away
                        </span>
                      </div>
                    </div>

                    {/* Pickup Timer */}
                    <div className="fd-timer-row">
                      <span className="fd-timer-label">⏰ Rescue By:</span>
                      <CountdownTimer availableUntil={rec.availableUntil} />
                    </div>

                    {/* Card Footer: Price & CTA */}
                    <div className="air-card-footer">
                      <div className="fd-price-stack">
                        <span className="fd-price-val">${rec.price.toFixed(2)}</span>
                        <span className="fd-qty-pill">{rec.quantity} left</span>
                      </div>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <Link
                          to={`/customer/food/${rec.foodId}`}
                          className="fd-details-btn"
                        >
                          Details
                        </Link>
                        <button
                          type="button"
                          className="fd-reserve-cta"
                          onClick={() => setReserveItem(toFoodItem(rec))}
                        >
                          Reserve Meal ➔
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Reservation Checkout Modal */}
      {reserveItem && (
        <CustomerReserveModal
          food={reserveItem}
          customerProfile={profile}
          onClose={() => setReserveItem(null)}
          onOrderSuccess={handleOrderSuccess}
        />
      )}
    </CustomerLayout>
  );
}

