import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: string | ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  bordered?: boolean;
}

export function EmptyState({
  icon = "📦",
  title,
  message,
  action,
  secondaryAction,
  className = "",
  bordered = true,
}: EmptyStateProps) {
  return (
    <div className={`sb-empty-card ${bordered ? "sb-empty-bordered" : ""} ${className}`}>
      <div className="sb-empty-icon-wrap">{icon}</div>
      <h3 className="sb-empty-title">{title}</h3>
      <p className="sb-empty-message">{message}</p>
      {(action || secondaryAction) && (
        <div className="sb-empty-actions">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-built Preset: "No surplus food found near you."
 */
export function NoFoodEmptyState({
  onExpandRadius,
  onResetFilters,
}: {
  onExpandRadius?: () => void;
  onResetFilters?: () => void;
}) {
  return (
    <EmptyState
      icon="🍲"
      title="No surplus food found near you."
      message="Local restaurants haven't listed any surplus meals in this radius right now. Try expanding your search distance or checking back later as kitchens post surplus meals."
      action={
        onExpandRadius ? (
          <button type="button" onClick={onExpandRadius} className="sb-btn-primary">
            📍 Expand Search to 10 km
          </button>
        ) : undefined
      }
      secondaryAction={
        onResetFilters ? (
          <button type="button" onClick={onResetFilters} className="sb-btn-secondary">
            Reset Category Filters
          </button>
        ) : undefined
      }
    />
  );
}

/**
 * Pre-built Preset: "No delivery partners are currently available."
 */
export function NoDriversEmptyState({
  onRetry,
}: {
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="🛵"
      title="No delivery partners are currently available."
      message="All nearby certified delivery partners are currently fulfilling orders or outside the operating perimeter. Autonomous AI dispatch will continue scanning every few minutes."
      action={
        onRetry ? (
          <button type="button" onClick={onRetry} className="sb-btn-primary">
            ⚡ Retry AI Partner Search
          </button>
        ) : undefined
      }
    />
  );
}

/**
 * Pre-built Preset: "Your restaurant is awaiting approval."
 */
export function RestaurantPendingEmptyState({
  onContactSupport,
}: {
  onContactSupport?: () => void;
}) {
  return (
    <EmptyState
      icon="⏳"
      title="Your restaurant is awaiting approval."
      message="Your kitchen profile has been submitted and is currently being verified by platform administrators. Once approved, you will be able to post surplus food listings and fulfill orders."
      action={
        <div className="sb-pending-badge">
          <span>Status: Under Review by Administrator</span>
        </div>
      }
      secondaryAction={
        onContactSupport ? (
          <button type="button" onClick={onContactSupport} className="sb-btn-secondary">
            💬 Contact Administrator Support
          </button>
        ) : undefined
      }
    />
  );
}

/**
 * Pre-built Preset: No Orders
 */
export function NoOrdersEmptyState({
  onExploreFood,
}: {
  onExploreFood?: () => void;
}) {
  return (
    <EmptyState
      icon="🛍️"
      title="No orders yet"
      message="You haven't placed any surplus food rescue orders yet. Explore nearby restaurants to save good food from going to waste."
      action={
        onExploreFood ? (
          <button type="button" onClick={onExploreFood} className="sb-btn-primary">
            🔍 Explore Surplus Food
          </button>
        ) : undefined
      }
    />
  );
}

