namespace SaveBite.API.DTOs;

public class CreateFoodRequest
{
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public decimal Price { get; set; }

    public DateTime AvailableFrom { get; set; }

    public DateTime AvailableUntil { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }
}