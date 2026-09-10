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

    public async Task TriggerDeliveryRetryAsync(
        string deliveryRequestId,
        string rejectedDriverId)
    {
        var baseUrl =
            _configuration["AIService:BaseUrl"];

        var serviceKey =
            _configuration["AIService:ServiceKey"];

        if (string.IsNullOrWhiteSpace(baseUrl) ||
            string.IsNullOrWhiteSpace(serviceKey))
        {
            throw new InvalidOperationException(
                "AI service configuration is missing.");
        }

        var url =
            $"{baseUrl}/agents/delivery/retry" +
            $"?delivery_request_id={Uri.EscapeDataString(deliveryRequestId)}" +
            $"&rejected_driver_id={Uri.EscapeDataString(rejectedDriverId)}";

        using var request =
            new HttpRequestMessage(
                HttpMethod.Post,
                url);

        request.Headers.Add(
            "X-AI-Service-Key",
            serviceKey);

        var response =
            await _httpClient.SendAsync(request);

        response.EnsureSuccessStatusCode();
    }
}