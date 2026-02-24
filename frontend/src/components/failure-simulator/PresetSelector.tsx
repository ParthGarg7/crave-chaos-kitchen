import { useState } from 'react';
import { 
  Zap, 
  Play, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Server,
  Clock,
  Shield,
  Activity
} from 'lucide-react';
import { FailurePreset } from '../../types';

interface PresetSelectorProps {
  presets: Record<string, FailurePreset>;
  onApplyPreset: (presetName: string) => void;
  isApplying: boolean;
}

const presetIcons: Record<string, typeof Zap> = {
  demo_rate_limiting: Clock,
  demo_auth_failures: Shield,
  demo_payment_issues: Zap,
  demo_server_errors: Server,
  demo_all_failures: Activity,
  chaos_mode: AlertTriangle,
  clear_all: CheckCircle,
};

const presetColors: Record<string, string> = {
  demo_rate_limiting: 'text-yellow-600 bg-yellow-100 border-yellow-200',
  demo_auth_failures: 'text-red-600 bg-red-100 border-red-200',
  demo_payment_issues: 'text-blue-600 bg-blue-100 border-blue-200',
  demo_server_errors: 'text-purple-600 bg-purple-100 border-purple-200',
  demo_all_failures: 'text-orange-600 bg-orange-100 border-orange-200',
  chaos_mode: 'text-failure-600 bg-failure-100 border-failure-200',
  clear_all: 'text-success-600 bg-success-100 border-success-200',
};

const PresetSelector = ({ presets, onApplyPreset, isApplying }: PresetSelectorProps) => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handleApply = (presetName: string) => {
    setSelectedPreset(presetName);
    onApplyPreset(presetName);
  };

  const getScenarioCount = (preset: FailurePreset) => {
    return Object.keys(preset.scenarios || {}).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Failure Presets
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Quickly apply predefined failure configurations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(presets).map(([key, preset]) => {
          const Icon = presetIcons[key] || Zap;
          const colorClass = presetColors[key] || 'text-gray-600 bg-gray-100 border-gray-200';
          const scenarioCount = getScenarioCount(preset);

          return (
            <div
              key={key}
              className={`border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                selectedPreset === key ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClass.split(' ').slice(1).join(' ')}`}>
                  <Icon className={`h-6 w-6 ${colorClass.split(' ')[0]}`} />
                </div>
                {scenarioCount > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {scenarioCount} scenarios
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {preset.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {preset.description}
              </p>

              {/* Scenario Preview */}
              {scenarioCount > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Includes:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(preset.scenarios).slice(0, 3).map((scenarioKey) => (
                      <span
                        key={scenarioKey}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {scenarioKey.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {scenarioCount > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">
                        +{scenarioCount - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleApply(key)}
                disabled={isApplying}
                className={`w-full inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  key === 'clear_all'
                    ? 'bg-success-100 text-success-700 hover:bg-success-200'
                    : key === 'chaos_mode'
                    ? 'bg-failure-100 text-failure-700 hover:bg-failure-200'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                } disabled:opacity-50`}
              >
                {isApplying && selectedPreset === key ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Apply Preset</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">
              About Presets
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Presets are pre-configured combinations of failure scenarios designed for 
              specific testing purposes. Applying a preset will reset all current scenarios 
              and enable only those defined in the preset.
            </p>
            <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
              <li><strong>Demo presets:</strong> Moderate failure rates for demonstration</li>
              <li><strong>Chaos Mode:</strong> High failure rates for stress testing</li>
              <li><strong>Clear All:</strong> Disable all failure scenarios</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresetSelector;
