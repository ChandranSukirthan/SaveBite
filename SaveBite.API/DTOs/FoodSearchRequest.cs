namespace SaveBite.API.DTOs;

public class FoodSearchRequest
{
    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public double RadiusInKilometers { get; set; } = 5;

    public string? Category { get; set; }

    public decimal? MaxPrice { get; set; }
}