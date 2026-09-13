using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.DTOs;
using SaveBite.API.Models;
using SaveBite.API.Services;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/internal-ai/delivery")]
public class InternalAiDeliveryRouteController : ControllerBase
{
    private readonly IMongoCollection<DeliveryRequest> _deliveryRequests;
    private readonly IMongoCollection<DeliveryPerson> _deliveryPersons;
    private readonly IMongoCollection<Order> _orders;
    private readonly RouteOptimizationService _routeOptimizationService;
    private readonly IRoutingProvider _routingProvider;

    public InternalAiDeliveryRouteController(
        MongoDbContext mongoDbContext,
        RouteOptimizationService routeOptimizationService,
        IRoutingProvider routingProvider)
    {
        _deliveryRequests = mongoDbContext.Database.GetCollection<DeliveryRequest>("deliveryRequests");
        _deliveryPersons = mongoDbContext.Database.GetCollection<DeliveryPerson>("deliveryPersons");
        _orders = mongoDbContext.Database.GetCollection<Order>("orders");
        _routeOptimizationService = routeOptimizationService;
        _routingProvider = routingProvider;
    }

    public class RouteOptionsRequest
    {
        public double OriginLatitude { get; set; }
        public double OriginLongitude { get; set; }
        public double DestinationLatitude { get; set; }
        public double DestinationLongitude { get; set; }
        public bool SimulateCongestionOnRouteA { get; set; }
    }

    // 1. GET: /api/internal-ai/delivery/{id}/route-state
    [HttpGet("{id}/route-state")]
    public async Task<IActionResult> GetRouteState(string id)
    {
        var delivery = await _deliveryRequests.Find(x => x.Id == id || x.OrderId == id).FirstOrDefaultAsync();
        if (delivery == null)
        {
            return NotFound(new { message = "Delivery request not found." });
        }

        DeliveryPerson? driver = null;
        if (!string.IsNullOrEmpty(delivery.DeliveryPersonId))
        {
            driver = await _deliveryPersons.Find(x => x.Id == delivery.DeliveryPersonId).FirstOrDefaultAsync();
        }

        var latestRoute = await _routeOptimizationService.GetLatestRouteForDeliveryAsync(delivery.Id);

        var pLat = delivery.PickupLocation?.Coordinates.Length > 1 ? delivery.PickupLocation.Coordinates[1] : 40.7128;
        var pLon = delivery.PickupLocation?.Coordinates.Length > 0 ? delivery.PickupLocation.Coordinates[0] : -74.0060;

        var dLat = delivery.DeliveryLocation?.Coordinates.Length > 1 ? delivery.DeliveryLocation.Coordinates[1] : 40.7484;
        var dLon = delivery.DeliveryLocation?.Coordinates.Length > 0 ? delivery.DeliveryLocation.Coordinates[0] : -73.9857;

        var drLat = driver?.Location?.Coordinates.Length > 1 ? driver.Location.Coordinates[1] : pLat;
        var drLon = driver?.Location?.Coordinates.Length > 0 ? driver.Location.Coordinates[0] : pLon;

        return Ok(new
        {
            deliveryRequestId = delivery.Id,
            orderId = delivery.OrderId,
            deliveryStatus = delivery.Status.ToString(),
            pickupLatitude = pLat,
            pickupLongitude = pLon,
            destinationLatitude = dLat,
            destinationLongitude = dLon,
            driverLatitude = drLat,
            driverLongitude = drLon,
            driverId = driver?.Id,
            driverName = driver?.VehicleNumber ?? "Courier",
            driverVehicleType = driver?.VehicleType ?? "Bicycle",
            currentRouteId = latestRoute?.RouteId,
            currentEta = latestRoute?.EstimatedMinutes ?? delivery.EstimatedMinutes,
            currentDistance = latestRoute?.DistanceInKilometers ?? delivery.DistanceInKilometers,
            routeVersion = latestRoute?.RouteVersion ?? 0
        });
    }

    // 2. GET: /api/internal-ai/delivery/{id}/driver-location
    [HttpGet("{id}/driver-location")]
    public async Task<IActionResult> GetDriverLocation(string id)
    {
        var delivery = await _deliveryRequests.Find(x => x.Id == id || x.OrderId == id).FirstOrDefaultAsync();
        if (delivery == null)
        {
            return NotFound(new { message = "Delivery request not found." });
        }

        if (string.IsNullOrEmpty(delivery.DeliveryPersonId))
        {
            return NotFound(new { message = "No driver assigned to this delivery request." });
        }

        var driver = await _deliveryPersons.Find(x => x.Id == delivery.DeliveryPersonId).FirstOrDefaultAsync();
        if (driver == null || driver.Location == null || driver.Location.Coordinates.Length < 2)
        {
            return Ok(new
            {
                latitude = delivery.PickupLocation?.Coordinates[1] ?? 40.7128,
                longitude = delivery.PickupLocation?.Coordinates[0] ?? -74.0060,
                isSimulated = true
            });
        }

        return Ok(new
        {
            latitude = driver.Location.Coordinates[1],
            longitude = driver.Location.Coordinates[0],
            isSimulated = false,
            updatedAt = DateTime.UtcNow
        });
    }

    // 3. POST: /api/internal-ai/delivery/route-options
    [HttpPost("route-options")]
    public async Task<IActionResult> GetRouteOptions([FromBody] RouteOptionsRequest request)
    {
        var origin = new Location { Type = "Point", Coordinates = new[] { request.OriginLongitude, request.OriginLatitude } };
        var destination = new Location { Type = "Point", Coordinates = new[] { request.DestinationLongitude, request.DestinationLatitude } };

        var routes = await _routingProvider.GetRouteOptionsAsync(origin, destination, request.SimulateCongestionOnRouteA);
        return Ok(new { routes });
    }

    // 4. POST: /api/internal-ai/delivery/traffic
    [HttpPost("traffic")]
    public async Task<IActionResult> GetTraffic([FromBody] RouteOptionsRequest request)
    {
        var origin = new Location { Type = "Point", Coordinates = new[] { request.OriginLongitude, request.OriginLatitude } };
        var destination = new Location { Type = "Point", Coordinates = new[] { request.DestinationLongitude, request.DestinationLatitude } };

        var traffic = await _routingProvider.GetCurrentTrafficAsync(origin, destination);
        return Ok(traffic);
    }

    // 5. POST: /api/internal-ai/delivery/historical-routes
    [HttpPost("historical-routes")]
    public async Task<IActionResult> GetHistoricalRoutes([FromBody] RouteOptionsRequest request)
    {
        var origin = new Location { Type = "Point", Coordinates = new[] { request.OriginLongitude, request.OriginLatitude } };
        var destination = new Location { Type = "Point", Coordinates = new[] { request.DestinationLongitude, request.DestinationLatitude } };

        var aggregations = await _routeOptimizationService.GetHistoricalRouteAggregationsAsync(origin, destination);
        return Ok(new { historicalRoutes = aggregations });
    }

    // 6. POST: /api/internal-ai/delivery/save-route
    [HttpPost("save-route")]
    public async Task<IActionResult> SaveRoute([FromBody] SaveRouteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DeliveryRequestId) || string.IsNullOrWhiteSpace(request.RouteId))
        {
            return BadRequest(new { message = "DeliveryRequestId and RouteId are required." });
        }

        var saved = await _routeOptimizationService.SaveSelectedRouteAsync(request);
        return Ok(new
        {
            success = true,
            message = "Route saved and broadcast successfully.",
            route = saved
        });
    }
}

