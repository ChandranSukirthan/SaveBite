namespace SaveBite.API.Middleware;

public class AIServiceAuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _configuration;

    public AIServiceAuthenticationMiddleware(
        RequestDelegate next,
        IConfiguration configuration)
    {
        _next = next;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only protect internal AI endpoints.
        if (!context.Request.Path.StartsWithSegments(
                "/api/internal-ai"))
        {
            await _next(context);
            return;
        }

        var configuredKey =
            _configuration["AIService:ServiceKey"];

        if (string.IsNullOrWhiteSpace(configuredKey))
        {
            context.Response.StatusCode = StatusCodes
                .Status500InternalServerError;

            await context.Response.WriteAsJsonAsync(
                new
                {
                    message =
                        "AI service authentication is not configured."
                });

            return;
        }

        if (!context.Request.Headers.TryGetValue(
                "X-AI-Service-Key",
                out var providedKey))
        {
            context.Response.StatusCode =
                StatusCodes.Status401Unauthorized;

            await context.Response.WriteAsJsonAsync(
                new
                {
                    message =
                        "AI service key is required."
                });

            return;
        }

        if (!string.Equals(
                providedKey.ToString(),
                configuredKey,
                StringComparison.Ordinal))
        {
            context.Response.StatusCode =
                StatusCodes.Status401Unauthorized;

            await context.Response.WriteAsJsonAsync(
                new
                {
                    message =
                        "Invalid AI service key."
                });

            return;
        }

        await _next(context);
    }
}