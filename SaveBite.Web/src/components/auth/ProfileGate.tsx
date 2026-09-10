import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  getCustomerProfile,
  getRestaurantProfile,
  getDeliveryPersonProfile,
} from "../../services/profileService";

interface ProfileGateProps {
  children: ReactNode;
}

export function ProfileGate({ children }: ProfileGateProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkProfile() {
      if (!isAuthenticated || !user) {
        setChecking(false);
        return;
      }

      if (user.role === "Admin") {
        if (isMounted) {
          setHasProfile(true);
          setChecking(false);
        }
        return;
      }

      try {
        let profile = null;
        if (user.role === "Customer") {
          profile = await getCustomerProfile();
        } else if (user.role === "RestaurantOwner") {
          profile = await getRestaurantProfile();
        } else if (user.role === "DeliveryPerson") {
          profile = await getDeliveryPersonProfile();
        }

        if (isMounted) {
          setHasProfile(profile !== null);
          setChecking(false);
        }
      } catch {
        if (isMounted) {
          // If server error, default to true to not trap user
          setHasProfile(true);
          setChecking(false);
        }
      }
    }

    if (!authLoading) {
      checkProfile();
    }

    return () => {
      isMounted = false;
    };
  }, [user, isAuthenticated, authLoading]);

  if (authLoading || checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-family, sans-serif)",
          background: "var(--white, #ffffff)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🌱</div>
          <p style={{ color: "var(--grey-600, #555555)", fontWeight: 600 }}>
            Checking account setup...
          </p>
        </div>
      </div>
    );
  }

  if (hasProfile === false && user) {
    switch (user.role) {
      case "Customer":
        return <Navigate to="/customer/profile-setup" replace />;
      case "RestaurantOwner":
        return <Navigate to="/restaurant/profile-setup" replace />;
      case "DeliveryPerson":
        return <Navigate to="/delivery/profile-setup" replace />;
      default:
        break;
    }
  }

  return <>{children}</>;
}

export default ProfileGate;
