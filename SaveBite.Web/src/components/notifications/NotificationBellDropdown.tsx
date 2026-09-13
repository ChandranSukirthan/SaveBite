import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSignalR } from "../../context/SignalRContext";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationIcon,
  getNotificationTypeColor,
  getNotificationDeepLink,
  type AppNotification,
} from "../../services/notificationService";

interface NotificationBellDropdownProps {
  role?: "Customer" | "RestaurantOwner" | "DeliveryPerson";
  className?: string;
}

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 5) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "Recent";
  }
}

export const NotificationBellDropdown: React.FC<NotificationBellDropdownProps> = ({
  role = "Customer",
  className = "",
}) => {
  const navigate = useNavigate();
  const { onNotificationReceived } = useSignalR();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotifications(25);
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Real-time listener for incoming SignalR notifications
  useEffect(() => {
    const unsub = onNotificationReceived((incoming) => {
      const formatted: AppNotification = {
        id: incoming.id || `notif-${Date.now()}`,
        userId: incoming.userId || "",
        title: incoming.title,
        message: incoming.message,
        type: incoming.type as any,
        orderId: incoming.orderId,
        deliveryRequestId: incoming.deliveryRequestId,
        isRead: false,
        createdAt: incoming.createdAt || new Date().toISOString(),
      };

      setNotifications((prev) => [formatted, ...prev]);
    });

    return unsub;
  }, [onNotificationReceived]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif.id);
    }
    const deepLink = getNotificationDeepLink(notif, role);
    setIsOpen(false);
    if (deepLink) {
      navigate(deepLink);
    }
  };

  const fullCenterPath =
    role === "RestaurantOwner"
      ? "/restaurant/notifications"
      : role === "DeliveryPerson"
      ? "/delivery/notifications"
      : "/customer/notifications";

  const displayedList =
    activeTab === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className={`nbd-wrapper ${className}`} ref={dropdownRef}>
      {/* BELL TRIGGER BUTTON */}
      <button
        type="button"
        className={`nbd-bell-btn ${isOpen ? "nbd-bell-btn--active" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <span className="nbd-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="nbd-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="nbd-dropdown">
          {/* HEADER */}
          <div className="nbd-header">
            <div className="nbd-header-title-wrap">
              <span className="nbd-header-icon">🔔</span>
              <h4 className="nbd-header-title">Notifications</h4>
              {unreadCount > 0 && (
                <span className="nbd-unread-pill">{unreadCount} new</span>
              )}
            </div>

            <button
              type="button"
              className="nbd-mark-all-btn"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              title="Mark all notifications as read"
            >
              ✓ Mark all read
            </button>
          </div>

          {/* FILTER TABS */}
          <div className="nbd-tabs">
            <button
              type="button"
              className={`nbd-tab ${activeTab === "all" ? "nbd-tab--active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              className={`nbd-tab ${activeTab === "unread" ? "nbd-tab--active" : ""}`}
              onClick={() => setActiveTab("unread")}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* NOTIFICATION LIST */}
          <div className="nbd-list">
            {loading && notifications.length === 0 ? (
              <div className="nbd-empty">
                <span className="nbd-empty-icon">⏳</span>
                <p>Loading notifications...</p>
              </div>
            ) : displayedList.length === 0 ? (
              <div className="nbd-empty">
                <span className="nbd-empty-icon">
                  {activeTab === "unread" ? "✨" : "📭"}
                </span>
                <p>
                  {activeTab === "unread"
                    ? "You are all caught up!"
                    : "No notifications yet."}
                </p>
                <span className="nbd-empty-sub">
                  Real-time order and delivery dispatches will appear here.
                </span>
              </div>
            ) : (
              displayedList.map((notif) => {
                const color = getNotificationTypeColor(notif.type);
                const deepLink = getNotificationDeepLink(notif, role);

                return (
                  <div
                    key={notif.id}
                    className={`nbd-item ${!notif.isRead ? "nbd-item--unread" : ""}`}
                    onClick={() => handleNotificationClick(notif)}
                    role="button"
                    tabIndex={0}
                  >
                    {/* TYPE ICON */}
                    <div
                      className="nbd-item-avatar"
                      style={{
                        backgroundColor: color.bg,
                        borderColor: color.border,
                        color: color.text,
                      }}
                    >
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* CONTENT */}
                    <div className="nbd-item-body">
                      <div className="nbd-item-title-row">
                        <span
                          className="nbd-type-tag"
                          style={{ color: color.text }}
                        >
                          {notif.type}
                        </span>
                        <span className="nbd-time">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>

                      <strong className="nbd-item-title">{notif.title}</strong>
                      <p className="nbd-item-msg">{notif.message}</p>

                      {notif.orderId && (
                        <div className="nbd-order-pill">
                          <span>Order #{notif.orderId.slice(-8)}</span>
                          {deepLink && <span className="nbd-link-arrow">➔</span>}
                        </div>
                      )}
                    </div>

                    {/* ACTIONS */}
                    <div className="nbd-item-actions">
                      {!notif.isRead && (
                        <button
                          type="button"
                          className="nbd-read-check-btn"
                          title="Mark as read"
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                        >
                          ✓
                        </button>
                      )}
                      {!notif.isRead && <span className="nbd-unread-dot" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* FOOTER */}
          <div className="nbd-footer">
            <Link
              to={fullCenterPath}
              className="nbd-footer-link"
              onClick={() => setIsOpen(false)}
            >
              Open Full Notification Center ➔
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

