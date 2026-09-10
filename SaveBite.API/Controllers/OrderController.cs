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
[Route("api/[controller]")]
[Authorize(Roles = "Customer")]
public class OrderController : ControllerBase
{
    private readonly IMongoCollection<Order> _orders;
    private readonly IMongoCollection<FoodItem> _foodItems;
    private readonly IMongoCollection<Customer> _customers;
    private readonly IMongoCollection<Restaurant> _restaurants;
    private readonly NotificationService _notificationService;

    public OrderController(
        MongoDbContext mongoDbContext,
        NotificationService notificationService)
    {
        _orders = mongoDbContext.Database
            .GetCollection<Order>("orders");

        _foodItems = mongoDbContext.Database
            .GetCollection<FoodItem>("foodItems");

        _customers = mongoDbContext.Database
            .GetCollection<Customer>("customers");

        _restaurants = mongoDbContext.Database
            .GetCollection<Restaurant>("restaurants");

        _notificationService = notificationService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder(
        CreateOrderRequest request)
    {
        var customerUserId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(customerUserId))
        {
            return Unauthorized(new
            {
                message = "User identity could not be determined."
            });
        }

        if (string.IsNullOrWhiteSpace(request.FoodItemId))
        {
            return BadRequest(new
            {
                message = "Food item ID is required."
            });
        }

        if (request.Quantity <= 0)
        {
            return BadRequest(new
            {
                message = "Quantity must be greater than zero."
            });
        }

        if (string.IsNullOrWhiteSpace(request.DeliveryAddress))
        {
            return BadRequest(new
            {
                message = "Delivery address is required."
            });
        }

        if (request.Latitude < -90 || request.Latitude > 90)
        {
            return BadRequest(new
            {
                message = "Invalid latitude."
            });
        }

        if (request.Longitude < -180 || request.Longitude > 180)
        {
            return BadRequest(new
            {
                message = "Invalid longitude."
            });
        }

        var customer = await _customers
            .Find(x => x.UserId == customerUserId)
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return BadRequest(new
            {
                message = "Please create your customer profile first."
            });
        }

        var food = await _foodItems
            .Find(x => x.Id == request.FoodItemId)
            .FirstOrDefaultAsync();

        if (food == null)
        {
            return NotFound(new
            {
                message = "Food item not found."
            });
        }

        if (food.Status != FoodStatus.Available)
        {
            return BadRequest(new
            {
                message = "This food is no longer available."
            });
        }

        if (food.AvailableUntil <= DateTime.UtcNow)
        {
            return BadRequest(new
            {
                message = "This food listing has expired."
            });
        }

        if (food.Quantity < request.Quantity)
        {
            return BadRequest(new
            {
                message = $"Only {food.Quantity} item(s) are available."
            });
        }

        var restaurant = await _restaurants
            .Find(x => x.Id == food.RestaurantId && x.IsApproved)
            .FirstOrDefaultAsync();

        if (restaurant == null)
        {
            return BadRequest(new
            {
                message = "The restaurant is not currently available."
            });
        }

        /*
         * Atomically reserve the requested quantity.
         *
         * The quantity condition is included in the filter,
         * preventing over-ordering when multiple customers
         * place orders at approximately the same time.
         */
        var quantityFilter = Builders<FoodItem>.Filter.And(
            Builders<FoodItem>.Filter.Eq(
                x => x.Id,
                food.Id),

            Builders<FoodItem>.Filter.Eq(
                x => x.Status,
                FoodStatus.Available),

            Builders<FoodItem>.Filter.Gte(
                x => x.Quantity,
                request.Quantity),

            Builders<FoodItem>.Filter.Gt(
                x => x.AvailableUntil,
                DateTime.UtcNow)
        );

        var quantityUpdate = Builders<FoodItem>.Update
            .Inc(x => x.Quantity, -request.Quantity)
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

        var quantityResult = await _foodItems.UpdateOneAsync(
            quantityFilter,
            quantityUpdate);

        if (quantityResult.ModifiedCount == 0)
        {
            return Conflict(new
            {
                message =
                    "The requested quantity is no longer available."
            });
        }

        var foodTotal =
            food.Price * request.Quantity;

