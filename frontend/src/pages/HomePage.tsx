import { Link } from 'react-router-dom';
import { 
  Utensils, 
  AlertTriangle, 
  Zap, 
  Shield, 
  Clock, 
  Server,
  ArrowRight,
  Code,
  Activity
} from 'lucide-react';

const HomePage = () => {
  const failureTypes = [
    {
      icon: Zap,
      title: 'Rate Limiting',
      description: '429 Too Many Requests - Control API usage limits',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      icon: Clock,
      title: 'Timeouts',
      description: '408/504 Request Timeout - Simulate slow responses',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      icon: Shield,
      title: 'Auth Failures',
      description: '401/403 - Test authentication & authorization',
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      icon: Server,
      title: 'Server Errors',
      description: '500/503 - Simulate backend failures',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      icon: Code,
      title: 'Bad Requests',
      description: '400/422 - Test validation error handling',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      icon: Activity,
      title: 'Dependencies',
      description: '502/504 - External service failures',
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2 mb-6">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">API Failure Simulation Demo</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Food Delivery API
              <span className="block text-primary-200">Failure Simulator</span>
            </h1>
            <p className="text-xl text-primary-100 max-w-2xl mx-auto mb-8">
              A complete food delivery platform built to demonstrate and test 
              various API failure scenarios. Learn how to handle errors gracefully 
              in production applications.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                to="/failure-simulator"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
              >
                <AlertTriangle className="h-5 w-5" />
                <span>Open Failure Simulator</span>
              </Link>
              <Link
                to="/restaurants"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors border border-primary-500"
              >
                <Utensils className="h-5 w-5" />
                <span>Browse Restaurants</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Simulate Real-World API Failures
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Test your application's resilience by simulating common API failure scenarios 
              that occur in production environments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {failureTypes.map((type, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className={`inline-flex p-3 rounded-lg ${type.bgColor} mb-4`}>
                  <type.icon className={`h-6 w-6 ${type.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {type.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {type.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Configure Failures
              </h3>
              <p className="text-gray-600">
                Use the Failure Simulator dashboard to enable and configure 
                different types of API failures.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Use the App
              </h3>
              <p className="text-gray-600">
                Browse restaurants, add items to cart, and place orders. 
                Watch how failures are injected in real-time.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Monitor & Learn
              </h3>
              <p className="text-gray-600">
                Track failure metrics, response times, and learn how to 
                build more resilient applications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Test Your Error Handling?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Start simulating API failures and see how your application responds 
            to different error scenarios.
          </p>
          <Link
            to="/failure-simulator"
            className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-primary-700 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
          >
            <span>Launch Failure Simulator</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
