import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  Clock
} from 'lucide-react';
import { FailureSimulatorMetrics } from '../../types';

interface MetricsPanelProps {
  metrics: FailureSimulatorMetrics | null;
}

const MetricsPanel = ({ metrics }: MetricsPanelProps) => {
  if (!metrics) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No metrics available yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Start making API requests to see metrics
        </p>
      </div>
    );
  }

  const successFailData = [
    { name: 'Success', value: metrics.total_requests - metrics.failed_requests, color: '#22c55e' },
    { name: 'Failed', value: metrics.failed_requests, color: '#ef4444' },
  ];

  const rateData = [
    { name: 'Success Rate', value: metrics.success_rate, fill: '#22c55e' },
    { name: 'Failure Rate', value: metrics.failure_rate, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Successful Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {(metrics.total_requests - metrics.failed_requests).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Failed Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.failed_requests.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {metrics.success_rate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Failure Rate</p>
              <p className="text-2xl font-bold text-red-600">
                {metrics.failure_rate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Success vs Failure Pie Chart */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Request Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={successFailData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {successFailData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Success/Failure Rate Bar Chart */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Success vs Failure Rate
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rateData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Additional Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(metrics.last_updated).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Activity className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Active Scenarios</p>
              <p className="text-sm font-medium text-gray-900">
                {metrics.active_scenarios} / {metrics.total_scenarios}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-sm font-medium text-gray-900">
                {metrics.total_requests.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
