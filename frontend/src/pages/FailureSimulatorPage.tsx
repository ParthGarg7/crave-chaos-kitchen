import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Power,
  RotateCcw,
  Activity,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Settings,
  Zap,
  Clock,
  Shield,
  Server,
  Code,
  Link as LinkIcon,
  Wrench
} from 'lucide-react';
import { failureSimulatorApi } from '../services/api';
import { useFailureSimulatorStore } from '../stores/failureSimulatorStore';
import LoadingSpinner from '../components/LoadingSpinner';
import ScenarioCard from '../components/failure-simulator/ScenarioCard';
import MetricsPanel from '../components/failure-simulator/MetricsPanel';
import PresetSelector from '../components/failure-simulator/PresetSelector';

const FailureSimulatorPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'scenarios' | 'metrics' | 'presets'>('scenarios');
  
  const {
    scenarios,
    status,
    metrics,
    presets,
    setScenarios,
    setStatus,
    setMetrics,
    setPresets,
    setLoading,
    setError,
  } = useFailureSimulatorStore();

  // Fetch initial data
  const { isLoading: isLoadingScenarios } = useQuery({
    queryKey: ['failure-scenarios'],
    queryFn: async () => {
      const response = await failureSimulatorApi.getScenarios();
      setScenarios(response.data);
      return response.data;
    },
  });

  const { isLoading: isLoadingStatus } = useQuery({
    queryKey: ['failure-status'],
    queryFn: async () => {
      const response = await failureSimulatorApi.getStatus();
      setStatus(response.data);
      return response.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['failure-metrics'],
    queryFn: async () => {
      const response = await failureSimulatorApi.getMetrics();
      setMetrics(response.data);
      return response.data;
    },
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const { isLoading: isLoadingPresets } = useQuery({
    queryKey: ['failure-presets'],
    queryFn: async () => {
      const response = await failureSimulatorApi.getPresets();
      setPresets(response.data);
      return response.data;
    },
  });

  // Mutations
  const toggleSimulator = useMutation({
    mutationFn: (enabled: boolean) => failureSimulatorApi.toggle(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failure-status'] });
      toast.success(`Simulator ${status?.enabled ? 'disabled' : 'enabled'}`);
    },
  });

  const resetAll = useMutation({
    mutationFn: () => failureSimulatorApi.resetAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failure-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['failure-status'] });
      toast.success('All scenarios reset');
    },
  });

  const applyPreset = useMutation({
    mutationFn: (presetName: string) => failureSimulatorApi.applyPreset(presetName),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['failure-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['failure-status'] });
      toast.success(`Applied preset: ${response.data.message}`);
    },
  });

  const isLoading = isLoadingScenarios || isLoadingStatus || isLoadingMetrics || isLoadingPresets;

  if (isLoading && !status) {
    return <LoadingSpinner fullScreen text="Loading failure simulator..." />;
  }

  const activeScenariosCount = Object.values(scenarios).filter(s => s.enabled).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8 text-failure-600" />
                <span>Failure Simulator</span>
              </h1>
              <p className="mt-2 text-gray-600">
                Configure and control API failure injection for testing and demonstration
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              {/* Simulator Status */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Simulator:</span>
                <button
                  onClick={() => toggleSimulator.mutate(!status?.enabled)}
                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    status?.enabled
                      ? 'bg-failure-100 text-failure-700 hover:bg-failure-200'
                      : 'bg-success-100 text-success-700 hover:bg-success-200'
                  }`}
                >
                  {status?.enabled ? (
                    <>
                      <Pause className="h-4 w-4" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Inactive</span>
                    </>
                  )}
                </button>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => resetAll.mutate()}
                disabled={resetAll.isPending}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset All</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Scenarios</p>
                <p className="text-2xl font-bold text-gray-900">{activeScenariosCount}</p>
              </div>
              <div className={`p-3 rounded-lg ${activeScenariosCount > 0 ? 'bg-failure-100' : 'bg-gray-100'}`}>
                <Settings className={`h-6 w-6 ${activeScenariosCount > 0 ? 'text-failure-600' : 'text-gray-600'}`} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-success-600">
                  {metrics?.success_rate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-success-100">
                <TrendingUp className="h-6 w-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failure Rate</p>
                <p className="text-2xl font-bold text-failure-600">
                  {metrics?.failure_rate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-failure-100">
                <TrendingDown className="h-6 w-6 text-failure-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.total_requests.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary-100">
                <Activity className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('scenarios')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'scenarios'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Scenarios</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('metrics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'metrics'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>Metrics</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('presets')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'presets'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Presets</span>
                </span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'scenarios' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Failure Scenarios
                  </h2>
                  <p className="text-sm text-gray-500">
                    Toggle scenarios to inject failures into API requests
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(scenarios).map(([name, scenario]) => (
                    <ScenarioCard
                      key={name}
                      name={name}
                      scenario={scenario}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'metrics' && (
              <MetricsPanel metrics={metrics} />
            )}

            {activeTab === 'presets' && (
              <PresetSelector
                presets={presets}
                onApplyPreset={(presetName) => applyPreset.mutate(presetName)}
                isApplying={applyPreset.isPending}
              />
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900">
                How to Use the Failure Simulator
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                1. Enable the simulator using the toggle above.{' '}
                2. Select a preset or manually enable individual scenarios.{' '}
                3. Use the app normally - failures will be injected based on configured probabilities.{' '}
                4. Monitor the metrics tab to see failure rates and response patterns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FailureSimulatorPage;
