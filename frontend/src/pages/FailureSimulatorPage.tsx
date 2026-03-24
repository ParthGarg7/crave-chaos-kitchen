import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Activity, Settings, Zap, RotateCcw } from 'lucide-react';
import { failureSimulatorApi } from '../services/api';
import { useFailureSimulatorStore } from '../stores/failureSimulatorStore';
import ScenarioCard from '../components/failure-simulator/ScenarioCard';
import MetricsPanel from '../components/failure-simulator/MetricsPanel';
import PresetSelector from '../components/failure-simulator/PresetSelector';

// ── Stat Chip ────────────────────────────────────────────────────────────
function StatChip({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="glass" style={{
      borderRadius: 'var(--radius-sm)', padding: '14px 20px',
      border: '1px solid rgba(255,255,255,0.05)',
      minWidth: 140, flex: '1 1 140px',
    }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-accent)', fontSize: '2rem', color: accent || 'var(--accent-cream)', lineHeight: 1 }}>{value}</p>
    </div>
  );
}

const TABS = [
  { id: 'scenarios', label: 'Scenarios', icon: Settings },
  { id: 'metrics', label: 'Metrics', icon: Activity },
  { id: 'presets', label: 'Presets', icon: Zap },
] as const;

type TabId = typeof TABS[number]['id'];

const FailureSimulatorPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('scenarios');

  const {
    scenarios, status, metrics, presets,
    setScenarios, setStatus, setMetrics, setPresets,
  } = useFailureSimulatorStore();

  useQuery({
    queryKey: ['failure-scenarios'],
    queryFn: async () => { const r = await failureSimulatorApi.getScenarios(); setScenarios(r.data); return r.data; },
  });
  useQuery({
    queryKey: ['failure-status'],
    queryFn: async () => { const r = await failureSimulatorApi.getStatus(); setStatus(r.data); return r.data; },
    refetchInterval: 5000,
  });
  useQuery({
    queryKey: ['failure-metrics'],
    queryFn: async () => { const r = await failureSimulatorApi.getMetrics(); setMetrics(r.data); return r.data; },
    refetchInterval: 3000,
  });
  useQuery({
    queryKey: ['failure-presets'],
    queryFn: async () => { const r = await failureSimulatorApi.getPresets(); setPresets(r.data); return r.data; },
  });

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
      toast.success(`Applied: ${response.data.message}`);
    },
  });

  const activeScenariosCount = Object.values(scenarios).filter(s => s.enabled).length;
  const isEnabled = status?.enabled ?? false;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', paddingTop: 90, paddingBottom: 80 }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', top: -300, left: '50%', transform: 'translateX(-50%)', width: 800, height: 500, borderRadius: '50%', background: 'rgba(255,69,0,0.08)', filter: 'blur(200px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-lg)', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--accent-fire)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
              ⚡ API Testing
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.8rem)', lineHeight: 0.95, marginBottom: 10 }}>
              Failure Simulator
            </h1>
            <p style={{ fontFamily: 'var(--font-sub)', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
              Inject chaos. Test resilience. Build confidence.
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Simulator toggle */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggleSimulator.mutate(!isEnabled)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 24px', borderRadius: 'var(--radius-sm)', cursor: 'none',
                background: isEnabled ? 'rgba(255,69,0,0.15)' : 'var(--bg-elevated)',
                border: isEnabled ? '1px solid rgba(255,69,0,0.5)' : '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase',
                color: isEnabled ? 'var(--accent-fire)' : 'var(--text-muted)',
                boxShadow: isEnabled ? '0 0 24px rgba(255,69,0,0.2)' : 'none',
                transition: 'all 0.3s',
              }}
            >
              {/* Toggle pill */}
              <span style={{ width: 40, height: 22, borderRadius: 11, background: isEnabled ? 'var(--accent-fire)' : 'var(--bg-void)', border: isEnabled ? 'none' : '1px solid rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', padding: '0 3px', position: 'relative', flexShrink: 0, transition: 'background 0.3s' }}>
                <motion.span animate={{ x: isEnabled ? 18 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', display: 'block' }} />
              </span>
              {isEnabled ? 'Simulator Active' : 'Simulator Off'}
            </motion.button>

            {/* Reset */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => resetAll.mutate()}
              disabled={resetAll.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 20px', borderRadius: 'var(--radius-sm)', cursor: 'none',
                background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase',
                color: 'var(--text-muted)', transition: 'all 0.2s', opacity: resetAll.isPending ? 0.5 : 1,
              }}
            >
              <RotateCcw size={14} />
              Reset All
            </motion.button>
          </div>
        </div>

        {/* ── Stat row ── */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-lg)' }}>
          <StatChip label="Active Scenarios" value={activeScenariosCount}
            accent={activeScenariosCount > 0 ? 'var(--accent-fire)' : undefined} />
          <StatChip label="Success Rate" value={`${metrics?.success_rate.toFixed(1) ?? '—'}%`} accent="#22c55e" />
          <StatChip label="Failure Rate" value={`${metrics?.failure_rate.toFixed(1) ?? '—'}%`} accent="#ef4444" />
          <StatChip label="Total Requests" value={metrics?.total_requests.toLocaleString() ?? '0'} />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-md)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 4 }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', cursor: 'none',
                background: activeTab === id ? 'var(--bg-elevated)' : 'transparent',
                fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase',
                color: activeTab === id ? 'var(--accent-cream)' : 'var(--text-muted)',
                borderBottom: activeTab === id ? '2px solid var(--accent-fire)' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'scenarios' && (
            <motion.div key="scenarios" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-md)' }}>
                {Object.entries(scenarios).map(([name, scenario]) => (
                  <ScenarioCard key={name} name={name} scenario={scenario} />
                ))}
              </div>
            </motion.div>
          )}
          {activeTab === 'metrics' && (
            <motion.div key="metrics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <MetricsPanel metrics={metrics} />
            </motion.div>
          )}
          {activeTab === 'presets' && (
            <motion.div key="presets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <PresetSelector presets={presets} onApplyPreset={(n) => applyPreset.mutate(n)} isApplying={applyPreset.isPending} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Info box ── */}
        <div className="glass" style={{ marginTop: 'var(--space-lg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: '1px solid rgba(255,140,0,0.15)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--accent-ember)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>📖 How to Use</p>
          <ol style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 2, paddingLeft: 20 }}>
            <li>Enable the simulator using the toggle above.</li>
            <li>Select a preset or manually toggle individual scenarios.</li>
            <li>Use the app normally — failures will be injected based on configured probabilities.</li>
            <li>Monitor the <strong style={{ color: 'var(--accent-cream)' }}>Metrics</strong> tab to see failure rates and response patterns.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default FailureSimulatorPage;
