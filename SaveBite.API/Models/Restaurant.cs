using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SaveBite.API.Models;

public class Restaurant
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string OwnerId { get; set; } = string.Empty;

    [BsonElement("restaurantName")]
    public string RestaurantName { get; set; } = string.Empty;

    [BsonElement("phoneNumber")]
    public string PhoneNumber { get; set; } = string.Empty;

    [BsonElement("address")]
    public string Address { get; set; } = string.Empty;

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("location")]
    public Location Location { get; set; } = new();

    [BsonElement("isApproved")]
    public bool IsApproved { get; set; } = false;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Location
{
    [BsonElement("type")]
    public string Type { get; set; } = "Point";

    [BsonElement("coordinates")]
    public double[] Coordinates { get; set; } = new double[2];
}