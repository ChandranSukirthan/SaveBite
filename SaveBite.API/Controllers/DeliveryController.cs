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
            new MongoDB.Driver.GeoJson2DGeographicCoordinates(
                request.Longitude,
                request.Latitude);
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