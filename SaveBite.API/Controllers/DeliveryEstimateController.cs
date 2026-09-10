using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SaveBite.API.Configuration;
using SaveBite.API.Models;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/customer/delivery-estimate")]
[Authorize(Roles = "Customer")]
public class DeliveryEstimateController : ControllerBase
{
    private readonly IMongoCollection<Customer> _customers;
    private readonly IMongoCollection<Order> _orders;
    private readonly IMongoCollection<Restaurant> _restaurants;

    public DeliveryEstimateController(
        MongoDbContext mongoDbContext)
    {
        _customers = mongoDbContext.Database
            .GetCollection<Customer>("customers");

        _orders = mongoDbContext.Database
            .GetCollection<Order>("orders");

        _restaurants = mongoDbContext.Database
            .GetCollection<Restaurant>("restaurants");
    }


    // GET DELIVERY ESTIMATE
    //
    // GET:
    // /api/customer/delivery-estimate/{orderId}


    [HttpGet("{orderId}")]
    public async Task<IActionResult> GetDeliveryEstimate(
        string orderId)
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

        if (string.IsNullOrWhiteSpace(orderId))
        {
            return BadRequest(new
            {
                message =
                    "Order ID is required."
            });
        }

        // Find customer
      

        var customer = await _customers
            .Find(x => x.UserId == userId)
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return NotFound(new
            {
                message =
                    "Customer profile not found."
            });
        }

    
        // Find customer's order
     

        var order = await _orders
            .Find(x =>
                x.Id == orderId &&
                x.CustomerId == customer.Id)
            .FirstOrDefaultAsync();

        if (order == null)
        {
            return NotFound(new
            {
                message =
                    "Order not found."
            });
        }

       
        // Find restaurant
      

        var restaurant = await _restaurants
            .Find(x =>
                x.Id == order.RestaurantId &&
                x.IsApproved)
            .FirstOrDefaultAsync();

        if (restaurant == null)
        {
            return NotFound(new
            {
                message =
                    "Approved restaurant not found."
            });
        }

        
        // Validate restaurant location
       

        if (restaurant.Location == null ||
            restaurant.Location.Coordinates == null ||
            restaurant.Location.Coordinates.Length < 2)
        {
            return BadRequest(new
            {
                message =
                    "Restaurant location is invalid."
            });
        }

    
        // Validate customer location
        

        if (customer.Location == null ||
            customer.Location.Coordinates == null ||
            customer.Location.Coordinates.Length < 2)
        {
            return BadRequest(new
            {
                message =
                    "Customer location is invalid."
            });
        }

        // GeoJSON:
        // [longitude, latitude]

        var restaurantLongitude =
            restaurant.Location.Coordinates[0];

        var restaurantLatitude =
            restaurant.Location.Coordinates[1];

        var customerLongitude =
            customer.Location.Coordinates[0];

        var customerLatitude =
            customer.Location.Coordinates[1];

      
        // Calculate distance
       

        var distance =
            CalculateDistanceInKilometers(
                restaurantLatitude,
                restaurantLongitude,
                customerLatitude,
                customerLongitude);

        // Calculate estimated delivery fee
        

        var deliveryFee =
            CalculateDeliveryFee(distance);

      
        // Calculate estimated delivery time


        var estimatedMinutes =
            CalculateEstimatedMinutes(distance);

       
        // Calculate estimated total
     

        var estimatedTotal =
            order.FoodTotal + deliveryFee;

        var estimate = new
        {
            OrderId = order.Id,

            DistanceInKilometers =
                Math.Round(distance, 2),

            EstimatedDeliveryFee =
                deliveryFee,

            FoodTotal =
                order.FoodTotal,

            EstimatedTotalAmount =
                estimatedTotal,

            EstimatedMinutes =
                estimatedMinutes,

            GeneratedAt =
                DateTime.UtcNow
        };

        return Ok(new
        {
            estimate,

            restaurant = new
            {
                id = restaurant.Id,

                name =
                    restaurant.RestaurantName
            },

            pricing = new
            {
                baseFee = 100m,

                perKilometer = 50m
            },

            note =
                "This is an estimated delivery fee. " +
                "The final delivery assignment may " +
                "affect the final delivery details."
        });
    }

    [AllowAnonymous]
    [HttpGet("/api/internal-ai/delivery-estimate/{orderId}")]
    public async Task<IActionResult> GetDeliveryEstimateForAI(
        string orderId)
    {
        if (string.IsNullOrWhiteSpace(orderId))
        {
            return BadRequest(new
            {
                message =
                    "Order ID is required."
            });
        }

        var order = await _orders
            .Find(x => x.Id == orderId)
            .FirstOrDefaultAsync();

        if (order == null)
        {
            return NotFound(new
            {
                message =
                    "Order not found."
            });
        }

        var customer = await _customers
            .Find(x => x.Id == order.CustomerId)
            .FirstOrDefaultAsync();

        if (customer == null)
        {
            return NotFound(new
            {
                message =
                    "Customer not found."
            });
        }

        var restaurant = await _restaurants
            .Find(x =>
                x.Id == order.RestaurantId &&
                x.IsApproved)
            .FirstOrDefaultAsync();

        if (restaurant == null)
        {
            return NotFound(new
            {
                message =
                    "Approved restaurant not found."
            });
        }

        if (restaurant.Location == null ||
            restaurant.Location.Coordinates == null ||
            restaurant.Location.Coordinates.Length < 2)
        {
            return BadRequest(new
            {
                message =
                    "Restaurant location is invalid."
            });
        }

        if (customer.Location == null ||
            customer.Location.Coordinates == null ||
            customer.Location.Coordinates.Length < 2)
        {
            return BadRequest(new
            {
                message =
                    "Customer location is invalid."
            });
        }

        var restaurantLongitude =
            restaurant.Location.Coordinates[0];

        var restaurantLatitude =
            restaurant.Location.Coordinates[1];

        var customerLongitude =
            customer.Location.Coordinates[0];

        var customerLatitude =
            customer.Location.Coordinates[1];

        var distance =
            CalculateDistanceInKilometers(
                restaurantLatitude,
                restaurantLongitude,
                customerLatitude,
                customerLongitude);

        var deliveryFee =
            CalculateDeliveryFee(distance);

        var estimatedMinutes =
            CalculateEstimatedMinutes(distance);

        var estimatedTotal =
            order.FoodTotal + deliveryFee;

        var estimate = new
        {
            OrderId = order.Id,

            DistanceInKilometers =
                Math.Round(distance, 2),

            EstimatedDeliveryFee =
                deliveryFee,

            FoodTotal =
                order.FoodTotal,

            EstimatedTotalAmount =
                estimatedTotal,

            EstimatedMinutes =
                estimatedMinutes,

            GeneratedAt =
                DateTime.UtcNow
        };

        return Ok(new
        {
            estimate,

            restaurant = new
            {
                id = restaurant.Id,

                name =
                    restaurant.RestaurantName
            },

            pricing = new
            {
                baseFee = 100m,

                perKilometer = 50m
            },

            note =
                "This is an estimated delivery fee. " +
                "The final delivery assignment may " +
                "affect the final delivery details."
        });
    }
    // Temporary development pricing model


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

    // ESTIMATED TIME
   

    private static int CalculateEstimatedMinutes(
        double distanceInKilometers)
    {
        const double averageSpeedKmPerHour = 25.0;

        var hours =
            distanceInKilometers /
            averageSpeedKmPerHour;

        var minutes =
            (int)Math.Ceiling(
                hours * 60);

        return Math.Max(
            5,
            minutes);
    }

    // HAVERSINE DISTANCE


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
        return degrees *
               Math.PI /
               180.0;
    }
}