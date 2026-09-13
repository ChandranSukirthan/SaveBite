import type { ReactNode } from "react";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: string | ReactNode;
  errorCode?: string | number;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  className?: string;
  inline?: boolean;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again or contact support if the issue persists.",
  icon = "⚠️",
  errorCode,
  onRetry,
  retryLabel = "🔄 Try Again",
  action,
  className = "",
  inline = false,
}: ErrorStateProps) {
  if (inline) {
    return (
      <div className={`sb-error-inline ${className}`}>
        <span className="sb-error-icon">{icon}</span>
        <div className="sb-error-inline-content">
          <strong>{title}</strong>: {message}
        </div>
        {onRetry && (
          <button type="button" onClick={onRetry} className="sb-btn-inline-retry">
            {retryLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`sb-error-card ${className}`}>
      <div className="sb-error-icon-circle">{icon}</div>
      <h3 className="sb-error-title">{title}</h3>
      <p className="sb-error-message">{message}</p>
      {errorCode && <span className="sb-error-code">Code: {errorCode}</span>}

      <div className="sb-error-actions">
        {onRetry && (
          <button type="button" onClick={onRetry} className="sb-btn-primary">
            {retryLabel}
          </button>
        )}
        {action}
      </div>
    </div>
  );
}

/**
 * Pre-built Preset: "This food is no longer available."
 */
export function ItemUnavailableErrorState({
  onBrowseMore,
}: {
  onBrowseMore?: () => void;
}) {
  return (
    <ErrorState
      icon="🍽️"
      title="This food is no longer available."
      message="This surplus listing has already been rescued by another customer or reached its availability expiration cutoff."
      action={
        onBrowseMore ? (
          <button type="button" onClick={onBrowseMore} className="sb-btn-secondary">
            🍲 Explore Other Food
          </button>
        ) : undefined
      }
    />
  );
}

/**
 * Pre-built Preset: "AI recommendation could not be generated."
 */
export function AIErrorState({
  onRetry,
}: {
  onRetry?: () => void;
}) {
  return (
    <ErrorState
      icon="🧠"
      title="AI recommendation could not be generated."
      message="The autonomous food matching agent encountered a temporary timeout or insufficient candidate data in your search radius. Please adjust your preferences or try again."
      onRetry={onRetry}
      retryLabel="⚡ Re-Run AI Matching"
    />
  );
}

/**
 * Pre-built Preset: Network Connection Failure
 */
export function NetworkErrorState({
  onRetry,
}: {
  onRetry?: () => void;
}) {
  return (
    <ErrorState
      icon="📡"
      title="Connection Lost"
      message="Unable to reach SaveBite servers. Please check your internet connection or verify that backend services are active."
      onRetry={onRetry}
      retryLabel="🔄 Reconnect"
    />
  );
}

