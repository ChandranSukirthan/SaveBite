using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.DTOs;
using SaveBite.API.Models;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/food-discovery")]
[Authorize(Roles = "Customer")]
public class FoodDiscoveryController : ControllerBase
{
    private readonly IMongoCollection<FoodItem> _foodItems;
    private readonly IMongoCollection<Restaurant> _restaurants;

    public FoodDiscoveryController(MongoDbContext mongoDbContext)
    {
        _foodItems = mongoDbContext.Database
            .GetCollection<FoodItem>("foodItems");

        _restaurants = mongoDbContext.Database
            .GetCollection<Restaurant>("restaurants");
    }

    [HttpPost("search")]
    public async Task<IActionResult> SearchFood(
        FoodSearchRequest request)
    {
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

        if (request.RadiusInKilometers <= 0)
        {
            return BadRequest(new
            {
                message = "Radius must be greater than zero."
            });
        }

        if (request.RadiusInKilometers > 50)
        {
            return BadRequest(new
            {
                message = "Maximum search radius is 50 km."
            });
        }

        if (request.MaxPrice.HasValue &&
            request.MaxPrice.Value < 0)
        {
            return BadRequest(new
            {
                message = "Maximum price cannot be negative."
            });
        }

        // First find approved restaurants.
        var approvedRestaurants = await _restaurants
            .Find(x => x.IsApproved)
            .ToListAsync();

        if (approvedRestaurants.Count == 0)
        {
            return Ok(new List<object>());
        }

        var restaurantIds = approvedRestaurants
            .Select(x => x.Id)
            .ToList();

        // Build the basic food filter.
        var filterBuilder = Builders<FoodItem>.Filter;

        var filters = new List<FilterDefinition<FoodItem>>
        {
            filterBuilder.In(
                x => x.RestaurantId,
                restaurantIds),

            filterBuilder.Eq(
                x => x.Status,
                FoodStatus.Available),

            filterBuilder.Gt(
                x => x.Quantity,
                0),

            filterBuilder.Lte(
                x => x.AvailableFrom,
                DateTime.UtcNow),

            filterBuilder.Gt(
                x => x.AvailableUntil,
                DateTime.UtcNow)
        };

        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            filters.Add(
                filterBuilder.Regex(
                    x => x.Category,
                    new MongoDB.Bson.BsonRegularExpression(
                        $"^{System.Text.RegularExpressions.Regex.Escape(request.Category.Trim())}$",
                        "i")));
        }

        if (request.MaxPrice.HasValue)
        {
            filters.Add(
                filterBuilder.Lte(
                    x => x.Price,
                    request.MaxPrice.Value));
        }

        var foodItems = await _foodItems
            .Find(filterBuilder.And(filters))
            .ToListAsync();

        var results = new List<object>();

        foreach (var food in foodItems)
        {
            var restaurant = approvedRestaurants
                .FirstOrDefault(x => x.Id == food.RestaurantId);

            if (restaurant == null)
            {
                continue;
            }

            var distance = CalculateDistanceInKilometers(
                request.Latitude,
                request.Longitude,
                food.Location.Coordinates[1],
                food.Location.Coordinates[0]);

            if (distance <= request.RadiusInKilometers)
            {
                results.Add(new
                {
                    food.Id,
                    food.Name,
                    food.Description,
                    food.Category,
                    food.Quantity,
                    food.Price,
                    food.AvailableFrom,
                    food.AvailableUntil,

                    distanceInKilometers =
                        Math.Round(distance, 2),

                    restaurant = new
                    {
                        restaurant.Id,
                        restaurant.RestaurantName,
                        restaurant.Address
                    }
                });
            }
        }

        var sortedResults = results
            .OrderBy(x => GetDistance(x))
            .ToList();

        return Ok(sortedResults);
    }

    private static double GetDistance(object item)
    {
        var property = item
            .GetType()
            .GetProperty("distanceInKilometers");

        return property == null
            ? double.MaxValue
            : (double)(property.GetValue(item) ?? double.MaxValue);
    }

    private static double CalculateDistanceInKilometers(
        double latitude1,
        double longitude1,
        double latitude2,
        double longitude2)
    {
        const double earthRadiusKm = 6371.0;

        var lat1 = DegreesToRadians(latitude1);
        var lat2 = DegreesToRadians(latitude2);

        var deltaLat =
            DegreesToRadians(latitude2 - latitude1);

        var deltaLon =
            DegreesToRadians(longitude2 - longitude1);

        var a =
            Math.Sin(deltaLat / 2) *
            Math.Sin(deltaLat / 2) +
            Math.Cos(lat1) *
            Math.Cos(lat2) *
            Math.Sin(deltaLon / 2) *
            Math.Sin(deltaLon / 2);

        var c = 2 * Math.Atan2(
            Math.Sqrt(a),
            Math.Sqrt(1 - a));

        return earthRadiusKm * c;
    }

    private static double DegreesToRadians(double degrees)
    {
        return degrees * Math.PI / 180.0;
    }
}