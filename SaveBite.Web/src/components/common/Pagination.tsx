import React, { useMemo } from "react";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = React.memo(
  ({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [6, 12, 24],
    itemLabel = "items",
    className = "",
  }) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    // Calculate start & end index for display
    const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
    const endIndex = Math.min(safeCurrentPage * pageSize, totalItems);

    // Generate page numbers with ellipsis
    const pageNumbers = useMemo(() => {
      const delta = 2;
      const range: (number | "...")[] = [];
      const left = Math.max(2, safeCurrentPage - delta);
      const right = Math.min(totalPages - 1, safeCurrentPage + delta);

      range.push(1);

      if (left > 2) {
        range.push("...");
      }

      for (let i = left; i <= right; i++) {
        range.push(i);
      }

      if (right < totalPages - 1) {
        range.push("...");
      }

      if (totalPages > 1) {
        range.push(totalPages);
      }

      return range;
    }, [safeCurrentPage, totalPages]);

    if (totalItems <= 0) {
      return null;
    }

    return (
      <nav
        className={`sb-pagination ${className}`}
        aria-label="Pagination Navigation"
      >
        <div className="sb-pagination-info">
          Showing <strong>{startIndex}</strong>–<strong>{endIndex}</strong> of{" "}
          <strong>{totalItems}</strong> {itemLabel}
        </div>

        <div className="sb-pagination-controls">
          {/* Previous Page Button */}
          <button
            type="button"
            className="sb-pagination-btn sb-pagination-btn--prev"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            aria-label="Previous page"
          >
            ← Prev
          </button>

          {/* Page Numbers */}
          <div className="sb-pagination-pages">
            {pageNumbers.map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="sb-pagination-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={`page-${p}`}
                  type="button"
                  className={`sb-pagination-page-btn ${
                    p === safeCurrentPage ? "active" : ""
                  }`}
                  onClick={() => onPageChange(p)}
                  aria-current={p === safeCurrentPage ? "page" : undefined}
                >
                  {p}
                </button>
              )
            )}
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            className="sb-pagination-btn sb-pagination-btn--next"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPages}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>

        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="sb-pagination-size-select">
            <label htmlFor="sb-page-size" className="sb-pagination-size-label">
              Per page:
            </label>
            <select
              id="sb-page-size"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="sb-pagination-select"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </nav>
    );
  }
);

Pagination.displayName = "Pagination";
export default Pagination;

