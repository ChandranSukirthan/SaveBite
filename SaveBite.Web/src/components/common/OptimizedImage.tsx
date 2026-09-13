import React, { useState } from "react";

export interface OptimizedImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  fallbackCategory?: string;
  aspectRatio?: string;
  className?: string;
  containerClassName?: string;
}

// Curated high quality surplus food SVGs/placeholders for categories
const CATEGORY_FALLBACK_ICONS: Record<string, string> = {
  Bakery: "🥖",
  "Prepared Meals": "🍲",
  "Fresh Produce": "🥗",
  Groceries: "🛒",
  Desserts: "🍰",
  "Dairy & Drinks": "🥛",
  Beverages: "🧃",
  All: "🍽️",
};

export const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(
  ({
    src,
    alt,
    fallbackCategory = "Prepared Meals",
    aspectRatio = "16 / 10",
    className = "",
    containerClassName = "",
    ...props
  }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const showFallback = !src || hasError;
    const categoryIcon =
      CATEGORY_FALLBACK_ICONS[fallbackCategory] || "🍽️";

    return (
      <div
        className={`sb-opt-img-container ${containerClassName}`}
        style={{ aspectRatio }}
      >
        {/* Skeleton shimmer while loading */}
        {!isLoaded && !showFallback && (
          <div className="sb-opt-img-skeleton" aria-hidden="true" />
        )}

        {/* Fallback plate / illustration when image is missing or failed */}
        {showFallback ? (
          <div className="sb-opt-img-fallback">
            <span className="sb-opt-img-fallback-icon" role="img" aria-label={alt}>
              {categoryIcon}
            </span>
            <span className="sb-opt-img-fallback-text">{fallbackCategory}</span>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`sb-opt-img ${isLoaded ? "loaded" : "loading"} ${className}`}
            {...props}
          />
        )}
      </div>
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";
export default OptimizedImage;

