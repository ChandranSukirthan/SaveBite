import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationIcon,
  getNotificationTypeColor,
  getNotificationDeepLink,
  type AppNotification,
} from "../../services/notificationService";
import { useSignalR } from "../../context/SignalRContext";

function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const { onNotificationReceived } = useSignalR();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotifications(50);
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load customer notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time listener for incoming notifications
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

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
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

  const unreadTotal = notifications.filter((n) => !n.isRead).length;

  const displayedNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <CustomerLayout>
      <div className="rst-dashboard">
        {/* PAGE HEADER */}
        <div className="rst-page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="fd-badge">🔔 REAL-TIME DISPATCH</span>
              {unreadTotal > 0 && (
                <span className="rst-nav-badge">{unreadTotal} unread</span>
              )}
            </div>
            <h1 className="rst-page-title">Customer Notification Center</h1>
            <p className="rst-page-subtitle">
              Live updates on kitchen prep, autonomous driver routing, and food rescue order milestones.
            </p>
          </div>

          <div className="rst-page-actions">
            <button
              type="button"
              className={`rst-btn-tab ${filter === "all" ? "rst-btn-tab--active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              className={`rst-btn-tab ${filter === "unread" ? "rst-btn-tab--active" : ""}`}
              onClick={() => setFilter("unread")}
            >
              Unread ({unreadTotal})
            </button>
            <button
              type="button"
              className="rst-btn-outline"
              onClick={handleMarkAllAsRead}
              disabled={unreadTotal === 0}
            >
              ✓ Mark All Read
            </button>
            <button
              type="button"
              className="fd-refresh-btn"
              onClick={loadData}
              disabled={loading}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* NOTIFICATIONS CARD */}
        <div className="rst-card">
          {loading ? (
            <div className="rst-empty-state">
              <span style={{ fontSize: "32px" }}>⏳</span>
              <p>Loading notification feed...</p>
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="rst-empty-state">
              <span style={{ fontSize: "38px" }}>
                {filter === "unread" ? "✨" : "📭"}
              </span>
              <p style={{ fontWeight: 800, margin: "12px 0 4px", fontSize: "16px", color: "var(--black)" }}>
                {filter === "unread"
                  ? "All caught up! No unread notifications."
                  : "No notifications recorded yet."}
              </p>
              <p className="rst-empty-text">
                When restaurants confirm your orders or drivers are dispatched, real-time alerts will appear here.
              </p>
              <div style={{ marginTop: "16px" }}>
                <Link to="/customer/food" className="rst-btn-solid" style={{ textDecoration: "none" }}>
                  Explore Surplus Food
                </Link>
              </div>
            </div>
          ) : (
            <div className="rst-notif-full-list">
              {displayedNotifications.map((notif) => {
                const color = getNotificationTypeColor(notif.type);
                const deepLink = getNotificationDeepLink(notif, "Customer");

                return (
                  <div
                    key={notif.id}
                    className={`rst-notif-full-item ${!notif.isRead ? "rst-notif-full-item--unread" : ""}`}
                  >
                    <div className="rst-notif-full-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <span
                          className="rst-notif-type-tag"
                          style={{
                            backgroundColor: color.bg,
                            borderColor: color.border,
                            color: color.text,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <span>{getNotificationIcon(notif.type)}</span>
                          <span>{notif.type}</span>
                        </span>

                        <h4 className="rst-notif-full-title">{notif.title}</h4>
                        {!notif.isRead && <span className="rst-unread-dot" />}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span className="rst-notif-time">
                          {formatDateTime(notif.createdAt)}
                        </span>
                        {!notif.isRead && (
                          <button
                            type="button"
                            className="rst-mark-read-btn"
                            onClick={() => handleMarkAsRead(notif.id)}
                            title="Mark as read"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="rst-notif-msg" style={{ margin: "8px 0 12px", fontSize: "13.5px" }}>
                      {notif.message}
                    </p>

                    {/* DEEP LINK TO RELATED ORDER */}
                    {notif.orderId && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                        <span className="rst-code">Order #{notif.orderId.slice(-8)}</span>
                        {deepLink && (
                          <Link
                            to={deepLink}
                            className="rst-btn-outline"
                            style={{
                              padding: "4px 12px",
                              fontSize: "12px",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            onClick={() => {
                              if (!notif.isRead) handleMarkAsRead(notif.id);
                            }}
                          >
                            🛰️ Live Tracking Map ➔
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}

export default CustomerNotificationsPage;

