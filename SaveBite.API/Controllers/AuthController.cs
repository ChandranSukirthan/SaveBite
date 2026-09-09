using BCrypt.Net;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.DTOs;
using SaveBite.API.Models;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMongoCollection<User> _users;

    public AuthController(MongoDbContext mongoDbContext)
    {
        _users = mongoDbContext.Database.GetCollection<User>("users");
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest(new
            {
                message = "Full name is required."
            });
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new
            {
                message = "Email is required."
            });
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new
            {
                message = "Password is required."
            });
        }

        var existingUser = await _users
            .Find(x => x.Email.ToLower() == request.Email.ToLower())
            .FirstOrDefaultAsync();

        if (existingUser != null)
        {
            return Conflict(new
            {
                message = "An account with this email already exists."
            });
        }

        if (!Enum.IsDefined(typeof(UserRole), request.Role) ||
            request.Role == UserRole.Admin)
        {
            return BadRequest(new
            {
                message = "Invalid registration role."
            });
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _users.InsertOneAsync(user);

        return Ok(new
        {
            message = "Registration successful.",
            user = new
            {
                user.Id,
                user.FullName,
                user.Email,
                role = user.Role.ToString()
            }
        });
    }
}