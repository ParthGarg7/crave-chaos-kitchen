import { useState, useEffect, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api, { chaosApi } from '../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Experiment {
  id: string;
  name: string;
  description: string;
  category: string;
  category_label: string;
  failure_type: string;
  enabled: boolean;
  delay_seconds?: number;
  injected_status?: number;
  cascade_experiments?: string[];
}

interface ImpactEntry {
  id: string;
  experiment_id: string;
  method: string;
  endpoint: string;
  failure_type: string;
  injected_status: number | null;
  detail: string;
  timestamp: string;
}

interface ApiCall {
  id: string;
  method: string;
  path: string;
  full_url: string;
  status: 'active' | 'completed';
  start_time: string;
  duration_ms?: number;
  status_code?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const CATEGORY_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];
const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  A: { icon: '🚫', color: '#f85149' },
  B: { icon: '⏱️', color: '#d29922' },
  C: { icon: '⚡', color: '#f0883e' },
  D: { icon: '🔀', color: '#a78bfa' },
  E: { icon: '🔥', color: '#ff6b6b' },
  F: { icon: '🌊', color: '#58a6ff' },
};

const METHOD_COLORS: Record<string, string> = {
  GET: '#3fb950', POST: '#58a6ff', PUT: '#d29922',
  PATCH: '#a78bfa', DELETE: '#f85149',
};
const getMethodColor = (m: string) => METHOD_COLORS[m?.toUpperCase()] ?? '#8b949e';

const getStatusColor = (code?: number | null) => {
  if (!code) return '#8b949e';
  if (code < 300) return '#3fb950';
  if (code < 400) return '#d29922';
  return '#f85149';
};

const HEALTH_CONFIG = {
  Healthy: { color: '#3fb950', bg: 'rgba(63,185,80,0.12)', border: 'rgba(63,185,80,0.3)', dot: '#3fb950' },
  Degraded: { color: '#d29922', bg: 'rgba(210,153,34,0.12)', border: 'rgba(210,153,34,0.3)', dot: '#d29922' },
  Critical: { color: '#f85149', bg: 'rgba(248,81,73,0.12)', border: 'rgba(248,81,73,0.3)', dot: '#f85149' },
};

// ─── Small Components ────────────────────────────────────────────────────────────
function MethodBadge({ method }: { method: string }) {
  return (
    <span style={{
      background: `${getMethodColor(method)}22`, color: getMethodColor(method),
      border: `1px solid ${getMethodColor(method)}55`,
      borderRadius: 4, padding: '2px 7px', fontSize: '0.6rem',
      fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace', flexShrink: 0,
    }}>
      {method}
    </span>
  );
}

