using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SaveBite.API.Models;

public class Customer
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("phoneNumber")]
    public string PhoneNumber { get; set; } = string.Empty;

    [BsonElement("address")]
    public string Address { get; set; } = string.Empty;

    [BsonElement("location")]
    public Location Location { get; set; } = new();

    [BsonElement("preferredCategories")]
    public List<string> PreferredCategories { get; set; } = new();

    [BsonElement("maximumBudget")]
    public decimal MaximumBudget { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}