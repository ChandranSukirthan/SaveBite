using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.Models;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/customer/delivery")]
[Authorize(Roles = "Customer")]
public class CustomerDeliveryController : ControllerBase
{
    private readonly IMongoCollection<Customer> _customers;
    private readonly IMongoCollection<Order> _orders;
    private readonly IMongoCollection<DeliveryRequest> _deliveryRequests;
    private readonly IMongoCollection<DeliveryPerson> _deliveryPersons;
    private readonly IMongoCollection<Restaurant> _restaurants;
    private readonly IMongoCollection<FoodItem> _foodItems;

    public CustomerDeliveryController(
        MongoDbContext mongoDbContext)
    {
        _customers = mongoDbContext.Database
            .GetCollection<Customer>("customers");

        _orders = mongoDbContext.Database
            .GetCollection<Order>("orders");

        _deliveryRequests = mongoDbContext.Database
            .GetCollection<DeliveryRequest>("deliveryRequests");

        _deliveryPersons = mongoDbContext.Database
            .GetCollection<DeliveryPerson>("deliveryPersons");

        _restaurants = mongoDbContext.Database
            .GetCollection<Restaurant>("restaurants");

        _foodItems = mongoDbContext.Database
            .GetCollection<FoodItem>("foodItems");
    }


    // GET DELIVERY INFORMATION FOR AN ORDER
    // GET: /api/customer/delivery/order/{orderId}


    [HttpGet("order/{orderId}")]
    public async Task<IActionResult> GetDeliveryByOrder(
        string orderId)
    {
        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new
            {
                message =
                    "User identity could not be determined."
            });
        }

        // Find customer
        var customer = await _customers
            .Find(x => x.UserId == userId)
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return NotFound(new
            {
                message =
                    "Customer profile not found."
            });
        }

        // Find customer's order
        var order = await _orders
            .Find(x =>
                x.Id == orderId &&
                x.CustomerId == customer.Id)
            .FirstOrDefaultAsync();

        if (order == null)
        {
            return NotFound(new
            {
                message =
                    "Order not found."
            });
        }

        // Find food
        var food = await _foodItems
            .Find(x => x.Id == order.FoodItemId)
            .FirstOrDefaultAsync();

        // Find restaurant
        var restaurant = await _restaurants
            .Find(x => x.Id == order.RestaurantId)
            .FirstOrDefaultAsync();

        // Find delivery request
        DeliveryRequest? deliveryRequest = null;

        if (!string.IsNullOrEmpty(
                order.DeliveryRequestId))
        {
            deliveryRequest =
                await _deliveryRequests
                    .Find(x =>
                        x.Id == order.DeliveryRequestId)
                    .FirstOrDefaultAsync();
        }

        // Find delivery person
        DeliveryPerson? deliveryPerson = null;

        if (deliveryRequest != null &&
            !string.IsNullOrEmpty(
                deliveryRequest.DeliveryPersonId))
        {
            deliveryPerson =
                await _deliveryPersons
                    .Find(x =>
                        x.Id ==
                        deliveryRequest.DeliveryPersonId)
                    .FirstOrDefaultAsync();
        }

        return Ok(new
        {
            order = new
            {
                id = order.Id,

                status = order.Status.ToString(),

                quantity = order.Quantity,

                unitPrice = order.UnitPrice,

                foodTotal = order.FoodTotal,

                deliveryFee = order.DeliveryFee,

                totalAmount = order.TotalAmount,

                deliveryAddress =
                    order.DeliveryAddress,

                createdAt = order.CreatedAt,

                updatedAt = order.UpdatedAt
            },

            food = food == null
                ? null
                : new
                {
                    id = food.Id,
                    name = food.Name,
                    category = food.Category
                },

            restaurant = restaurant == null
                ? null
                : new
                {
                    id = restaurant.Id,
                    name = restaurant.RestaurantName,
                    address = restaurant.Address
                },

            delivery =
                deliveryRequest == null
                    ? null
                    : new
                    {
                        id = deliveryRequest.Id,

                        status =
                            deliveryRequest.Status
                                .ToString(),

                        distanceInKilometers =
                            deliveryRequest
                                .DistanceInKilometers,

                        deliveryFee =
                            deliveryRequest.DeliveryFee,

                        estimatedMinutes =
                            deliveryRequest
                                .EstimatedMinutes,

                        requestedAt =
                            deliveryRequest.RequestedAt,

                        assignedAt =
                            deliveryRequest.AssignedAt,

                        acceptedAt =
                            deliveryRequest.AcceptedAt,

                        completedAt =
                            deliveryRequest.CompletedAt,

                        deliveryPerson =
                            deliveryPerson == null
                                ? null
                                : new
                                {
                                    id =
                                        deliveryPerson.Id,

                                    phoneNumber =
                                        deliveryPerson.PhoneNumber,

                                    vehicleType =
                                        deliveryPerson.VehicleType,

                                    vehicleNumber =
                                        deliveryPerson.VehicleNumber,

                                    location =
                                        deliveryPerson.Location
                                }
                    }
        });
    }


    // GET ACTIVE DELIVERIES
    // GET: /api/customer/delivery/active


    [HttpGet("active")]
    public async Task<IActionResult> GetActiveDeliveries()
    {
        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var customer = await _customers
            .Find(x => x.UserId == userId)
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return NotFound(new
            {
                message =
                    "Customer profile not found."
            });
        }

        var activeStatuses = new[]
        {
            OrderStatus.Pending,
            OrderStatus.Confirmed,
            OrderStatus.Preparing,
            OrderStatus.ReadyForPickup,
            OrderStatus.PickedUp,
            OrderStatus.OutForDelivery
        };

        var orders = await _orders
            .Find(
                x =>
                    x.CustomerId == customer.Id &&
                    activeStatuses.Contains(x.Status))
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(orders);
    }
}