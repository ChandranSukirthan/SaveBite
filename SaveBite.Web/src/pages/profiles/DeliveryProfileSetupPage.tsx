import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createDeliveryPersonProfile } from "../../services/profileService";
import { useAuth } from "../../hooks/useAuth";

const VEHICLE_OPTIONS = [
  "Bicycle",
  "Electric Bike",
  "Motorcycle",
  "Scooter",
  "Car",
];

export function DeliveryProfileSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [vehicleType, setVehicleType] = useState(VEHICLE_OPTIONS[0]);
  const [vehicleNumber, setVehicleNumber] = useState("");
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

    if (!phoneNumber.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!vehicleType.trim()) {
      setError("Vehicle type is required.");
      return;
    }

    if (!vehicleNumber.trim()) {
      setError("Vehicle registration / identifier is required.");
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
      await createDeliveryPersonProfile({
        phoneNumber: phoneNumber.trim(),
        vehicleType: vehicleType.trim(),
        vehicleNumber: vehicleNumber.trim(),
        latitude: lat,
        longitude: lng,
      });

      navigate("/delivery/dashboard", { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Failed to create delivery profile. Please check your details.";
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
          <h1>Delivery Partner Setup</h1>
          <p>Register your vehicle & location to receive automated AI delivery dispatches.</p>
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
              placeholder="+1 (555) 987-6543"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="vehicleType">Vehicle Type *</label>
            <select
              id="vehicleType"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid var(--grey-200, #e0e0e0)",
                borderRadius: "10px",
                fontFamily: "var(--font-family, sans-serif)",
                fontSize: "14px",
                background: "var(--grey-100, #f4f4f4)",
                outline: "none",
              }}
            >
              {VEHICLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="vehicleNumber">Vehicle Registration / ID Number *</label>
            <input
              id="vehicleNumber"
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. NY-98421 or BIKE-04"
              required
              disabled={loading}
            />
          </div>

          {/* Location & GPS */}
          <div style={{ background: "var(--grey-100, #f4f4f4)", padding: "16px", borderRadius: "12px", border: "1px solid var(--grey-200, #e0e0e0)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--black, #0f0f0f)" }}>📍 Starting Location (GPS)</span>
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
            🚴 You can toggle your availability on/off anytime from your driver dashboard.
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
            style={{ marginTop: "12px" }}
          >
            {loading ? "Registering Rider..." : "Save & Open Delivery Dashboard →"}
          </button>
        </form>

        <div className="auth-role" style={{ marginTop: "16px" }}>
          Rider: <strong>{user?.fullName}</strong> ({user?.email})
        </div>
      </section>
    </main>
  );
}

export default DeliveryProfileSetupPage;
