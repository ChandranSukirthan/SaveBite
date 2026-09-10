using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SaveBite.API.Hubs;

[Authorize]
public class DeliveryHub : Hub
{
    public async Task JoinDeliveryGroup(
        string orderId)
    {
        if (string.IsNullOrWhiteSpace(orderId))
        {
            throw new HubException(
                "Order ID is required.");
        }

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            $"delivery-{orderId}");
    }

    public async Task LeaveDeliveryGroup(
        string orderId)
    {
        if (string.IsNullOrWhiteSpace(orderId))
        {
            return;
        }

        await Groups.RemoveFromGroupAsync(
            Context.ConnectionId,
            $"delivery-{orderId}");
    }
}