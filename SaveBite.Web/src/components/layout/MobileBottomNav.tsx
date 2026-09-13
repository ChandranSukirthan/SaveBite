import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { UserRole } from "../../types/auth";

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

interface MobileBottomNavProps {
  role: UserRole;
  unreadCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = React.memo(
  ({ role, unreadCount = 0 }) => {
    const location = useLocation();

    let items: NavItem[] = [];

    switch (role) {
      case "Customer":
        items = [
          { to: "/customer/dashboard", icon: "🏠", label: "Home" },
          { to: "/customer/food", icon: "🍲", label: "Food" },
          { to: "/customer/ai-recommendations", icon: "🤖", label: "AI Recs" },
          { to: "/customer/orders", icon: "📦", label: "Orders" },
          { to: "/customer/notifications", icon: "🔔", label: "Alerts" },
        ];
        break;

      case "DeliveryPerson":
        items = [
          { to: "/delivery/dashboard", icon: "🏠", label: "Home" },
          { to: "/delivery/requests", icon: "⚡", label: "Deliveries" },
          { to: "/delivery/notifications", icon: "🔔", label: "Alerts" },
          { to: "/delivery/profile", icon: "👤", label: "Profile" },
        ];
        break;

      case "RestaurantOwner":
        items = [
          { to: "/restaurant/dashboard", icon: "🏠", label: "Home" },
          { to: "/restaurant/food", icon: "🍲", label: "Menu" },
          { to: "/restaurant/orders", icon: "📦", label: "Orders" },
          { to: "/restaurant/notifications", icon: "🔔", label: "Alerts" },
        ];
        break;

      case "Admin":
        items = [
          { to: "/admin/dashboard", icon: "🏠", label: "Home" },
          { to: "/admin/restaurants", icon: "🏪", label: "Kitchens" },
          { to: "/admin/users", icon: "👥", label: "Users" },
          { to: "/admin/ai-activity", icon: "🤖", label: "AI Graph" },
        ];
        break;
    }

    return (
      <nav className="sb-mobile-bottom-nav" aria-label="Mobile Navigation">
        {items.map((item) => {
          const isActive = location.pathname === item.to;
          const isNotification = item.to.includes("notification");

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`sb-bottom-nav-item ${isActive ? "active" : ""}`}
            >
              <div className="sb-bottom-nav-icon-wrap">
                <span className="sb-bottom-nav-icon" role="img" aria-hidden="true">
                  {item.icon}
                </span>
                {isNotification && unreadCount > 0 && (
                  <span className="sb-bottom-nav-badge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="sb-bottom-nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    );
  }
);

MobileBottomNav.displayName = "MobileBottomNav";
export default MobileBottomNav;

