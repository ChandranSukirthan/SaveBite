using MongoDB.Driver;
using SaveBite.API.Models;

namespace SaveBite.API.Configuration;

public static class MongoDbIndexes
{
    public static async Task CreateAsync(
        MongoDbContext mongoDbContext)
    {
        var restaurants =
            mongoDbContext.Database.GetCollection<Restaurant>(
                "restaurants");

        var customers =
            mongoDbContext.Database.GetCollection<Customer>(
                "customers");

        var deliveryPersons =
            mongoDbContext.Database.GetCollection<DeliveryPerson>(
                "deliveryPersons");

        var foodItems =
            mongoDbContext.Database.GetCollection<FoodItem>(
                "foodItems");

        var restaurantLocationIndex =
            new CreateIndexModel<Restaurant>(
                Builders<Restaurant>.IndexKeys
                    .Geo2DSphere(x => x.Location));

        var customerLocationIndex =
            new CreateIndexModel<Customer>(
                Builders<Customer>.IndexKeys
                    .Geo2DSphere(x => x.Location));

        var deliveryPersonLocationIndex =
            new CreateIndexModel<DeliveryPerson>(
                Builders<DeliveryPerson>.IndexKeys
                    .Geo2DSphere(x => x.Location));

        var foodLocationIndex =
            new CreateIndexModel<FoodItem>(
                Builders<FoodItem>.IndexKeys
                    .Geo2DSphere(x => x.Location));

        await restaurants.Indexes.CreateOneAsync(
            restaurantLocationIndex);

        await customers.Indexes.CreateOneAsync(
            customerLocationIndex);

        await deliveryPersons.Indexes.CreateOneAsync(
            deliveryPersonLocationIndex);

        await foodItems.Indexes.CreateOneAsync(
            foodLocationIndex);
    }
}