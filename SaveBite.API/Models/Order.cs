using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SaveBite.API.Models;

public enum OrderStatus
{
    Pending,
    Confirmed,
    Preparing,
    ReadyForPickup,
    PickedUp,
    OutForDelivery,
    Delivered,
    Cancelled,
    Failed
}

public class Order
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("customerId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string CustomerId { get; set; } = string.Empty;

    [BsonElement("restaurantId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string RestaurantId { get; set; } = string.Empty;

    [BsonElement("foodItemId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string FoodItemId { get; set; } = string.Empty;

    [BsonElement("quantity")]
    public int Quantity { get; set; }

    [BsonElement("unitPrice")]
    public decimal UnitPrice { get; set; }

    [BsonElement("foodTotal")]
    public decimal FoodTotal { get; set; }

    [BsonElement("deliveryFee")]
    public decimal DeliveryFee { get; set; }

    [BsonElement("totalAmount")]
    public decimal TotalAmount { get; set; }

    [BsonElement("deliveryAddress")]
    public string DeliveryAddress { get; set; } = string.Empty;

    [BsonElement("deliveryLocation")]
    public Location DeliveryLocation { get; set; } = new();

    [BsonElement("deliveryRequestId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? DeliveryRequestId { get; set; }

    [BsonElement("deliveryPersonId")]
    [BsonRepresentation(BsonType.ObjectId)]

    public string? DeliveryPersonId { get; set; }





    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    
}