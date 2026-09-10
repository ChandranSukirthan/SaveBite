using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SaveBite.API.Models;

public enum NotificationType
{
    General,
    FoodRecommendation,
    OrderCreated,
    OrderConfirmed,
    FoodReady,
    DriverAssigned,
    DriverAccepted,
    DeliveryStarted,
    DeliveryCompleted,
    DeliveryRejected
}

public class Notification
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("message")]
    public string Message { get; set; } = string.Empty;

    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]
    public NotificationType Type { get; set; }

    [BsonElement("orderId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? OrderId { get; set; }

    [BsonElement("deliveryRequestId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? DeliveryRequestId { get; set; }

    [BsonElement("isRead")]
    public bool IsRead { get; set; } = false;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}