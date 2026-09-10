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
public class RestaurantController : ControllerBase
{
    private readonly IMongoCollection<Restaurant> _restaurants;

    public RestaurantController(MongoDbContext mongoDbContext)
    {
        _restaurants = mongoDbContext.Database
            .GetCollection<Restaurant>("restaurants");
    }

    [HttpPost("profile")]
    public async Task<IActionResult> CreateProfile(
        CreateRestaurantRequest request)
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

        var existingRestaurant = await _restaurants
            .Find(x => x.OwnerId == ownerId)
            .FirstOrDefaultAsync();

        if (existingRestaurant != null)
        {
            return Conflict(new
            {
                message = "Restaurant profile already exists."
            });
        }

        if (string.IsNullOrWhiteSpace(request.RestaurantName))
        {
            return BadRequest(new
            {
                message = "Restaurant name is required."
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

        var restaurant = new Restaurant
        {
            OwnerId = ownerId,
            RestaurantName = request.RestaurantName.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            Address = request.Address.Trim(),
            Description = request.Description.Trim(),

            Location = new Location
            {
                Type = "Point",
                Coordinates = new[]
                {
                    request.Longitude,
                    request.Latitude
                }
            },

            IsApproved = false,
            CreatedAt = DateTime.UtcNow
        };

        await _restaurants.InsertOneAsync(restaurant);

        return Ok(new
        {
            message = "Restaurant profile created successfully.",
            restaurant = new
            {
                restaurant.Id,
                restaurant.RestaurantName,
                restaurant.Address,
                restaurant.IsApproved,
                restaurant.Location
            }
        });
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
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

        return Ok(restaurant);
    }
}