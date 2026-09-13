import React from "react";
import { Link } from "react-router-dom";
import type { DiscoveredFoodItem } from "../../types/customer";
import { CountdownTimer } from "./CountdownTimer";
import { OptimizedImage } from "../common/OptimizedImage";

export interface FoodCardProps {
  food: DiscoveredFoodItem;
  onReserve: (food: DiscoveredFoodItem) => void;
  onSelectRestaurant: (restaurantId: string) => void;
}

export function getCategoryIcon(cat: string): string {
  switch (cat) {
    case "Bakery":
      return "🥖";
    case "Prepared Meals":
      return "🍲";
    case "Fresh Produce":
      return "🥗";
    case "Groceries":
      return "🛒";
    case "Desserts":
      return "🍰";
    case "Dairy & Drinks":
      return "🥛";
    case "Beverages":
      return "🧃";
    default:
      return "🍽️";
  }
}

export const FoodCard: React.FC<FoodCardProps> = React.memo(
  ({ food, onReserve, onSelectRestaurant }) => {
    return (
      <div className="fd-food-card">
        {/* Visual Banner with Optimized Lazy-Loaded Image */}
        <OptimizedImage
          alt={food.name}
          fallbackCategory={food.category}
          aspectRatio="16 / 9"
          containerClassName="fd-food-img-container"
        />

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
            food.restaurant?.id && onSelectRestaurant(food.restaurant.id)
          }
          title="Click to view restaurant details & address"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              food.restaurant?.id && onSelectRestaurant(food.restaurant.id);
            }
          }}
        >
          <span className="fd-rest-icon">🏪</span>
          <div className="fd-rest-details">
            <span className="fd-rest-name">
              {food.restaurant?.restaurantName || "Partner Restaurant"}
            </span>
            <span className="fd-rest-addr">{food.restaurant?.address}</span>
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
            <span className="fd-qty-pill">{food.quantity} left</span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <Link to={`/customer/food/${food.id}`} className="fd-details-btn">
              Details
            </Link>
            <button
              type="button"
              className="fd-reserve-cta"
              onClick={() => onReserve(food)}
            >
              Reserve ➔
            </button>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom shallow equality comparison for maximum memoization performance
    return (
      prevProps.food.id === nextProps.food.id &&
      prevProps.food.quantity === nextProps.food.quantity &&
      prevProps.food.price === nextProps.food.price &&
      prevProps.food.availableUntil === nextProps.food.availableUntil &&
      prevProps.food.distanceInKilometers === nextProps.food.distanceInKilometers &&
      prevProps.onReserve === nextProps.onReserve &&
      prevProps.onSelectRestaurant === nextProps.onSelectRestaurant
    );
  }
);

FoodCard.displayName = "FoodCard";
export default FoodCard;

