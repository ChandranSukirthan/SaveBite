import { useState } from "react";
import type { DiscoveredFoodItem } from "../../types/customer";

interface FoodDiscoveryMapProps {
  customerLocation: { latitude: number; longitude: number; address: string };
  radiusKm: number;
  foodItems: DiscoveredFoodItem[];
  onSelectFood: (item: DiscoveredFoodItem) => void;
  onSelectRestaurant: (restaurantId: string) => void;
}

export function FoodDiscoveryMap({
  customerLocation,
  radiusKm,
  foodItems,
  onSelectFood,
  onSelectRestaurant,
}: FoodDiscoveryMapProps) {
  const [selectedPinFood, setSelectedPinFood] = useState<DiscoveredFoodItem | null>(
    foodItems.length > 0 ? foodItems[0] : null
  );
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const effectiveRadius = Math.max(radiusKm / zoomLevel, 1);

  // Canvas dimensions
  const size = 600;
  const center = size / 2;
  const maxPixelRadius = center - 50;

  // Calculate pixel coordinates for an item
  const getPinCoordinates = (index: number, total: number, distanceKm: number) => {
    // Distribute angularly if coordinates aren't explicitly projected
    const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
    const normDist = Math.min(distanceKm / effectiveRadius, 1);
    const pixelDist = normDist * maxPixelRadius;
    const x = center + pixelDist * Math.cos(angle);
    const y = center + pixelDist * Math.sin(angle);
    return { x, y };
  };

  return (
    <div className="fd-map-container">
      <div className="fd-map-header">
        <div className="fd-map-title-wrap">
          <span className="fd-map-badge">🛰️ GEOSPATIAL RADAR</span>
          <h3 className="fd-map-title">Surplus Food Discovery Map</h3>
          <p className="fd-map-subtitle">
            Showing surplus meals within <strong>{radiusKm} km</strong> of{" "}
            <span className="fd-map-addr">{customerLocation.address}</span>
          </p>
        </div>

        <div className="fd-map-controls">
          <div className="fd-map-zoom-buttons">
            <button
              type="button"
              className="fd-zoom-btn"
              onClick={() => setZoomLevel((z) => Math.min(z + 0.5, 3))}
              title="Zoom In"
            >
              +
            </button>
            <span className="fd-zoom-label">{zoomLevel}x</span>
            <button
              type="button"
              className="fd-zoom-btn"
              onClick={() => setZoomLevel((z) => Math.max(z - 0.5, 0.5))}
              title="Zoom Out"
            >
              -
            </button>
          </div>
        </div>
      </div>

      <div className="fd-map-stage">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="fd-radar-svg"
          aria-label="Interactive surplus food radar map"
        >
          {/* Radial grid lines */}
          <circle cx={center} cy={center} r={maxPixelRadius * 0.25} className="fd-radar-ring" />
          <circle cx={center} cy={center} r={maxPixelRadius * 0.5} className="fd-radar-ring" />
          <circle cx={center} cy={center} r={maxPixelRadius * 0.75} className="fd-radar-ring" />
          <circle cx={center} cy={center} r={maxPixelRadius} className="fd-radar-ring outer" />

          {/* Crosshairs */}
          <line
            x1={center}
            y1={center - maxPixelRadius}
            x2={center}
            y2={center + maxPixelRadius}
            className="fd-radar-crosshair"
          />
          <line
            x1={center - maxPixelRadius}
            y1={center}
            x2={center + maxPixelRadius}
            y2={center}
            className="fd-radar-crosshair"
          />

          {/* Range text labels */}
          <text
            x={center + 8}
            y={center - maxPixelRadius * 0.5 + 4}
            className="fd-radar-text"
          >
            {(effectiveRadius * 0.5).toFixed(1)} km
          </text>
          <text
            x={center + 8}
            y={center - maxPixelRadius + 14}
            className="fd-radar-text"
          >
            {effectiveRadius.toFixed(1)} km
          </text>

          {/* User Location Center Marker */}
          <g transform={`translate(${center}, ${center})`}>
            <circle r="18" className="fd-user-beacon" />
            <circle r="8" className="fd-user-center" />
            <text x="0" y="26" textAnchor="middle" className="fd-user-label">
              You
            </text>
          </g>

          {/* Food and Restaurant Pins */}
          {foodItems.map((item, idx) => {
            const { x, y } = getPinCoordinates(
              idx,
              foodItems.length,
              item.distanceInKilometers || 0.5
            );
            const isSelected = selectedPinFood?.id === item.id;

            return (
              <g
                key={item.id}
                transform={`translate(${x}, ${y})`}
                className={`fd-pin-group ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedPinFood(item)}
                style={{ cursor: "pointer" }}
              >
                {/* Ping pulse for ending soon */}
                <circle r={isSelected ? 22 : 16} className="fd-pin-aura" />
                <circle r={isSelected ? 14 : 10} className="fd-pin-body" />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  className="fd-pin-icon"
                  fontSize={isSelected ? "11" : "9"}
                >
                  🍲
                </text>
                <text
                  x="0"
                  y={isSelected ? "-18" : "-14"}
                  textAnchor="middle"
                  className="fd-pin-price-tag"
                >
                  ${item.price.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="fd-map-legend">
          <div className="fd-legend-item">
            <span className="fd-legend-dot you" />
            <span>Your Location</span>
          </div>
          <div className="fd-legend-item">
            <span className="fd-legend-dot surplus" />
            <span>Surplus Food ({foodItems.length})</span>
          </div>
          <div className="fd-legend-item">
            <span className="fd-legend-dot ring" />
            <span>{radiusKm} km Search Zone</span>
          </div>
        </div>

        {/* Floating Selected Pin Card Popover */}
        {selectedPinFood && (
          <div className="fd-pin-popup-card">
            <button
              type="button"
              className="fd-pin-popup-close"
              onClick={() => setSelectedPinFood(null)}
              aria-label="Close popup"
            >
              ✕
            </button>
            <div className="fd-pin-popup-header">
              <span className="fd-pin-badge">{selectedPinFood.category}</span>
              <span className="fd-pin-dist">
                📍 {selectedPinFood.distanceInKilometers} km away
              </span>
            </div>

            <h4 className="fd-pin-food-title">{selectedPinFood.name}</h4>

            <div
              className="fd-pin-restaurant"
              onClick={() =>
                selectedPinFood.restaurant?.id &&
                onSelectRestaurant(selectedPinFood.restaurant.id)
              }
              title="Click to view restaurant info"
            >
              🏪 <strong>{selectedPinFood.restaurant?.restaurantName}</strong>{" "}
              <span className="fd-link-hint">ℹ️ Details</span>
            </div>

            <p className="fd-pin-desc">{selectedPinFood.description}</p>

            <div className="fd-pin-footer">
              <div className="fd-pin-price-box">
                <span className="fd-pin-price">${selectedPinFood.price.toFixed(2)}</span>
                <span className="fd-pin-qty">{selectedPinFood.quantity} portions left</span>
              </div>
              <button
                type="button"
                className="fd-pin-action-btn"
                onClick={() => onSelectFood(selectedPinFood)}
              >
                Reserve Meal ➔
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
