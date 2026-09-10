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
[Authorize(Roles = "DeliveryPerson")]
public class DeliveryPersonController : ControllerBase
{
    private readonly IMongoCollection<DeliveryPerson> _deliveryPersons;

    public DeliveryPersonController(MongoDbContext mongoDbContext)
    {
        _deliveryPersons = mongoDbContext.Database
            .GetCollection<DeliveryPerson>("deliveryPersons");
    }

    [HttpPost("profile")]
    public async Task<IActionResult> CreateProfile(
        CreateDeliveryPersonRequest request)
    {
        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new
            {
                message = "User identity could not be determined."
            });
        }

        var existingPerson = await _deliveryPersons
            .Find(x => x.UserId == userId)
            .FirstOrDefaultAsync();

        if (existingPerson != null)
        {
            return Conflict(new
            {
                message = "Delivery person profile already exists."
            });
        }

        if (string.IsNullOrWhiteSpace(request.VehicleType))
        {
            return BadRequest(new
            {
                message = "Vehicle type is required."
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

        var deliveryPerson = new DeliveryPerson
        {
            UserId = userId,

            PhoneNumber = request.PhoneNumber.Trim(),

            VehicleType = request.VehicleType.Trim(),

            VehicleNumber = request.VehicleNumber.Trim(),

            Location = new Location
            {
                Type = "Point",
                Coordinates = new[]
                {
                    request.Longitude,
                    request.Latitude
                }
            },

            IsAvailable = false,

            CreatedAt = DateTime.UtcNow
        };

        await _deliveryPersons.InsertOneAsync(deliveryPerson);

        return Ok(new
        {
            message = "Delivery person profile created successfully.",

            deliveryPerson = new
            {
                deliveryPerson.Id,
                deliveryPerson.PhoneNumber,
                deliveryPerson.VehicleType,
                deliveryPerson.VehicleNumber,
                deliveryPerson.Location,
                deliveryPerson.IsAvailable
            }
        });
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var deliveryPerson = await _deliveryPersons
            .Find(x => x.UserId == userId)
            .FirstOrDefaultAsync();

        if (deliveryPerson == null)
        {
            return NotFound(new
            {
                message = "Delivery person profile not found."
            });
        }

        return Ok(deliveryPerson);
    }

    [HttpPatch("availability")]
    public async Task<IActionResult> UpdateAvailability(
        [FromQuery] bool available)
    {
        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var filter = Builders<DeliveryPerson>.Filter
            .Eq(x => x.UserId, userId);

        var update = Builders<DeliveryPerson>.Update
            .Set(x => x.IsAvailable, available);

        var result = await _deliveryPersons.UpdateOneAsync(
            filter,
            update);

        if (result.MatchedCount == 0)
        {
            return NotFound(new
            {
                message = "Delivery person profile not found."
            });
        }

        return Ok(new
        {
            message = available
                ? "You are now available for deliveries."
                : "You are now unavailable for deliveries.",

            isAvailable = available
        });
    }
}