using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/role-test")]
public class RoleTestController : ControllerBase
{
    [HttpGet("restaurant-owner")]
    [Authorize(Roles = "RestaurantOwner")]
    public IActionResult RestaurantOwner()
    {
        return Ok(new
        {
            message = "Welcome, Restaurant Owner!",
            role = "RestaurantOwner"
        });
    }

    [HttpGet("customer")]
    [Authorize(Roles = "Customer")]
    public IActionResult Customer()
    {
        return Ok(new
        {
            message = "Welcome, Customer!",
            role = "Customer"
        });
    }

    [HttpGet("delivery-person")]
    [Authorize(Roles = "DeliveryPerson")]
    public IActionResult DeliveryPerson()
    {
        return Ok(new
        {
            message = "Welcome, Delivery Person!",
            role = "DeliveryPerson"
        });
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public IActionResult Admin()
    {
        return Ok(new
        {
            message = "Welcome, Admin!",
            role = "Admin"
        });
    }
}