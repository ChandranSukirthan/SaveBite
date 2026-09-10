import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RestaurantLayout } from "../../components/layout/RestaurantLayout";
import { createFood } from "../../services/restaurantService";
import { getRestaurantProfile } from "../../services/profileService";
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

export function AddFoodPage() {
  const navigate = useNavigate();

  // Helper to format ISO date to datetime-local string (YYYY-MM-DDTHH:mm)
  function toLocalInputString(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  const defaultFrom = new Date();
  const defaultUntil = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours later

  const [formData, setFormData] = useState<CreateFoodPayload>({
    name: "",
    description: "",
    category: "Bakery",
    quantity: 5,
    price: 4.99,
    availableFrom: toLocalInputString(defaultFrom),
    availableUntil: toLocalInputString(defaultUntil),
    latitude: 40.7128,
    longitude: -74.006,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto load restaurant coordinates
  useEffect(() => {
    async function loadCoords() {
      try {
        const profile = await getRestaurantProfile();
        if (profile?.location?.coordinates) {
          setFormData((prev) => ({
            ...prev,
            longitude: profile.location.coordinates[0],
            latitude: profile.location.coordinates[1],
          }));
        }
      } catch (err) {
        console.error("Could not prefill restaurant coordinates:", err);
      }
    }
    loadCoords();
  }, []);

  // Preset button handlers
  const applyDurationPreset = (hours: number) => {
    const fromDate = new Date();
    const untilDate = new Date(Date.now() + hours * 60 * 60 * 1000);
    setFormData((prev) => ({
      ...prev,
      availableFrom: toLocalInputString(fromDate),
      availableUntil: toLocalInputString(untilDate),
    }));
  };

  const applyEndOfDayPreset = () => {
    const fromDate = new Date();
    const untilDate = new Date();
    untilDate.setHours(23, 0, 0, 0); // 11:00 PM tonight
    setFormData((prev) => ({
      ...prev,
      availableFrom: toLocalInputString(fromDate),
      availableUntil: toLocalInputString(untilDate),
    }));
  };

  const detectGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
      },
      (err) => {
        alert("Failed to retrieve GPS location: " + err.message);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
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
      await createFood({
        ...formData,
        availableFrom: new Date(formData.availableFrom).toISOString(),
        availableUntil: new Date(formData.availableUntil).toISOString(),
      });
      navigate("/restaurant/food");
    } catch (err: any) {
      console.error("Create food error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to create food listing. Please check the inputs."
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
            <h1 className="rst-page-title">Add Surplus Food Listing</h1>
            <p className="rst-page-subtitle">
              Publish fresh surplus portions from your kitchen before the pickup window expires.
            </p>
          </div>
          <div className="rst-page-actions">
            <Link to="/restaurant/food" className="rst-btn-outline">
              ← Back to Listings
            </Link>
          </div>
        </div>

        {error && (
          <div className="rst-banner rst-banner--warning">
            <div className="rst-banner-icon">⚠️</div>
            <div className="rst-banner-content">
              <strong>Listing Error:</strong> {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rst-form-card">
          <div className="rst-card-header">
            <h3>Surplus Item Details</h3>
            <span className="rst-badge">New Listing</span>
          </div>

          <div className="rst-form-grid">
            {/* NAME */}
            <div className="rst-form-group rst-col-span-2">
              <label className="rst-form-label">FOOD ITEM NAME *</label>
              <input
                type="text"
                required
                placeholder="e.g. Sourdough Baguettes (Pack of 3) or Vegan Curry Bowl"
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
                placeholder="Include allergens, storage instructions, or heating recommendations."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="rst-textarea"
              />
            </div>

            {/* AVAILABILITY WINDOW & PRESETS */}
            <div className="rst-form-group rst-col-span-2">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "6px" }}>
                <label className="rst-form-label" style={{ margin: 0 }}>
                  AVAILABILITY & PICKUP WINDOW *
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <span style={{ fontSize: "11px", color: "var(--grey-600)", alignSelf: "center" }}>Quick presets:</span>
                  <button
                    type="button"
                    className="rst-preset-btn"
                    onClick={() => applyDurationPreset(2)}
                  >
                    +2 Hours
                  </button>
                  <button
                    type="button"
                    className="rst-preset-btn"
                    onClick={() => applyDurationPreset(4)}
                  >
                    +4 Hours
                  </button>
                  <button
                    type="button"
                    className="rst-preset-btn"
                    onClick={() => applyDurationPreset(6)}
                  >
                    +6 Hours
                  </button>
                  <button
                    type="button"
                    className="rst-preset-btn"
                    onClick={applyEndOfDayPreset}
                  >
                    End of Day
                  </button>
                </div>
              </div>

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

            {/* LOCATION COORDINATES */}
            <div className="rst-form-group rst-col-span-2">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <label className="rst-form-label" style={{ margin: 0 }}>
                  PICKUP GEO-COORDINATES *
                </label>
                <button
                  type="button"
                  className="rst-btn-outline"
                  style={{ padding: "4px 10px", fontSize: "11px" }}
                  onClick={detectGps}
                >
                  📍 Detect Current GPS
                </button>
              </div>

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
              {submitting ? "Publishing Listing..." : "🚀 Publish Surplus Food"}
            </button>
          </div>
        </form>
      </div>
    </RestaurantLayout>
  );
}

export default AddFoodPage;

