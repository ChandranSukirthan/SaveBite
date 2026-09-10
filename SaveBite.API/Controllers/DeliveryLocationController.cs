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
[Route("api/delivery-person/location")]
[Authorize(Roles = "DeliveryPerson")]
public class DeliveryLocationController : ControllerBase
{
    private readonly IMongoCollection<DeliveryPerson>
        _deliveryPersons;

    private readonly IMongoCollection<DeliveryRequest>
        _deliveryRequests;

    private readonly DeliveryNotificationService
        _notificationService;

    public DeliveryLocationController(
        MongoDbContext mongoDbContext,
        DeliveryNotificationService notificationService)
    {
        _deliveryPersons =
            mongoDbContext.Database
                .GetCollection<DeliveryPerson>(
                    "deliveryPersons");

        _deliveryRequests =
            mongoDbContext.Database
                .GetCollection<DeliveryRequest>(
                    "deliveryRequests");

        _notificationService =
            notificationService;
    }


    
    // PUT:
  
    

    [HttpPut]
    public async Task<IActionResult> UpdateLocation(
        UpdateLocationRequest request)
    {
        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new
            {
                message =
                    "User identity could not be determined."
            });
        }

        if (request.Latitude < -90 ||
            request.Latitude > 90)
        {
            return BadRequest(new
            {
                message =
                    "Invalid latitude."
            });
        }

        if (request.Longitude < -180 ||
            request.Longitude > 180)
        {
            return BadRequest(new
            {
                message =
                    "Invalid longitude."
            });
        }

        var deliveryPerson =
            await _deliveryPersons
                .Find(x => x.UserId == userId)
                .FirstOrDefaultAsync();

        if (deliveryPerson == null)
        {
            return NotFound(new
            {
                message =
                    "Delivery person profile not found."
            });
        }

        var newLocation = new Location
        {
            Type = "Point",

            Coordinates = new[]
            {
                request.Longitude,
                request.Latitude
            }
        };

        var update =
            Builders<DeliveryPerson>.Update
                .Set(
                    x => x.Location,
                    newLocation);

        await _deliveryPersons.UpdateOneAsync(
            x => x.Id == deliveryPerson.Id,
            update);

        // Find the driver's active delivery.
        var activeDelivery =
            await _deliveryRequests
                .Find(x =>
                    x.DeliveryPersonId ==
                        deliveryPerson.Id
                    &&
                    (
                        x.Status ==
                            DeliveryRequestStatus
                                .Accepted
                        ||
                        x.Status ==
                            DeliveryRequestStatus
                                .PickedUp
                        ||
                        x.Status ==
                            DeliveryRequestStatus
                                .InTransit
                    ))
                .FirstOrDefaultAsync();

        if (activeDelivery != null)
        {
            await _notificationService
                .NotifyDriverLocationAsync(
                    activeDelivery.OrderId,
                    deliveryPerson.Id,
                    request.Latitude,
                    request.Longitude);
        }

        return Ok(new
        {
            message =
                "Location updated successfully.",

            location = new
            {
                latitude =
                    request.Latitude,

                longitude =
                    request.Longitude
            },

            trackingActive =
                activeDelivery != null
        });
    }
}