import { create } from 'zustand';
import { FailureScenario, FailureSimulatorStatus, FailureSimulatorMetrics, FailurePreset } from '../types';

interface FailureSimulatorState {
  // Data
  scenarios: Record<string, FailureScenario>;
  status: FailureSimulatorStatus | null;
  metrics: FailureSimulatorMetrics | null;
  presets: Record<string, FailurePreset>;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  selectedScenario: string | null;
  
  // Actions
  setScenarios: (scenarios: Record<string, FailureScenario>) => void;
  setStatus: (status: FailureSimulatorStatus) => void;
  setMetrics: (metrics: FailureSimulatorMetrics) => void;
  setPresets: (presets: Record<string, FailurePreset>) => void;
  updateScenario: (name: string, updates: Partial<FailureScenario>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedScenario: (name: string | null) => void;
  
  // Computed
  getActiveScenarios: () => FailureScenario[];
  getScenarioByType: (type: string) => FailureScenario | undefined;
}

export const useFailureSimulatorStore = create<FailureSimulatorState>((set, get) => ({
  scenarios: {},
  status: null,
  metrics: null,
  presets: {},
  isLoading: false,
  error: null,
  selectedScenario: null,
  
  setScenarios: (scenarios) => set({ scenarios }),
  
  setStatus: (status) => set({ status }),
  
  setMetrics: (metrics) => set({ metrics }),
  
  setPresets: (presets) => set({ presets }),
  
  updateScenario: (name, updates) => {
    set((state) => ({
      scenarios: {
        ...state.scenarios,
        [name]: { ...state.scenarios[name], ...updates },
      },
    }));
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setSelectedScenario: (name) => set({ selectedScenario: name }),
  
  getActiveScenarios: () => {
    return Object.values(get().scenarios).filter((s) => s.enabled);
  },
  
  getScenarioByType: (type) => {
    return Object.values(get().scenarios).find((s) => s.failure_type === type);
  },
}));
