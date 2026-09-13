import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "../hooks/useAuth";
import {
  signalRService,
  type ConnectionState,
  type OrderStatusUpdatedEvent,
  type DeliveryStatusUpdatedEvent,
  type DriverAssignedEvent,
  type DriverLocationUpdatedEvent,
  type NotificationReceivedEvent,
} from "../services/signalrService";

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

interface SignalRContextType {
  connectionState: ConnectionState;
  joinDeliveryGroup: (orderId: string) => Promise<void>;
  leaveDeliveryGroup: (orderId: string) => Promise<void>;
  onOrderStatusUpdated: (
    callback: (data: OrderStatusUpdatedEvent) => void
  ) => () => void;
  onDeliveryStatusUpdated: (
    callback: (data: DeliveryStatusUpdatedEvent) => void
  ) => () => void;
  onDriverAssigned: (
    callback: (data: DriverAssignedEvent) => void
  ) => () => void;
  onDriverLocationUpdated: (
    callback: (data: DriverLocationUpdatedEvent) => void
  ) => () => void;
  onNotificationReceived: (
    callback: (data: NotificationReceivedEvent) => void
  ) => () => void;
  dismissToast: (id: string) => void;
}

const SignalRContext = createContext<SignalRContextType | null>(null);

export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, token } = useAuth();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("Disconnected");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Track connection state from service
  useEffect(() => {
    const unsub = signalRService.onConnectionStateChange((state) => {
      setConnectionState(state);
    });
    return unsub;
  }, []);

  // Connect when authenticated, disconnect on logout
  useEffect(() => {
    if (isAuthenticated && token) {
      signalRService.startConnection();
    } else {
      signalRService.stopConnection();
    }
  }, [isAuthenticated, token]);

  // Global listener for NotificationReceived to display real-time toast alert
  useEffect(() => {
    const unsub = signalRService.onNotificationReceived((notif) => {
      const newToast: ToastItem = {
        id: notif.id || `toast-${Date.now()}`,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        createdAt: notif.createdAt || new Date().toISOString(),
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

      // Auto dismiss after 5.5s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5500);
    });

    return unsub;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const joinDeliveryGroup = useCallback((orderId: string) => {
    return signalRService.joinDeliveryGroup(orderId);
  }, []);

  const leaveDeliveryGroup = useCallback((orderId: string) => {
    return signalRService.leaveDeliveryGroup(orderId);
  }, []);

  const onOrderStatusUpdated = useCallback(
    (callback: (data: OrderStatusUpdatedEvent) => void) => {
      return signalRService.onOrderStatusUpdated(callback);
    },
    []
  );

  const onDeliveryStatusUpdated = useCallback(
    (callback: (data: DeliveryStatusUpdatedEvent) => void) => {
      return signalRService.onDeliveryStatusUpdated(callback);
    },
    []
  );

  const onDriverAssigned = useCallback(
    (callback: (data: DriverAssignedEvent) => void) => {
      return signalRService.onDriverAssigned(callback);
    },
    []
  );

  const onDriverLocationUpdated = useCallback(
    (callback: (data: DriverLocationUpdatedEvent) => void) => {
      return signalRService.onDriverLocationUpdated(callback);
    },
    []
  );

  const onNotificationReceived = useCallback(
    (callback: (data: NotificationReceivedEvent) => void) => {
      return signalRService.onNotificationReceived(callback);
    },
    []
  );

  // Memoize context value to prevent consumer re-render cascading
  const contextValue = useMemo<SignalRContextType>(
    () => ({
      connectionState,
      joinDeliveryGroup,
      leaveDeliveryGroup,
      onOrderStatusUpdated,
      onDeliveryStatusUpdated,
      onDriverAssigned,
      onDriverLocationUpdated,
      onNotificationReceived,
      dismissToast,
    }),
    [
      connectionState,
      joinDeliveryGroup,
      leaveDeliveryGroup,
      onOrderStatusUpdated,
      onDeliveryStatusUpdated,
      onDriverAssigned,
      onDriverLocationUpdated,
      onNotificationReceived,
      dismissToast,
    ]
  );

  return (
    <SignalRContext.Provider value={contextValue}>
      {children}

      {/* GLOBAL FLOATING TOAST NOTIFICATION CONTAINER */}
      {toasts.length > 0 && (
        <div className="sr-toast-container" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className="sr-toast">
              <div className="sr-toast-icon">
                {toast.type.includes("Order")
                  ? "📦"
                  : toast.type.includes("Driver")
                  ? "🚴"
                  : toast.type.includes("Food")
                  ? "🍲"
                  : "⚡"}
              </div>
              <div className="sr-toast-body">
                <div className="sr-toast-header">
                  <strong className="sr-toast-title">{toast.title}</strong>
                  <span className="sr-toast-badge">Live SignalR</span>
                </div>
                <p className="sr-toast-message">{toast.message}</p>
              </div>
              <button
                type="button"
                className="sr-toast-close"
                onClick={() => dismissToast(toast.id)}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* DISCREET SIGNALR STATUS PILL IN CORNER (IF RECONNECTING) */}
      {connectionState === "Reconnecting" && (
        <div className="sr-status-banner">
          <span className="sr-status-dot sr-status-dot--reconnecting" />
          <span>SignalR Reconnecting...</span>
        </div>
      )}
    </SignalRContext.Provider>
  );
};

export function useSignalR(): SignalRContextType {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error("useSignalR must be used within a SignalRProvider");
  }
  return context;
}
