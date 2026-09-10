using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.Models;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IMongoCollection<Restaurant> _restaurants;

    public AdminController(MongoDbContext mongoDbContext)
    {
        _restaurants = mongoDbContext.Database
            .GetCollection<Restaurant>("restaurants");
    }

    [HttpGet("restaurants/pending")]
    public async Task<IActionResult> GetPendingRestaurants()
    {
        var restaurants = await _restaurants
            .Find(x => !x.IsApproved)
            .SortBy(x => x.CreatedAt)
            .ToListAsync();

        return Ok(restaurants);
    }

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

        return Ok(new
        {
            message = "Restaurant approved successfully."
        });
    }

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

        return Ok(new
        {
            message = "Restaurant rejected."
        });
    }
}