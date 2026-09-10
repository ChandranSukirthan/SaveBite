import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { getCustomerProfile } from "../../services/profileService";
import { searchNearbyFood } from "../../services/customerService";
import type { CustomerProfile } from "../../types/profile";
import type { DiscoveredFoodItem, FoodSortOption } from "../../types/customer";
import { CountdownTimer } from "../../components/food/CountdownTimer";
import { CustomerReserveModal } from "../../components/customer/CustomerReserveModal";
import { RestaurantDetailsModal } from "../../components/customer/RestaurantDetailsModal";
import { FoodDiscoveryMap } from "../../components/customer/FoodDiscoveryMap";

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

const RADIUS_OPTIONS = [1, 3, 5, 10, 15, 25, 50];

export function FoodDiscoveryPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [allFoods, setAllFoods] = useState<DiscoveredFoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [radiusKm, setRadiusKm] = useState(15);
  const [maxPrice, setMaxPrice] = useState<number>(30);
  const [sortBy, setSortBy] = useState<FoodSortOption>("distance");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // Modals state
  const [reserveItem, setReserveItem] = useState<DiscoveredFoodItem | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Effective customer coordinates
  const customerLat = profile?.location?.coordinates?.[1] || 40.7135;
  const customerLng = profile?.location?.coordinates?.[0] || -74.0050;
  const customerAddress = profile?.address || "Downtown, New York, NY";

  // Load customer profile
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
      .catch(() => {
        // Fallback default
      });
  }, []);

  // Fetch foods from C# API
  const fetchSurplusFood = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await searchNearbyFood({
        latitude: customerLat,
        longitude: customerLng,
        radiusInKilometers: radiusKm,
        category: selectedCategory === "All" ? undefined : selectedCategory,
        maxPrice: maxPrice > 0 ? maxPrice : undefined,
      });
      setAllFoods(items);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to discover nearby food. Please ensure backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurplusFood();
  }, [customerLat, customerLng, radiusKm, selectedCategory, maxPrice]);

  // Client-side text search & sorting
  const filteredAndSortedFoods = useMemo(() => {
    let result = [...allFoods];

    // Search query filter (name, description, restaurantName)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.restaurant?.restaurantName?.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "distance":
          return (a.distanceInKilometers || 0) - (b.distanceInKilometers || 0);
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "ending-soon": {
          const tA = new Date(a.availableUntil).getTime();
          const tB = new Date(b.availableUntil).getTime();
          return tA - tB;
        }
        case "quantity":
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });

    return result;
  }, [allFoods, searchQuery, sortBy]);

  const handleOrderCreated = () => {
    setOrderSuccessMsg("🎉 Portion successfully reserved! The kitchen is preparing it.");
    setReserveItem(null);
    fetchSurplusFood();
    setTimeout(() => setOrderSuccessMsg(null), 6000);
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

  return (
    <CustomerLayout>
      <div className="fd-container">
        {/* Page Header */}
        <div className="fd-header">
          <div className="fd-header-left">
            <span className="fd-badge">🛒 SURPLUS RESCUE MARKET</span>
            <h1 className="fd-title">Explore Nearby Surplus Food</h1>
            <p className="fd-subtitle">
              Browse discounted surplus meals from verified local restaurants around{" "}
              <strong>{customerAddress}</strong>.
            </p>
          </div>

          {/* View Mode Switcher: Grid vs Map */}
          <div className="fd-view-toggle">
            <button
              type="button"
              className={`fd-view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              📋 Grid View
            </button>
            <button
              type="button"
              className={`fd-view-btn ${viewMode === "map" ? "active" : ""}`}
              onClick={() => setViewMode("map")}
            >
              🛰️ Radar Map
            </button>
          </div>
        </div>

        {orderSuccessMsg && (
          <div className="cst-alert-success">
            {orderSuccessMsg}
          </div>
        )}

        {/* Filter & Search Bar Toolbar */}
        <div className="fd-controls-bar">
          {/* Search Input */}
          <div className="fd-search-box">
            <span className="fd-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by food name, bakery, chef, or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="fd-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="fd-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          {/* Controls Cluster */}
          <div className="fd-filters-cluster">
            {/* Radius Selector */}
            <div className="fd-control-item">
              <label htmlFor="radius-select" className="fd-control-label">
                📍 Radius
              </label>
              <select
                id="radius-select"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="fd-select"
              >
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    Within {r} km
                  </option>
                ))}
              </select>
            </div>

            {/* Max Price Filter */}
            <div className="fd-control-item">
              <label htmlFor="price-range" className="fd-control-label">
                💰 Max Price: <strong>${maxPrice}</strong>
              </label>
              <input
                id="price-range"
                type="range"
                min="3"
                max="50"
                step="1"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="fd-range-slider"
              />
            </div>

            {/* Sorting Dropdown */}
            <div className="fd-control-item">
              <label htmlFor="sort-select" className="fd-control-label">
                ⚡ Sort By
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as FoodSortOption)}
                className="fd-select"
              >
                <option value="distance">Nearest Distance First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="ending-soon">Ending Soonest</option>
                <option value="quantity">Most Portions Available</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Horizontal Pills */}
        <div className="fd-categories-bar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`fd-cat-pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              <span className="fd-cat-icon">{getCategoryIcon(cat)}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Status Count & Summary */}
        <div className="fd-results-summary">
          <span>
            Found <strong>{filteredAndSortedFoods.length}</strong> surplus meals available within{" "}
            <strong>{radiusKm} km</strong>
            {selectedCategory !== "All" && ` in ${selectedCategory}`}
          </span>
          <button
            type="button"
            className="fd-refresh-btn"
            onClick={fetchSurplusFood}
            disabled={loading}
          >
            🔄 Refresh Listings
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="cst-alert-danger">
            ⚠️ {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="fd-loading-card">
            <div className="spinner-border text-warning" role="status" />
            <p>Scanning nearby verified restaurants for surplus portions...</p>
          </div>
        )}

        {/* Main Content: Map or Grid */}
        {!loading && (
          <>
            {viewMode === "map" ? (
              <FoodDiscoveryMap
                customerLocation={{
                  latitude: customerLat,
                  longitude: customerLng,
                  address: customerAddress,
                }}
                radiusKm={radiusKm}
                foodItems={filteredAndSortedFoods}
                onSelectFood={(item) => setReserveItem(item)}
                onSelectRestaurant={(restId) => setSelectedRestaurantId(restId)}
              />
            ) : (
              <>
                {filteredAndSortedFoods.length === 0 ? (
                  <div className="fd-empty-card">
                    <span className="fd-empty-icon">🍽️</span>
                    <h3>No Surplus Food Found Nearby</h3>
                    <p>
                      We couldn't find any surplus food matching your current filters within{" "}
                      {radiusKm} km.
                    </p>
                    <div className="fd-empty-actions">
                      <button
                        type="button"
                        className="fd-btn-action"
                        onClick={() => {
                          setSelectedCategory("All");
                          setSearchQuery("");
                          setMaxPrice(50);
                          setRadiusKm(50);
                        }}
                      >
                        Expand Search to 50 km
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="fd-grid">
                    {filteredAndSortedFoods.map((food) => (
                      <div key={food.id} className="fd-food-card">
                        {/* Food Card Top Bar */}
                        <div className="fd-card-top">
                          <span className="fd-category-pill">
                            {getCategoryIcon(food.category)} {food.category}
                          </span>
                          <span className="fd-distance-pill">
                            📍 {food.distanceInKilometers} km
                          </span>
                        </div>

                        {/* Title & Description */}
                        <Link to={`/customer/food/${food.id}`} className="fd-card-title-link">
                          <h3 className="fd-card-title">{food.name}</h3>
                        </Link>
                        <p className="fd-card-desc">{food.description}</p>

                        {/* Restaurant Info (Clickable) */}
                        <div
                          className="fd-restaurant-box"
                          onClick={() =>
                            food.restaurant?.id &&
                            setSelectedRestaurantId(food.restaurant.id)
                          }
                          title="Click to view restaurant details & address"
                        >
                          <span className="fd-rest-icon">🏪</span>
                          <div className="fd-rest-details">
                            <span className="fd-rest-name">
                              {food.restaurant?.restaurantName || "Partner Restaurant"}
                            </span>
                            <span className="fd-rest-addr">
                              {food.restaurant?.address}
                            </span>
                          </div>
                          <span className="fd-rest-arrow">ℹ️</span>
                        </div>

                        {/* Availability & Countdown Timer */}
                        <div className="fd-timer-row">
                          <span className="fd-timer-label">⏰ Pickup Window:</span>
                          <CountdownTimer availableUntil={food.availableUntil} />
                        </div>

                        {/* Card Footer: Price & Reservation CTA */}
                        <div className="fd-card-footer">
                          <div className="fd-price-stack">
                            <span className="fd-price-val">${food.price.toFixed(2)}</span>
                            <span className="fd-qty-pill">
                              {food.quantity} left
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <Link
                              to={`/customer/food/${food.id}`}
                              className="fd-details-btn"
                            >
                              Details
                            </Link>
                            <button
                              type="button"
                              className="fd-reserve-cta"
                              onClick={() => setReserveItem(food)}
                            >
                              Reserve ➔
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
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
          onOrderSuccess={handleOrderCreated}
        />
      )}

      {/* Restaurant Details Modal */}
      {selectedRestaurantId && (
        <RestaurantDetailsModal
          restaurantId={selectedRestaurantId}
          onClose={() => setSelectedRestaurantId(null)}
          availableFoods={allFoods}
          onSelectFood={(item) => setReserveItem(item)}
        />
      )}
    </CustomerLayout>
  );
}
