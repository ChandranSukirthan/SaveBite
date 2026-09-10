using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.Hubs;
using SaveBite.API.Models;

namespace SaveBite.API.Services;

public class NotificationService
{
    private readonly IMongoCollection<Notification>
        _notifications;

    private readonly IHubContext<DeliveryHub>
        _hubContext;

    public NotificationService(
        MongoDbContext mongoDbContext,
        IHubContext<DeliveryHub> hubContext)
    {
        _notifications =
            mongoDbContext.Database
                .GetCollection<Notification>(
                    "notifications");

        _hubContext = hubContext;
    }

    public async Task<Notification> CreateAsync(
        string userId,
        string title,
        string message,
        NotificationType type,
        string? orderId = null,
        string? deliveryRequestId = null)
    {
        var notification = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            OrderId = orderId,
            DeliveryRequestId =
                deliveryRequestId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        await _notifications.InsertOneAsync(
            notification);

        await _hubContext.Clients
            .Group($"user-{userId}")
            .SendAsync(
                "NotificationReceived",
                new
                {
                    notification.Id,
                    notification.Title,
                    notification.Message,
                    type =
                        notification.Type.ToString(),
                    notification.OrderId,
                    notification.DeliveryRequestId,
                    notification.IsRead,
                    notification.CreatedAt
                });

        return notification;
    }

    public async Task<List<Notification>>
        GetUserNotificationsAsync(
            string userId,
            int limit = 50)
    {
        return await _notifications
            .Find(x => x.UserId == userId)
            .SortByDescending(x => x.CreatedAt)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<bool> MarkAsReadAsync(
        string notificationId,
        string userId)
    {
        var update =
            Builders<Notification>.Update
                .Set(
                    x => x.IsRead,
                    true);

        var result =
            await _notifications.UpdateOneAsync(
                x =>
                    x.Id == notificationId &&
                    x.UserId == userId,
                update);

        return result.ModifiedCount > 0;
    }
}