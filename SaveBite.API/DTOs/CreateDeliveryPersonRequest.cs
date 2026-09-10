namespace SaveBite.API.DTOs;

public class CreateDeliveryPersonRequest
{
    public string PhoneNumber { get; set; } = string.Empty;

    public string VehicleType { get; set; } = string.Empty;

    public string VehicleNumber { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }
}