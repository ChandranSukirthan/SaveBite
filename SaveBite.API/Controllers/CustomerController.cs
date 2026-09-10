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
[Authorize(Roles = "Customer")]
public class CustomerController : ControllerBase
{
    private readonly IMongoCollection<Customer> _customers;

    public CustomerController(MongoDbContext mongoDbContext)
    {
        _customers = mongoDbContext.Database
            .GetCollection<Customer>("customers");
    }

    [HttpPost("profile")]
    public async Task<IActionResult> CreateProfile(
        CreateCustomerRequest request)
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

        var existingCustomer = await _customers
            .Find(x => x.UserId == userId)
            .FirstOrDefaultAsync();

        if (existingCustomer != null)
        {
            return Conflict(new
            {
                message = "Customer profile already exists."
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

        if (request.MaximumBudget < 0)
        {
            return BadRequest(new
            {
                message = "Maximum budget cannot be negative."
            });
        }

        var customer = new Customer
        {
            UserId = userId,
            PhoneNumber = request.PhoneNumber.Trim(),
            Address = request.Address.Trim(),

            Location = new Location
            {
                Type = "Point",
                Coordinates = new[]
                {
                    request.Longitude,
                    request.Latitude
                }
            },

            PreferredCategories = request.PreferredCategories,
            MaximumBudget = request.MaximumBudget,

            CreatedAt = DateTime.UtcNow
        };

        await _customers.InsertOneAsync(customer);

        return Ok(new
        {
            message = "Customer profile created successfully.",
            customer = new
            {
                customer.Id,
                customer.PhoneNumber,
                customer.Address,
                customer.Location,
                customer.PreferredCategories,
                customer.MaximumBudget
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

        var customer = await _customers
            .Find(x => x.UserId == userId)
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return NotFound(new
            {
                message = "Customer profile not found."
            });
        }

        return Ok(customer);
    }

    [HttpGet("internal/{customerId}")]
    [Authorize]
    public async Task<IActionResult> GetCustomerProfileInternal(
        string customerId)
    {
        if (string.IsNullOrWhiteSpace(customerId))
        {
            return BadRequest(new
            {
                message = "Customer ID is required."
            });
        }

        var customer = await _customers
            .Find(x => x.Id == customerId)
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return NotFound(new
            {
                message = "Customer profile not found."
            });
        }

        return Ok(new
        {
            customer.Id,
            customer.UserId,
            customer.PhoneNumber,
            customer.Address,
            customer.Location,
            customer.PreferredCategories,
            customer.MaximumBudget,
            customer.CreatedAt
        });
    }
}