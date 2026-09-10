using System.Text.Json.Serialization;

namespace SaveBite.API.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UserRole
{
    RestaurantOwner,
    Customer,
    DeliveryPerson,
    Admin
}

