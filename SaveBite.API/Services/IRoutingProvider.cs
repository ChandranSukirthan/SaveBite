using SaveBite.API.DTOs;
using SaveBite.API.Models;

namespace SaveBite.API.Services;

public interface IRoutingProvider
{
    Task<List<RouteOptionDto>> GetRouteOptionsAsync(Location origin, Location destination, bool simulateCongestionOnRouteA = false);
    Task<TrafficInfoDto> GetCurrentTrafficAsync(Location origin, Location destination);
}

