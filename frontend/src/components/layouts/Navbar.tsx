import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { 
  Utensils, 
  ShoppingCart, 
  User, 
  Menu, 
  X, 
  LogOut,
  AlertTriangle,
  Home,
  List
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const Navbar = () => {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/';
  };

  const navLinks = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/restaurants', label: 'Restaurants', icon: Utensils },
  ];

  const authLinks = isAuthenticated
    ? [
        { path: '/orders', label: 'My Orders', icon: List },
        { path: '/cart', label: 'Cart', icon: ShoppingCart },
      ]
    : [];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-primary-600 p-2 rounded-lg">
                <Utensils className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                FoodDelivery
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {[...navLinks, ...authLinks].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center space-x-1">
                  <link.icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </span>
              </Link>
            ))}

            {/* Failure Simulator Link */}
            <Link
              to="/failure-simulator"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/failure-simulator')
                  ? 'bg-failure-100 text-failure-700'
                  : 'text-failure-600 hover:bg-failure-50'
              }`}
            >
              <span className="flex items-center space-x-1">
                <AlertTriangle className="h-4 w-4" />
                <span>Failure Simulator</span>
              </span>
            </Link>

            {/* Auth Buttons */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2 ml-4">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  <User className="h-4 w-4" />
                  <span>{user?.first_name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 ml-4">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-3 space-y-1">
            {[...navLinks, ...authLinks].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive(link.path)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <link.icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            ))}

            <Link
              to="/failure-simulator"
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                isActive('/failure-simulator')
                  ? 'bg-failure-100 text-failure-700'
                  : 'text-failure-600 hover:bg-failure-50'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Failure Simulator</span>
            </Link>

            {isAuthenticated ? (
              <>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="px-3 py-2 text-sm text-gray-500">
                    Signed in as {user?.email}
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
