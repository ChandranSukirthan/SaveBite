using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.DTOs;
using SaveBite.API.Models;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "RestaurantOwner")]
public class FoodController : ControllerBase
{
    private readonly IMongoCollection<FoodItem> _foodItems;
    private readonly IMongoCollection<Restaurant> _restaurants;

    public FoodController(MongoDbContext mongoDbContext)
    {
        _foodItems = mongoDbContext.Database
            .GetCollection<FoodItem>("foodItems");

        _restaurants = mongoDbContext.Database
            .GetCollection<Restaurant>("restaurants");
    }

    // CREATE
    [HttpPost]
    public async Task<IActionResult> CreateFood(
        CreateFoodRequest request)
    {
        var ownerId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(ownerId))
        {
            return Unauthorized(new
            {
                message = "User identity could not be determined."
            });
        }

        var restaurant = await _restaurants
            .Find(x => x.OwnerId == ownerId)
            .FirstOrDefaultAsync();

        if (restaurant == null)
        {
            return BadRequest(new
            {
                message = "Please create your restaurant profile first."
            });
        }

        if (!restaurant.IsApproved)
        {
            return BadRequest(new
            {
                message = "Your restaurant has not been approved yet."
            });
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new
            {
                message = "Food name is required."
            });
        }

        if (string.IsNullOrWhiteSpace(request.Category))
        {
            return BadRequest(new
            {
                message = "Food category is required."
            });
        }

        if (request.Quantity <= 0)
        {
            return BadRequest(new
            {
                message = "Quantity must be greater than zero."
            });
        }

        if (request.Price < 0)
        {
            return BadRequest(new
            {
                message = "Price cannot be negative."
            });
        }

        if (request.AvailableUntil <= request.AvailableFrom)
        {
            return BadRequest(new
            {
                message = "Available until must be after available from."
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

        var food = new FoodItem
        {
            RestaurantId = restaurant.Id,

            Name = request.Name.Trim(),

            Description = request.Description.Trim(),

            Category = request.Category.Trim(),

            Quantity = request.Quantity,

            Price = request.Price,

            AvailableFrom = request.AvailableFrom,

            AvailableUntil = request.AvailableUntil,

            Location = new Location
            {
                Type = "Point",
                Coordinates = new[]
                {
                    request.Longitude,
                    request.Latitude
                }
            },

            Status = FoodStatus.Available,

            CreatedAt = DateTime.UtcNow,

            UpdatedAt = DateTime.UtcNow
        };

        await _foodItems.InsertOneAsync(food);

        return CreatedAtAction(
            nameof(GetFoodById),
            new { id = food.Id },
            new
            {
                message = "Surplus food created successfully.",
                food
            });
    }

    // READ ALL FOOD BELONGING TO CURRENT RESTAURANT
    [HttpGet("my-food")]
    public async Task<IActionResult> GetMyFood()
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

        var food = await _foodItems
            .Find(x => x.RestaurantId == restaurant.Id)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(food);
    }

    // READ ONE
    [HttpGet("{id}")]
    public async Task<IActionResult> GetFoodById(string id)
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

        var food = await _foodItems
            .Find(x =>
                x.Id == id &&
                x.RestaurantId == restaurant.Id)
            .FirstOrDefaultAsync();

        if (food == null)
        {
            return NotFound(new
            {
                message = "Food item not found."
            });
        }

        return Ok(food);
    }

    // UPDATE
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateFood(
        string id,
        CreateFoodRequest request)
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

        var existingFood = await _foodItems
            .Find(x =>
                x.Id == id &&
                x.RestaurantId == restaurant.Id)
            .FirstOrDefaultAsync();

        if (existingFood == null)
        {
            return NotFound(new
            {
                message = "Food item not found."
            });
        }

        if (request.Quantity <= 0)
        {
            return BadRequest(new
            {
                message = "Quantity must be greater than zero."
            });
        }

        if (request.Price < 0)
        {
            return BadRequest(new
            {
                message = "Price cannot be negative."
            });
        }

        if (request.AvailableUntil <= request.AvailableFrom)
        {
            return BadRequest(new
            {
                message = "Available until must be after available from."
            });
        }

        var update = Builders<FoodItem>.Update
            .Set(x => x.Name, request.Name.Trim())
            .Set(x => x.Description, request.Description.Trim())
            .Set(x => x.Category, request.Category.Trim())
            .Set(x => x.Quantity, request.Quantity)
            .Set(x => x.Price, request.Price)
            .Set(x => x.AvailableFrom, request.AvailableFrom)
            .Set(x => x.AvailableUntil, request.AvailableUntil)
            .Set(x => x.Location, new Location
            {
                Type = "Point",
                Coordinates = new[]
                {
                    request.Longitude,
                    request.Latitude
                }
            })
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

        await _foodItems.UpdateOneAsync(
            x =>
                x.Id == id &&
                x.RestaurantId == restaurant.Id,
            update);

        var updatedFood = await _foodItems
            .Find(x =>
                x.Id == id &&
                x.RestaurantId == restaurant.Id)
            .FirstOrDefaultAsync();

        return Ok(new
        {
            message = "Food item updated successfully.",
            food = updatedFood
        });
    }

    // DELETE
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFood(string id)
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

        var result = await _foodItems.DeleteOneAsync(
            x =>
                x.Id == id &&
                x.RestaurantId == restaurant.Id);

        if (result.DeletedCount == 0)
        {
            return NotFound(new
            {
                message = "Food item not found."
            });
        }

        return Ok(new
        {
            message = "Food item deleted successfully."
        });
    }
}