        /*
         * Delivery fee will be calculated by the
         * delivery/agentic system later.
         *
         * For now we use zero so the order workflow
         * can be tested without a delivery provider.
         */
        var deliveryFee = 0m;

        var totalAmount =
            foodTotal + deliveryFee;

        var order = new Order
        {
            CustomerId = customer.Id,

            RestaurantId = food.RestaurantId,

            FoodItemId = food.Id,

            Quantity = request.Quantity,

            UnitPrice = food.Price,

            FoodTotal = foodTotal,

            DeliveryFee = deliveryFee,

            TotalAmount = totalAmount,

            DeliveryAddress =
                request.DeliveryAddress.Trim(),

            DeliveryLocation = new Location
            {
                Type = "Point",
                Coordinates = new[]
                {
                    request.Longitude,
                    request.Latitude
                }
            },

            Status = OrderStatus.Pending,

            CreatedAt = DateTime.UtcNow,

            UpdatedAt = DateTime.UtcNow
        };

        await _orders.InsertOneAsync(order);

        var restaurantOwner =
            await _restaurants
                .Find(x => x.Id == order.RestaurantId)
                .FirstOrDefaultAsync();

        if (restaurantOwner != null)
        {
            await _notificationService.CreateAsync(
                restaurantOwner.OwnerId,
                "New Order",
                "A customer has placed a new surplus food order.",
                NotificationType.OrderCreated,
                order.Id);
        }

