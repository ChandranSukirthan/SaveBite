namespace SaveBite.API.Models;

public class DeliveryEstimate
{
    public string OrderId { get; set; } = string.Empty;

    public double DistanceInKilometers { get; set; }

    public decimal EstimatedDeliveryFee { get; set; }

    public decimal FoodTotal { get; set; }

    public decimal EstimatedTotalAmount { get; set; }

    public int EstimatedMinutes { get; set; }

    public DateTime GeneratedAt { get; set; } =
        DateTime.UtcNow;
}