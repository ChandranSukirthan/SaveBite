import { useEffect, useState } from "react";
import { RestaurantLayout } from "../../components/layout/RestaurantLayout";
import {
  getNotifications,
  markNotificationRead,
} from "../../services/restaurantService";
import type { AppNotification } from "../../types/restaurant";

export function RestaurantNotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const data = await getNotifications(50);
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const displayedNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const unreadTotal = notifications.filter((n) => !n.isRead).length;

  return (
    <RestaurantLayout>
      <div className="rst-dashboard">
        <div className="rst-page-header">
          <div>
            <h1 className="rst-page-title">Notification Center</h1>
            <p className="rst-page-subtitle">
              Live updates regarding order creation, pickup status, and delivery person assignments.
            </p>
          </div>
          <div className="rst-page-actions">
            <button
              onClick={() => setFilter("all")}
              className={`rst-btn-tab ${filter === "all" ? "rst-btn-tab--active" : ""}`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`rst-btn-tab ${filter === "unread" ? "rst-btn-tab--active" : ""}`}
            >
              Unread ({unreadTotal})
            </button>
          </div>
        </div>

        <div className="rst-card">
          {loading ? (
            <p className="rst-empty-text">Loading notifications...</p>
          ) : displayedNotifications.length === 0 ? (
            <div className="rst-empty-state">
              <span style={{ fontSize: "36px" }}>🔔</span>
              <p style={{ fontWeight: 700, margin: "8px 0 4px" }}>
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
              <p className="rst-empty-text">
                Incoming orders and delivery notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="rst-notif-full-list">
              {displayedNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`rst-notif-full-item ${!notif.isRead ? "rst-notif-full-item--unread" : ""}`}
                >
                  <div className="rst-notif-full-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="rst-notif-type-tag">{notif.type}</span>
                      <h4 className="rst-notif-full-title">{notif.title}</h4>
                      {!notif.isRead && <span className="rst-unread-dot" />}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span className="rst-notif-time">
                        {new Date(notif.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="rst-btn-mark-read"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="rst-notif-full-msg">{notif.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RestaurantLayout>
  );
}

export default RestaurantNotificationsPage;
