using SaveBite.API.Models;

namespace SaveBite.API.DTOs;

public class UpdateOrderStatusRequest
{
    public OrderStatus Status { get; set; }
}