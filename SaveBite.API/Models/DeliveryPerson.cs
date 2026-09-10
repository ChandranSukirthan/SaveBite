using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SaveBite.API.Models;

public class DeliveryPerson
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("phoneNumber")]
    public string PhoneNumber { get; set; } = string.Empty;

    [BsonElement("vehicleType")]
    public string VehicleType { get; set; } = string.Empty;

    [BsonElement("vehicleNumber")]
    public string VehicleNumber { get; set; } = string.Empty;

    [BsonElement("location")]
    public Location Location { get; set; } = new();

    [BsonElement("isAvailable")]
    public bool IsAvailable { get; set; } = false;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}