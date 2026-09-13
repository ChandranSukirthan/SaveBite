import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  HttpTransportType,
} from "@microsoft/signalr";

export interface OrderStatusUpdatedEvent {
  orderId: string;
  status: string;
  updatedAt?: string;
}

export interface DeliveryStatusUpdatedEvent {
  deliveryRequestId: string;
  orderId: string;
  status: string;
  distanceInKilometers?: number;
  estimatedMinutes?: number;
  updatedAt?: string;
}

export interface DriverAssignedEvent {
  orderId: string;
  deliveryRequestId: string;
  deliveryPersonId: string;
  status: string;
}

export interface DriverLocationUpdatedEvent {
  orderId: string;
  deliveryPersonId: string;
  latitude: number;
  longitude: number;
  updatedAt?: string;
}

export interface NotificationReceivedEvent {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: string;
  orderId?: string;
  deliveryRequestId?: string;
  isRead: boolean;
  createdAt: string;
}

export type ConnectionState =
  | "Disconnected"
  | "Connecting"
  | "Connected"
  | "Reconnecting";

class SignalRService {
  private connection: HubConnection | null = null;
  private trackedDeliveryGroups: Set<string> = new Set();
  private stateChangeListeners: Set<(state: ConnectionState) => void> = new Set();

  // Centralized listener registries to prevent memory leaks and duplicate handler registrations
  private orderStatusListeners: Set<(data: OrderStatusUpdatedEvent) => void> = new Set();
  private deliveryStatusListeners: Set<(data: DeliveryStatusUpdatedEvent) => void> = new Set();
  private driverAssignedListeners: Set<(data: DriverAssignedEvent) => void> = new Set();
  private driverLocationListeners: Set<(data: DriverLocationUpdatedEvent) => void> = new Set();
  private notificationListeners: Set<(data: NotificationReceivedEvent) => void> = new Set();

  private getHubUrl(): string {
    const apiBase =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    return `${apiBase.replace(/\/$/, "")}/hubs/delivery`;
  }

  private getToken(): string {
    return (
      localStorage.getItem("savebite_token") ||
      localStorage.getItem("token") ||
      ""
    );
  }

  private mapState(hubState: HubConnectionState): ConnectionState {
    switch (hubState) {
      case HubConnectionState.Connected:
        return "Connected";
      case HubConnectionState.Connecting:
        return "Connecting";
      case HubConnectionState.Reconnecting:
        return "Reconnecting";
      default:
        return "Disconnected";
    }
  }

