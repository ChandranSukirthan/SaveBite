using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SaveBite.API.Models;

public enum DeliveryRequestStatus
{
    Pending,
    Searching,
    Assigned,
    Accepted,
    PickedUp,
    InTransit,
    Delivered,
    Cancelled,
    Failed
}

public class DeliveryRequest
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("orderId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string OrderId { get; set; } = string.Empty;

    [BsonElement("customerId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string CustomerId { get; set; } = string.Empty;

    [BsonElement("restaurantId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string RestaurantId { get; set; } = string.Empty;

    [BsonElement("deliveryPersonId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? DeliveryPersonId { get; set; }

    [BsonElement("pickupLocation")]
    public Location PickupLocation { get; set; } = new();

    [BsonElement("deliveryLocation")]
    public Location DeliveryLocation { get; set; } = new();

    [BsonElement("distanceInKilometers")]
    public double DistanceInKilometers { get; set; }

    [BsonElement("deliveryFee")]
    public decimal DeliveryFee { get; set; }

    [BsonElement("estimatedMinutes")]
    public int EstimatedMinutes { get; set; }

    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public DeliveryRequestStatus Status { get; set; } =
        DeliveryRequestStatus.Pending;

    [BsonElement("requestedAt")]
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("assignedAt")]
    public DateTime? AssignedAt { get; set; }

    [BsonElement("acceptedAt")]
    public DateTime? AcceptedAt { get; set; }

    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}