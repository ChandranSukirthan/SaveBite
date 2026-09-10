using System.Net.Http.Json;

namespace SaveBite.API.Services;

public class AIServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public AIServiceClient(
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task TriggerDeliveryOptimizationAsync(
        string deliveryRequestId)
    {
        var baseUrl =
            _configuration["AIService:BaseUrl"];

        var serviceKey =
            _configuration["AIService:ServiceKey"];

        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            throw new InvalidOperationException(
                "AI service BaseUrl is not configured.");
        }

        if (string.IsNullOrWhiteSpace(serviceKey))
        {
            throw new InvalidOperationException(
                "AI service ServiceKey is not configured.");
        }

        var url =
            $"{baseUrl.TrimEnd('/')}" +
            "/agents/delivery/optimize" +
            "?delivery_request_id=" +
            Uri.EscapeDataString(
                deliveryRequestId);

        using var request =
            new HttpRequestMessage(
                HttpMethod.Post,
                url);

        request.Headers.Add(
            "X-AI-Service-Key",
            serviceKey);

        var response =
            await _httpClient.SendAsync(request);

        var responseBody =
            await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"AI delivery optimization failed. " +
                $"Status: {(int)response.StatusCode}. " +
                $"Response: {responseBody}");
        }
    }

    public async Task TriggerDeliveryRetryAsync(
        string deliveryRequestId,
        string rejectedDriverId)
    {
        var baseUrl =
            _configuration["AIService:BaseUrl"];

        var serviceKey =
            _configuration["AIService:ServiceKey"];

        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            throw new InvalidOperationException(
                "AI service BaseUrl is not configured.");
        }

        if (string.IsNullOrWhiteSpace(serviceKey))
        {
            throw new InvalidOperationException(
                "AI service ServiceKey is not configured.");
        }

        var url =
            $"{baseUrl.TrimEnd('/')}" +
            "/agents/delivery/retry" +
            "?delivery_request_id=" +
            Uri.EscapeDataString(
                deliveryRequestId) +
            "&rejected_driver_id=" +
            Uri.EscapeDataString(
                rejectedDriverId);

        using var request =
            new HttpRequestMessage(
                HttpMethod.Post,
                url);

        request.Headers.Add(
            "X-AI-Service-Key",
            serviceKey);

        var response =
            await _httpClient.SendAsync(request);

        var responseBody =
            await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"AI delivery retry failed. " +
                $"Status: {(int)response.StatusCode}. " +
                $"Response: {responseBody}");
        }
    }
}