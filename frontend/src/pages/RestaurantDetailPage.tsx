import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Star, 
  Clock, 
  MapPin, 
  Phone, 
  ChevronLeft,
  Plus,
  Minus,
  ShoppingCart,
  Info
} from 'lucide-react';
import { restaurantApi } from '../services/api';
import { MenuItem } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const RestaurantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Record<number, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => restaurantApi.getById(Number(id)),
    select: (res) => res.data,
  });

  const { data: menuItems, isLoading: isLoadingMenu } = useQuery({
    queryKey: ['menu', id],
    queryFn: () => restaurantApi.getMenu(Number(id)),
    select: (res) => res.data,
  });

  if (isLoadingRestaurant || isLoadingMenu) {
    return <LoadingSpinner fullScreen />;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Restaurant not found</p>
        </div>
      </div>
    );
  }

  // Group menu items by category
  const categories = [...new Set(menuItems?.map((item: MenuItem) => item.category))];
  const filteredItems = selectedCategory
    ? menuItems?.filter((item: MenuItem) => item.category === selectedCategory)
    : menuItems;

  const addToCart = (itemId: number) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const cartTotal = Object.entries(cart).reduce((total, [itemId, quantity]) => {
    const item = menuItems?.find((i: MenuItem) => i.id === Number(itemId));
    return total + (item?.price || 0) * quantity;
  }, 0);

  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1>
              <p className="mt-2 text-gray-600 capitalize">
                {restaurant.cuisine_type.replace('_', ' ')} • {restaurant.city}
              </p>
              
              <div className="flex items-center space-x-6 mt-4">
                <div className="flex items-center space-x-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="font-medium">{restaurant.rating}</span>
                  <span className="text-gray-500">({restaurant.review_count} reviews)</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-600">
                  <Clock className="h-5 w-5" />
                  <span>{restaurant.delivery_time_min}-{restaurant.delivery_time_max} min</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-600">
                  <MapPin className="h-5 w-5" />
                  <span>${restaurant.delivery_fee.toFixed(2)} delivery</span>
                </div>
              </div>
            </div>

            <div className="mt-4 md:mt-0 text-right">
              <p className="text-sm text-gray-600">{restaurant.address}</p>
              <p className="text-sm text-gray-600">
                {restaurant.city}, {restaurant.state} {restaurant.zip_code}
              </p>
              <p className="text-sm text-gray-600 mt-1">{restaurant.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Menu Content */}
          <div className="flex-1">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === ''
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Menu Items */}
            <div className="space-y-4">
              {filteredItems?.map((item: MenuItem) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-4 border border-gray-200 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {item.is_vegetarian && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Veg
                        </span>
                      )}
                      {item.is_spicy && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          Spicy
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    <p className="text-lg font-semibold text-gray-900 mt-2">
                      ${item.price.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {cart[item.id] ? (
                      <div className="flex items-center space-x-2 bg-primary-50 rounded-lg p-1">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 hover:bg-primary-100 rounded"
                        >
                          <Minus className="h-4 w-4 text-primary-600" />
                        </button>
                        <span className="w-8 text-center font-medium">{cart[item.id]}</span>
                        <button
                          onClick={() => addToCart(item.id)}
                          className="p-1 hover:bg-primary-100 rounded"
                        >
                          <Plus className="h-4 w-4 text-primary-600" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item.id)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Sidebar */}
          {cartItemCount > 0 && (
            <div className="lg:w-80">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-32">
                <div className="flex items-center space-x-2 mb-4">
                  <ShoppingCart className="h-5 w-5 text-primary-600" />
                  <h2 className="text-lg font-semibold">Your Order</h2>
                  <span className="bg-primary-100 text-primary-700 text-sm font-medium px-2 py-0.5 rounded-full">
                    {cartItemCount}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  {Object.entries(cart).map(([itemId, quantity]) => {
                    const item = menuItems?.find((i: MenuItem) => i.id === Number(itemId));
                    if (!item) return null;
                    return (
                      <div key={itemId} className="flex justify-between text-sm">
                        <span>
                          {quantity}x {item.name}
                        </span>
                        <span className="font-medium">
                          ${(item.price * quantity).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-gray-200 pt-4 mb-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button className="w-full btn-primary py-3">
                  Proceed to Checkout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetailPage;
