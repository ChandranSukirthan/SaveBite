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
}