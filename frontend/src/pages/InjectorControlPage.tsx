import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { injectorApi, failureSimulatorApi } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface InjectorState {
  injector_state: 'idle' | 'active' | 'paused' | 'unknown';
  traffic_enabled: boolean;
  current_scenario: string | null;
  is_paused_by_heal: boolean;
  error?: string;
}

interface ScenarioEntry {
  name: string;
  enabled: boolean;
  failure_type: string;
  probability: number;
}

// ─── Auto-injector cycle scenarios (same order as injector.py) ───────────────
const AUTO_SCENARIOS = ['database_error', 'service_overload', 'config_error'];

// ─── Shared style helpers ─────────────────────────────────────────────────────
const btnBase: React.CSSProperties = {
  borderRadius: 8,
  fontFamily: 'var(--font-body)',
  fontSize: '0.72rem',
  letterSpacing: 2,
  textTransform: 'uppercase',
  cursor: 'none',
  transition: 'opacity 0.2s, background 0.2s',
  border: 'none',
};

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 12,
  padding: '20px 24px',
  marginBottom: 20,
};

// ─── State badge ──────────────────────────────────────────────────────────────
function StateBadge({ state }: { state: InjectorState['injector_state'] }) {
  const cfg = {
    idle:    { color: '#8b949e', bg: 'rgba(139,148,158,0.12)', label: 'IDLE',           pulse: false },
    active:  { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'ACTIVE',         pulse: true  },
    paused:  { color: '#ffc845', bg: 'rgba(255,200,69,0.12)',  label: 'PAUSED BY HEAL', pulse: false },
    unknown: { color: '#f85149', bg: 'rgba(248,81,73,0.12)',   label: 'UNKNOWN',        pulse: false },
  }[state] ?? { color: '#8b949e', bg: 'rgba(139,148,158,0.12)', label: state.toUpperCase(), pulse: false };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}44`,
      borderRadius: 20, padding: '4px 12px',
      fontFamily: 'var(--font-body)', fontSize: '0.65rem', letterSpacing: 2,
    }}>
      {cfg.pulse && (
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: cfg.color,
          animation: 'injPulse 1.2s ease-in-out infinite', flexShrink: 0,
        }} />
      )}
      {cfg.label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InjectorControlPage() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [injState, setInjState]       = useState<InjectorState | null>(null);
  const [scenarios, setScenarios]     = useState<Record<string, ScenarioEntry>>({});
  const [stateLoading, setStateLoading] = useState(true);
  const [busy, setBusy]               = useState<string | null>(null); // tracks which action is in-flight
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch injector state (auto-refresh) ───────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const res = await injectorApi.getState();
      setInjState(res.data as InjectorState);
    } catch {
      // silently ignore; show last known state
    } finally {
      setStateLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchState();
    intervalRef.current = setInterval(() => { void fetchState(); }, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchState]);

  // ── Fetch scenarios (once on mount, and after actions) ───────────────────
  const fetchScenarios = useCallback(async () => {
    try {
      const res = await failureSimulatorApi.getScenarios();
      const raw = res.data as Record<string, any>;
      const mapped: Record<string, ScenarioEntry> = {};
      for (const [name, s] of Object.entries(raw)) {
        mapped[name] = {
          name,
          enabled:      s.enabled ?? false,
          failure_type: s.failure_type ?? '',
          probability:  s.probability ?? 0,
        };
      }
      setScenarios(mapped);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => { void fetchScenarios(); }, [fetchScenarios]);

  // ── Action helpers ────────────────────────────────────────────────────────
  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch { toast.error('Action failed — check console'); }
    finally { setBusy(null); }
  };

  const handleStartTraffic = () => withBusy('traffic-start', async () => {
    await injectorApi.setTraffic(true);
    toast.success('Traffic generator started');
    await fetchState();
  });

  const handleStopTraffic = () => withBusy('traffic-stop', async () => {
    await injectorApi.setTraffic(false);
    toast.success('Traffic generator stopped');
    await fetchState();
  });

  const handleStartInjection = () => withBusy('inj-start', async () => {
    await injectorApi.setInjectorState('active');
    toast.success('Auto-injector started');
    await fetchState();
  });

  const handleStopInjection = () => withBusy('inj-stop', async () => {
    await injectorApi.setInjectorState('idle');
    toast.success('Auto-injector stopped');
    await fetchState();
  });

  const handleClearPause = () => withBusy('clear-pause', async () => {
    await injectorApi.clearPause();
    toast.success('Heal pause cleared — injector set to idle');
    await fetchState();
  });

  const handleEnableScenario = (name: string) => withBusy(`en-${name}`, async () => {
    await failureSimulatorApi.enableScenario(name);
    toast.success(`${name} enabled`);
    await fetchScenarios();
  });

  const handleDisableScenario = (name: string) => withBusy(`dis-${name}`, async () => {
    await failureSimulatorApi.disableScenario(name);
    toast.success(`${name} disabled`);
    await fetchScenarios();
  });

  const handleResetAll = () => withBusy('reset', async () => {
    const ok = window.confirm('Disable all active scenarios? This cannot be undone.');
    if (!ok) return;
    await failureSimulatorApi.resetAll();
    toast.success('All scenarios reset');
    await fetchScenarios();
  });

  // ── Derived values ─────────────────────────────────────────────────────────
  const isPaused         = injState?.injector_state === 'paused';
  const isActive         = injState?.injector_state === 'active';
  const isIdle           = injState?.injector_state === 'idle';
  const trafficRunning   = injState?.traffic_enabled ?? true;
  const isPausedByHeal   = injState?.is_paused_by_heal ?? false;

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    color: '#e6edf3',
    fontFamily: 'var(--font-body)',
    fontSize: '0.65rem',
    padding: '6px 12px',
    outline: 'none',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      paddingTop: 88,
      paddingBottom: 60,
      fontFamily: 'var(--font-body)',
    }}>
      <style>{`
        @keyframes injPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.3; transform: scale(0.65); }
        }
      `}</style>

      {/* Background glow */}
      <div style={{
        position: 'fixed', top: -200, left: -200, width: 600, height: 600,
        borderRadius: '50%', background: 'rgba(240,136,62,0.06)',
        filter: 'blur(180px)', pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 var(--space-lg)', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => navigate('/developer')}
            style={{ ...inputStyle, marginTop: 6, cursor: 'none', whiteSpace: 'nowrap' }}
          >
            ← Back
          </button>
          <div>
            <p style={{ fontSize: '0.65rem', color: '#f0883e', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
              Developer Tools
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', color: '#e6edf3', lineHeight: 1 }}>
              🎛️ Injector Control
            </h1>
            <p style={{ marginTop: 8, color: '#8b949e', fontSize: '0.78rem', fontStyle: 'italic' }}>
              Manage traffic generation and failure injection — controls what Niramay detects
            </p>
          </div>
        </div>

        {/* ── STATUS PANEL ── */}
        <div style={{ ...card, borderColor: 'rgba(240,136,62,0.2)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#f0883e', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
            Live Status
          </p>

          {stateLoading ? (
            <div style={{ display: 'flex', gap: 10 }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 36, borderRadius: 20, width: 120 }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Injector state */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.55rem', color: '#6e7681', letterSpacing: 2, textTransform: 'uppercase' }}>Injector State</span>
                <StateBadge state={injState?.injector_state ?? 'unknown'} />
              </div>

              {/* Traffic */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.55rem', color: '#6e7681', letterSpacing: 2, textTransform: 'uppercase' }}>Traffic Generator</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: trafficRunning ? 'rgba(34,197,94,0.12)' : 'rgba(248,81,73,0.12)',
                  color: trafficRunning ? '#22c55e' : '#f85149',
                  border: `1px solid ${trafficRunning ? 'rgba(34,197,94,0.3)' : 'rgba(248,81,73,0.3)'}`,
                  borderRadius: 20, padding: '4px 12px',
                  fontFamily: 'var(--font-body)', fontSize: '0.65rem', letterSpacing: 2,
                }}>
                  {trafficRunning ? '▶ RUNNING' : '■ STOPPED'}
                </span>
              </div>

              {/* Current scenario */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.55rem', color: '#6e7681', letterSpacing: 2, textTransform: 'uppercase' }}>Current Scenario</span>
                {injState?.current_scenario ? (
                  <span style={{ background: 'rgba(240,136,62,0.15)', color: '#f0883e', border: '1px solid rgba(240,136,62,0.3)', borderRadius: 20, padding: '4px 12px', fontFamily: 'var(--font-body)', fontSize: '0.65rem', letterSpacing: 1 }}>
                    🔥 {injState.current_scenario}
                  </span>
                ) : (
                  <span style={{ color: '#484f58', fontFamily: 'var(--font-body)', fontSize: '0.65rem', padding: '4px 0' }}>None</span>
                )}
              </div>

              {/* Heal pause indicator */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.55rem', color: '#6e7681', letterSpacing: 2, textTransform: 'uppercase' }}>Heal Pause</span>
                {isPausedByHeal ? (
                  <span style={{ background: 'rgba(255,200,69,0.12)', color: '#ffc845', border: '1px solid rgba(255,200,69,0.3)', borderRadius: 20, padding: '4px 12px', fontFamily: 'var(--font-body)', fontSize: '0.65rem', letterSpacing: 1 }}>
                    🔒 ACTIVE
                  </span>
                ) : (
                  <span style={{ color: '#484f58', fontFamily: 'var(--font-body)', fontSize: '0.65rem', padding: '4px 0' }}>Not active</span>
                )}
              </div>
            </div>
          )}

          {/* Heal pause warning box */}
          {isPausedByHeal && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: 18, padding: '14px 18px',
                background: 'rgba(255,200,69,0.08)',
                border: '1px solid rgba(255,200,69,0.3)',
                borderRadius: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              }}
            >
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#ffc845', fontWeight: 600, marginBottom: 4 }}>
                  🔒 PAUSED BY HEALING SYSTEM
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: '#8b949e', lineHeight: 1.6 }}>
                  The healing system paused injection. Clear the pause then manually restart.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => void handleClearPause()}
                disabled={busy === 'clear-pause'}
                style={{
                  ...btnBase,
                  padding: '8px 18px',
                  background: 'rgba(255,200,69,0.15)',
                  color: '#ffc845',
                  border: '1px solid rgba(255,200,69,0.35)',
                  opacity: busy === 'clear-pause' ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                {busy === 'clear-pause' ? '⏳ Clearing…' : '✕ Clear Pause'}
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* ── TRAFFIC GENERATOR ── */}
        <div style={card}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#22c55e', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
            Traffic Generator
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#8b949e', lineHeight: 1.7, marginBottom: 16 }}>
            Controls whether the injector makes HTTP requests to CRAVE every 2 seconds. When stopped no new logs are produced and the Observation Logs page will show frozen data.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              whileHover={{ scale: trafficRunning ? 1 : 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => void handleStartTraffic()}
              disabled={trafficRunning || busy === 'traffic-start'}
              style={{
                ...btnBase,
                flex: trafficRunning ? 0 : 1,
                padding: '11px 20px',
                background: trafficRunning ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.15)',
                color: trafficRunning ? '#484f58' : '#22c55e',
                border: `1px solid ${trafficRunning ? 'rgba(255,255,255,0.05)' : 'rgba(34,197,94,0.3)'}`,
                opacity: (trafficRunning || busy === 'traffic-start') ? 0.5 : 1,
              }}
            >
              {busy === 'traffic-start' ? '⏳ Starting…' : '▶ Start Traffic'}
            </motion.button>
            <motion.button
              whileHover={{ scale: !trafficRunning ? 1 : 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => void handleStopTraffic()}
              disabled={!trafficRunning || busy === 'traffic-stop'}
              style={{
                ...btnBase,
                flex: !trafficRunning ? 0 : 1,
                padding: '11px 20px',
                background: !trafficRunning ? 'rgba(248,81,73,0.06)' : 'rgba(248,81,73,0.12)',
                color: !trafficRunning ? '#484f58' : '#f85149',
                border: `1px solid ${!trafficRunning ? 'rgba(255,255,255,0.05)' : 'rgba(248,81,73,0.3)'}`,
                opacity: (!trafficRunning || busy === 'traffic-stop') ? 0.5 : 1,
              }}
            >
              {busy === 'traffic-stop' ? '⏳ Stopping…' : '■ Stop Traffic'}
            </motion.button>
          </div>

          {!trafficRunning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                marginTop: 14, padding: '10px 16px',
                background: 'rgba(248,81,73,0.07)',
                border: '1px solid rgba(248,81,73,0.2)',
                borderRadius: 8,
              }}
            >
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: '#f87171', lineHeight: 1.6 }}>
                ⚠️ Traffic generator is stopped. No new logs are being produced. The Observation Logs page shows frozen data.
              </p>
            </motion.div>
          )}
        </div>

        {/* ── AUTO INJECTOR ── */}
        <div style={card}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#f0883e', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
            Auto Injector
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#8b949e', lineHeight: 1.7, marginBottom: 16 }}>
            When active, automatically cycles through healable failure scenarios. Each scenario runs for 60 seconds then waits 120 seconds before the next. This drives the self-healing pipeline.
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <motion.button
              whileHover={{ scale: (isActive || isPaused) ? 1 : 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => void handleStartInjection()}
              disabled={isActive || isPaused || busy === 'inj-start'}
              style={{
                ...btnBase,
                flex: 1,
                padding: '11px 20px',
                background: (isActive || isPaused) ? 'rgba(255,69,0,0.05)' : 'rgba(255,69,0,0.15)',
                color: (isActive || isPaused) ? '#484f58' : '#ff4500',
                border: `1px solid ${(isActive || isPaused) ? 'rgba(255,255,255,0.05)' : 'rgba(255,69,0,0.35)'}`,
                opacity: (isActive || isPaused || busy === 'inj-start') ? 0.5 : 1,
              }}
            >
              {busy === 'inj-start' ? '⏳ Starting…' : '▶ Start Injection'}
            </motion.button>
            <motion.button
              whileHover={{ scale: isIdle ? 1 : 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => void handleStopInjection()}
              disabled={isIdle || busy === 'inj-stop'}
              style={{
                ...btnBase,
                flex: 1,
                padding: '11px 20px',
                background: isIdle ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
                color: isIdle ? '#484f58' : '#8b949e',
                border: `1px solid ${isIdle ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)'}`,
                opacity: (isIdle || busy === 'inj-stop') ? 0.5 : 1,
              }}
            >
              {busy === 'inj-stop' ? '⏳ Stopping…' : '■ Stop Injection'}
            </motion.button>
          </div>

          {/* Cycle info box */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 8,
            marginBottom: isPaused ? 14 : 0,
          }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.55rem', color: '#6e7681', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
              Injection Cycle
            </p>
            {AUTO_SCENARIOS.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < AUTO_SCENARIOS.length - 1 ? 6 : 0 }}>
                <span style={{ color: '#484f58', fontSize: '0.65rem', fontFamily: 'monospace' }}>→</span>
                <span style={{
                  fontFamily: 'monospace', fontSize: '0.65rem',
                  color: injState?.current_scenario === s ? '#f0883e' : '#c9d1d9',
                  background: injState?.current_scenario === s ? 'rgba(240,136,62,0.1)' : 'transparent',
                  padding: injState?.current_scenario === s ? '1px 6px' : '1px 0',
                  borderRadius: 4,
                }}>{s}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.58rem', color: '#6e7681' }}>60s active · 120s gap</span>
                {injState?.current_scenario === s && (
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.55rem', color: '#f0883e', letterSpacing: 1 }}>← CURRENT</span>
                )}
              </div>
            ))}
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.55rem', color: '#484f58', marginTop: 8, letterSpacing: 1 }}>
              repeats from beginning
            </p>
          </div>

          {isPaused && (
            <div style={{
              padding: '10px 16px',
              background: 'rgba(255,200,69,0.07)',
              border: '1px solid rgba(255,200,69,0.2)',
              borderRadius: 8,
            }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: '#ffc845', lineHeight: 1.6 }}>
                🔒 Injector paused by healing system. Clear the pause above before restarting.
              </p>
            </div>
          )}
        </div>

        {/* ── MANUAL SCENARIO CONTROL ── */}
        <div style={card}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#a78bfa', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
            Manual Scenario Control
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#8b949e', lineHeight: 1.7, marginBottom: 20 }}>
            Directly enable or disable individual failure scenarios. Use this for targeted testing without the auto-injector cycle.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {Object.values(scenarios).map(s => {
              const isAuto = AUTO_SCENARIOS.includes(s.name);
              return (
                <div key={s.name} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${s.enabled ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                }}>
                  {/* Name + auto badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '0.9rem', color: '#f0883e', letterSpacing: 1 }}>{s.name}</p>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: '0.55rem', letterSpacing: 1,
                      background: s.enabled ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                      color: s.enabled ? '#22c55e' : '#6e7681',
                      border: `1px solid ${s.enabled ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
                      padding: '2px 8px', borderRadius: 12,
                    }}>
                      {s.enabled ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  {isAuto && (
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.58rem', color: '#6e7681', marginBottom: 6, letterSpacing: 0.5 }}>
                      Used by auto-injector
                    </p>
                  )}
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#8b949e', marginBottom: 12 }}>
                    {s.failure_type} · {Math.round(s.probability * 100)}%
                  </p>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <motion.button
                      whileHover={{ scale: s.enabled ? 1 : 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => void handleEnableScenario(s.name)}
                      disabled={s.enabled || busy === `en-${s.name}`}
                      style={{
                        ...btnBase,
                        flex: 1, padding: '6px 0', fontSize: '0.6rem',
                        background: s.enabled ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.12)',
                        color: s.enabled ? '#484f58' : '#22c55e',
                        border: `1px solid ${s.enabled ? 'rgba(255,255,255,0.04)' : 'rgba(34,197,94,0.25)'}`,
                        opacity: (s.enabled || busy === `en-${s.name}`) ? 0.5 : 1,
                      }}
                    >
                      {busy === `en-${s.name}` ? '...' : 'Enable'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: !s.enabled ? 1 : 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => void handleDisableScenario(s.name)}
                      disabled={!s.enabled || busy === `dis-${s.name}`}
                      style={{
                        ...btnBase,
                        flex: 1, padding: '6px 0', fontSize: '0.6rem',
                        background: !s.enabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
                        color: !s.enabled ? '#484f58' : '#8b949e',
                        border: `1px solid ${!s.enabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)'}`,
                        opacity: (!s.enabled || busy === `dis-${s.name}`) ? 0.5 : 1,
                      }}
                    >
                      {busy === `dis-${s.name}` ? '...' : 'Disable'}
                    </motion.button>
                  </div>
                </div>
              );
            })}
          </div>

          {Object.keys(scenarios).length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#6e7681', fontFamily: 'var(--font-body)', fontSize: '0.75rem' }}>
              Loading scenarios…
            </div>
          )}
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div style={{ ...card, marginBottom: 0 }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#8b949e', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
            Quick Actions
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => void handleResetAll()}
              disabled={busy === 'reset'}
              style={{
                ...btnBase,
                padding: '10px 20px',
                background: 'transparent',
                color: '#f85149',
                border: '1px solid rgba(248,81,73,0.35)',
                opacity: busy === 'reset' ? 0.5 : 1,
              }}
            >
              {busy === 'reset' ? '⏳ Resetting…' : '↺ Reset All Scenarios'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/developer/observation-logs')}
              style={{ ...btnBase, padding: '10px 20px', background: 'transparent', color: '#58a6ff', border: '1px solid rgba(88,166,255,0.35)' }}
            >
              📡 View Logs
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/developer/failure-simulator')}
              style={{ ...btnBase, padding: '10px 20px', background: 'transparent', color: '#f0883e', border: '1px solid rgba(240,136,62,0.35)' }}
            >
              💥 Failure Simulator
            </motion.button>
          </div>
        </div>

      </div>
    </div>
  );
}
