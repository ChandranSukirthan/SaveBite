using Microsoft.AspNetCore.SignalR;
using SaveBite.API.Hubs;
using SaveBite.API.Models;

namespace SaveBite.API.Services;

public class DeliveryNotificationService
{
    private readonly IHubContext<DeliveryHub>
        _hubContext;

    public DeliveryNotificationService(
        IHubContext<DeliveryHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyOrderStatusAsync(
        Order order)
    {
        await _hubContext.Clients
            .Group($"delivery-{order.Id}")
            .SendAsync(
                "OrderStatusUpdated",
                new
                {
                    orderId = order.Id,

                    status =
                        order.Status.ToString(),

                    updatedAt =
                        order.UpdatedAt
                });
    }

    public async Task NotifyDeliveryStatusAsync(
        DeliveryRequest delivery)
    {
        await _hubContext.Clients
            .Group($"delivery-{delivery.OrderId}")
            .SendAsync(
                "DeliveryStatusUpdated",
                new
                {
                    deliveryRequestId =
                        delivery.Id,

                    orderId =
                        delivery.OrderId,

                    status =
                        delivery.Status.ToString(),

                    distanceInKilometers =
                        delivery.DistanceInKilometers,

                    estimatedMinutes =
                        delivery.EstimatedMinutes,

                    updatedAt =
                        delivery.UpdatedAt
                });
    }

    public async Task NotifyDriverAssignedAsync(
        DeliveryRequest delivery)
    {
        await _hubContext.Clients
            .Group($"delivery-{delivery.OrderId}")
            .SendAsync(
                "DriverAssigned",
                new
                {
                    orderId =
                        delivery.OrderId,

                    deliveryRequestId =
                        delivery.Id,

                    deliveryPersonId =
                        delivery.DeliveryPersonId,

                    status =
                        delivery.Status.ToString()
                });
    }

    public async Task NotifyDriverLocationAsync(
        string orderId,
        string deliveryPersonId,
        double latitude,
        double longitude)
    {
        await _hubContext.Clients
            .Group($"delivery-{orderId}")
            .SendAsync(
                "DriverLocationUpdated",
                new
                {
                    orderId,

                    deliveryPersonId,

                    latitude,

                    longitude,

                    updatedAt =
                        DateTime.UtcNow
                });
    }

    public async Task NotifyRouteUpdatedAsync(
        string orderId,
        DeliveryRoute route)
    {
        await _hubContext.Clients
            .Group($"delivery-{orderId}")
            .SendAsync(
                "RouteUpdated",
                new
                {
                    orderId,
                    deliveryRequestId = route.DeliveryRequestId,
                    routeVersion = route.RouteVersion,
                    selectedRoute = new
                    {
                        routeId = route.RouteId,
                        distanceInKilometers = route.DistanceInKilometers,
                        estimatedMinutes = route.EstimatedMinutes,
                        trafficCondition = route.TrafficCondition,
                        trafficDelayMinutes = route.TrafficDelayMinutes,
                        polyline = route.Polyline,
                        waypoints = route.Waypoints,
                        reason = route.SelectionReason,
                        score = route.SelectionScore
                    },
                    alternativeRoutes = route.AlternativeRoutes,
                    updatedAt = route.UpdatedAt
                });
    }

    public async Task NotifyETAUpdatedAsync(
        string orderId,
        int estimatedMinutes,
        double distanceInKilometers)
    {
        await _hubContext.Clients
            .Group($"delivery-{orderId}")
            .SendAsync(
                "ETAUpdated",
                new
                {
                    orderId,
                    estimatedMinutes,
                    distanceInKilometers,
                    updatedAt = DateTime.UtcNow
                });
    }

    public async Task NotifyTrafficUpdatedAsync(
        string orderId,
        string trafficCondition,
        double delayMinutes)
    {
        await _hubContext.Clients
            .Group($"delivery-{orderId}")
            .SendAsync(
                "TrafficUpdated",
                new
                {
                    orderId,
                    trafficCondition,
                    delayMinutes,
                    updatedAt = DateTime.UtcNow
                });
    }

    public async Task NotifyRouteRecalculationStartedAsync(
        string orderId,
        string reason)
    {
        await _hubContext.Clients
            .Group($"delivery-{orderId}")
            .SendAsync(
                "RouteRecalculationStarted",
                new
                {
                    orderId,
                    reason,
                    timestamp = DateTime.UtcNow
                });
    }

    public async Task NotifyRouteRecalculationCompletedAsync(
        string orderId,
        string selectedRouteId,
        int newEta,
        string reason)
    {
        await _hubContext.Clients
            .Group($"delivery-{orderId}")
            .SendAsync(
                "RouteRecalculationCompleted",
                new
                {
                    orderId,
                    selectedRouteId,
                    newEta,
                    reason,
                    timestamp = DateTime.UtcNow
                });
    }
}