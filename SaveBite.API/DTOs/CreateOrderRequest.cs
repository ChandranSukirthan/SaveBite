namespace SaveBite.API.DTOs;

public class CreateOrderRequest
{
    public string FoodItemId { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public string DeliveryAddress { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }
}