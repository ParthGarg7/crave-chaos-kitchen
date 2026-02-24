import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-failure-100 rounded-full mb-6">
          <AlertTriangle className="h-12 w-12 text-failure-600" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
        >
          <Home className="h-5 w-5" />
          <span>Go Home</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
