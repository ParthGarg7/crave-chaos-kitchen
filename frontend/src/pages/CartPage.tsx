import { Link } from 'react-router-dom';
import { ShoppingCart, ArrowRight, Trash2 } from 'lucide-react';

const CartPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-600 mb-6">
            Add some delicious items from our restaurants
          </p>
          <Link
            to="/restaurants"
            className="inline-flex items-center space-x-2 btn-primary"
          >
            <span>Browse Restaurants</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
