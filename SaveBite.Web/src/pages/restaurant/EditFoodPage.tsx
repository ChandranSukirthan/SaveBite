import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RestaurantLayout } from "../../components/layout/RestaurantLayout";
import { getFoodById, updateFood } from "../../services/restaurantService";
import type { CreateFoodPayload } from "../../types/restaurant";

const CATEGORIES = [
  "Bakery",
  "Prepared Meals",
  "Fresh Produce",
  "Groceries",
  "Desserts",
  "Dairy & Drinks",
  "Beverages",
];

export function EditFoodPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  function toLocalInputString(dateStr: string) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  const [formData, setFormData] = useState<CreateFoodPayload>({
    name: "",
    description: "",
    category: "Bakery",
    quantity: 1,
    price: 0,
    availableFrom: "",
    availableUntil: "",
    latitude: 0,
    longitude: 0,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      try {
        setLoading(true);
        const food = await getFoodById(id);
        setFormData({
          name: food.name,
          description: food.description || "",
          category: food.category,
          quantity: food.quantity,
          price: food.price,
          availableFrom: toLocalInputString(food.availableFrom),
          availableUntil: toLocalInputString(food.availableUntil),
          latitude: food.location?.coordinates?.[1] || 0,
          longitude: food.location?.coordinates?.[0] || 0,
        });
      } catch (err: any) {
        console.error("Failed to load food item for edit:", err);
        setError("Unable to find surplus food listing.");
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);

    if (!formData.name.trim()) {
      setError("Please enter a food item name.");
      return;
    }
    if (formData.quantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    if (formData.price < 0) {
      setError("Price cannot be negative.");
      return;
    }

    const fromTime = new Date(formData.availableFrom).getTime();
    const untilTime = new Date(formData.availableUntil).getTime();

    if (isNaN(fromTime) || isNaN(untilTime)) {
      setError("Please specify valid available from and until dates.");
      return;
    }

    if (untilTime <= fromTime) {
      setError("Available Until must be set to a time after Available From.");
      return;
    }

    try {
      setSubmitting(true);
      await updateFood(id, {
        ...formData,
        availableFrom: new Date(formData.availableFrom).toISOString(),
        availableUntil: new Date(formData.availableUntil).toISOString(),
      });
      navigate("/restaurant/food");
    } catch (err: any) {
      console.error("Update food error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to update food listing. Please check the inputs."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RestaurantLayout>
      <div className="rst-dashboard">
        <div className="rst-page-header">
          <div>
            <h1 className="rst-page-title">Edit Surplus Food Listing</h1>
            <p className="rst-page-subtitle">
              Update inventory, pricing, or extend availability windows for this listing.
            </p>
          </div>
          <div className="rst-page-actions">
            <Link to="/restaurant/food" className="rst-btn-outline">
              ← Back to Listings
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="rst-empty-text">Loading listing data...</p>
        ) : (
          <form onSubmit={handleSubmit} className="rst-form-card">
            <div className="rst-card-header">
              <h3>Edit Listing Details</h3>
              <span className="rst-badge">ID: {id}</span>
            </div>

            {error && (
              <div className="rst-banner rst-banner--warning" style={{ marginBottom: "16px" }}>
                <div className="rst-banner-icon">⚠️</div>
                <div className="rst-banner-content">
                  <strong>Update Error:</strong> {error}
                </div>
              </div>
            )}

            <div className="rst-form-grid">
              {/* NAME */}
              <div className="rst-form-group rst-col-span-2">
                <label className="rst-form-label">FOOD ITEM NAME *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="rst-input"
                />
              </div>

              {/* CATEGORY */}
              <div className="rst-form-group">
                <label className="rst-form-label">FOOD CATEGORY *</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="rst-select"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* QUANTITY */}
              <div className="rst-form-group">
                <label className="rst-form-label">PORTIONS / QUANTITY AVAILABLE *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="rst-input"
                />
              </div>

              {/* PRICE */}
              <div className="rst-form-group">
                <label className="rst-form-label">RESCUE PRICE ($ USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="rst-input"
                />
              </div>

              {/* DESCRIPTION */}
              <div className="rst-form-group rst-col-span-2">
                <label className="rst-form-label">DESCRIPTION & INGREDIENTS</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="rst-textarea"
                />
              </div>

              {/* TIME INPUTS */}
              <div className="rst-form-group rst-col-span-2">
                <label className="rst-form-label">AVAILABILITY WINDOW *</label>
                <div className="rst-time-inputs-grid">
                  <div>
                    <span className="rst-field-label">Available From</span>
                    <input
                      type="datetime-local"
                      required
                      value={formData.availableFrom}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          availableFrom: e.target.value,
                        })
                      }
                      className="rst-input"
                    />
                  </div>
                  <div>
                    <span className="rst-field-label">Available Until</span>
                    <input
                      type="datetime-local"
                      required
                      value={formData.availableUntil}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          availableUntil: e.target.value,
                        })
                      }
                      className="rst-input"
                    />
                  </div>
                </div>
              </div>

              {/* LOCATION INPUTS */}
              <div className="rst-form-group rst-col-span-2">
                <label className="rst-form-label">PICKUP GEO-COORDINATES *</label>
                <div className="rst-time-inputs-grid">
                  <div>
                    <span className="rst-field-label">Latitude</span>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={formData.latitude}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          latitude: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="rst-input"
                    />
                  </div>
                  <div>
                    <span className="rst-field-label">Longitude</span>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={formData.longitude}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          longitude: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="rst-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rst-form-footer">
              <Link to="/restaurant/food" className="rst-btn-outline">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="rst-btn-solid"
              >
                {submitting ? "Saving Changes..." : "💾 Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </RestaurantLayout>
  );
}

export default EditFoodPage;

