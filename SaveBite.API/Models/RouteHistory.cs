using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SaveBite.API.Models;

public class RouteHistory
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string RouteId { get; set; } = string.Empty;

    public string OrderId { get; set; } = string.Empty;

    public string DeliveryRequestId { get; set; } = string.Empty;

    public Location Origin { get; set; } = new();

    public Location Destination { get; set; } = new();

    public double Distance { get; set; }

    public int PlannedDuration { get; set; }

    public int ActualDuration { get; set; }

    public string TrafficAtStart { get; set; } = "Moderate";

    public string TrafficAtDelivery { get; set; } = "Moderate";

    public string TimeOfDay { get; set; } = "PeakEvening";

    public string DayOfWeek { get; set; } = "Friday";

    public string DriverType { get; set; } = "Bicycle";

    public string VehicleType { get; set; } = "Bicycle";

    public string CompletionStatus { get; set; } = "Delivered";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

