using SaveBite.API.DTOs;
using SaveBite.API.Models;

namespace SaveBite.API.Services;

public class MockRoutingProvider : IRoutingProvider
{
    private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double r = 6371.0; // Earth radius in km
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLon = (lon2 - lon1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return Math.Round(r * c, 2);
    }

    private static List<RouteWaypoint> GenerateInterpolatedWaypoints(
        double startLat, double startLon,
        double endLat, double endLon,
        double lateralCurveFactor,
        int steps = 8)
    {
        var waypoints = new List<RouteWaypoint>();

        // Perpendicular vector for realistic boulevard curvature
        var dLat = endLat - startLat;
        var dLon = endLon - startLon;
        var perpLat = -dLon;
        var perpLon = dLat;

        for (int i = 0; i <= steps; i++)
        {
            double t = (double)i / steps;
            // Parabolic lateral offset (highest in the middle, 0 at endpoints)
            double arch = 4 * t * (1 - t) * lateralCurveFactor;

            double lat = startLat + t * dLat + arch * perpLat;
            double lon = startLon + t * dLon + arch * perpLon;

            string desc = i == 0 ? "Depart origin location" :
                          i == steps ? "Arrive at destination" :
                          $"Waypoint {i}: proceed along transit corridor";

            waypoints.Add(new RouteWaypoint
            {
                Latitude = Math.Round(lat, 6),
                Longitude = Math.Round(lon, 6),
                StepDescription = desc
            });
        }

        return waypoints;
    }

    public Task<List<RouteOptionDto>> GetRouteOptionsAsync(
        Location origin,
        Location destination,
        bool simulateCongestionOnRouteA = false)
    {
        var oLat = origin.Coordinates.Length > 1 ? origin.Coordinates[1] : 40.7128;
        var oLon = origin.Coordinates.Length > 0 ? origin.Coordinates[0] : -74.0060;
        var dLat = destination.Coordinates.Length > 1 ? destination.Coordinates[1] : 40.7484;
        var dLon = destination.Coordinates.Length > 0 ? destination.Coordinates[0] : -73.9857;

        var baseKm = CalculateDistance(oLat, oLon, dLat, dLon);
        if (baseKm < 0.5) baseKm = 2.5;

        // Route A: Central Avenue Corridor (Shortest distance, but heavy traffic)
        var distA = Math.Round(baseKm * 1.05, 1);
        var normDurA = Math.Max((int)Math.Ceiling(distA * 3.2), 8);
        var delayA = simulateCongestionOnRouteA ? 16.0 : 10.0;
        var durA = (int)(normDurA + delayA);
        var waypointsA = GenerateInterpolatedWaypoints(oLat, oLon, dLat, dLon, 0.05, 8);

        // Route B: Arterial Bypass / Expressway (AI Recommended: moderate traffic, lowest reliable ETA)
        var distB = Math.Round(baseKm * 1.25, 1);
        var normDurB = Math.Max((int)Math.Ceiling(distB * 3.0), 10);
        var delayB = 1.5;
        var durB = (int)(normDurB + delayB);
        var waypointsB = GenerateInterpolatedWaypoints(oLat, oLon, dLat, dLon, -0.22, 9);

        // Route C: Perimeter Ring Road (Longest distance, low traffic)
        var distC = Math.Round(baseKm * 1.6, 1);
        var normDurC = Math.Max((int)Math.Ceiling(distC * 3.1), 15);
        var delayC = 0.0;
        var durC = normDurC;
        var waypointsC = GenerateInterpolatedWaypoints(oLat, oLon, dLat, dLon, 0.35, 10);

        var routes = new List<RouteOptionDto>
        {
            new()
            {
                RouteId = "route-A",
                Name = "Central Avenue Direct",
                DistanceInKilometers = distA,
                NormalDurationMinutes = normDurA,
                TrafficDurationMinutes = durA,
                TrafficDelayMinutes = delayA,
                TrafficCondition = simulateCongestionOnRouteA ? "Severe" : "Heavy",
                RoadDescription = "Direct urban route via central avenues with multiple traffic signals and heavy density.",
                Polyline = string.Join(";", waypointsA.Select(w => $"{w.Latitude},{w.Longitude}")),
                Waypoints = waypointsA,
                HistoricalAverageMinutes = durA - 2,
                HistoricalDelayMinutes = delayA - 1,
                ReliabilityScore = 0.82
            },
            new()
            {
                RouteId = "route-B",
                Name = "Westside Arterial Bypass",
                DistanceInKilometers = distB,
                NormalDurationMinutes = normDurB,
                TrafficDurationMinutes = durB,
                TrafficDelayMinutes = delayB,
                TrafficCondition = "Moderate",
                RoadDescription = "Grade-separated arterial corridor with synchronized green waves and bypass flow.",
                Polyline = string.Join(";", waypointsB.Select(w => $"{w.Latitude},{w.Longitude}")),
                Waypoints = waypointsB,
                HistoricalAverageMinutes = durB,
                HistoricalDelayMinutes = delayB,
                ReliabilityScore = 0.96
            },
            new()
            {
                RouteId = "route-C",
                Name = "East River Perimeter Loop",
                DistanceInKilometers = distC,
                NormalDurationMinutes = normDurC,
                TrafficDurationMinutes = durC,
                TrafficDelayMinutes = delayC,
                TrafficCondition = "Low",
                RoadDescription = "Perimeter highway ring avoiding inner urban intersections completely.",
                Polyline = string.Join(";", waypointsC.Select(w => $"{w.Latitude},{w.Longitude}")),
                Waypoints = waypointsC,
                HistoricalAverageMinutes = durC + 1,
                HistoricalDelayMinutes = 0.5,
                ReliabilityScore = 0.94
            }
        };

        return Task.FromResult(routes);
    }

    public Task<TrafficInfoDto> GetCurrentTrafficAsync(Location origin, Location destination)
    {
        return Task.FromResult(new TrafficInfoDto
        {
            OverallTrafficLevel = "Moderate",
            CongestionFactor = 1.35,
            AverageDelayMinutes = 4.2,
            BottleneckArea = "Central Metro Crossing",
            Timestamp = DateTime.UtcNow
        });
    }
}

