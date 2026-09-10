using SaveBite.API.Models;

namespace SaveBite.API.DTOs;

public class CreateRestaurantRequest
{
    public string RestaurantName { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }
}