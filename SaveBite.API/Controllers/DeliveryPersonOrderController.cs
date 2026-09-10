using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.DTOs;
using SaveBite.API.Models;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/delivery-person/orders")]
[Authorize(Roles = "DeliveryPerson")]
public class DeliveryPersonOrderController : ControllerBase
{
    private readonly IMongoCollection<DeliveryPerson> _deliveryPersons;
    private readonly IMongoCollection<DeliveryRequest> _deliveryRequests;
    private readonly IMongoCollection<Order> _orders;

    public DeliveryPersonOrderController(
        MongoDbContext mongoDbContext)
    {
        _deliveryPersons = mongoDbContext.Database
            .GetCollection<DeliveryPerson>("deliveryPersons");

        _deliveryRequests = mongoDbContext.Database
            .GetCollection<DeliveryRequest>("deliveryRequests");

        _orders = mongoDbContext.Database
            .GetCollection<Order>("orders");
    }

   
    // GET MY DELIVERY REQUESTS
    // GET: /api/delivery-person/orders
   

    [HttpGet]
    public async Task<IActionResult> GetMyDeliveryRequests()
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

        var requests = await _deliveryRequests
            .Find(x =>
                x.DeliveryPersonId == deliveryPerson.Id)
            .SortByDescending(x => x.RequestedAt)
            .ToListAsync();

