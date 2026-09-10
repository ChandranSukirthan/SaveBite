using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.DTOs;
using SaveBite.API.Models;
using SaveBite.API.Services;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/restaurant/orders")]
[Authorize(Roles = "RestaurantOwner")]
public class RestaurantOrderController : ControllerBase
{
    private readonly IMongoCollection<Restaurant> _restaurants;
    private readonly IMongoCollection<Order> _orders;
    private readonly AIServiceClient _aiServiceClient;

    public RestaurantOrderController(
        MongoDbContext mongoDbContext,
        AIServiceClient aiServiceClient)
    {
        _restaurants = mongoDbContext.Database
            .GetCollection<Restaurant>("restaurants");

        _orders = mongoDbContext.Database
            .GetCollection<Order>("orders");

        _aiServiceClient = aiServiceClient;
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders()
    {
        var ownerId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(ownerId))
        {
            return Unauthorized();
        }

        var restaurant = await _restaurants
            .Find(x => x.OwnerId == ownerId)
            .FirstOrDefaultAsync();

        if (restaurant == null)
        {
            return NotFound(new
            {
                message = "Restaurant profile not found."
            });
        }

        var orders = await _orders
            .Find(x => x.RestaurantId == restaurant.Id)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(string id)
    {
        var ownerId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(ownerId))
        {
            return Unauthorized();
        }

        var restaurant = await _restaurants
            .Find(x => x.OwnerId == ownerId)
            .FirstOrDefaultAsync();

        if (restaurant == null)
        {
            return NotFound(new
            {
                message = "Restaurant profile not found."
            });
        }

        var order = await _orders
            .Find(x =>
                x.Id == id &&
                x.RestaurantId == restaurant.Id)
            .FirstOrDefaultAsync();

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        return Ok(order);
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(
        string id,
        UpdateOrderStatusRequest request)
    {
        var ownerId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(ownerId))
        {
            return Unauthorized();
        }

        var restaurant = await _restaurants
            .Find(x => x.OwnerId == ownerId)
            .FirstOrDefaultAsync();

        if (restaurant == null)
        {
            return NotFound(new
            {
                message = "Restaurant profile not found."
            });
        }

        var order = await _orders
            .Find(x =>
                x.Id == id &&
                x.RestaurantId == restaurant.Id)
            .FirstOrDefaultAsync();

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        if (!IsValidRestaurantStatusChange(
                order.Status,
                request.Status))
        {
            return BadRequest(new
            {
                message =
                    $"Cannot change order status from " +
                    $"{order.Status} to " +
                    $"{request.Status}."
            });
        }

        var update =
            Builders<Order>.Update
                .Set(
                    x => x.Status,
                    request.Status)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        await _orders.UpdateOneAsync(
            x =>
                x.Id == id &&
                x.RestaurantId == restaurant.Id,
            update);

        /*
         * When the restaurant marks the order as
         * ReadyForPickup, automatically start the
         * AI delivery workflow.
         */
        if (request.Status ==
            OrderStatus.ReadyForPickup)
        {
            try
            {
                /*
                 * Create a delivery request first.
                 */
                var existingDeliveryRequest =
                    await GetExistingDeliveryRequest(
                        order.Id);

                if (existingDeliveryRequest == null)
                {
                    /*
                     * DeliveryRequest creation belongs to
                     * DeliveryController in our current
                     * architecture.
                     *
                     * We retrieve the order again here and
                     * create the request directly so the
                     * transition is automatic.
                     */
                    existingDeliveryRequest =
                        await CreateDeliveryRequestForOrder(
                            order);
                }

                /*
                 * Start LangGraph delivery optimization.
                 */
                await _aiServiceClient
                    .TriggerDeliveryOptimizationAsync(
                        existingDeliveryRequest.Id);

                return Ok(new
                {
                    message =
                        "Order status updated and " +
                        "AI delivery agent started.",

                    orderId = order.Id,

                    status =
                        request.Status.ToString(),

                    deliveryRequestId =
                        existingDeliveryRequest.Id,

                    aiTriggered = true
                });
            }
            catch (Exception ex)
            {
                /*
                 * The order remains ReadyForPickup.
                 *
                 * We do not roll back the restaurant's
                 * status change merely because the AI
                 * service is temporarily unavailable.
                 */
                return Accepted(new
                {
                    message =
                        "Order is ready for pickup, but " +
                        "the AI delivery agent could not " +
                        "be started automatically.",

                    orderId = order.Id,

                    status =
                        request.Status.ToString(),

                    aiTriggered = false,

                    error = ex.Message
                });
            }
        }

        return Ok(new
        {
            message =
                "Order status updated successfully.",

            orderId = order.Id,

            status =
                request.Status.ToString()
        });
    }

    private async Task<DeliveryRequest?>
        GetExistingDeliveryRequest(
            string orderId)
    {
        var database =
            _orders.Database;

        var deliveryRequests =
            database.GetCollection<DeliveryRequest>(
                "deliveryRequests");

        return await deliveryRequests
            .Find(x => x.OrderId == orderId)
            .FirstOrDefaultAsync();
    }

