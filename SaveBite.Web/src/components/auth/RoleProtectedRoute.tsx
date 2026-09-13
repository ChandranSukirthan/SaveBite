import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../types/auth";

import { LoadingSpinner } from "../common/LoadingSpinner";

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRole: UserRole;
  fallbackLogin: string;
}

export function RoleProtectedRoute({
  children,
  allowedRole,
  fallbackLogin,
}: RoleProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--white, #ffffff)",
      }}>
        <LoadingSpinner size="lg" label="Verifying credentials..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={fallbackLogin} state={{ from: location }} replace />;
  }

  if (user.role !== allowedRole) {
    // Redirect to user's designated dashboard
    switch (user.role) {
      case "RestaurantOwner":
        return <Navigate to="/restaurant/dashboard" replace />;
      case "Customer":
        return <Navigate to="/customer/dashboard" replace />;
      case "DeliveryPerson":
        return <Navigate to="/delivery/dashboard" replace />;
      case "Admin":
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

export default RoleProtectedRoute;
