import type { ReactNode } from "react";

export interface SuccessStateProps {
  title: string;
  message: string;
  badge?: string;
  icon?: string;
  details?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

export function SuccessState({
  title,
  message,
  badge = "Success",
  icon = "🎉",
  details,
  action,
  secondaryAction,
  className = "",
}: SuccessStateProps) {
  return (
    <div className={`sb-success-card ${className}`}>
      <div className="sb-success-icon-wrapper">
        <div className="sb-success-check-circle">✓</div>
        <span className="sb-success-confetti">{icon}</span>
      </div>

      <span className="sb-success-badge">{badge}</span>
      <h3 className="sb-success-title">{title}</h3>
      <p className="sb-success-message">{message}</p>

      {details && <div className="sb-success-details">{details}</div>}

      {(action || secondaryAction) && (
        <div className="sb-success-actions">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export interface SuccessModalProps extends SuccessStateProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SuccessModal({
  isOpen,
  onClose,
  ...props
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="sb-modal-backdrop" onClick={onClose}>
      <div className="sb-modal-content sb-success-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sb-modal-close" onClick={onClose}>×</button>
        <SuccessState {...props} />
      </div>
    </div>
  );
}