    private async Task<DeliveryRequest>
        CreateDeliveryRequestForOrder(
            Order order)
    {
        var database =
            _orders.Database;

        var deliveryRequests =
            database.GetCollection<DeliveryRequest>(
                "deliveryRequests");

        var restaurant =
            await _restaurants
                .Find(x => x.Id == order.RestaurantId)
                .FirstOrDefaultAsync();

        if (restaurant == null)
        {
            throw new InvalidOperationException(
                "Restaurant not found.");
        }

        var customers =
            database.GetCollection<Customer>(
                "customers");

        var customer =
            await customers
                .Find(x => x.Id == order.CustomerId)
                .FirstOrDefaultAsync();

        if (customer == null)
        {
            throw new InvalidOperationException(
                "Customer not found.");
        }

        if (restaurant.Location == null ||
            restaurant.Location.Coordinates == null ||
            restaurant.Location.Coordinates.Length < 2)
        {
            throw new InvalidOperationException(
                "Restaurant location is invalid.");
        }

        if (customer.Location == null ||
            customer.Location.Coordinates == null ||
            customer.Location.Coordinates.Length < 2)
        {
            throw new InvalidOperationException(
                "Customer location is invalid.");
        }

        var pickupLongitude =
            restaurant.Location.Coordinates[0];

        var pickupLatitude =
            restaurant.Location.Coordinates[1];

        var deliveryLongitude =
            customer.Location.Coordinates[0];

        var deliveryLatitude =
            customer.Location.Coordinates[1];

        var distance =
            CalculateDistanceInKilometers(
                pickupLatitude,
                pickupLongitude,
                deliveryLatitude,
                deliveryLongitude);

        var deliveryFee =
            CalculateDeliveryFee(distance);

        var estimatedMinutes =
            CalculateEstimatedMinutes(distance);

        var deliveryRequest =
            new DeliveryRequest
            {
                OrderId = order.Id,

                CustomerId = order.CustomerId,

                RestaurantId = order.RestaurantId,

                DeliveryPersonId = null,

                PickupLocation =
                    restaurant.Location,

                DeliveryLocation =
                    customer.Location,

                DistanceInKilometers =
                    Math.Round(distance, 2),

                DeliveryFee =
                    deliveryFee,

                EstimatedMinutes =
                    estimatedMinutes,

                Status =
                    DeliveryRequestStatus.Searching,

                RequestedAt =
                    DateTime.UtcNow,

                UpdatedAt =
                    DateTime.UtcNow
            };

        await deliveryRequests.InsertOneAsync(
            deliveryRequest);

        var orderUpdate =
            Builders<Order>.Update
                .Set(
                    x => x.DeliveryRequestId,
                    deliveryRequest.Id)
                .Set(
                    x => x.DeliveryFee,
                    deliveryFee)
                .Set(
                    x => x.TotalAmount,
                    order.FoodTotal +
                    deliveryFee)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        await _orders.UpdateOneAsync(
            x => x.Id == order.Id,
            orderUpdate);

        return deliveryRequest;
    }

    private static decimal CalculateDeliveryFee(
        double distanceInKilometers)
    {
        const decimal baseFee = 100m;
        const decimal feePerKilometer = 50m;

        return Math.Round(
            baseFee +
            ((decimal)distanceInKilometers *
             feePerKilometer),
            2);
    }

    private static int CalculateEstimatedMinutes(
        double distanceInKilometers)
    {
        const double averageSpeedKmPerHour = 25.0;

        var hours =
            distanceInKilometers /
            averageSpeedKmPerHour;

        return Math.Max(
            5,
            (int)Math.Ceiling(hours * 60));
    }

    private static double CalculateDistanceInKilometers(
        double latitude1,
        double longitude1,
        double latitude2,
        double longitude2)
    {
        const double earthRadiusKm = 6371.0;

        var lat1 =
            DegreesToRadians(latitude1);

        var lat2 =
            DegreesToRadians(latitude2);

        var deltaLat =
            DegreesToRadians(
                latitude2 - latitude1);

        var deltaLon =
            DegreesToRadians(
                longitude2 - longitude1);

        var a =
            Math.Sin(deltaLat / 2) *
            Math.Sin(deltaLat / 2)
            +
            Math.Cos(lat1) *
            Math.Cos(lat2) *
            Math.Sin(deltaLon / 2) *
            Math.Sin(deltaLon / 2);

        var c =
            2 *
            Math.Atan2(
                Math.Sqrt(a),
                Math.Sqrt(1 - a));

        return earthRadiusKm * c;
    }

    private static double DegreesToRadians(
        double degrees)
    {
        return degrees * Math.PI / 180.0;
    }

    private static bool IsValidRestaurantStatusChange(
        OrderStatus current,
        OrderStatus next)
    {
        return current switch
        {
            OrderStatus.Pending =>
                next == OrderStatus.Confirmed ||
                next == OrderStatus.Cancelled,

            OrderStatus.Confirmed =>
                next == OrderStatus.Preparing ||
                next == OrderStatus.Cancelled,

            OrderStatus.Preparing =>
                next == OrderStatus.ReadyForPickup,

            OrderStatus.ReadyForPickup =>
                false,

            _ => false
        };
    }
}