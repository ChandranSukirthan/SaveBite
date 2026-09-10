using System.Security.Claims;
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

    public async Task JoinUserNotificationGroup()
    {
        var userId =
            Context.User?.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new HubException(
                "User identity could not be determined.");
        }

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            $"user-{userId}");
    }

    public async Task LeaveUserNotificationGroup()
    {
        var userId =
            Context.User?.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId))
        {
            return;
        }

        await Groups.RemoveFromGroupAsync(
            Context.ConnectionId,
            $"user-{userId}");
    }
}