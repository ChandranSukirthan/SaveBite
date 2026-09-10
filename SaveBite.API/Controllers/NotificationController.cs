using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaveBite.API.Services;

namespace SaveBite.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly NotificationService
        _notificationService;

    public NotificationController(
        NotificationService notificationService)
    {
        _notificationService =
            notificationService;
    }

    [HttpGet]
    public async Task<IActionResult>
        GetMyNotifications(
            [FromQuery] int limit = 50)
    {
        var userId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        if (limit <= 0)
        {
            limit = 50;
        }

        if (limit > 100)
        {
            limit = 100;
        }

        var notifications =
            await _notificationService
                .GetUserNotificationsAsync(
                    userId,
                    limit);

        return Ok(notifications);
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult>
        MarkAsRead(string id)
    {
        var userId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var success =
            await _notificationService
                .MarkAsReadAsync(
                    id,
                    userId);

        if (!success)
        {
            return NotFound(new
            {
                message =
                    "Notification not found."
            });
        }

        return Ok(new
        {
            message =
                "Notification marked as read."
        });
    }
}