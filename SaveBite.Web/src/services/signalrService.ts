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

  private getHubUrl(): string {
    const apiBase =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    return `${apiBase.replace(/\/$/, "")}/hubs/delivery`;
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
    this.stateChangeListeners.forEach((listener) => listener(currentState));
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

  public async startConnection(): Promise<void> {
    const token = localStorage.getItem("token");
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
        accessTokenFactory: () => localStorage.getItem("token") || "",
        transport:
          HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

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

  // --- Event Subscriptions ---

  public onOrderStatusUpdated(
    callback: (data: OrderStatusUpdatedEvent) => void
  ): () => void {
    const handler = (data: OrderStatusUpdatedEvent) => callback(data);
    this.connection?.on("OrderStatusUpdated", handler);

    return () => {
      this.connection?.off("OrderStatusUpdated", handler);
    };
  }

  public onDeliveryStatusUpdated(
    callback: (data: DeliveryStatusUpdatedEvent) => void
  ): () => void {
    const handler = (data: DeliveryStatusUpdatedEvent) => callback(data);
    this.connection?.on("DeliveryStatusUpdated", handler);

    return () => {
      this.connection?.off("DeliveryStatusUpdated", handler);
    };
  }

  public onDriverAssigned(
    callback: (data: DriverAssignedEvent) => void
  ): () => void {
    const handler = (data: DriverAssignedEvent) => callback(data);
    this.connection?.on("DriverAssigned", handler);

    return () => {
      this.connection?.off("DriverAssigned", handler);
    };
  }

  public onDriverLocationUpdated(
    callback: (data: DriverLocationUpdatedEvent) => void
  ): () => void {
    const handler = (data: DriverLocationUpdatedEvent) => callback(data);
    this.connection?.on("DriverLocationUpdated", handler);

    return () => {
      this.connection?.off("DriverLocationUpdated", handler);
    };
  }

  public onNotificationReceived(
    callback: (data: NotificationReceivedEvent) => void
  ): () => void {
    const handler = (data: NotificationReceivedEvent) => callback(data);
    this.connection?.on("NotificationReceived", handler);

    return () => {
      this.connection?.off("NotificationReceived", handler);
    };
  }
}

export const signalRService = new SignalRService();