        return Ok(requests);
    }

    // ACCEPT OR REJECT DELIVERY
    // POST: /api/delivery-person/orders/{id}/respond


    [HttpPost("{id}/respond")]
    public async Task<IActionResult> RespondToDelivery(
        string id,
        DeliveryResponseRequest request)
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

        var deliveryRequest = await _deliveryRequests
            .Find(x =>
                x.Id == id &&
                x.DeliveryPersonId == deliveryPerson.Id)
            .FirstOrDefaultAsync();

        if (deliveryRequest == null)
        {
            return NotFound(new
            {
                message = "Delivery request not found."
            });
        }

        if (deliveryRequest.Status !=
            DeliveryRequestStatus.Assigned)
        {
            return BadRequest(new
            {
                message =
                    $"This delivery request cannot be responded to " +
                    $"because its current status is " +
                    $"{deliveryRequest.Status}."
            });
        }

        if (!request.Accept)
        {
            // Driver rejected the request.
            var rejectUpdate =
                Builders<DeliveryRequest>.Update
                    .Set(
                        x => x.DeliveryPersonId,
                        null)
                    .Set(
                        x => x.Status,
                        DeliveryRequestStatus.Searching)
                    .Set(
                        x => x.AssignedAt,
                        null)
                    .Set(
                        x => x.UpdatedAt,
                        DateTime.UtcNow);

            await _deliveryRequests.UpdateOneAsync(
                x =>
                    x.Id == id &&
                    x.DeliveryPersonId == deliveryPerson.Id &&
                    x.Status == DeliveryRequestStatus.Assigned,
                rejectUpdate);

            // Make driver available again.
            var driverUpdate =
                Builders<DeliveryPerson>.Update
                    .Set(
                        x => x.IsAvailable,
                        true);

            await _deliveryPersons.UpdateOneAsync(
                x => x.Id == deliveryPerson.Id,
                driverUpdate);

            return Ok(new
            {
                message =
                    "Delivery request rejected. " +
                    "The system can search for another driver.",

                status =
                    DeliveryRequestStatus.Searching.ToString()
            });
        }

        // Driver accepted.
        var acceptUpdate =
            Builders<DeliveryRequest>.Update
                .Set(
                    x => x.Status,
                    DeliveryRequestStatus.Accepted)
                .Set(
                    x => x.AcceptedAt,
                    DateTime.UtcNow)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        var acceptResult =
            await _deliveryRequests.UpdateOneAsync(
                x =>
                    x.Id == id &&
                    x.DeliveryPersonId == deliveryPerson.Id &&
                    x.Status == DeliveryRequestStatus.Assigned,
                acceptUpdate);

        if (acceptResult.ModifiedCount == 0)
        {
            return Conflict(new
            {
                message =
                    "The delivery request has already been processed."
            });
        }

        return Ok(new
        {
            message =
                "Delivery request accepted successfully.",

            status =
                DeliveryRequestStatus.Accepted.ToString()
        });
    }


    // MARK FOOD AS PICKED UP
    // POST: /api/delivery-person/orders/{id}/pickup


    [HttpPost("{id}/pickup")]
    public async Task<IActionResult> MarkPickedUp(string id)
    {
        var deliveryPerson = await GetCurrentDeliveryPerson();

        if (deliveryPerson == null)
        {
            return NotFound(new
            {
                message = "Delivery person profile not found."
            });
        }

        var deliveryRequest = await _deliveryRequests
            .Find(x =>
                x.Id == id &&
                x.DeliveryPersonId == deliveryPerson.Id)
            .FirstOrDefaultAsync();

        if (deliveryRequest == null)
        {
            return NotFound(new
            {
                message = "Delivery request not found."
            });
        }

        if (deliveryRequest.Status !=
            DeliveryRequestStatus.Accepted)
        {
            return BadRequest(new
            {
                message =
                    "Food can only be marked as picked up " +
                    "after the delivery request has been accepted."
            });
        }

        var deliveryUpdate =
            Builders<DeliveryRequest>.Update
                .Set(
                    x => x.Status,
                    DeliveryRequestStatus.PickedUp)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        await _deliveryRequests.UpdateOneAsync(
            x => x.Id == id,
            deliveryUpdate);

        var orderUpdate =
            Builders<Order>.Update
                .Set(
                    x => x.Status,
                    OrderStatus.PickedUp)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        await _orders.UpdateOneAsync(
            x => x.Id == deliveryRequest.OrderId,
            orderUpdate);

        return Ok(new
        {
            message =
                "Food marked as picked up successfully.",
            status =
                DeliveryRequestStatus.PickedUp.ToString()
        });
    }


    // START DELIVERY
    // POST: /api/delivery-person/orders/{id}/start


    [HttpPost("{id}/start")]
    public async Task<IActionResult> StartDelivery(string id)
    {
        var deliveryPerson = await GetCurrentDeliveryPerson();

        if (deliveryPerson == null)
        {
            return NotFound(new
            {
                message = "Delivery person profile not found."
            });
        }

        var deliveryRequest = await _deliveryRequests
            .Find(x =>
                x.Id == id &&
                x.DeliveryPersonId == deliveryPerson.Id)
            .FirstOrDefaultAsync();

        if (deliveryRequest == null)
        {
            return NotFound(new
            {
                message = "Delivery request not found."
            });
        }

        if (deliveryRequest.Status !=
            DeliveryRequestStatus.PickedUp)
        {
            return BadRequest(new
            {
                message =
                    "Delivery can only start after pickup."
            });
        }

        var deliveryUpdate =
            Builders<DeliveryRequest>.Update
                .Set(
                    x => x.Status,
                    DeliveryRequestStatus.InTransit)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        await _deliveryRequests.UpdateOneAsync(
            x => x.Id == id,
            deliveryUpdate);

        var orderUpdate =
            Builders<Order>.Update
                .Set(
                    x => x.Status,
                    OrderStatus.OutForDelivery)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        await _orders.UpdateOneAsync(
            x => x.Id == deliveryRequest.OrderId,
            orderUpdate);

        return Ok(new
        {
            message =
                "Delivery started successfully.",
            status =
                DeliveryRequestStatus.InTransit.ToString()
        });
    }


    // COMPLETE DELIVERY
    // POST: /api/delivery-person/orders/{id}/complete
  

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteDelivery(string id)
    {
        var deliveryPerson = await GetCurrentDeliveryPerson();

        if (deliveryPerson == null)
        {
            return NotFound(new
            {
                message = "Delivery person profile not found."
            });
        }

        var deliveryRequest = await _deliveryRequests
            .Find(x =>
                x.Id == id &&
                x.DeliveryPersonId == deliveryPerson.Id)
            .FirstOrDefaultAsync();

        if (deliveryRequest == null)
        {
            return NotFound(new
            {
                message = "Delivery request not found."
            });
        }

        if (deliveryRequest.Status !=
            DeliveryRequestStatus.InTransit)
        {
            return BadRequest(new
            {
                message =
                    "Delivery can only be completed " +
                    "when it is in transit."
            });
        }

        var deliveryUpdate =
            Builders<DeliveryRequest>.Update
                .Set(
                    x => x.Status,
                    DeliveryRequestStatus.Delivered)
                .Set(
                    x => x.CompletedAt,
                    DateTime.UtcNow)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        await _deliveryRequests.UpdateOneAsync(
            x => x.Id == id,
            deliveryUpdate);

        var orderUpdate =
            Builders<Order>.Update
                .Set(
                    x => x.Status,
                    OrderStatus.Delivered)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        await _orders.UpdateOneAsync(
            x => x.Id == deliveryRequest.OrderId,
            orderUpdate);

        // Driver becomes available for another delivery.
        var driverUpdate =
            Builders<DeliveryPerson>.Update
                .Set(
                    x => x.IsAvailable,
                    true);

        await _deliveryPersons.UpdateOneAsync(
            x => x.Id == deliveryPerson.Id,
            driverUpdate);

        return Ok(new
        {
            message =
                "Delivery completed successfully.",

            status =
                DeliveryRequestStatus.Delivered.ToString(),

            driverAvailable = true
        });
    }

  
    // GET CURRENT DELIVERY PERSON
  

    private async Task<DeliveryPerson?>
        GetCurrentDeliveryPerson()
    {
        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return null;
        }

        return await _deliveryPersons
            .Find(x => x.UserId == userId)
            .FirstOrDefaultAsync();
    }
}