using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.DTOs;
using SaveBite.API.Models;
using SaveBite.API.Services;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/delivery/{id}")]
[Authorize]
public class DeliveryRouteController : ControllerBase
{
    private readonly IMongoCollection<DeliveryRequest> _deliveryRequests;
    private readonly IMongoCollection<DeliveryPerson> _deliveryPersons;
    private readonly RouteOptimizationService _routeOptimizationService;
    private readonly IRoutingProvider _routingProvider;
    private readonly AIServiceClient _aiServiceClient;
    private readonly DeliveryNotificationService _notificationService;

    public DeliveryRouteController(
        MongoDbContext mongoDbContext,
        RouteOptimizationService routeOptimizationService,
        IRoutingProvider routingProvider,
        AIServiceClient aiServiceClient,
        DeliveryNotificationService notificationService)
    {
        _deliveryRequests = mongoDbContext.Database.GetCollection<DeliveryRequest>("deliveryRequests");
        _deliveryPersons = mongoDbContext.Database.GetCollection<DeliveryPerson>("deliveryPersons");
        _routeOptimizationService = routeOptimizationService;
        _routingProvider = routingProvider;
        _aiServiceClient = aiServiceClient;
        _notificationService = notificationService;
    }

    // 1. GET /api/delivery/{id}/route
    [HttpGet("route")]
    public async Task<IActionResult> GetCurrentRoute(string id)
    {
        var delivery = await _deliveryRequests.Find(x => x.Id == id || x.OrderId == id).FirstOrDefaultAsync();
        if (delivery == null)
        {
            return NotFound(new { message = "Delivery request not found." });
        }

        var route = await _routeOptimizationService.GetLatestRouteForDeliveryAsync(delivery.Id);
        if (route == null)
        {
            // If route hasn't been generated yet, compute fallback options from routing provider
            var origin = delivery.PickupLocation ?? new Location { Type = "Point", Coordinates = new[] { -74.0060, 40.7128 } };
            var destination = delivery.DeliveryLocation ?? new Location { Type = "Point", Coordinates = new[] { -73.9857, 40.7484 } };
            var options = await _routingProvider.GetRouteOptionsAsync(origin, destination);
            var bestOption = options.FirstOrDefault(o => o.RouteId == "route-B") ?? options.First();

            route = new DeliveryRoute
            {
                OrderId = delivery.OrderId,
                DeliveryRequestId = delivery.Id,
                RouteId = bestOption.RouteId,
                Origin = origin,
                Destination = destination,
                DistanceInKilometers = bestOption.DistanceInKilometers,
                EstimatedMinutes = bestOption.TrafficDurationMinutes,
                TrafficCondition = bestOption.TrafficCondition,
                TrafficDelayMinutes = bestOption.TrafficDelayMinutes,
                Polyline = bestOption.Polyline,
                Waypoints = bestOption.Waypoints,
                AlternativeRoutes = options.Where(o => o.RouteId != bestOption.RouteId).Select(o => new AlternativeRouteSummary
                {
                    RouteId = o.RouteId,
                    Name = o.Name,
                    DistanceInKilometers = o.DistanceInKilometers,
                    EstimatedMinutes = o.TrafficDurationMinutes,
                    TrafficCondition = o.TrafficCondition,
                    TrafficDelayMinutes = o.TrafficDelayMinutes,
                    Polyline = o.Polyline,
                    Waypoints = o.Waypoints
                }).ToList(),
                Selected = true,
                SelectionReason = "Initial baseline route optimized for reliable arrival time.",
                SelectionScore = 0.94,
                RouteVersion = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }

        return Ok(new
        {
            deliveryRequestId = delivery.Id,
            orderId = delivery.OrderId,
            route
        });
    }

    // 2. GET /api/delivery/{id}/route/options
    [HttpGet("route/options")]
    public async Task<IActionResult> GetRouteOptions(string id)
    {
        var delivery = await _deliveryRequests.Find(x => x.Id == id || x.OrderId == id).FirstOrDefaultAsync();
        if (delivery == null)
        {
            return NotFound(new { message = "Delivery request not found." });
        }

        var origin = delivery.PickupLocation ?? new Location { Type = "Point", Coordinates = new[] { -74.0060, 40.7128 } };
        var destination = delivery.DeliveryLocation ?? new Location { Type = "Point", Coordinates = new[] { -73.9857, 40.7484 } };

        var options = await _routingProvider.GetRouteOptionsAsync(origin, destination);
        return Ok(new
        {
            deliveryRequestId = delivery.Id,
            options
        });
    }

    // 3. POST /api/delivery/{id}/route/recalculate
    [HttpPost("route/recalculate")]
    public async Task<IActionResult> RecalculateRoute(string id, [FromBody] RecalculateRouteRequest? request)
    {
        var delivery = await _deliveryRequests.Find(x => x.Id == id || x.OrderId == id).FirstOrDefaultAsync();
        if (delivery == null)
        {
            return NotFound(new { message = "Delivery request not found." });
        }

        var reason = request?.Reason ?? "Manual recalculation requested by courier";
        var simulateSpike = request?.SimulateTrafficSpike ?? false;

        // Broadcast recalculation started to both customer & driver
        await _notificationService.NotifyRouteRecalculationStartedAsync(delivery.OrderId, reason);

        // Trigger Python LangGraph Agent
        await _aiServiceClient.TriggerRouteRecalculationAsync(delivery.Id, reason, simulateSpike);

        return Ok(new
        {
            message = "Route recalculation initiated via LangGraph agent.",
            deliveryRequestId = delivery.Id,
            reason
        });
    }

    // 4. PUT /api/delivery/{id}/route
    [HttpPut("route")]
    public async Task<IActionResult> UpdateRouteSelection(string id, [FromBody] SaveRouteRequest request)
    {
        var delivery = await _deliveryRequests.Find(x => x.Id == id || x.OrderId == id).FirstOrDefaultAsync();
        if (delivery == null)
        {
            return NotFound(new { message = "Delivery request not found." });
        }

        request.DeliveryRequestId = delivery.Id;
        request.OrderId = delivery.OrderId;

        var saved = await _routeOptimizationService.SaveSelectedRouteAsync(request);
        return Ok(new
        {
            message = "Route updated successfully.",
            route = saved
        });
    }

    // 5. GET /api/delivery/{id}/traffic
    [HttpGet("traffic")]
    public async Task<IActionResult> GetTraffic(string id)
    {
        var delivery = await _deliveryRequests.Find(x => x.Id == id || x.OrderId == id).FirstOrDefaultAsync();
        if (delivery == null)
        {
            return NotFound(new { message = "Delivery request not found." });
        }

        var origin = delivery.PickupLocation ?? new Location { Type = "Point", Coordinates = new[] { -74.0060, 40.7128 } };
        var destination = delivery.DeliveryLocation ?? new Location { Type = "Point", Coordinates = new[] { -73.9857, 40.7484 } };

        var traffic = await _routingProvider.GetCurrentTrafficAsync(origin, destination);
        return Ok(traffic);
    }

    // 6. GET /api/delivery/{id}/eta
    [HttpGet("eta")]
    public async Task<IActionResult> GetEta(string id)
    {
        var delivery = await _deliveryRequests.Find(x => x.Id == id || x.OrderId == id).FirstOrDefaultAsync();
        if (delivery == null)
        {
            return NotFound(new { message = "Delivery request not found." });
        }

        var latestRoute = await _routeOptimizationService.GetLatestRouteForDeliveryAsync(delivery.Id);
        var etaMinutes = latestRoute?.EstimatedMinutes ?? delivery.EstimatedMinutes;
        var distanceKm = latestRoute?.DistanceInKilometers ?? delivery.DistanceInKilometers;

        return Ok(new
        {
            deliveryRequestId = delivery.Id,
            orderId = delivery.OrderId,
            estimatedMinutes = etaMinutes,
            distanceInKilometers = distanceKm,
            trafficCondition = latestRoute?.TrafficCondition ?? "Moderate",
            updatedAt = latestRoute?.UpdatedAt ?? DateTime.UtcNow
        });
    }

    // 7. GET /api/delivery/{id}/history
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory(string id)
    {
        var delivery = await _deliveryRequests.Find(x => x.Id == id || x.OrderId == id).FirstOrDefaultAsync();
        if (delivery == null)
        {
            return NotFound(new { message = "Delivery request not found." });
        }

        var origin = delivery.PickupLocation ?? new Location { Type = "Point", Coordinates = new[] { -74.0060, 40.7128 } };
        var destination = delivery.DeliveryLocation ?? new Location { Type = "Point", Coordinates = new[] { -73.9857, 40.7484 } };

        var aggregations = await _routeOptimizationService.GetHistoricalRouteAggregationsAsync(origin, destination);
        return Ok(new
        {
            deliveryRequestId = delivery.Id,
            historicalAggregations = aggregations
        });
    }
}

