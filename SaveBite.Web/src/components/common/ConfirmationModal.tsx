import type { ReactNode } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isConfirming?: boolean;
  icon?: string;
  details?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isConfirming = false,
  icon = "⚠️",
  details,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="sb-modal-backdrop" onClick={!isConfirming ? onCancel : undefined}>
      <div
        className="sb-modal-content sb-confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sb-confirm-header">
          <div className={`sb-confirm-icon-circle ${isDestructive ? "sb-icon-destructive" : "sb-icon-warning"}`}>
            {icon}
          </div>
          <div>
            <h3 className="sb-confirm-title">{title}</h3>
            <p className="sb-confirm-message">{message}</p>
          </div>
        </div>

        {details && <div className="sb-confirm-details">{details}</div>}

        <div className="sb-confirm-actions">
          <button
            type="button"
            className="sb-btn-secondary"
            onClick={onCancel}
            disabled={isConfirming}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={isDestructive ? "sb-btn-danger" : "sb-btn-primary"}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <LoadingSpinner size="sm" variant={isDestructive ? "light" : "dark"} />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

