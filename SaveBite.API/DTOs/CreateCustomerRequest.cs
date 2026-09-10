namespace SaveBite.API.DTOs;

public class CreateCustomerRequest
{
    public string PhoneNumber { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public List<string> PreferredCategories { get; set; } = new();

    public decimal MaximumBudget { get; set; }
}