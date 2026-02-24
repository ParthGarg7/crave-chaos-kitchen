import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, Clock, Utensils } from 'lucide-react';
import { restaurantApi } from '../services/api';
import { Restaurant } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const RestaurantsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('');

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['restaurants', searchQuery, selectedCuisine],
    queryFn: () => restaurantApi.getAll({ 
      query: searchQuery || undefined,
      cuisine_type: selectedCuisine || undefined 
    }),
    select: (res) => res.data,
  });

  const { data: cuisineTypes } = useQuery({
    queryKey: ['cuisine-types'],
    queryFn: () => restaurantApi.getCuisineTypes(),
    select: (res) => res.data,
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Restaurants</h1>
          <p className="mt-2 text-gray-600">
            Discover the best food near you
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Cuisine Filter */}
            <div className="md:w-48">
              <select
                value={selectedCuisine}
                onChange={(e) => setSelectedCuisine(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Cuisines</option>
                {cuisineTypes?.map((cuisine: { value: string; label: string }) => (
                  <option key={cuisine.value} value={cuisine.value}>
                    {cuisine.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Restaurant Grid */}
        {restaurants?.length === 0 ? (
          <div className="text-center py-12">
            <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No restaurants found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants?.map((restaurant: Restaurant) => (
              <Link
                key={restaurant.id}
                to={`/restaurants/${restaurant.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <Utensils className="h-16 w-16 text-primary-400" />
                </div>

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {restaurant.name}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {restaurant.cuisine_type.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded-lg">
                      <Star className="h-4 w-4 text-green-600 fill-current" />
                      <span className="text-sm font-medium text-green-700">
                        {restaurant.rating}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {restaurant.delivery_time_min}-{restaurant.delivery_time_max} min
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>${restaurant.delivery_fee.toFixed(2)} delivery</span>
                    </div>
                  </div>

                  {/* Min Order */}
                  <p className="text-sm text-gray-500 mt-2">
                    Min. order: ${restaurant.min_order_amount.toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantsPage;
