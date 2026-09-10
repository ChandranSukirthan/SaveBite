using System.Text.Json.Serialization;
using SaveBite.API.Models;

namespace SaveBite.API.DTOs;

public class RegisterRequest
{
    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public UserRole Role { get; set; }
}