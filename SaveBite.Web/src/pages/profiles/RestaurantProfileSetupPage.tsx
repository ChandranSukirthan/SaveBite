import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createRestaurantProfile } from "../../services/profileService";
import { useAuth } from "../../hooks/useAuth";

export function RestaurantProfileSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [restaurantName, setRestaurantName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<string>("40.7128");
  const [longitude, setLongitude] = useState<string>("-74.0060");

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
        setError(`Location access denied (${err.message}). Using default coordinates.`);
        setGpsLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!restaurantName.trim()) {
      setError("Restaurant name is required.");
      return;
    }

    if (!phoneNumber.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!address.trim()) {
      setError("Restaurant address is required.");
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

    try {
      setLoading(true);
      await createRestaurantProfile({
        restaurantName: restaurantName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        description: description.trim(),
        latitude: lat,
        longitude: lng,
      });

      navigate("/restaurant/dashboard", { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Failed to create restaurant profile. Please check your details.";
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
          <h1>Register Your Kitchen</h1>
          <p>Provide your restaurant location and details to start listing surplus meals.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="restaurantName">Restaurant Name *</label>
            <input
              id="restaurantName"
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. Green Leaf Bistro & Bakery"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Contact Phone Number *</label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 123-4567"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Physical Address *</label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="456 Broadway Ave, New York, NY"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Restaurant Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Artisan sourdough bakery and Mediterranean lunch spot reducing food waste daily."
              disabled={loading}
              rows={3}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid var(--grey-200, #e0e0e0)",
                borderRadius: "10px",
                fontFamily: "var(--font-family, sans-serif)",
                fontSize: "14px",
                resize: "vertical",
                background: "var(--grey-100, #f4f4f4)",
                outline: "none",
              }}
            />
          </div>

          {/* Location & GPS */}
          <div style={{ background: "var(--grey-100, #f4f4f4)", padding: "16px", borderRadius: "12px", border: "1px solid var(--grey-200, #e0e0e0)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--black, #0f0f0f)" }}>📍 Kitchen Location (GPS)</span>
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
                {gpsLoading ? "Detecting..." : "Detect Location"}
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

          <div style={{ background: "#fef9e7", padding: "12px 16px", borderRadius: "10px", border: "1px solid #fde68a", fontSize: "12px", color: "#92400e" }}>
            ℹ️ New restaurants are placed under pending approval by default until verified by admin.
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
            style={{ marginTop: "12px" }}
          >
            {loading ? "Registering Kitchen..." : "Save & Open Restaurant Dashboard →"}
          </button>
        </form>

        <div className="auth-role" style={{ marginTop: "16px" }}>
          Owner: <strong>{user?.fullName}</strong> ({user?.email})
        </div>
      </section>
    </main>
  );
}

export default RestaurantProfileSetupPage;
