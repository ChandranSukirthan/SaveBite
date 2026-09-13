using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SaveBite.API.Models;

public class RouteWaypoint
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? StepDescription { get; set; }
}

public class AlternativeRouteSummary
{
    public string RouteId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public double DistanceInKilometers { get; set; }
    public int EstimatedMinutes { get; set; }
    public string TrafficCondition { get; set; } = "Moderate";
    public double TrafficDelayMinutes { get; set; }
    public string Polyline { get; set; } = string.Empty;
    public List<RouteWaypoint> Waypoints { get; set; } = new();
}

public class DeliveryRoute
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string OrderId { get; set; } = string.Empty;

    public string DeliveryRequestId { get; set; } = string.Empty;

    public string RouteId { get; set; } = string.Empty;

    public Location Origin { get; set; } = new();

    public Location Destination { get; set; } = new();

    public double DistanceInKilometers { get; set; }

    public int EstimatedMinutes { get; set; }

    public string TrafficCondition { get; set; } = "Moderate";

    public double TrafficDelayMinutes { get; set; }

    public string Polyline { get; set; } = string.Empty;

    public List<RouteWaypoint> Waypoints { get; set; } = new();

    public List<AlternativeRouteSummary> AlternativeRoutes { get; set; } = new();

    public bool Selected { get; set; } = true;

    public string SelectionReason { get; set; } = string.Empty;

    public double SelectionScore { get; set; }

    public int RouteVersion { get; set; } = 1;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

