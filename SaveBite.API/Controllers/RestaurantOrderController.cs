using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.DTOs;
using SaveBite.API.Models;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/restaurant/orders")]
[Authorize(Roles = "RestaurantOwner")]
public class RestaurantOrderController : ControllerBase
{
    private readonly IMongoCollection<Restaurant> _restaurants;
    private readonly IMongoCollection<Order> _orders;

    public RestaurantOrderController(MongoDbContext mongoDbContext)
    {
        _restaurants = mongoDbContext.Database
            .GetCollection<Restaurant>("restaurants");

        _orders = mongoDbContext.Database
            .GetCollection<Order>("orders");
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders()
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

        var orders = await _orders
            .Find(x => x.RestaurantId == restaurant.Id)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(string id)
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

        var order = await _orders
            .Find(x =>
                x.Id == id &&
                x.RestaurantId == restaurant.Id)
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

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(
        string id,
        UpdateOrderStatusRequest request)
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

        var order = await _orders
            .Find(x =>
                x.Id == id &&
                x.RestaurantId == restaurant.Id)
            .FirstOrDefaultAsync();

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        if (!IsValidRestaurantStatusChange(
                order.Status,
                request.Status))
        {
            return BadRequest(new
            {
                message =
                    $"Cannot change order status from " +
                    $"{order.Status} to {request.Status}."
            });
        }

        var update = Builders<Order>.Update
            .Set(x => x.Status, request.Status)
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

        await _orders.UpdateOneAsync(
            x =>
                x.Id == id &&
                x.RestaurantId == restaurant.Id,
            update);

        return Ok(new
        {
            message = "Order status updated successfully.",
            orderId = id,
            status = request.Status.ToString()
        });
    }

    private static bool IsValidRestaurantStatusChange(
        OrderStatus current,
        OrderStatus next)
    {
        return current switch
        {
            OrderStatus.Pending =>
                next == OrderStatus.Confirmed ||
                next == OrderStatus.Cancelled,

            OrderStatus.Confirmed =>
                next == OrderStatus.Preparing ||
                next == OrderStatus.Cancelled,

            OrderStatus.Preparing =>
                next == OrderStatus.ReadyForPickup,

            OrderStatus.ReadyForPickup =>
                false,

            _ => false
        };
    }
}