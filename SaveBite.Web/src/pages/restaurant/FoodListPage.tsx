import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RestaurantLayout } from "../../components/layout/RestaurantLayout";
import { getMyFood, deleteFood } from "../../services/restaurantService";
import type { FoodItem } from "../../types/restaurant";
import { CountdownTimer } from "../../components/food/CountdownTimer";
import { FoodDetailsModal } from "../../components/food/FoodDetailsModal";
import { FoodDeleteModal } from "../../components/food/FoodDeleteModal";

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

export function FoodListPage() {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Modals state
  const [activeItemDetails, setActiveItemDetails] = useState<FoodItem | null>(null);
  const [activeItemDelete, setActiveItemDelete] = useState<FoodItem | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getMyFood();
      setFoodItems(data);
    } catch (err) {
      console.error("Failed to load restaurant surplus food:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter food items
  const filteredFood = foodItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;

    const matchesStatus =
      statusFilter === "All" ||
      item.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const availableCount = foodItems.filter((f) => f.status === "Available").length;
  const expiredCount = foodItems.filter((f) => f.status === "Expired").length;

  return (
    <RestaurantLayout>
      <div className="rst-dashboard">
        {/* PAGE HEADER */}
        <div className="rst-page-header">
          <div>
            <h1 className="rst-page-title">Surplus Food Listings</h1>
            <p className="rst-page-subtitle">
              Manage live surplus portions, set rescue prices, and control pickup timeframes.
            </p>
          </div>
          <div className="rst-page-actions">
            <Link to="/restaurant/food/new" className="rst-btn-solid">
              ➕ Add Surplus Food
            </Link>
          </div>
        </div>

        {/* TOOLBAR & FILTERS */}
        <div className="rst-card" style={{ padding: "16px 20px" }}>
          <div className="rst-food-toolbar">
            {/* SEARCH INPUT */}
            <div className="rst-search-wrapper">
              <span className="rst-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search food listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rst-search-input"
              />
            </div>

            {/* CATEGORY SELECTOR */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="rst-field-label" style={{ margin: 0 }}>Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rst-filter-select"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* STATUS FILTER BUTTONS */}
            <div className="rst-status-tabs">
              <button
                type="button"
                className={`rst-btn-tab ${statusFilter === "All" ? "rst-btn-tab--active" : ""}`}
                onClick={() => setStatusFilter("All")}
              >
                All ({foodItems.length})
              </button>
              <button
                type="button"
                className={`rst-btn-tab ${statusFilter === "Available" ? "rst-btn-tab--active" : ""}`}
                onClick={() => setStatusFilter("Available")}
              >
                Available ({availableCount})
              </button>
              <button
                type="button"
                className={`rst-btn-tab ${statusFilter === "Expired" ? "rst-btn-tab--active" : ""}`}
                onClick={() => setStatusFilter("Expired")}
              >
                Expired ({expiredCount})
              </button>
            </div>
          </div>
        </div>

        {/* FOOD TABLE / CARD LIST */}
        <div className="rst-card">
          <div className="rst-card-header">
            <h3>Active Listings ({filteredFood.length})</h3>
            <span className="rst-badge">MongoDB Live Sync</span>
          </div>

          {loading ? (
            <p className="rst-empty-text">Loading surplus food items...</p>
          ) : filteredFood.length === 0 ? (
            <div className="rst-empty-state">
              <span style={{ fontSize: "42px" }}>🍲</span>
              <p style={{ fontWeight: 800, fontSize: "16px", margin: "8px 0 4px" }}>
                No surplus food items found
              </p>
              <p className="rst-empty-text">
                {searchQuery || selectedCategory !== "All" || statusFilter !== "All"
                  ? "Try changing your search keywords or filter settings."
                  : "List unsold portions from your daily batch before they expire."}
              </p>
              <Link
                to="/restaurant/food/new"
                className="rst-btn-solid"
                style={{ marginTop: "16px" }}
              >
                ➕ Create First Listing
              </Link>
            </div>
          ) : (
            <div className="rst-table-wrapper">
              <table className="rst-table">
                <thead>
                  <tr>
                    <th>Food Item</th>
                    <th>Category</th>
                    <th>Portions</th>
                    <th>Rescue Price</th>
                    <th>Availability / Timer</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFood.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong style={{ fontSize: "14px", display: "block" }}>
                          {item.name}
                        </strong>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--grey-600)",
                            maxWidth: "240px",
                            display: "inline-block",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.description}
                        </span>
                      </td>
                      <td>
                        <span className="rst-cat-tag">{item.category}</span>
                      </td>
                      <td>
                        <strong>{item.quantity}</strong> portions
                      </td>
                      <td>
                        <strong style={{ color: "var(--yellow-dark)", fontSize: "14px" }}>
                          ${item.price?.toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        <CountdownTimer availableUntil={item.availableUntil} />
                      </td>
                      <td>
                        <span className={`rst-status-pill rst-status-pill--${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="rst-btn-icon"
                            onClick={() => setActiveItemDetails(item)}
                            title="View details"
                          >
                            👁️
                          </button>
                          <Link
                            to={`/restaurant/food/${item.id}/edit`}
                            className="rst-btn-icon"
                            title="Edit listing"
                          >
                            ✏️
                          </Link>
                          <button
                            type="button"
                            className="rst-btn-icon rst-btn-icon--danger"
                            onClick={() => setActiveItemDelete(item)}
                            title="Delete listing"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DETAILS MODAL */}
        {activeItemDetails && (
          <FoodDetailsModal
            item={activeItemDetails}
            onClose={() => setActiveItemDetails(null)}
            onDelete={(item) => {
              setActiveItemDetails(null);
              setActiveItemDelete(item);
            }}
          />
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {activeItemDelete && (
          <FoodDeleteModal
            item={activeItemDelete}
            onClose={() => setActiveItemDelete(null)}
            onSuccess={() => {
              loadData();
            }}
            onDeleteApi={deleteFood}
          />
        )}
      </div>
    </RestaurantLayout>
  );
}

export default FoodListPage;
