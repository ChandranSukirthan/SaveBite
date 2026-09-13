import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { getCustomerProfile } from "../../services/profileService";
import { searchNearbyFood } from "../../services/customerService";
import type { CustomerProfile } from "../../types/profile";
import type { DiscoveredFoodItem, FoodSortOption } from "../../types/customer";
import { CustomerReserveModal } from "../../components/customer/CustomerReserveModal";
import { RestaurantDetailsModal } from "../../components/customer/RestaurantDetailsModal";
import { FoodDiscoveryMap } from "../../components/customer/FoodDiscoveryMap";
import { FoodCardSkeleton } from "../../components/common/Skeleton";
import { NoFoodEmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Pagination } from "../../components/common/Pagination";
import { FoodCard, getCategoryIcon } from "../../components/food/FoodCard";
import { useDebounce } from "../../hooks/useDebounce";

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

  // Search input and debounced search query (350ms)
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 350);

  // Filter & Pagination state
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [radiusKm, setRadiusKm] = useState(15);
  const [maxPrice, setMaxPrice] = useState<number>(30);
  const [sortBy, setSortBy] = useState<FoodSortOption>("distance");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Modals state
  const [reserveItem, setReserveItem] = useState<DiscoveredFoodItem | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // AbortController ref for in-flight request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Fetch foods from C# API with request cancellation
  const fetchSurplusFood = useCallback(async () => {
    // Abort any prior pending in-flight search request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const items = await searchNearbyFood(
        {
          latitude: customerLat,
          longitude: customerLng,
          radiusInKilometers: radiusKm,
          category: selectedCategory === "All" ? undefined : selectedCategory,
          maxPrice: maxPrice > 0 ? maxPrice : undefined,
        },
        controller.signal
      );
      setAllFoods(items);
      setCurrentPage(1);
    } catch (err: any) {
      // Ignore cancellations cleanly
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
        return;
      }
      setError(
        err.response?.data?.message ||
          "Failed to discover nearby food. Please ensure backend is running."
      );
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [customerLat, customerLng, radiusKm, selectedCategory, maxPrice]);

  useEffect(() => {
    fetchSurplusFood();

    return () => {
      // Cancel pending request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSurplusFood]);

  // Client-side text search & sorting (memoized)
  const filteredAndSortedFoods = useMemo(() => {
    let result = [...allFoods];

    // Search query filter (name, description, restaurantName, category)
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().trim();
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
  }, [allFoods, debouncedSearchQuery, sortBy]);

  // Sliced paginated foods for grid view
  const paginatedFoods = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedFoods.slice(start, start + pageSize);
  }, [filteredAndSortedFoods, currentPage, pageSize]);

  // Stable handlers for memoized children
  const handleReserve = useCallback((item: DiscoveredFoodItem) => {
    setReserveItem(item);
  }, []);

  const handleSelectRestaurant = useCallback((restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
  }, []);

  const handleOrderCreated = useCallback(() => {
    setOrderSuccessMsg("🎉 Portion successfully reserved! The kitchen is preparing it.");
    setReserveItem(null);
    fetchSurplusFood();
    setTimeout(() => setOrderSuccessMsg(null), 6000);
  }, [fetchSurplusFood]);

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
          {/* Debounced Search Input */}
          <div className="fd-search-box">
            <span className="fd-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by food name, bakery, chef, or ingredients..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="fd-search-input"
            />
            {searchInput && (
              <button
                type="button"
                className="fd-search-clear"
                onClick={() => setSearchInput("")}
                title="Clear search"
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
          <div style={{ marginBottom: "20px" }}>
            <ErrorState inline title="Search Failed" message={error} onRetry={fetchSurplusFood} />
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            <FoodCardSkeleton />
            <FoodCardSkeleton />
            <FoodCardSkeleton />
            <FoodCardSkeleton />
            <FoodCardSkeleton />
            <FoodCardSkeleton />
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
                onSelectFood={handleReserve}
                onSelectRestaurant={handleSelectRestaurant}
              />
            ) : (
              <>
                {filteredAndSortedFoods.length === 0 ? (
                  <NoFoodEmptyState
                    onExpandRadius={() => setRadiusKm(50)}
                    onResetFilters={() => {
                      setSelectedCategory("All");
                      setSearchInput("");
                      setMaxPrice(50);
                    }}
                  />
                ) : (
                  <>
                    <div className="fd-grid">
                      {paginatedFoods.map((food) => (
                        <FoodCard
                          key={food.id}
                          food={food}
                          onReserve={handleReserve}
                          onSelectRestaurant={handleSelectRestaurant}
                        />
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    <Pagination
                      currentPage={currentPage}
                      totalItems={filteredAndSortedFoods.length}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                      pageSizeOptions={[6, 12, 24]}
                      itemLabel="meals"
                      className="fd-pagination-container"
                    />
                  </>
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

      {/* Restaurant Info & Location Modal */}
      {selectedRestaurantId && (
        <RestaurantDetailsModal
          restaurantId={selectedRestaurantId}
          availableFoods={filteredAndSortedFoods}
          onSelectFood={handleReserve}
          onClose={() => setSelectedRestaurantId(null)}
        />
      )}
    </CustomerLayout>
  );
}

export default FoodDiscoveryPage;
