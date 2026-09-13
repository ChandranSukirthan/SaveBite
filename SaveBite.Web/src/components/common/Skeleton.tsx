export interface SkeletonBoxProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonBox({
  width = "100%",
  height = "20px",
  borderRadius = "6px",
  className = "",
  style,
}: SkeletonBoxProps) {
  return (
    <div
      className={`sb-skeleton-box ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
        ...style,
      }}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  gap?: string | number;
  lastLineWidth?: string;
  className?: string;
}

export function SkeletonText({
  lines = 3,
  gap = 8,
  lastLineWidth = "65%",
  className = "",
}: SkeletonTextProps) {
  return (
    <div
      className={`sb-skeleton-text-group ${className}`}
      style={{ display: "flex", flexDirection: "column", gap: typeof gap === "number" ? `${gap}px` : gap }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          height="14px"
          width={i === lines - 1 ? lastLineWidth : "100%"}
          borderRadius="4px"
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <SkeletonBox
      width={size}
      height={size}
      borderRadius="50%"
      className={`sb-skeleton-circle ${className}`}
    />
  );
}

/**
 * Composite Skeleton for Food Cards (matches customer food browsing grid)
 */
export function FoodCardSkeleton() {
  return (
    <div className="sb-skeleton-food-card">
      <SkeletonBox height="180px" borderRadius="12px 12px 0 0" />
      <div className="sb-skeleton-food-body">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <SkeletonBox width="80px" height="18px" borderRadius="10px" />
          <SkeletonBox width="60px" height="18px" borderRadius="10px" />
        </div>
        <SkeletonBox width="85%" height="22px" style={{ marginBottom: "10px" }} />
        <SkeletonText lines={2} gap={6} lastLineWidth="75%" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
          <SkeletonBox width="70px" height="24px" />
          <SkeletonBox width="100px" height="34px" borderRadius="8px" />
        </div>
      </div>
    </div>
  );
}

/**
 * Composite Skeleton for Table Rows (orders, deliveries, users)
 */
export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="sb-skeleton-table-row">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={{ padding: "16px 12px" }}>
          <SkeletonBox
            height="18px"
            width={i === 0 ? "50px" : i === 1 ? "120px" : i === columns - 1 ? "80px" : "90%"}
            borderRadius="4px"
          />
        </td>
      ))}
    </tr>
  );
}

/**
 * Composite Skeleton for KPI Cards (dashboard headers)
 */
export function StatCardSkeleton() {
  return (
    <div className="sb-skeleton-stat-card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <SkeletonBox width="100px" height="16px" />
        <SkeletonCircle size={28} />
      </div>
      <SkeletonBox width="120px" height="32px" style={{ marginBottom: "8px" }} />
      <SkeletonBox width="80%" height="14px" />
    </div>
  );
}

/**
 * Composite Skeleton for Profile Setup
 */
export function ProfileSkeleton() {
  return (
    <div className="sb-skeleton-profile-card">
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <SkeletonCircle size={64} />
        <div style={{ flex: 1 }}>
          <SkeletonBox width="180px" height="22px" style={{ marginBottom: "8px" }} />
          <SkeletonBox width="120px" height="16px" />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <SkeletonBox width="100%" height="42px" borderRadius="8px" />
        <SkeletonBox width="100%" height="42px" borderRadius="8px" />
        <SkeletonBox width="100%" height="80px" borderRadius="8px" />
      </div>
    </div>
  );
}

