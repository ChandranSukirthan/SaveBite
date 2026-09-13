using SaveBite.API.Models;

namespace SaveBite.API.DTOs;

public class RouteOptionDto
{
    public string RouteId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public double DistanceInKilometers { get; set; }
    public int NormalDurationMinutes { get; set; }
    public int TrafficDurationMinutes { get; set; }
    public double TrafficDelayMinutes { get; set; }
    public string TrafficCondition { get; set; } = "Moderate";
    public string RoadDescription { get; set; } = string.Empty;
    public string Polyline { get; set; } = string.Empty;
    public List<RouteWaypoint> Waypoints { get; set; } = new();
    public double HistoricalAverageMinutes { get; set; }
    public double HistoricalDelayMinutes { get; set; }
    public double ReliabilityScore { get; set; } = 0.95;
    public double CalculatedScore { get; set; }
}

public class TrafficInfoDto
{
    public string OverallTrafficLevel { get; set; } = "Moderate";
    public double CongestionFactor { get; set; } = 1.2;
    public double AverageDelayMinutes { get; set; } = 3.0;
    public string BottleneckArea { get; set; } = "Downtown Corridor";
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class HistoricalRouteAggregationDto
{
    public string RouteId { get; set; } = string.Empty;
    public double HistoricalAverageMinutes { get; set; }
    public double HistoricalDelayMinutes { get; set; }
    public double SuccessfulDeliveryRate { get; set; } = 0.96;
    public int SampleCount { get; set; } = 25;
}

public class SaveRouteRequest
{
    public string OrderId { get; set; } = string.Empty;
    public string DeliveryRequestId { get; set; } = string.Empty;
    public string RouteId { get; set; } = string.Empty;
    public double DistanceInKilometers { get; set; }
    public int EstimatedMinutes { get; set; }
    public string TrafficCondition { get; set; } = "Moderate";
    public double TrafficDelayMinutes { get; set; }
    public string Polyline { get; set; } = string.Empty;
    public List<RouteWaypoint> Waypoints { get; set; } = new();
    public List<AlternativeRouteSummary> AlternativeRoutes { get; set; } = new();
    public string Reason { get; set; } = string.Empty;
    public double SelectionScore { get; set; }
    public int RouteVersion { get; set; } = 1;
}

public class RecalculateRouteRequest
{
    public string? Reason { get; set; }
    public bool SimulateTrafficSpike { get; set; }
}

