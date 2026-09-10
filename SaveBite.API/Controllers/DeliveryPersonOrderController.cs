using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.DTOs;
using SaveBite.API.Models;
using SaveBite.API.Services;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/delivery-person/orders")]
[Authorize(Roles = "DeliveryPerson")]
public class DeliveryPersonOrderController : ControllerBase
{
    private readonly IMongoCollection<DeliveryPerson> _deliveryPersons;
    private readonly IMongoCollection<DeliveryRequest> _deliveryRequests;
    private readonly IMongoCollection<Order> _orders;
    private readonly AIServiceClient _aiServiceClient;
    private readonly DeliveryNotificationService _deliveryNotificationService;
    private readonly NotificationService _notificationService;

    public DeliveryPersonOrderController(
        MongoDbContext mongoDbContext,
        AIServiceClient aiServiceClient,
        DeliveryNotificationService deliveryNotificationService,
        NotificationService notificationService)
    {
        _deliveryPersons = mongoDbContext.Database
            .GetCollection<DeliveryPerson>("deliveryPersons");

        _deliveryRequests = mongoDbContext.Database
            .GetCollection<DeliveryRequest>("deliveryRequests");

        _orders = mongoDbContext.Database
            .GetCollection<Order>("orders");

        _aiServiceClient = aiServiceClient;
        _deliveryNotificationService = deliveryNotificationService;
        _notificationService = notificationService;
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

            var rejectResult =
                await _deliveryRequests.UpdateOneAsync(
                    x =>
                        x.Id == id &&
                        x.DeliveryPersonId ==
                            deliveryPerson.Id &&
                        x.Status ==
                            DeliveryRequestStatus.Assigned,

                    rejectUpdate);

            if (rejectResult.ModifiedCount == 0)
            {
                return Conflict(new
                {
                    message =
                        "The delivery request has already been processed."
                });
            }

            // Driver becomes available again.
            await _deliveryPersons.UpdateOneAsync(
                x => x.Id == deliveryPerson.Id,

                Builders<DeliveryPerson>.Update
                    .Set(
                        x => x.IsAvailable,
                        true)
            );

            // Automatically trigger the AI retry workflow.
            try
            {
                await _aiServiceClient
                    .TriggerDeliveryRetryAsync(
                        id,
                        deliveryPerson.Id);
            }
            catch (Exception ex)
            {
                // The delivery remains in Searching state.
                // It can be retried later if the AI service
                // is temporarily unavailable.
                return Accepted(new
                {
                    message =
                        "Delivery request rejected. " +
                        "The system could not contact the AI " +
                        "delivery agent, so the request remains " +
                        "in Searching state.",

                    status =
                        DeliveryRequestStatus
                            .Searching
                            .ToString(),

                    aiTriggered = false,

                    error = ex.Message
                });
            }

            return Ok(new
            {
                message =
                    "Delivery rejected. " +
                    "AI agent is searching for another driver.",

                status =
                    DeliveryRequestStatus
                        .Searching
                        .ToString(),

                aiTriggered = true
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

        var acceptedDelivery =
            await _deliveryRequests
                .Find(x => x.Id == id)
                .FirstOrDefaultAsync();

        if (acceptedDelivery != null)
        {
            await _deliveryNotificationService
                .NotifyDeliveryStatusAsync(
                    acceptedDelivery);

            var order =
                await _orders
                    .Find(x =>
                        x.Id ==
                        acceptedDelivery.OrderId)
                    .FirstOrDefaultAsync();

            if (order != null)
            {
                var customer =
                    await _orders.Database
                        .GetCollection<Customer>(
                            "customers")
                        .Find(x =>
                            x.Id == order.CustomerId)
                        .FirstOrDefaultAsync();

                if (customer != null)
                {
                    await _notificationService.CreateAsync(
                        customer.UserId,
                        "Driver Accepted",
                        "Your delivery person has accepted the delivery.",
                        NotificationType.DriverAccepted,
                        order.Id,
                        acceptedDelivery.Id);
                }
            }
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

        var updatedDelivery =
            await _deliveryRequests
                .Find(x => x.Id == id)
                .FirstOrDefaultAsync();

        var updatedOrder =
            await _orders
                .Find(x =>
                    x.Id ==
                    deliveryRequest.OrderId)
                .FirstOrDefaultAsync();

        if (updatedDelivery != null)
        {
            await _deliveryNotificationService
                .NotifyDeliveryStatusAsync(
                    updatedDelivery);
        }

        if (updatedOrder != null)
        {
            await _deliveryNotificationService
                .NotifyOrderStatusAsync(
                    updatedOrder);
        }

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

        var updatedDelivery =
            await _deliveryRequests
                .Find(x => x.Id == id)
                .FirstOrDefaultAsync();

        var updatedOrder =
            await _orders
                .Find(x =>
                    x.Id ==
                    deliveryRequest.OrderId)
                .FirstOrDefaultAsync();

        if (updatedDelivery != null)
        {
            await _deliveryNotificationService
                .NotifyDeliveryStatusAsync(
                    updatedDelivery);
        }

        if (updatedOrder != null)
        {
            await _deliveryNotificationService
                .NotifyOrderStatusAsync(
                    updatedOrder);

            var customer =
                await _orders.Database
                    .GetCollection<Customer>(
                        "customers")
                    .Find(x =>
                        x.Id ==
                        updatedOrder.CustomerId)
                    .FirstOrDefaultAsync();

            if (customer != null)
            {
                await _notificationService.CreateAsync(
                    customer.UserId,
                    "Delivery Started",
                    "Your order is now on the way.",
                    NotificationType.DeliveryStarted,
                    updatedOrder.Id,
                    updatedDelivery?.Id);
            }
        }

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

        var completedDelivery =
            await _deliveryRequests
                .Find(x => x.Id == id)
                .FirstOrDefaultAsync();

        var completedOrder =
            await _orders
                .Find(x =>
                    x.Id ==
                    deliveryRequest.OrderId)
                .FirstOrDefaultAsync();

        if (completedDelivery != null)
        {
            await _deliveryNotificationService
                .NotifyDeliveryStatusAsync(
                    completedDelivery);
        }

        if (completedOrder != null)
        {
            await _deliveryNotificationService
                .NotifyOrderStatusAsync(
                    completedOrder);
        }

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