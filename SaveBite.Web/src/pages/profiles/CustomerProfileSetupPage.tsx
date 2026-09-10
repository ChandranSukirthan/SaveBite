import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createCustomerProfile } from "../../services/profileService";
import { useAuth } from "../../hooks/useAuth";

const AVAILABLE_CATEGORIES = [
  "Bakery",
  "Prepared Meals",
  "Fresh Produce",
  "Groceries",
  "Desserts",
  "Dairy & Drinks",
];

export function CustomerProfileSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<string>("40.7128");
  const [longitude, setLongitude] = useState<string>("-74.0060");
  const [preferredCategories, setPreferredCategories] = useState<string[]>([
    "Prepared Meals",
    "Bakery",
  ]);
  const [maximumBudget, setMaximumBudget] = useState<string>("25.00");

  const [gpsLoading, setGpsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      (err) => {
        setError(`Location access denied or unavailable (${err.message}). Coordinates set to default.`);
        setGpsLoading(false);
      },
      { timeout: 8000 },
    );
  };

  const toggleCategory = (cat: string) => {
    setPreferredCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!phoneNumber.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!address.trim()) {
      setError("Delivery address is required.");
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError("Please enter a valid latitude (-90 to 90).");
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError("Please enter a valid longitude (-180 to 180).");
      return;
    }

    const budget = parseFloat(maximumBudget);
    if (isNaN(budget) || budget < 0) {
      setError("Maximum budget cannot be negative.");
      return;
    }

    try {
      setLoading(true);
      await createCustomerProfile({
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        preferredCategories,
        maximumBudget: budget,
      });

      navigate("/customer/dashboard", { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Failed to create profile. Please check your details.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page" style={{ padding: "40px 16px" }}>
      <section className="auth-card" style={{ maxWidth: "560px" }}>
        <div className="auth-header" style={{ marginBottom: "20px" }}>
          <p className="auth-brand">MILESTONE 5 — PROFILE SETUP</p>
          <h1>Complete Customer Profile</h1>
          <p>Tell us your location & food preferences to find nearby surplus meals.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number *</label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 000-0000"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Delivery Address *</label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Green St, Apt 4B, New York, NY"
              required
              disabled={loading}
            />
          </div>

          {/* Location & GPS */}
          <div style={{ background: "var(--grey-100, #f4f4f4)", padding: "16px", borderRadius: "12px", border: "1px solid var(--grey-200, #e0e0e0)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--black, #0f0f0f)" }}>📍 GPS Coordinates</span>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={gpsLoading || loading}
                style={{
                  background: "var(--yellow, #f5c518)",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {gpsLoading ? "Detecting..." : "Detect My Location"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="form-group">
                <label htmlFor="latitude" style={{ fontSize: "11px" }}>Latitude</label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="longitude" style={{ fontSize: "11px" }}>Longitude</label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Preferred categories */}
          <div className="form-group">
            <label>Food Preferences</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
              {AVAILABLE_CATEGORIES.map((cat) => {
                const isSelected = preferredCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: isSelected ? "2px solid var(--yellow, #f5c518)" : "1.5px solid var(--grey-200, #e0e0e0)",
                      background: isSelected ? "var(--yellow-light, #fef9e7)" : "white",
                      color: isSelected ? "var(--black, #0f0f0f)" : "var(--grey-600, #555555)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cat} {isSelected ? "✓" : "+"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget */}
          <div className="form-group">
            <label htmlFor="maximumBudget">Maximum Meal Budget ($)</label>
            <input
              id="maximumBudget"
              type="number"
              step="0.50"
              min="0"
              value={maximumBudget}
              onChange={(e) => setMaximumBudget(e.target.value)}
              placeholder="25.00"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
            style={{ marginTop: "12px" }}
          >
            {loading ? "Saving Profile..." : "Save & Open Customer Dashboard →"}
          </button>
        </form>

        <div className="auth-role" style={{ marginTop: "16px" }}>
          Logged in as <strong>{user?.fullName}</strong> ({user?.email})
        </div>
      </section>
    </main>
  );
}

export default CustomerProfileSetupPage;
