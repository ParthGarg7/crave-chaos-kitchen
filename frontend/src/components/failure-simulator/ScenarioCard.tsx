import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Power,
  Settings,
  Zap,
  Clock,
  Shield,
  Server,
  Code,
  Link as LinkIcon,
  Wrench,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { failureSimulatorApi } from '../../services/api';
import { FailureScenario, FailureType } from '../../types';

interface ScenarioCardProps {
  name: string;
  scenario: FailureScenario;
}

const failureTypeIcons: Record<FailureType, typeof Zap> = {
  rate_limit: Zap,
  timeout: Clock,
  authentication: Shield,
  authorization: Shield,
  server_error: Server,
  service_unavailable: Server,
  bad_request: Code,
  dependency: LinkIcon,
  configuration: Wrench,
};

const failureTypeColors: Record<FailureType, string> = {
  rate_limit: 'text-yellow-600 bg-yellow-100',
  timeout: 'text-orange-600 bg-orange-100',
  authentication: 'text-red-600 bg-red-100',
  authorization: 'text-red-600 bg-red-100',
  server_error: 'text-purple-600 bg-purple-100',
  service_unavailable: 'text-purple-600 bg-purple-100',
  bad_request: 'text-blue-600 bg-blue-100',
  dependency: 'text-pink-600 bg-pink-100',
  configuration: 'text-gray-600 bg-gray-100',
};

const ScenarioCard = ({ name, scenario }: ScenarioCardProps) => {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [probability, setProbability] = useState(scenario.probability);

  const Icon = failureTypeIcons[scenario.failure_type];
  const colorClass = failureTypeColors[scenario.failure_type];

  const toggleMutation = useMutation({
    mutationFn: () =>
      scenario.enabled
        ? failureSimulatorApi.disableScenario(name)
        : failureSimulatorApi.enableScenario(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failure-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['failure-status'] });
      toast.success(`${name} ${scenario.enabled ? 'disabled' : 'enabled'}`);
    },
  });

  const updateProbabilityMutation = useMutation({
    mutationFn: (newProbability: number) =>
      failureSimulatorApi.updateScenario(name, { probability: newProbability }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failure-scenarios'] });
      toast.success('Probability updated');
    },
  });

  const handleProbabilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setProbability(value);
  };

  const handleProbabilityBlur = () => {
    if (probability !== scenario.probability) {
      updateProbabilityMutation.mutate(probability);
    }
  };

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        scenario.enabled
          ? 'border-failure-300 shadow-md'
          : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 capitalize">
                {name.replace(/_/g, ' ')}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {scenario.failure_type.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Status Badge */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                scenario.enabled
                  ? 'bg-failure-100 text-failure-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {scenario.enabled ? 'Active' : 'Inactive'}
            </span>

            {/* Toggle Button */}
            <button
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              className={`p-2 rounded-lg transition-colors ${
                scenario.enabled
                  ? 'bg-failure-100 text-failure-600 hover:bg-failure-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Power className="h-4 w-4" />
            </button>

            {/* Expand Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Info */}
        <div className="mt-3 flex items-center space-x-4 text-sm">
          <span className="text-gray-600">
            Probability: <span className="font-medium">{(scenario.probability * 100).toFixed(0)}%</span>
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">
            Endpoints: <span className="font-medium">{scenario.endpoints.length}</span>
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {/* Probability Slider */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Failure Probability
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={probability}
                onChange={handleProbabilityChange}
                onBlur={handleProbabilityBlur}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-900 w-16 text-right">
                {(probability * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Endpoints */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Affected Endpoints
            </label>
            <div className="flex flex-wrap gap-2">
              {scenario.endpoints.map((endpoint, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono bg-gray-200 text-gray-700"
                >
                  {endpoint}
                </span>
              ))}
            </div>
          </div>

          {/* Methods */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HTTP Methods
            </label>
            <div className="flex flex-wrap gap-2">
              {scenario.methods.map((method, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {scenario.error_message && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Error Message
              </label>
              <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                {scenario.error_message}
              </p>
            </div>
          )}

          {/* Type-specific settings */}
          {scenario.rate_limit_requests && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate Limit (requests)
                </label>
                <p className="text-sm text-gray-900">{scenario.rate_limit_requests}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Window (seconds)
                </label>
                <p className="text-sm text-gray-900">{scenario.rate_limit_window}</p>
              </div>
            </div>
          )}

          {scenario.timeout_seconds && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (seconds)
              </label>
              <p className="text-sm text-gray-900">{scenario.timeout_seconds}s</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScenarioCard;