        return CreatedAtAction(
            nameof(GetOrderById),
            new { id = order.Id },
            new
            {
                message = "Order created successfully.",
                order
            });
    }

    [HttpGet]
    public async Task<IActionResult> GetMyOrders()
    {
        var customerUserId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(customerUserId))
        {
            return Unauthorized();
        }

        var customer = await _customers
            .Find(x => x.UserId == customerUserId)
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return NotFound(new
            {
                message = "Customer profile not found."
            });
        }

        var orders = await _orders
            .Find(x => x.CustomerId == customer.Id)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrderById(
        string id)
    {
        var customerUserId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(customerUserId))
        {
            return Unauthorized();
        }

        var customer = await _customers
            .Find(x => x.UserId == customerUserId)
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return NotFound(new
            {
                message = "Customer profile not found."
            });
        }

        var order = await _orders
            .Find(x =>
                x.Id == id &&
                x.CustomerId == customer.Id)
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

    [HttpPatch("{id}/cancel")]
    public async Task<IActionResult> CancelOrder(
        string id)
    {
        var customerUserId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(customerUserId))
        {
            return Unauthorized();
        }

        var customer = await _customers
            .Find(x => x.UserId == customerUserId)
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return NotFound(new
            {
                message = "Customer profile not found."
            });
        }

        var order = await _orders
            .Find(x =>
                x.Id == id &&
                x.CustomerId == customer.Id)
            .FirstOrDefaultAsync();

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        if (order.Status != OrderStatus.Pending)
        {
            return BadRequest(new
            {
                message =
                    "Only pending orders can be cancelled."
            });
        }

        var orderUpdate = Builders<Order>.Update
            .Set(x => x.Status, OrderStatus.Cancelled)
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

        await _orders.UpdateOneAsync(
            x =>
                x.Id == id &&
                x.CustomerId == customer.Id,
            orderUpdate);

        // Return the reserved quantity to the food item.
        var foodUpdate = Builders<FoodItem>.Update
            .Inc(x => x.Quantity, order.Quantity)
            .Set(x => x.Status, FoodStatus.Available)
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

        await _foodItems.UpdateOneAsync(
            x => x.Id == order.FoodItemId,
            foodUpdate);

        return Ok(new
        {
            message = "Order cancelled successfully."
        });
    }

    [AllowAnonymous]
    [HttpPost("/api/internal-ai/orders")]
    public async Task<IActionResult> CreateOrderForAI(
        [FromQuery] string customerId,
        CreateOrderRequest request)
    {
        if (string.IsNullOrWhiteSpace(customerId))
        {
            return BadRequest(new
            {
                message = "Customer ID is required."
            });
        }

        if (string.IsNullOrWhiteSpace(request.FoodItemId))
        {
            return BadRequest(new
            {
                message = "Food item ID is required."
            });
        }

        if (request.Quantity <= 0)
        {
            return BadRequest(new
            {
                message = "Quantity must be greater than zero."
            });
        }

        if (string.IsNullOrWhiteSpace(
                request.DeliveryAddress))
        {
            return BadRequest(new
            {
                message = "Delivery address is required."
            });
        }

        if (request.Latitude < -90 ||
            request.Latitude > 90)
        {
            return BadRequest(new
            {
                message = "Invalid latitude."
            });
        }

        if (request.Longitude < -180 ||
            request.Longitude > 180)
        {
            return BadRequest(new
            {
                message = "Invalid longitude."
            });
        }

        var customer = await _customers
            .Find(x => x.Id == customerId)
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return NotFound(new
            {
                message = "Customer not found."
            });
        }

        var food = await _foodItems
            .Find(x => x.Id == request.FoodItemId)
            .FirstOrDefaultAsync();

        if (food == null)
        {
            return NotFound(new
            {
                message = "Food item not found."
            });
        }

        if (food.Status != FoodStatus.Available)
        {
            return BadRequest(new
            {
                message = "Food item is no longer available."
            });
        }

        if (food.AvailableUntil <= DateTime.UtcNow)
        {
            return BadRequest(new
            {
                message = "Food item has expired."
            });
        }

        if (food.Quantity < request.Quantity)
        {
            return Conflict(new
            {
                message =
                    $"Only {food.Quantity} item(s) are currently available."
            });
        }

        var restaurant = await _restaurants
            .Find(x =>
                x.Id == food.RestaurantId &&
                x.IsApproved)
            .FirstOrDefaultAsync();

        if (restaurant == null)
        {
            return BadRequest(new
            {
                message =
                    "The restaurant is not currently available."
            });
        }

        var quantityFilter =
            Builders<FoodItem>.Filter.And(
                Builders<FoodItem>.Filter.Eq(
                    x => x.Id,
                    food.Id),

                Builders<FoodItem>.Filter.Eq(
                    x => x.Status,
                    FoodStatus.Available),

                Builders<FoodItem>.Filter.Gte(
                    x => x.Quantity,
                    request.Quantity),

                Builders<FoodItem>.Filter.Gt(
                    x => x.AvailableUntil,
                    DateTime.UtcNow)
            );

        var quantityUpdate =
            Builders<FoodItem>.Update
                .Inc(
                    x => x.Quantity,
                    -request.Quantity)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        var quantityResult =
            await _foodItems.UpdateOneAsync(
                quantityFilter,
                quantityUpdate);

        if (quantityResult.ModifiedCount == 0)
        {
            return Conflict(new
            {
                message =
                    "The requested food quantity is no longer available."
            });
        }

        var foodTotal =
            food.Price * request.Quantity;

        var order = new Order
        {
            CustomerId = customer.Id,

            RestaurantId = food.RestaurantId,

            FoodItemId = food.Id,

            Quantity = request.Quantity,

            UnitPrice = food.Price,

            FoodTotal = foodTotal,

            DeliveryFee = 0m,

            TotalAmount = foodTotal,

            DeliveryAddress =
                request.DeliveryAddress.Trim(),

            DeliveryLocation = new Location
            {
                Type = "Point",
                Coordinates = new[]
                {
                    request.Longitude,
                    request.Latitude
                }
            },

            Status = OrderStatus.Pending,

            CreatedAt = DateTime.UtcNow,

            UpdatedAt = DateTime.UtcNow
        };

        await _orders.InsertOneAsync(order);

        var restaurantOwner =
            await _restaurants
                .Find(x => x.Id == order.RestaurantId)
                .FirstOrDefaultAsync();

        if (restaurantOwner != null)
        {
            await _notificationService.CreateAsync(
                restaurantOwner.OwnerId,
                "New Order",
                "A customer has placed a new surplus food order.",
                NotificationType.OrderCreated,
                order.Id);
        }

        return CreatedAtAction(
            nameof(GetOrderById),
            new { id = order.Id },
            new
            {
                message = "Order created successfully.",

                order = new
                {
                    order.Id,
                    order.CustomerId,
                    order.RestaurantId,
                    order.FoodItemId,
                    order.Quantity,
                    order.UnitPrice,
                    order.FoodTotal,
                    order.DeliveryFee,
                    order.TotalAmount,
                    status = order.Status.ToString()
                }
            });
    }
}