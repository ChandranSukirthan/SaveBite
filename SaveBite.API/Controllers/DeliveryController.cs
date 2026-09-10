using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;
using SaveBite.API.Configuration;
using SaveBite.API.DTOs;
using SaveBite.API.Models;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DeliveryController : ControllerBase
{
    private readonly IMongoCollection<Order> _orders;
    private readonly IMongoCollection<Restaurant> _restaurants;
    private readonly IMongoCollection<Customer> _customers;
    private readonly IMongoCollection<DeliveryRequest> _deliveryRequests;
    private readonly IMongoCollection<DeliveryPerson> _deliveryPersons;

    public DeliveryController(MongoDbContext mongoDbContext)
    {
        _orders = mongoDbContext.Database
            .GetCollection<Order>("orders");

        _restaurants = mongoDbContext.Database
            .GetCollection<Restaurant>("restaurants");

        _customers = mongoDbContext.Database
            .GetCollection<Customer>("customers");

        _deliveryRequests = mongoDbContext.Database
            .GetCollection<DeliveryRequest>("deliveryRequests");

        _deliveryPersons = mongoDbContext.Database
            .GetCollection<DeliveryPerson>("deliveryPersons");
    }

    
    // CREATE DELIVERY REQUEST
    // POST: /api/Delivery/create-request
    // Restaurant Owner / Admin
    

    [HttpPost("create-request")]
    [Authorize(Roles = "RestaurantOwner,Admin")]
    public async Task<IActionResult> CreateDeliveryRequest(
        CreateDeliveryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.OrderId))
        {
            return BadRequest(new
            {
                message = "Order ID is required."
            });
        }

        // Find the order
        var order = await _orders
            .Find(x => x.Id == request.OrderId)
            .FirstOrDefaultAsync();

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        // Delivery can only start when restaurant has prepared the order
        if (order.Status != OrderStatus.ReadyForPickup)
        {
            return BadRequest(new
            {
                message =
                    "Delivery can only be created when the order is ReadyForPickup."
            });
        }

        // Prevent duplicate delivery requests
        var existingDelivery = await _deliveryRequests
            .Find(x => x.OrderId == order.Id)
            .FirstOrDefaultAsync();

        if (existingDelivery != null)
        {
            return Conflict(new
            {
                message = "A delivery request already exists for this order.",
                deliveryRequestId = existingDelivery.Id,
                status = existingDelivery.Status.ToString()
            });
        }

        // Find restaurant
        var restaurant = await _restaurants
            .Find(x => x.Id == order.RestaurantId)
            .FirstOrDefaultAsync();

        if (restaurant == null)
        {
            return NotFound(new
            {
                message = "Restaurant not found."
            });
        }

        // Find customer
        var customer = await _customers
            .Find(x => x.Id == order.CustomerId)
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return NotFound(new
            {
                message = "Customer not found."
            });
        }

        // Validate restaurant coordinates
        if (restaurant.Location == null ||
            restaurant.Location.Coordinates == null ||
            restaurant.Location.Coordinates.Length < 2)
        {
            return BadRequest(new
            {
                message = "Restaurant location is invalid."
            });
        }

        // Validate customer coordinates
        if (customer.Location == null ||
            customer.Location.Coordinates == null ||
            customer.Location.Coordinates.Length < 2)
        {
            return BadRequest(new
            {
                message = "Customer location is invalid."
            });
        }

        // GeoJSON stores:
        // [longitude, latitude]
        var pickupLongitude =
            restaurant.Location.Coordinates[0];

        var pickupLatitude =
            restaurant.Location.Coordinates[1];

        var deliveryLongitude =
            customer.Location.Coordinates[0];

        var deliveryLatitude =
            customer.Location.Coordinates[1];

        // Calculate delivery distance
        var distance = CalculateDistanceInKilometers(
            pickupLatitude,
            pickupLongitude,
            deliveryLatitude,
            deliveryLongitude);

        // Temporary development delivery fee
        var deliveryFee = CalculateDeliveryFee(distance);

        // Temporary ETA calculation
        var estimatedMinutes =
            CalculateEstimatedMinutes(distance);

        var deliveryRequest = new DeliveryRequest
        {
            OrderId = order.Id,

            CustomerId = order.CustomerId,

            RestaurantId = order.RestaurantId,

            DeliveryPersonId = null,

            PickupLocation = restaurant.Location,

            DeliveryLocation = customer.Location,

            DistanceInKilometers =
                Math.Round(distance, 2),

            DeliveryFee = deliveryFee,

            EstimatedMinutes = estimatedMinutes,

            Status = DeliveryRequestStatus.Searching,

            RequestedAt = DateTime.UtcNow,

            AssignedAt = null,

            AcceptedAt = null,

            CompletedAt = null,

            UpdatedAt = DateTime.UtcNow
        };

        await _deliveryRequests.InsertOneAsync(
            deliveryRequest);

        // Update order with delivery information
        var orderUpdate = Builders<Order>.Update
            .Set(
                x => x.DeliveryRequestId,
                deliveryRequest.Id)
            .Set(
                x => x.DeliveryFee,
                deliveryFee)
            .Set(
                x => x.TotalAmount,
                order.FoodTotal + deliveryFee)
            .Set(
                x => x.UpdatedAt,
                DateTime.UtcNow);

        await _orders.UpdateOneAsync(
            x => x.Id == order.Id,
            orderUpdate);

        return CreatedAtAction(
            nameof(GetDeliveryRequest),
            new
            {
                id = deliveryRequest.Id
            },
            new
            {
                message =
                    "Delivery request created successfully.",

                deliveryRequest = new
                {
                    deliveryRequest.Id,
                    deliveryRequest.OrderId,
                    deliveryRequest.CustomerId,
                    deliveryRequest.RestaurantId,
                    deliveryRequest.DistanceInKilometers,
                    deliveryRequest.DeliveryFee,
                    deliveryRequest.EstimatedMinutes,
                    status =
                        deliveryRequest.Status.ToString()
                }
            });
    }

   
    // GET DELIVERY REQUEST
    // GET: /api/Delivery/{id}
    

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDeliveryRequest(
        string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new
            {
                message = "Delivery request ID is required."
            });
        }

        var deliveryRequest = await _deliveryRequests
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync();

        if (deliveryRequest == null)
        {
            return NotFound(new
            {
                message = "Delivery request not found."
            });
        }

        return Ok(deliveryRequest);
    }

  
    // FIND NEARBY AVAILABLE DELIVERY PERSONS
    // POST: /api/Delivery/nearby-persons
    // Restaurant Owner / Admin
    

    [HttpPost("nearby-persons")]
    [Authorize(Roles = "RestaurantOwner,Admin")]
    public async Task<IActionResult> FindNearbyDeliveryPersons(
        NearbyDeliveryPersonRequest request)
    {
        // Validate latitude
        if (request.Latitude < -90 ||
            request.Latitude > 90)
        {
            return BadRequest(new
            {
                message = "Invalid latitude."
            });
        }

        // Validate longitude
        if (request.Longitude < -180 ||
            request.Longitude > 180)
        {
            return BadRequest(new
            {
                message = "Invalid longitude."
            });
        }

        // Validate radius
        if (request.RadiusInKilometers <= 0)
        {
            return BadRequest(new
            {
                message =
                    "Radius must be greater than zero."
            });
        }

        if (request.RadiusInKilometers > 50)
        {
            return BadRequest(new
            {
                message =
                    "Maximum search radius is 50 km."
            });
        }

        /*
         * MongoDB GeoJSON coordinates use:
         *
         * [longitude, latitude]
         */

        var point =
            GeoJson.Point(
                GeoJson.Geographic(
                    request.Longitude,
                    request.Latitude));

        /*
         * Convert kilometers to meters because
         * MongoDB NearSphere maxDistance uses meters.
         */

        var maxDistanceMeters =
            request.RadiusInKilometers * 1000;

        var nearFilter =
            Builders<DeliveryPerson>.Filter.NearSphere(
                x => x.Location,
                point,
                maxDistanceMeters);

        var availabilityFilter =
            Builders<DeliveryPerson>.Filter.Eq(
                x => x.IsAvailable,
                true);

        var filter =
            Builders<DeliveryPerson>.Filter.And(
                nearFilter,
                availabilityFilter);

        var deliveryPersons =
            await _deliveryPersons
                .Find(filter)
                .Limit(20)
                .ToListAsync();

        var results = deliveryPersons
            .Select(person =>
            {
                if (person.Location == null ||
                    person.Location.Coordinates == null ||
                    person.Location.Coordinates.Length < 2)
                {
                    return new
                    {
                        person.Id,
                        person.UserId,
                        person.PhoneNumber,
                        person.VehicleType,
                        person.VehicleNumber,
                        person.IsAvailable,
                        distanceInKilometers =
                            double.MaxValue
                    };
                }

                var personLongitude =
                    person.Location.Coordinates[0];

                var personLatitude =
                    person.Location.Coordinates[1];

                var distance =
                    CalculateDistanceInKilometers(
                        request.Latitude,
                        request.Longitude,
                        personLatitude,
                        personLongitude);

                return new
                {
                    person.Id,
                    person.UserId,
                    person.PhoneNumber,
                    person.VehicleType,
                    person.VehicleNumber,
                    person.IsAvailable,
                    distanceInKilometers =
                        Math.Round(distance, 2)
                };
            })
            .Where(x =>
                x.distanceInKilometers != double.MaxValue)
            .OrderBy(x => x.distanceInKilometers)
            .ToList();

        return Ok(new
        {
            count = results.Count,
            searchLocation = new
            {
                request.Latitude,
                request.Longitude
            },
            radiusInKilometers =
                request.RadiusInKilometers,
            deliveryPersons = results
        });
    }

    // ============================================================
    // ASSIGN DELIVERY PERSON
    // POST: /api/Delivery/{id}/assign
    // Restaurant Owner / Admin
    // ============================================================

    [HttpPost("{id}/assign")]
    [Authorize(Roles = "RestaurantOwner,Admin")]
    public async Task<IActionResult> AssignDeliveryPerson(
        string id,
        AssignDeliveryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DeliveryPersonId))
        {
            return BadRequest(new
            {
                message = "Delivery person ID is required."
            });
        }

        // Find delivery request
        var deliveryRequest = await _deliveryRequests
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync();

        if (deliveryRequest == null)
        {
            return NotFound(new
            {
                message = "Delivery request not found."
            });
        }

        // Only searching requests can be assigned
        if (deliveryRequest.Status !=
            DeliveryRequestStatus.Searching)
        {
            return BadRequest(new
            {
                message =
                    $"Delivery request cannot be assigned when status is " +
                    $"{deliveryRequest.Status}."
            });
        }

        // Find delivery person
        var deliveryPerson = await _deliveryPersons
            .Find(x => x.Id == request.DeliveryPersonId)
            .FirstOrDefaultAsync();

        if (deliveryPerson == null)
        {
            return NotFound(new
            {
                message = "Delivery person not found."
            });
        }

        // Driver must be available
        if (!deliveryPerson.IsAvailable)
        {
            return BadRequest(new
            {
                message = "Delivery person is not currently available."
            });
        }

        // Make sure the driver isn't already assigned to
        // another active delivery.
        var activeDelivery = await _deliveryRequests
            .Find(x =>
                x.DeliveryPersonId == deliveryPerson.Id &&
                (
                    x.Status == DeliveryRequestStatus.Assigned ||
                    x.Status == DeliveryRequestStatus.Accepted ||
                    x.Status == DeliveryRequestStatus.PickedUp ||
                    x.Status == DeliveryRequestStatus.InTransit
                ))
            .FirstOrDefaultAsync();

        if (activeDelivery != null)
        {
            return Conflict(new
            {
                message =
                    "Delivery person already has an active delivery.",
                activeDeliveryId = activeDelivery.Id
            });
        }

        // Atomically assign the driver.
        var deliveryFilter =
            Builders<DeliveryRequest>.Filter.And(
                Builders<DeliveryRequest>.Filter.Eq(
                    x => x.Id,
                    id),

                Builders<DeliveryRequest>.Filter.Eq(
                    x => x.Status,
                    DeliveryRequestStatus.Searching)
            );

        var deliveryUpdate =
            Builders<DeliveryRequest>.Update
                .Set(
                    x => x.DeliveryPersonId,
                    deliveryPerson.Id)
                .Set(
                    x => x.Status,
                    DeliveryRequestStatus.Assigned)
                .Set(
                    x => x.AssignedAt,
                    DateTime.UtcNow)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        var updateResult =
            await _deliveryRequests.UpdateOneAsync(
                deliveryFilter,
                deliveryUpdate);

        if (updateResult.ModifiedCount == 0)
        {
            return Conflict(new
            {
                message =
                    "Delivery request was already assigned or changed."
            });
        }

        // Mark delivery person unavailable while assigned.
        var driverFilter =
            Builders<DeliveryPerson>.Filter.And(
                Builders<DeliveryPerson>.Filter.Eq(
                    x => x.Id,
                    deliveryPerson.Id),

                Builders<DeliveryPerson>.Filter.Eq(
                    x => x.IsAvailable,
                    true)
            );

        var driverUpdate =
            Builders<DeliveryPerson>.Update
                .Set(
                    x => x.IsAvailable,
                    false);

        await _deliveryPersons.UpdateOneAsync(
            driverFilter,
            driverUpdate);

        // Update the order
        var orderUpdate =
            Builders<Order>.Update
                .Set(
                    x => x.DeliveryPersonId,
                    deliveryPerson.Id)
                .Set(
                    x => x.Status,
                    OrderStatus.ReadyForPickup)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        await _orders.UpdateOneAsync(
            x => x.Id == deliveryRequest.OrderId,
            orderUpdate);

        return Ok(new
        {
            message =
                "Delivery person assigned successfully.",

            deliveryRequestId =
                deliveryRequest.Id,

            deliveryPerson = new
            {
                deliveryPerson.Id,
                deliveryPerson.PhoneNumber,
                deliveryPerson.VehicleType,
                deliveryPerson.VehicleNumber
            },

            status = DeliveryRequestStatus
                .Assigned
                .ToString()
        });
    }

    [HttpPost("/api/internal-ai/delivery/nearby-persons")]
    public async Task<IActionResult> FindNearbyDeliveryPersonsForAI(
        NearbyDeliveryPersonRequest request)
    {
        if (request.Latitude < -90 ||
            request.Latitude > 90)
        {
            return BadRequest(new
            {
                message = "Invalid latitude."
            });
        }

        if (request.Longitude < -180 ||
            request.Longitude > 180)
        {
            return BadRequest(new
            {
                message = "Invalid longitude."
            });
        }

        if (request.RadiusInKilometers <= 0 ||
            request.RadiusInKilometers > 50)
        {
            return BadRequest(new
            {
                message = "Invalid search radius."
            });
        }

        var point =
            GeoJson.Point(
                GeoJson.Geographic(
                    request.Longitude,
                    request.Latitude));

        var maxDistance =
            request.RadiusInKilometers * 1000;

        var filters = new List<FilterDefinition<DeliveryPerson>>
        {
            Builders<DeliveryPerson>.Filter.NearSphere(
                x => x.Location,
                point,
                maxDistance),

            Builders<DeliveryPerson>.Filter.Eq(
                x => x.IsAvailable,
                true)
        };

        if (request.ExcludedDeliveryPersonIds != null &&
            request.ExcludedDeliveryPersonIds.Count > 0)
        {
            filters.Add(
                Builders<DeliveryPerson>.Filter.Nin(
                    x => x.Id,
                    request.ExcludedDeliveryPersonIds));
        }

        var filter =
            Builders<DeliveryPerson>.Filter.And(filters);

        var persons =
            await _deliveryPersons
                .Find(filter)
                .Limit(20)
                .ToListAsync();

        var results = persons
            .Where(x =>
                x.Location != null &&
                x.Location.Coordinates != null &&
                x.Location.Coordinates.Length >= 2)
            .Select(x =>
            {
                var longitude =
                    x.Location.Coordinates[0];

                var latitude =
                    x.Location.Coordinates[1];

                var distance =
                    CalculateDistanceInKilometers(
                        request.Latitude,
                        request.Longitude,
                        latitude,
                        longitude);

                return new
                {
                    x.Id,
                    x.UserId,
                    x.PhoneNumber,
                    x.VehicleType,
                    x.VehicleNumber,
                    x.IsAvailable,
                    distanceInKilometers =
                        Math.Round(distance, 2)
                };
            })
            .OrderBy(x => x.distanceInKilometers)
            .ToList();

        return Ok(new
        {
            count = results.Count,
            deliveryPersons = results
        });
    }

    [HttpPost("/api/internal-ai/delivery/{id}/assign")]
    public async Task<IActionResult> AssignDeliveryPersonForAI(
        string id,
        AssignDeliveryRequest request)
    {
        if (string.IsNullOrWhiteSpace(
                request.DeliveryPersonId))
        {
            return BadRequest(new
            {
                message =
                    "Delivery person ID is required."
            });
        }

        var deliveryRequest =
            await _deliveryRequests
                .Find(x => x.Id == id)
                .FirstOrDefaultAsync();

        if (deliveryRequest == null)
        {
            return NotFound(new
            {
                message =
                    "Delivery request not found."
            });
        }

        if (deliveryRequest.Status !=
            DeliveryRequestStatus.Searching)
        {
            return Conflict(new
            {
                message =
                    "Delivery request is no longer searching."
            });
        }

        var deliveryPerson =
            await _deliveryPersons
                .Find(x =>
                    x.Id ==
                    request.DeliveryPersonId)
                .FirstOrDefaultAsync();

        if (deliveryPerson == null)
        {
            return NotFound(new
            {
                message =
                    "Delivery person not found."
            });
        }

        if (!deliveryPerson.IsAvailable)
        {
            return Conflict(new
            {
                message =
                    "Delivery person is no longer available."
            });
        }

        var activeDelivery =
            await _deliveryRequests
                .Find(x =>
                    x.DeliveryPersonId ==
                        deliveryPerson.Id &&
                    (
                        x.Status ==
                            DeliveryRequestStatus.Assigned ||

                        x.Status ==
                            DeliveryRequestStatus.Accepted ||

                        x.Status ==
                            DeliveryRequestStatus.PickedUp ||

                        x.Status ==
                            DeliveryRequestStatus.InTransit
                    ))
                .FirstOrDefaultAsync();

        if (activeDelivery != null)
        {
            return Conflict(new
            {
                message =
                    "Delivery person already has an active delivery."
            });
        }

        var filter =
            Builders<DeliveryRequest>.Filter.And(
                Builders<DeliveryRequest>.Filter.Eq(
                    x => x.Id,
                    id),

                Builders<DeliveryRequest>.Filter.Eq(
                    x => x.Status,
                    DeliveryRequestStatus.Searching),

                Builders<DeliveryRequest>.Filter.Eq(
                    x => x.DeliveryPersonId,
                    null)
            );

        var update =
            Builders<DeliveryRequest>.Update
                .Set(
                    x => x.DeliveryPersonId,
                    deliveryPerson.Id)

                .Set(
                    x => x.Status,
                    DeliveryRequestStatus.Assigned)

                .Set(
                    x => x.AssignedAt,
                    DateTime.UtcNow)

                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow);

        var result =
            await _deliveryRequests
                .UpdateOneAsync(
                    filter,
                    update);

        if (result.ModifiedCount == 0)
        {
            return Conflict(new
            {
                message =
                    "Delivery request was already assigned."
            });
        }

        await _deliveryPersons.UpdateOneAsync(
            x => x.Id == deliveryPerson.Id,
            Builders<DeliveryPerson>.Update
                .Set(
                    x => x.IsAvailable,
                    false)
        );

        await _orders.UpdateOneAsync(
            x => x.Id == deliveryRequest.OrderId,
            Builders<Order>.Update
                .Set(
                    x => x.DeliveryPersonId,
                    deliveryPerson.Id)
                .Set(
                    x => x.UpdatedAt,
                    DateTime.UtcNow)
        );

        return Ok(new
        {
            message =
                "Delivery person assigned successfully.",

            deliveryRequestId = id,

            deliveryPerson = new
            {
                deliveryPerson.Id,
                deliveryPerson.PhoneNumber,
                deliveryPerson.VehicleType,
                deliveryPerson.VehicleNumber
            },

            status =
                DeliveryRequestStatus
                    .Assigned
                    .ToString()
        });
    }

    [HttpGet("/api/internal-ai/delivery/{id}")]
    public async Task<IActionResult> GetDeliveryRequestForAI(
        string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new
            {
                message =
                    "Delivery request ID is required."
            });
        }

        var deliveryRequest =
            await _deliveryRequests
                .Find(x => x.Id == id)
                .FirstOrDefaultAsync();

        if (deliveryRequest == null)
        {
            return NotFound(new
            {
                message =
                    "Delivery request not found."
            });
        }

        return Ok(deliveryRequest);
    }

    // CALCULATE DELIVERY FEE
    // Temporary development logic
    

    private static decimal CalculateDeliveryFee(
        double distanceInKilometers)
    {
        const decimal baseFee = 100m;
        const decimal feePerKilometer = 50m;

        var fee =
            baseFee +
            ((decimal)distanceInKilometers *
             feePerKilometer);

        return Math.Round(
            fee,
            2);
    }

    // CALCULATE ESTIMATED DELIVERY TIME
    // Temporary development logic
   

    private static int CalculateEstimatedMinutes(
        double distanceInKilometers)
    {
        const double averageSpeedKmPerHour = 25.0;

        var hours =
            distanceInKilometers /
            averageSpeedKmPerHour;

        var minutes =
            (int)Math.Ceiling(hours * 60);

        // Minimum ETA = 5 minutes
        return Math.Max(5, minutes);
    }

   

    private static double CalculateDistanceInKilometers(
        double latitude1,
        double longitude1,
        double latitude2,
        double longitude2)
    {
        const double earthRadiusKm = 6371.0;

        var lat1 =
            DegreesToRadians(latitude1);

        var lat2 =
            DegreesToRadians(latitude2);

        var deltaLat =
            DegreesToRadians(
                latitude2 - latitude1);

        var deltaLon =
            DegreesToRadians(
                longitude2 - longitude1);

        var a =
            Math.Sin(deltaLat / 2) *
            Math.Sin(deltaLat / 2)
            +
            Math.Cos(lat1) *
            Math.Cos(lat2) *
            Math.Sin(deltaLon / 2) *
            Math.Sin(deltaLon / 2);

        var c =
            2 *
            Math.Atan2(
                Math.Sqrt(a),
                Math.Sqrt(1 - a));

        return earthRadiusKm * c;
    }

    private static double DegreesToRadians(
        double degrees)
    {
        return degrees * Math.PI / 180.0;
    }
}