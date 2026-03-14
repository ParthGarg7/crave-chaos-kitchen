import { Utensils, Github, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-primary-600 p-2 rounded-lg">
                <Utensils className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">FoodDelivery</span>
            </div>
            <p className="text-gray-600 text-sm max-w-md">
              A demo food delivery application showcasing API failure simulation. 
              Built for educational purposes to demonstrate various types of API failures 
              and error handling patterns.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-600 hover:text-primary-600 text-sm">
                  Home
                </a>
              </li>
              <li>
                <a href="/restaurants" className="text-gray-600 hover:text-primary-600 text-sm">
                  Restaurants
                </a>
              </li>
              <li>
                <a href="/failure-simulator" className="text-gray-600 hover:text-failure-600 text-sm">
                  Failure Simulator
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="/docs" 
                  className="text-gray-600 hover:text-primary-600 text-sm"
                >
                  API Documentation
                </a>
              </li>
              <li className="flex items-center space-x-4 pt-2">
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Github className="h-5 w-5" />
                </a>
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Twitter className="h-5 w-5" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Food Delivery API Failure Simulator. 
            Built for educational purposes.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