function Toggle({ enabled, onToggle, loading }: { enabled: boolean; onToggle: () => void; loading: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      style={{
        position: 'relative', width: 44, height: 24, borderRadius: 12,
        background: enabled ? 'rgba(248,81,73,0.8)' : 'rgba(48,54,61,0.8)',
        border: enabled ? '1px solid rgba(248,81,73,0.5)' : '1px solid rgba(48,54,61,0.8)',
        cursor: loading ? 'default' : 'pointer', flexShrink: 0,
        transition: 'background 200ms, border 200ms',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: enabled ? 23 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: enabled ? '#fff' : '#8b949e',
        transition: 'left 200ms, background 200ms',
        boxShadow: enabled ? '0 0 6px rgba(248,81,73,0.8)' : 'none',
      }} />
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{
        fontFamily: 'monospace', fontSize: '0.68rem',
        letterSpacing: 3, textTransform: 'uppercase',
        color: '#58a6ff', marginBottom: 14,
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Experiment Card ─────────────────────────────────────────────────────────────
function ExperimentCard({
  exp,
  onToggle,
  toggling,
}: {
  exp: Experiment;
  onToggle: (id: string) => void;
  toggling: Set<string>;
}) {
  const meta = CATEGORY_META[exp.category] ?? { icon: '•', color: '#8b949e' };
  const isLoading = toggling.has(exp.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: exp.enabled ? 'rgba(248,81,73,0.05)' : '#161b22',
        border: exp.enabled
          ? `1px solid rgba(248,81,73,0.35)`
          : '1px solid #21262d',
        borderLeft: `4px solid ${exp.enabled ? meta.color : '#30363d'}`,
        borderRadius: 8, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'background 200ms, border 200ms',
      }}
    >
      {/* Active glow dot */}
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: exp.enabled ? meta.color : '#30363d',
        boxShadow: exp.enabled ? `0 0 8px ${meta.color}` : 'none',
        animation: exp.enabled ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
      }} />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: exp.enabled ? '#e6edf3' : '#c9d1d9' }}>
            {exp.name}
          </span>
          {exp.injected_status && (
            <span style={{
              fontSize: '0.58rem', padding: '1px 6px', borderRadius: 4,
              background: `${getStatusColor(exp.injected_status)}22`,
              color: getStatusColor(exp.injected_status),
              border: `1px solid ${getStatusColor(exp.injected_status)}44`,
            }}>
              HTTP {exp.injected_status}
            </span>
          )}
          {exp.delay_seconds && (
            <span style={{
              fontSize: '0.58rem', padding: '1px 6px', borderRadius: 4,
              background: 'rgba(210,153,34,0.15)', color: '#d29922',
              border: '1px solid rgba(210,153,34,0.3)',
            }}>
              +{exp.delay_seconds}s
            </span>
          )}
          {exp.cascade_experiments && (
            <span style={{
              fontSize: '0.58rem', padding: '1px 6px', borderRadius: 4,
              background: 'rgba(88,166,255,0.12)', color: '#58a6ff',
              border: '1px solid rgba(88,166,255,0.25)',
            }}>
              {exp.cascade_experiments.length} sub-experiments
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#6e7681', lineHeight: 1.4 }}>
          {exp.description}
        </div>
      </div>

      {/* Toggle */}
      <Toggle enabled={exp.enabled} onToggle={() => onToggle(exp.id)} loading={isLoading} />
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────────
export default function ChaosEngineer() {
  const navigate = useNavigate();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [healthLabel, setHealthLabel] = useState<'Healthy' | 'Degraded' | 'Critical'>('Healthy');
  const [healthColor, setHealthColor] = useState('green');

  const [impactLog, setImpactLog] = useState<ImpactEntry[]>([]);
  const [activeCalls, setActiveCalls] = useState<ApiCall[]>([]);

  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllImpact, setShowAllImpact] = useState(false);

  // ── Load experiments once ──────────────────────────────────────────────────────
  const loadExperiments = useCallback(async () => {
    try {
      const r = await chaosApi.getExperiments();
      setExperiments(r.data.experiments ?? []);
      setActiveCount(r.data.active_count ?? 0);
      setHealthLabel(r.data.health_label ?? 'Healthy');
      setHealthColor(r.data.health_color ?? 'green');
      setError('');
      setLoading(false);
    } catch (err: unknown) {
      setLoading(false);
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 403) setError('Access denied — Admin role required to access Chaos Engineer.');
      else setError('Failed to connect to chaos API.');
    }
  }, []);

  // ── Poll impact log + active calls every 2s ────────────────────────────────────
  const pollData = useCallback(async () => {
    try {
      const [impactRes, callsRes] = await Promise.all([
        chaosApi.getImpactLog(50),
        api.get('/developer/active-calls'),
      ]);
      setImpactLog(impactRes.data.entries ?? []);
      setActiveCalls(callsRes.data.active ?? []);
    } catch {
      // Silently swallow — loadExperiments shows the error on first load
    }
  }, []);

  useEffect(() => { loadExperiments(); }, [loadExperiments]);

  useEffect(() => {
    pollData();
    const t = setInterval(pollData, 2000);
    return () => clearInterval(t);
  }, [pollData]);

  // ── Toggle a single experiment ─────────────────────────────────────────────────
  const handleToggle = useCallback(async (id: string) => {
    setToggling(prev => new Set(prev).add(id));
    try {
      const r = await chaosApi.toggleExperiment(id);
      setExperiments(prev =>
        prev.map(e => e.id === id ? { ...e, enabled: r.data.enabled }
          // Also flip cascade children if they exist
          : e)
      );
      // Re-fetch to get accurate cascade state
      await loadExperiments();
    } catch {
      // Error toast handled by global interceptor
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [loadExperiments]);

  // ── Emergency reset ────────────────────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      await chaosApi.reset();
      await loadExperiments();
    } catch {
      // handled by interceptor
    } finally {
      setResetting(false);
    }
  }, [loadExperiments]);

  // ── Group experiments by category ─────────────────────────────────────────────
  const byCategory = CATEGORY_ORDER.reduce<Record<string, Experiment[]>>((acc, cat) => {
    acc[cat] = experiments.filter(e => e.category === cat);
    return acc;
  }, {});

  const health = HEALTH_CONFIG[healthLabel] ?? HEALTH_CONFIG['Healthy'];
  const displayedImpact = showAllImpact ? impactLog : impactLog.slice(0, 15);

  if (error && loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <span style={{ color: '#f85149', fontFamily: 'monospace', fontSize: '0.9rem' }}>⚠ {error}</span>
        <button onClick={() => navigate('/login')} style={{ background: '#161b22', border: '1px solid #30363d', color: '#8b949e', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: '0.72rem' }}>
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'monospace', paddingTop: 88, paddingBottom: 60 }}>

      {/* Fixed background glows */}
      <div style={{ position: 'fixed', top: -200, left: -200, width: 700, height: 700, borderRadius: '50%', background: 'rgba(248,81,73,0.04)', filter: 'blur(200px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: -200, right: -200, width: 600, height: 600, borderRadius: '50%', background: 'rgba(88,166,255,0.04)', filter: 'blur(180px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: '0.6rem', color: '#f0883e', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Developer Tools</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', color: '#e6edf3', lineHeight: 1 }}>
              ⚡ Chaos Engineer
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.3)', borderRadius: 20, padding: '6px 14px', fontSize: '0.6rem', color: '#3fb950', letterSpacing: 1 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3fb950', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
              LIVE — 2s refresh
            </span>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/developer')}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: '#8b949e', fontSize: '0.68rem', letterSpacing: 1 }}
            >
              ← Dashboard
            </motion.button>
          </div>
        </div>

        {/* ── Health Banner ── */}
        <motion.div
          layout
          style={{
            background: health.bg,
            border: `1px solid ${health.border}`,
            borderRadius: 12, padding: '18px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 28, flexWrap: 'wrap', gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 12, height: 12, borderRadius: '50%', background: health.dot,
                boxShadow: `0 0 12px ${health.dot}`,
                animation: activeCount > 0 ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
              }} />
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: health.color }}>
                {healthLabel}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#8b949e' }}>
              {activeCount} of 23 experiments active
            </span>
          </div>

          {/* Emergency Reset */}
          <motion.button
            whileHover={activeCount > 0 ? { scale: 1.04 } : {}}
            whileTap={activeCount > 0 ? { scale: 0.96 } : {}}
            onClick={handleReset}
            disabled={resetting || activeCount === 0}
            style={{
              background: activeCount > 0 ? 'rgba(248,81,73,0.15)' : 'rgba(48,54,61,0.5)',
              border: activeCount > 0 ? '1px solid rgba(248,81,73,0.5)' : '1px solid #30363d',
              borderRadius: 8, padding: '10px 20px', cursor: activeCount > 0 ? 'pointer' : 'default',
              color: activeCount > 0 ? '#f85149' : '#8b949e',
              fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1,
              transition: 'all 200ms',
            }}
          >
            {resetting ? '⟳ Resetting...' : '🛑 EMERGENCY RESET ALL'}
          </motion.button>
        </motion.div>

        {/* ── Error banner (non-fatal) ── */}
        {error && (
          <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 24, fontSize: '0.72rem', color: '#f85149' }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Category Sections ── */}
        {CATEGORY_ORDER.map(cat => {
          const exps = byCategory[cat] ?? [];
          if (exps.length === 0) return null;
          const meta = CATEGORY_META[cat];
          const label = exps[0]?.category_label ?? `Category ${cat}`;
          const catActive = exps.filter(e => e.enabled).length;

          return (
            <Section
              key={cat}
              title={`${meta.icon} Category ${cat} — ${label} (${catActive}/${exps.length} active)`}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {exps.map(exp => (
                  <ExperimentCard
                    key={exp.id}
                    exp={exp}
                    onToggle={handleToggle}
                    toggling={toggling}
                  />
                ))}
              </div>
            </Section>
          );
        })}

        {/* ── Impact Log ── */}
        <Section title={`📋 Impact Log (${impactLog.length} entries)`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: showAllImpact ? 'none' : 420, overflow: 'hidden' }}>
            <AnimatePresence initial={false}>
              {displayedImpact.length === 0 ? (
                <p style={{ color: '#8b949e', fontSize: '0.72rem', padding: 8 }}>
                  No requests have been affected by any chaos experiment yet. Activate an experiment then use the app to see entries here.
                </p>
              ) : (
                displayedImpact.map(entry => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      background: '#161b22',
                      border: '1px solid #21262d',
                      borderLeft: `4px solid ${CATEGORY_META[
                        experiments.find(e => e.id === entry.experiment_id)?.category ?? 'A'
                      ]?.color ?? '#8b949e'}`,
                      borderRadius: 6, padding: '8px 14px',
                      display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.7rem', flexWrap: 'wrap',
                    }}
                  >
                    <MethodBadge method={entry.method} />
                    <span style={{ color: '#58a6ff', fontWeight: 600, fontSize: '0.62rem', flexShrink: 0 }}>
                      {entry.experiment_id}
                    </span>
                    <span style={{ flex: 1, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 80 }}>
                      {entry.endpoint}
                    </span>
                    {entry.injected_status && (
                      <span style={{ color: getStatusColor(entry.injected_status), fontWeight: 700, fontSize: '0.7rem', flexShrink: 0 }}>
                        {entry.injected_status}
                      </span>
                    )}
                    <span style={{ color: '#6e7681', fontSize: '0.6rem', flexShrink: 0 }}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
          {impactLog.length > 15 && (
            <button
              onClick={() => setShowAllImpact(prev => !prev)}
              style={{ marginTop: 10, background: 'none', border: '1px solid #30363d', color: '#8b949e', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.68rem' }}
            >
              {showAllImpact ? '▲ Show less' : `▼ Show all ${impactLog.length} entries`}
            </button>
          )}
        </Section>

        {/* ── Active Calls (kept from original) ── */}
        <Section title={`🔴 Active Calls (${activeCalls.length} in flight)`}>
          {activeCalls.length === 0 ? (
            <p style={{ color: '#8b949e', fontSize: '0.72rem' }}>No requests in flight right now.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeCalls.map(call => (
                <div
                  key={call.id}
                  style={{
                    background: '#161b22', border: '1px solid #30363d',
                    borderLeft: '4px solid #f0883e',
                    borderRadius: 6, padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.72rem',
                  }}
                >
                  <MethodBadge method={call.method} />
                  <span style={{ flex: 1, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {call.full_url}
                  </span>
                  <span style={{ color: '#8b949e', fontSize: '0.6rem' }}>
                    {new Date(call.start_time).toLocaleTimeString()}
                  </span>
                  <span style={{
                    background: 'rgba(240,136,62,0.15)', color: '#f0883e',
                    borderRadius: 12, padding: '2px 10px', fontSize: '0.58rem',
                    animation: 'pulse-dot 1.5s ease-in-out infinite',
                  }}>
                    ● IN FLIGHT
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        button:focus { outline: none; }
      `}</style>
    </div>
  );
}
