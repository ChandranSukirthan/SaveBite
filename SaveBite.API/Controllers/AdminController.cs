using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.Models;
using SaveBite.API.Services;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IMongoCollection<Restaurant> _restaurants;
    private readonly IMongoCollection<User> _users;
    private readonly IMongoCollection<Order> _orders;
    private readonly IMongoCollection<DeliveryRequest> _deliveryRequests;
    private readonly IMongoCollection<DeliveryPerson> _deliveryPersons;
    private readonly IMongoCollection<Customer> _customers;
    private readonly IMongoCollection<FoodItem> _foodItems;
    private readonly NotificationService _notificationService;

    public AdminController(
        MongoDbContext mongoDbContext,
        NotificationService notificationService)
    {
        _restaurants = mongoDbContext.Database
            .GetCollection<Restaurant>("restaurants");

        _users = mongoDbContext.Database
            .GetCollection<User>("users");

        _orders = mongoDbContext.Database
            .GetCollection<Order>("orders");

        _deliveryRequests = mongoDbContext.Database
            .GetCollection<DeliveryRequest>("deliveryRequests");

        _deliveryPersons = mongoDbContext.Database
            .GetCollection<DeliveryPerson>("deliveryPersons");

        _customers = mongoDbContext.Database
            .GetCollection<Customer>("customers");

        _foodItems = mongoDbContext.Database
            .GetCollection<FoodItem>("foodItems");

        _notificationService = notificationService;
    }

    // 1. GET PENDING RESTAURANTS
    // GET: /api/Admin/restaurants/pending
    [HttpGet("restaurants/pending")]
    public async Task<IActionResult> GetPendingRestaurants()
    {
        var restaurants = await _restaurants
            .Find(x => !x.IsApproved)
            .SortBy(x => x.CreatedAt)
            .ToListAsync();

        var ownerIds = restaurants
            .Select(x => x.OwnerId)
            .Where(x => !string.IsNullOrEmpty(x))
            .Distinct()
            .ToList();

        var owners = await _users
            .Find(x => ownerIds.Contains(x.Id))
            .ToListAsync();

        var ownerMap = owners.ToDictionary(x => x.Id);

        var enriched = restaurants.Select(r =>
        {
            ownerMap.TryGetValue(r.OwnerId, out var owner);
            return new
            {
                r.Id,
                r.OwnerId,
                r.RestaurantName,
                r.Address,
                r.PhoneNumber,
                r.Location,
                r.IsApproved,
                r.CreatedAt,
                OwnerFullName = owner?.FullName ?? "Unknown Owner",
                OwnerEmail = owner?.Email ?? "No Email"
            };
        });

        return Ok(enriched);
    }

    // 2. GET ALL RESTAURANTS
    // GET: /api/Admin/restaurants?status=pending|approved|rejected|all
    [HttpGet("restaurants")]
    public async Task<IActionResult> GetAllRestaurants([FromQuery] string? status = null)
    {
        FilterDefinition<Restaurant> filter = Builders<Restaurant>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            if (status.Equals("pending", StringComparison.OrdinalIgnoreCase))
            {
                filter = Builders<Restaurant>.Filter.Eq(x => x.IsApproved, false);
            }
            else if (status.Equals("approved", StringComparison.OrdinalIgnoreCase))
            {
                filter = Builders<Restaurant>.Filter.Eq(x => x.IsApproved, true);
            }
        }

        var restaurants = await _restaurants
            .Find(filter)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();

        var ownerIds = restaurants
            .Select(x => x.OwnerId)
            .Where(x => !string.IsNullOrEmpty(x))
            .Distinct()
            .ToList();

        var restaurantIds = restaurants
            .Select(x => x.Id)
            .Distinct()
            .ToList();

        var owners = await _users
            .Find(x => ownerIds.Contains(x.Id))
            .ToListAsync();

        var foodCounts = await _foodItems
            .Find(x => restaurantIds.Contains(x.RestaurantId))
            .ToListAsync();

        var ownerMap = owners.ToDictionary(x => x.Id);
        var foodGroupMap = foodCounts
            .GroupBy(x => x.RestaurantId)
            .ToDictionary(g => g.Key, g => g.Count());

        var enriched = restaurants.Select(r =>
        {
            ownerMap.TryGetValue(r.OwnerId, out var owner);
            foodGroupMap.TryGetValue(r.Id, out var fCount);

            return new
            {
                r.Id,
                r.OwnerId,
                r.RestaurantName,
                r.Address,
                r.PhoneNumber,
                r.Location,
                r.IsApproved,
                r.CreatedAt,
                OwnerFullName = owner?.FullName ?? "Unknown Owner",
                OwnerEmail = owner?.Email ?? "No Email",
                FoodCount = fCount
            };
        });

        return Ok(enriched);
    }

    // 3. APPROVE RESTAURANT
    // PATCH: /api/Admin/restaurants/{id}/approve
    [HttpPatch("restaurants/{id}/approve")]
    public async Task<IActionResult> ApproveRestaurant(string id)
    {
        var filter = Builders<Restaurant>.Filter
            .Eq(x => x.Id, id);

        var update = Builders<Restaurant>.Update
            .Set(x => x.IsApproved, true);

        var result = await _restaurants.UpdateOneAsync(
            filter,
            update);

        if (result.MatchedCount == 0)
        {
            return NotFound(new
            {
                message = "Restaurant not found."
            });
        }

        // Notify restaurant owner
        var restaurant = await _restaurants.Find(filter).FirstOrDefaultAsync();
        if (restaurant != null && !string.IsNullOrEmpty(restaurant.OwnerId))
        {
            await _notificationService.CreateAsync(
                restaurant.OwnerId,
                "Restaurant Approved! 🎉",
                $"Congratulations! {restaurant.RestaurantName} has been verified and approved by the platform administrator. You can now post surplus food.",
                NotificationType.General);
        }

        return Ok(new
        {
            message = "Restaurant approved successfully.",
            restaurantId = id
        });
    }

    // 4. REJECT RESTAURANT
    // PATCH: /api/Admin/restaurants/{id}/reject
    [HttpPatch("restaurants/{id}/reject")]
    public async Task<IActionResult> RejectRestaurant(string id)
    {
        var filter = Builders<Restaurant>.Filter
            .Eq(x => x.Id, id);

        var update = Builders<Restaurant>.Update
            .Set(x => x.IsApproved, false);

        var result = await _restaurants.UpdateOneAsync(
            filter,
            update);

        if (result.MatchedCount == 0)
        {
            return NotFound(new
            {
                message = "Restaurant not found."
            });
        }

        // Notify restaurant owner
        var restaurant = await _restaurants.Find(filter).FirstOrDefaultAsync();
        if (restaurant != null && !string.IsNullOrEmpty(restaurant.OwnerId))
        {
            await _notificationService.CreateAsync(
                restaurant.OwnerId,
                "Restaurant Application Review",
                $"Your restaurant application for {restaurant.RestaurantName} was reviewed and rejected. Please update your profile with valid business information.",
                NotificationType.General);
        }

        return Ok(new
        {
            message = "Restaurant rejected.",
            restaurantId = id
        });
    }

    // 5. PLATFORM KPIS & STATS
    // GET: /api/Admin/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetPlatformStats()
    {
        var allUsers = await _users.Find(_ => true).ToListAsync();
        var allRestaurants = await _restaurants.Find(_ => true).ToListAsync();
        var allOrders = await _orders.Find(_ => true).ToListAsync();
        var allDeliveries = await _deliveryRequests.Find(_ => true).ToListAsync();
        var allFood = await _foodItems.Find(_ => true).ToListAsync();

        // User breakdown
        var customersCount = allUsers.Count(u => u.Role == UserRole.Customer);
        var restaurantsCount = allUsers.Count(u => u.Role == UserRole.RestaurantOwner);
        var driversCount = allUsers.Count(u => u.Role == UserRole.DeliveryPerson);
        var adminsCount = allUsers.Count(u => u.Role == UserRole.Admin);

        // Restaurant breakdown
        var approvedRestaurants = allRestaurants.Count(r => r.IsApproved);
        var pendingRestaurants = allRestaurants.Count(r => !r.IsApproved);

        // Orders breakdown
        var pendingOrders = allOrders.Count(o => o.Status == OrderStatus.Pending);
        var activeOrders = allOrders.Count(o => o.Status == OrderStatus.Confirmed ||
                                                o.Status == OrderStatus.Preparing ||
                                                o.Status == OrderStatus.ReadyForPickup ||
                                                o.Status == OrderStatus.OutForDelivery ||
                                                o.Status == OrderStatus.PickedUp);
        var deliveredOrders = allOrders.Count(o => o.Status == OrderStatus.Delivered);
        var cancelledOrders = allOrders.Count(o => o.Status == OrderStatus.Cancelled);

        // Deliveries breakdown
        var activeDeliveries = allDeliveries.Count(d => d.Status == DeliveryRequestStatus.Searching ||
                                                        d.Status == DeliveryRequestStatus.Assigned ||
                                                        d.Status == DeliveryRequestStatus.Accepted ||
                                                        d.Status == DeliveryRequestStatus.PickedUp ||
                                                        d.Status == DeliveryRequestStatus.InTransit);
        var completedDeliveries = allDeliveries.Count(d => d.Status == DeliveryRequestStatus.Delivered);

        // Financial & impact
        var totalGMV = allOrders
            .Where(o => o.Status != OrderStatus.Cancelled)
            .Sum(o => (double)o.TotalAmount);

        var rescuedMeals = allOrders
            .Where(o => o.Status == OrderStatus.Delivered)
            .Sum(o => o.Quantity);

        // AI dispatch stats
        var totalAIDispatches = allDeliveries.Count;
        var successfulMatches = allDeliveries.Count(d => d.Status != DeliveryRequestStatus.Cancelled &&
                                                        d.Status != DeliveryRequestStatus.Searching);
        var aiSuccessRate = totalAIDispatches > 0
            ? Math.Round((double)successfulMatches / totalAIDispatches * 100.0, 1)
            : 100.0;

        return Ok(new
        {
            users = new
            {
                total = allUsers.Count,
                customers = customersCount,
                restaurants = restaurantsCount,
                deliveryPersons = driversCount,
                admins = adminsCount
            },
            restaurants = new
            {
                total = allRestaurants.Count,
                approved = approvedRestaurants,
                pending = pendingRestaurants
            },
            orders = new
            {
                total = allOrders.Count,
                pending = pendingOrders,
                active = activeOrders,
                delivered = deliveredOrders,
                cancelled = cancelledOrders
            },
            deliveries = new
            {
                total = allDeliveries.Count,
                active = activeDeliveries,
                completed = completedDeliveries
            },
            food = new
            {
                total = allFood.Count,
                available = allFood.Count(f => f.Status == FoodStatus.Available),
                rescuedMeals = rescuedMeals
            },
            finance = new
            {
                totalGMV = Math.Round(totalGMV, 2)
            },
            ai = new
            {
                totalDispatches = totalAIDispatches,
                successfulMatches = successfulMatches,
                successRate = aiSuccessRate
            }
        });
    }

    // 6. GET ALL USERS
    // GET: /api/Admin/users?role=Customer|RestaurantOwner|DeliveryPerson|Admin&search=...
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? role = null,
        [FromQuery] string? search = null)
    {
        FilterDefinition<User> filter = Builders<User>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(role) && !role.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            if (Enum.TryParse<UserRole>(role, true, out var parsedRole))
            {
                filter &= Builders<User>.Filter.Eq(x => x.Role, parsedRole);
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchRegex = new MongoDB.Bson.BsonRegularExpression(search.Trim(), "i");
            var nameFilter = Builders<User>.Filter.Regex(x => x.FullName, searchRegex);
            var emailFilter = Builders<User>.Filter.Regex(x => x.Email, searchRegex);
            filter &= Builders<User>.Filter.Or(nameFilter, emailFilter);
        }

        var users = await _users
            .Find(filter)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();

        var sanitized = users.Select(u => new
        {
            u.Id,
            u.FullName,
            u.Email,
            u.Role,
            u.IsActive,
            u.CreatedAt
        });

        return Ok(sanitized);
    }

    // 7. GET ALL ORDERS (MONITORING)
    // GET: /api/Admin/orders?status=...&search=...
    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        FilterDefinition<Order> filter = Builders<Order>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            if (Enum.TryParse<OrderStatus>(status, true, out var parsedStatus))
            {
                filter &= Builders<Order>.Filter.Eq(x => x.Status, parsedStatus);
            }
        }

        var orders = await _orders
            .Find(filter)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();

        var customerIds = orders.Select(o => o.CustomerId).Distinct().ToList();
        var restaurantIds = orders.Select(o => o.RestaurantId).Distinct().ToList();
        var foodIds = orders.Select(o => o.FoodItemId).Distinct().ToList();

        var customers = await _customers.Find(c => customerIds.Contains(c.Id)).ToListAsync();
        var userIds = customers.Select(c => c.UserId).Distinct().ToList();
        var users = await _users.Find(u => userIds.Contains(u.Id)).ToListAsync();

        var restaurants = await _restaurants.Find(r => restaurantIds.Contains(r.Id)).ToListAsync();
        var foodItems = await _foodItems.Find(f => foodIds.Contains(f.Id)).ToListAsync();

        var customerUserMap = (from c in customers
                               join u in users on c.UserId equals u.Id
                               select new { CustomerId = c.Id, User = u })
                              .ToDictionary(x => x.CustomerId, x => x.User);

        var restaurantMap = restaurants.ToDictionary(r => r.Id);
        var foodMap = foodItems.ToDictionary(f => f.Id);

        var enriched = orders.Select(o =>
        {
            customerUserMap.TryGetValue(o.CustomerId, out var user);
            restaurantMap.TryGetValue(o.RestaurantId, out var rest);
            foodMap.TryGetValue(o.FoodItemId, out var food);

            return new
            {
                o.Id,
                o.CustomerId,
                o.RestaurantId,
                o.FoodItemId,
                o.Quantity,
                TotalPrice = o.TotalAmount,
                o.Status,
                o.DeliveryAddress,
                o.CreatedAt,
                o.UpdatedAt,
                CustomerName = user?.FullName ?? "Unknown Customer",
                CustomerEmail = user?.Email ?? "No Email",
                RestaurantName = rest?.RestaurantName ?? "Unknown Restaurant",
                FoodName = food?.Name ?? "Surplus Food",
                FoodCategory = food?.Category.ToString() ?? "Meal"
            };
        });

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            enriched = enriched.Where(e =>
                e.Id.ToLowerInvariant().Contains(q) ||
                e.RestaurantName.ToLowerInvariant().Contains(q) ||
                e.CustomerName.ToLowerInvariant().Contains(q) ||
                e.FoodName.ToLowerInvariant().Contains(q) ||
                e.DeliveryAddress.ToLowerInvariant().Contains(q));
        }

        return Ok(enriched);
    }

    // 8. GET ALL DELIVERIES (MONITORING)
    // GET: /api/Admin/deliveries?status=...
    [HttpGet("deliveries")]
    public async Task<IActionResult> GetDeliveries([FromQuery] string? status = null)
    {
        FilterDefinition<DeliveryRequest> filter = Builders<DeliveryRequest>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            if (Enum.TryParse<DeliveryRequestStatus>(status, true, out var parsedStatus))
            {
                filter &= Builders<DeliveryRequest>.Filter.Eq(x => x.Status, parsedStatus);
            }
        }

        var deliveries = await _deliveryRequests
            .Find(filter)
            .SortByDescending(x => x.RequestedAt)
            .ToListAsync();

        var restaurantIds = deliveries.Select(d => d.RestaurantId).Distinct().ToList();
        var driverPersonIds = deliveries.Select(d => d.DeliveryPersonId).Where(d => !string.IsNullOrEmpty(d)).Distinct().ToList();

        var restaurants = await _restaurants.Find(r => restaurantIds.Contains(r.Id)).ToListAsync();
        var driverPersons = await _deliveryPersons.Find(dp => driverPersonIds.Contains(dp.Id)).ToListAsync();
        var driverUserIds = driverPersons.Select(dp => dp.UserId).Distinct().ToList();
        var driverUsers = await _users.Find(u => driverUserIds.Contains(u.Id)).ToListAsync();

        var restaurantMap = restaurants.ToDictionary(r => r.Id);
        var driverPersonMap = driverPersons.ToDictionary(dp => dp.Id);
        var driverUserMap = driverUsers.ToDictionary(u => u.Id);

        var enriched = deliveries.Select(d =>
        {
            restaurantMap.TryGetValue(d.RestaurantId, out var rest);

            DeliveryPerson? dp = null;
            User? du = null;
            if (!string.IsNullOrEmpty(d.DeliveryPersonId))
            {
                driverPersonMap.TryGetValue(d.DeliveryPersonId, out dp);
                if (dp != null)
                {
                    driverUserMap.TryGetValue(dp.UserId, out du);
                }
            }

            return new
            {
                d.Id,
                d.OrderId,
                d.CustomerId,
                d.RestaurantId,
                d.DeliveryPersonId,
                d.PickupLocation,
                d.DeliveryLocation,
                d.DistanceInKilometers,
                d.DeliveryFee,
                d.EstimatedMinutes,
                d.Status,
                d.RequestedAt,
                d.AssignedAt,
                d.AcceptedAt,
                d.CompletedAt,
                d.UpdatedAt,
                RestaurantName = rest?.RestaurantName ?? "Restaurant",
                RestaurantAddress = rest?.Address ?? "",
                CourierName = du?.FullName ?? (d.Status == DeliveryRequestStatus.Searching ? "Searching (AI)" : "Unassigned"),
                CourierPhone = dp?.PhoneNumber ?? "",
                CourierVehicle = dp?.VehicleType ?? "Unknown"
            };
        });

        return Ok(enriched);
    }

    // 9. GET AI AUTONOMOUS ACTIVITY
    // GET: /api/Admin/ai-activity
    [HttpGet("ai-activity")]
    public async Task<IActionResult> GetAIActivity()
    {
        var deliveries = await _deliveryRequests
            .Find(_ => true)
            .SortByDescending(x => x.RequestedAt)
            .Limit(50)
            .ToListAsync();

        var restaurantIds = deliveries.Select(d => d.RestaurantId).Distinct().ToList();
        var driverIds = deliveries.Select(d => d.DeliveryPersonId).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();

        var restaurants = await _restaurants.Find(r => restaurantIds.Contains(r.Id)).ToListAsync();
        var drivers = await _deliveryPersons.Find(dp => driverIds.Contains(dp.Id)).ToListAsync();
        var driverUserIds = drivers.Select(dp => dp.UserId).Distinct().ToList();
        var users = await _users.Find(u => driverUserIds.Contains(u.Id)).ToListAsync();

        var restMap = restaurants.ToDictionary(r => r.Id);
        var dpMap = drivers.ToDictionary(dp => dp.Id);
        var userMap = users.ToDictionary(u => u.Id);

        var activities = deliveries.Select(d =>
        {
            restMap.TryGetValue(d.RestaurantId, out var r);
            DeliveryPerson? dp = null;
            User? u = null;
            if (!string.IsNullOrEmpty(d.DeliveryPersonId))
            {
                dpMap.TryGetValue(d.DeliveryPersonId, out dp);
                if (dp != null)
                {
                    userMap.TryGetValue(dp.UserId, out u);
                }
            }

            var decisionReason = d.Status switch
            {
                DeliveryRequestStatus.Delivered => "Completed autonomous delivery with high ETA accuracy.",
                DeliveryRequestStatus.InTransit => "Partner en route to customer destination.",
                DeliveryRequestStatus.PickedUp => "Food verified and in courier possession.",
                DeliveryRequestStatus.Accepted => "Courier confirmed dispatch assignment within acceptable acceptance threshold.",
                DeliveryRequestStatus.Assigned => "Matched nearby partner based on shortest distance and high vehicle suitability.",
                DeliveryRequestStatus.Searching => "Autonomous agent scanning nearby active courier radius and evaluating candidates.",
                _ => "Coordination cycle recorded."
            };

            return new
            {
                d.Id,
                d.OrderId,
                d.Status,
                d.DistanceInKilometers,
                d.DeliveryFee,
                d.EstimatedMinutes,
                d.RequestedAt,
                d.UpdatedAt,
                RestaurantName = r?.RestaurantName ?? "Kitchen",
                SelectedCourier = u?.FullName ?? "Autonomous Search in Progress",
                VehicleType = dp?.VehicleType ?? "Scooter/Bike",
                DecisionRationale = decisionReason,
                CandidateScore = Math.Round(Math.Max(65.0, 98.5 - (d.DistanceInKilometers * 2.5)), 1)
            };
        });

        return Ok(activities);
    }
}