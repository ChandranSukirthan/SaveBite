import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function SessionExpiredModal() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthExpired = () => {
      setIsOpen(true);
    };

    window.addEventListener("savebite:auth-expired", handleAuthExpired);
    return () => {
      window.removeEventListener("savebite:auth-expired", handleAuthExpired);
    };
  }, []);

  const handleSignInAgain = () => {
    setIsOpen(false);
    const path = location.pathname;
    if (path.startsWith("/admin")) {
      navigate("/admin/login");
    } else if (path.startsWith("/restaurant")) {
      navigate("/restaurant/login");
    } else if (path.startsWith("/delivery")) {
      navigate("/delivery/login");
    } else {
      navigate("/customer/login");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="sb-modal-backdrop sb-session-backdrop">
      <div className="sb-modal-content sb-session-modal" role="alertdialog">
        <div className="sb-session-icon-circle">🔒</div>
        <h3 className="sb-session-title">Your session has expired.</h3>
        <p className="sb-session-message">
          For your account security, your authentication session has timed out. Please sign in again to continue managing your orders and platform activities.
        </p>

        <div className="sb-session-actions">
          <button
            type="button"
            className="sb-btn-primary"
            onClick={handleSignInAgain}
            style={{ width: "100%", justifyContent: "center" }}
          >
            🔑 Sign In Again
          </button>
        </div>
      </div>
    </div>
  );
}