  private notifyStateChange() {
    const currentState = this.getConnectionState();
    this.stateChangeListeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (e) {
        console.error("Error in SignalR state listener:", e);
      }
    });
  }

  public getConnectionState(): ConnectionState {
    if (!this.connection) return "Disconnected";
    return this.mapState(this.connection.state);
  }

  public onConnectionStateChange(
    callback: (state: ConnectionState) => void
  ): () => void {
    this.stateChangeListeners.add(callback);
    callback(this.getConnectionState());
    return () => {
      this.stateChangeListeners.delete(callback);
    };
  }

  private registerHubHandlers(conn: HubConnection) {
    conn.on("OrderStatusUpdated", (data: OrderStatusUpdatedEvent) => {
      this.orderStatusListeners.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error("Error in OrderStatusUpdated listener:", e);
        }
      });
    });

    conn.on("DeliveryStatusUpdated", (data: DeliveryStatusUpdatedEvent) => {
      this.deliveryStatusListeners.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error("Error in DeliveryStatusUpdated listener:", e);
        }
      });
    });

    conn.on("DriverAssigned", (data: DriverAssignedEvent) => {
      this.driverAssignedListeners.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error("Error in DriverAssigned listener:", e);
        }
      });
    });

    conn.on("DriverLocationUpdated", (data: DriverLocationUpdatedEvent) => {
      this.driverLocationListeners.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error("Error in DriverLocationUpdated listener:", e);
        }
      });
    });

    conn.on("NotificationReceived", (data: NotificationReceivedEvent) => {
      this.notificationListeners.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error("Error in NotificationReceived listener:", e);
        }
      });
    });
  }

  public async startConnection(): Promise<void> {
    const token = this.getToken();
    if (!token) {
      return;
    }

    if (
      this.connection &&
      (this.connection.state === HubConnectionState.Connected ||
        this.connection.state === HubConnectionState.Connecting)
    ) {
      return;
    }

    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (err) {
        console.warn("SignalR stop previous connection error:", err);
      }
    }

    const hubUrl = this.getHubUrl();

    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.getToken(),
        transport:
          HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    // Register fanout event dispatchers on the single connection
    this.registerHubHandlers(this.connection);

    this.connection.onreconnecting(() => {
      this.notifyStateChange();
    });

    this.connection.onreconnected(async () => {
      this.notifyStateChange();

      // Re-join user group
      try {
        await this.joinUserNotificationGroup();
      } catch (err) {
        console.warn("Re-joining user notification group failed:", err);
      }

      // Re-join active delivery groups
      for (const orderId of this.trackedDeliveryGroups) {
        try {
          await this.connection?.invoke("JoinDeliveryGroup", orderId);
        } catch (err) {
          console.warn(`Re-joining delivery-${orderId} failed:`, err);
        }
      }
    });

    this.connection.onclose(() => {
      this.notifyStateChange();
    });

    try {
      this.notifyStateChange();
      await this.connection.start();
      this.notifyStateChange();

      // Auto-join user notifications group
      await this.joinUserNotificationGroup();
    } catch (err) {
      console.warn("SignalR connection start failed:", err);
      this.notifyStateChange();
    }
  }

  public async stopConnection(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (err) {
        console.warn("SignalR stop error:", err);
      } finally {
        this.connection = null;
        this.trackedDeliveryGroups.clear();
        this.notifyStateChange();
      }
    }
  }

  // --- Group Management ---

  public async joinDeliveryGroup(orderId: string): Promise<void> {
    if (!orderId) return;
    this.trackedDeliveryGroups.add(orderId);

    if (this.connection?.state === HubConnectionState.Connected) {
      try {
        await this.connection.invoke("JoinDeliveryGroup", orderId);
      } catch (err) {
        console.warn(`JoinDeliveryGroup for ${orderId} failed:`, err);
      }
    }
  }

  public async leaveDeliveryGroup(orderId: string): Promise<void> {
    if (!orderId) return;
    this.trackedDeliveryGroups.delete(orderId);

    if (this.connection?.state === HubConnectionState.Connected) {
      try {
        await this.connection.invoke("LeaveDeliveryGroup", orderId);
      } catch (err) {
        console.warn(`LeaveDeliveryGroup for ${orderId} failed:`, err);
      }
    }
  }

  public async joinUserNotificationGroup(): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      try {
        await this.connection.invoke("JoinUserNotificationGroup");
      } catch (err) {
        console.warn("JoinUserNotificationGroup failed:", err);
      }
    }
  }

  public async leaveUserNotificationGroup(): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      try {
        await this.connection.invoke("LeaveUserNotificationGroup");
      } catch (err) {
        console.warn("LeaveUserNotificationGroup failed:", err);
      }
    }
  }

  // --- Efficient Event Subscriptions ---

  public onOrderStatusUpdated(
    callback: (data: OrderStatusUpdatedEvent) => void
  ): () => void {
    this.orderStatusListeners.add(callback);
    return () => {
      this.orderStatusListeners.delete(callback);
    };
  }

  public onDeliveryStatusUpdated(
    callback: (data: DeliveryStatusUpdatedEvent) => void
  ): () => void {
    this.deliveryStatusListeners.add(callback);
    return () => {
      this.deliveryStatusListeners.delete(callback);
    };
  }

  public onDriverAssigned(
    callback: (data: DriverAssignedEvent) => void
  ): () => void {
    this.driverAssignedListeners.add(callback);
    return () => {
      this.driverAssignedListeners.delete(callback);
    };
  }

  public onDriverLocationUpdated(
    callback: (data: DriverLocationUpdatedEvent) => void
  ): () => void {
    this.driverLocationListeners.add(callback);
    return () => {
      this.driverLocationListeners.delete(callback);
    };
  }

  public onNotificationReceived(
    callback: (data: NotificationReceivedEvent) => void
  ): () => void {
    this.notificationListeners.add(callback);
    return () => {
      this.notificationListeners.delete(callback);
    };
  }
}

export const signalRService = new SignalRService();
