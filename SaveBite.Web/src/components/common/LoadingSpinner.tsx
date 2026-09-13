export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "yellow" | "dark" | "light" | "green";
  label?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  variant = "yellow",
  label,
  className = "",
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "16px",
    md: "24px",
    lg: "36px",
    xl: "48px",
  };

  const borderMap = {
    sm: "2px",
    md: "3px",
    lg: "3.5px",
    xl: "4px",
  };

  return (
    <div className={`sb-loading-container ${className}`}>
      <div
        className={`sb-spinner sb-spinner-${variant}`}
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          borderWidth: borderMap[size],
        }}
        role="status"
        aria-label={label || "Loading..."}
      />
      {label && <span className="sb-loading-label">{label}</span>}
    </div>
  );
}

export interface LoadingOverlayProps {
  label?: string;
  subtext?: string;
  fullscreen?: boolean;
}

export function LoadingOverlay({
  label = "Loading SaveBite...",
  subtext,
  fullscreen = false,
}: LoadingOverlayProps) {
  return (
    <div className={`sb-loading-overlay ${fullscreen ? "sb-loading-fullscreen" : ""}`}>
      <div className="sb-loading-card">
        <LoadingSpinner size="xl" variant="yellow" />
        <h4 className="sb-loading-overlay-title">{label}</h4>
        {subtext && <p className="sb-loading-overlay-subtext">{subtext}</p>}
      </div>
    </div>
  );
}

