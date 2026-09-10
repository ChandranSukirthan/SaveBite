namespace SaveBite.API.DTOs;

public class NearbyDeliveryPersonRequest
{
    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public double RadiusInKilometers { get; set; } = 10;
}