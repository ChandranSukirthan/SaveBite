using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SaveBite.API.Models;

public enum FoodStatus
{
    Draft,
    Available,
    Reserved,
    Sold,
    Expired,
    Cancelled
}

public class FoodItem
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("restaurantId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string RestaurantId { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    [BsonElement("quantity")]
    public int Quantity { get; set; }

    [BsonElement("price")]
    public decimal Price { get; set; }

    [BsonElement("availableFrom")]
    public DateTime AvailableFrom { get; set; }

    [BsonElement("availableUntil")]
    public DateTime AvailableUntil { get; set; }

    [BsonElement("location")]
    public Location Location { get; set; } = new();

    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public FoodStatus Status { get; set; } = FoodStatus.Draft;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}