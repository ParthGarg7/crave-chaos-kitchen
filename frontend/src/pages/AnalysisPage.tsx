import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { failureSimulatorApi, observationApi } from '../services/api';
import MetricsPanel from '../components/failure-simulator/MetricsPanel';
import { FailureSimulatorMetrics } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ObservationLog {
  timestamp: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  service_name: string;
  failure_type: string;
}

// ─── Color helpers ────────────────────────────────────────────────────────────
const SERVICE_COLORS: Record<string, string> = {
  'crave-payments':   '#a78bfa',
  'crave-orders':     '#58a6ff',
  'crave-auth':       '#22d3ee',
  'crave-restaurant': '#f0883e',
  'crave-delivery':   '#22c55e',
  'crave-simulator':  '#ffc845',
  'crave-chaos':      '#f85149',
  'crave-gateway':    '#8b949e',
};

const methodColor: Record<string, { bg: string; fg: string }> = {
  GET:    { bg: 'rgba(88,166,255,0.15)',  fg: '#58a6ff' },
  POST:   { bg: 'rgba(34,197,94,0.15)',   fg: '#22c55e' },
  PATCH:  { bg: 'rgba(255,200,69,0.15)',  fg: '#ffc845' },
  DELETE: { bg: 'rgba(248,81,73,0.15)',   fg: '#f85149' },
};

// ─── Pulse dot style ──────────────────────────────────────────────────────────
const pulseDotStyle: React.CSSProperties = {
  display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
  background: '#22c55e', marginRight: 5,
  animation: 'analysisPulse 1.2s ease-in-out infinite',
};

// ─── Stat chip (left panel quick stats) ──────────────────────────────────────
function StatChip({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="glass" style={{
      borderRadius: 'var(--radius-sm)', padding: '10px 16px',
      border: '1px solid rgba(255,255,255,0.05)', flex: '1 1 120px',
    }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.7rem', color: accent ?? 'var(--accent-cream)', lineHeight: 1 }}>{value}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnalysisPage() {
  const navigate = useNavigate();

  // ── Left panel: Failure Simulator Metrics ──────────────────────────────────
  const [metrics, setMetrics] = useState<FailureSimulatorMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsAutoRefresh, setMetricsAutoRefresh] = useState(true);
  const metricsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await failureSimulatorApi.getMetrics();
      setMetrics(res.data as FailureSimulatorMetrics);
    } catch { /* silently ignore */ }
    finally { setMetricsLoading(false); }
  }, []);

  useEffect(() => { void fetchMetrics(); }, [fetchMetrics]);

  useEffect(() => {
    if (metricsAutoRefresh) {
      metricsIntervalRef.current = setInterval(() => { void fetchMetrics(); }, 3000);
    }
    return () => { if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current); };
  }, [metricsAutoRefresh, fetchMetrics]);

  // ── Right panel: Observation Logs ─────────────────────────────────────────
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsAutoRefresh, setLogsAutoRefresh] = useState(true);
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [serviceFilter, setServiceFilter] = useState('all');
  const logsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await observationApi.getLogs({ limit: 1000 });
      setLogs((res.data as ObservationLog[]) ?? []);
    } catch { /* silently ignore */ }
    finally { setLogsLoading(false); }
  }, []);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (logsAutoRefresh) {
      logsIntervalRef.current = setInterval(() => { void fetchLogs(); }, 5000);
    }
    return () => { if (logsIntervalRef.current) clearInterval(logsIntervalRef.current); };
  }, [logsAutoRefresh, fetchLogs]);

  // Stats are derived from the SAME metrics object as the left panel so both
  // panels always show consistent numbers from one source of truth.
  const totalRequests  = metrics?.total_requests  ?? 0;
  const failedRequests = metrics?.failed_requests ?? 0;
  const healthyRequests = totalRequests - failedRequests;
  const failureRate    = metrics?.failure_rate    ?? 0;

  // Dropdowns list all services seen in the log entries
  const uniqueServices = Array.from(new Set(logs.map(l => l.service_name).filter(Boolean))).sort();

  const filteredLogs = logs.filter(l => {
    if (failuresOnly && (!l.failure_type || l.failure_type === 'none')) return false;
    if (serviceFilter !== 'all' && l.service_name !== serviceFilter) return false;
    return true;
  }).slice(0, 200);

  const fmtTime = (ts: string | null) => {
    if (!ts) return '--:--:--';
    return new Date(ts).toTimeString().slice(0, 8);
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    color: '#e6edf3',
    fontFamily: 'var(--font-body)',
    fontSize: '0.65rem',
    padding: '5px 10px',
    outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#0d1117',
      paddingTop: 64,
    }}>
      <style>{`
        @keyframes analysisPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.3; transform: scale(0.7); }
        }
      `}</style>

      {/* ── Page header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#161b22', borderBottom: '1px solid #30363d',
        padding: '8px 20px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: '#8b949e', letterSpacing: 2, textTransform: 'uppercase' }}>
            🔬 Analysis View
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#6e7681' }}>
            Failure Metrics ↔ Live Traffic
          </span>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/developer')}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #30363d', borderRadius: 6, padding: '6px 14px', cursor: 'none', color: '#8b949e', fontSize: '0.65rem', letterSpacing: 1, fontFamily: 'var(--font-body)' }}
        >
          ← Dashboard
        </motion.button>
      </div>

      {/* ── Split panels ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ════ LEFT: Failure Simulator Metrics ════ */}
        <div style={{ width: '50%', borderRight: '2px solid #30363d', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Left panel header */}
          <div style={{
            padding: '8px 16px', background: '#161b22', borderBottom: '1px solid #30363d',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1rem' }}>⚡</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: '#f0883e', letterSpacing: 2, textTransform: 'uppercase' }}>
                Failure Simulator Metrics
              </span>
              {metricsAutoRefresh && <span style={pulseDotStyle} />}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => { void fetchMetrics(); }}
                style={{ ...inputStyle, padding: '3px 10px', cursor: 'none' }}
              >
                ↺ Refresh
              </button>
              <button
                onClick={() => setMetricsAutoRefresh(p => !p)}
                style={{ ...inputStyle, padding: '3px 10px', cursor: 'none', background: metricsAutoRefresh ? 'rgba(34,197,94,0.1)' : 'rgba(248,81,73,0.08)', color: metricsAutoRefresh ? '#22c55e' : '#f85149', border: `1px solid ${metricsAutoRefresh ? 'rgba(34,197,94,0.25)' : 'rgba(248,81,73,0.2)'}` }}
              >
                {metricsAutoRefresh ? 'AUTO ON' : 'AUTO OFF'}
              </button>
            </div>
          </div>

          {/* Quick stat chips */}
          {metrics && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', flexShrink: 0, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <StatChip label="Total Requests" value={metrics.total_requests.toLocaleString()} />
              <StatChip label="Success Rate"   value={`${metrics.success_rate.toFixed(1)}%`}  accent="#22c55e" />
              <StatChip label="Failure Rate"   value={`${metrics.failure_rate.toFixed(1)}%`}  accent={metrics.failure_rate > 10 ? '#f85149' : metrics.failure_rate > 0 ? '#ffc845' : '#22c55e'} />
              <StatChip label="Active Scenarios" value={`${metrics.active_scenarios}/${metrics.total_scenarios}`} accent={metrics.active_scenarios > 0 ? 'var(--accent-fire)' : undefined} />
            </div>
          )}

          {/* MetricsPanel scroll area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            {metricsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />)}
              </div>
            ) : (
              <MetricsPanel metrics={metrics} />
            )}
          </div>
        </div>

        {/* ════ RIGHT: Observation Logs ════ */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Right panel header */}
          <div style={{
            padding: '8px 16px', background: '#161b22', borderBottom: '1px solid #30363d',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1rem' }}>📡</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: '#58a6ff', letterSpacing: 2, textTransform: 'uppercase' }}>
                Observation Logs
              </span>
              {logsAutoRefresh && <span style={{ ...pulseDotStyle, background: '#58a6ff' }} />}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => { void fetchLogs(); }}
                style={{ ...inputStyle, padding: '3px 10px', cursor: 'none' }}
              >
                ↺ Refresh
              </button>
              <button
                onClick={() => setLogsAutoRefresh(p => !p)}
                style={{ ...inputStyle, padding: '3px 10px', cursor: 'none', background: logsAutoRefresh ? 'rgba(34,197,94,0.1)' : 'rgba(248,81,73,0.08)', color: logsAutoRefresh ? '#22c55e' : '#f85149', border: `1px solid ${logsAutoRefresh ? 'rgba(34,197,94,0.25)' : 'rgba(248,81,73,0.2)'}` }}
              >
                {logsAutoRefresh ? 'AUTO ON' : 'AUTO OFF'}
              </button>
            </div>
          </div>

          {/* Quick stats + filters */}
          <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            {/* Mini stats — same source as left panel (failureSimulatorApi.getMetrics) */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Total',     value: totalRequests.toLocaleString(),          color: '#e6edf3' },
                { label: 'Failures',  value: failedRequests.toLocaleString(),         color: failedRequests > 0 ? '#f85149' : '#22c55e' },
                { label: 'Healthy',   value: healthyRequests.toLocaleString(),        color: '#22c55e' },
                { label: 'Failure %', value: `${failureRate.toFixed(1)}%`,            color: failureRate > 10 ? '#f85149' : failureRate > 0 ? '#ffc845' : '#22c55e' },
                { label: 'Services',  value: uniqueServices.length,                   color: '#58a6ff' },
              ].map(s => (
                <span key={s.label} style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#8b949e' }}>
                  {s.label}: <span style={{ color: s.color, fontFamily: 'var(--font-accent)', fontSize: '0.85rem' }}>{s.value}</span>
                </span>
              ))}
            </div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} style={inputStyle}>
                <option value="all">All Services</option>
                {uniqueServices.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={() => setFailuresOnly(p => !p)}
                style={{ ...inputStyle, cursor: 'none', background: failuresOnly ? 'rgba(248,81,73,0.12)' : 'rgba(255,255,255,0.04)', color: failuresOnly ? '#f85149' : '#8b949e', border: `1px solid ${failuresOnly ? 'rgba(248,81,73,0.3)' : 'rgba(255,255,255,0.08)'}` }}
              >
                {failuresOnly ? '🔥 Failures only' : 'All logs'}
              </button>
            </div>
          </div>

          {/* Log table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '68px 120px 1fr 50px 55px 75px',
              padding: '6px 12px', background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0,
            }}>
              {['Time', 'Service', 'Endpoint', 'Mth', 'Status', 'Failure'].map(h => (
                <span key={h} style={{ fontFamily: 'var(--font-body)', fontSize: '0.55rem', color: '#8b949e', letterSpacing: 2, textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>

            {logsLoading ? (
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 32, borderRadius: 6 }} />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8b949e', fontFamily: 'var(--font-body)', fontSize: '0.75rem' }}>
                {logs.length === 0 ? (
                  <>
                    <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>📡</div>
                    <p>Waiting for traffic...</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>🔍</div>
                    <p>No logs match filters</p>
                  </>
                )}
              </div>
            ) : (
              filteredLogs.map((log, idx) => {
                const hasFailure = log.failure_type && log.failure_type !== 'none';
                const mc = methodColor[log.method?.toUpperCase() ?? ''] ?? { bg: 'rgba(255,255,255,0.08)', fg: '#e6edf3' };
                const statusC = (log.status_code ?? 0) < 300 ? '#22c55e' : (log.status_code ?? 0) < 400 ? '#58a6ff' : (log.status_code ?? 0) < 500 ? '#ffc845' : '#f85149';
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'grid', gridTemplateColumns: '68px 120px 1fr 50px 55px 75px',
                      padding: '5px 12px', fontSize: '0.62rem', alignItems: 'center',
                      background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                      borderLeft: hasFailure ? '2px solid rgba(248,81,73,0.45)' : '2px solid transparent',
                    }}
                  >
                    <span style={{ color: '#8b949e', fontVariantNumeric: 'tabular-nums', fontSize: '0.58rem' }}>{fmtTime(log.timestamp)}</span>
                    <span style={{ color: SERVICE_COLORS[log.service_name] ?? '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.58rem' }}>{log.service_name || '—'}</span>
                    <span style={{ color: '#c9d1d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6, fontSize: '0.58rem' }} title={log.endpoint}>
                      {log.endpoint?.length > 30 ? `${log.endpoint.slice(0, 30)}…` : (log.endpoint || '—')}
                    </span>
                    <span>
                      <span style={{ background: mc.bg, color: mc.fg, padding: '1px 5px', borderRadius: 3, fontSize: '0.55rem', fontFamily: 'var(--font-accent)', letterSpacing: 0.5 }}>
                        {log.method ?? '?'}
                      </span>
                    </span>
                    <span style={{ color: statusC, fontVariantNumeric: 'tabular-nums' }}>{log.status_code ?? '?'}</span>
                    <span>
                      {hasFailure ? (
                        <span style={{ background: 'rgba(248,81,73,0.12)', color: '#f85149', padding: '1px 6px', borderRadius: 4, fontSize: '0.55rem', whiteSpace: 'nowrap' }}>
                          {log.failure_type}
                        </span>
                      ) : (
                        <span style={{ color: '#484f58' }}>—</span>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {!logsLoading && filteredLogs.length > 0 && (
            <div style={{ padding: '5px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.58rem', color: '#6e7681' }}>
                Showing {filteredLogs.length} of {logs.length} logs
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.58rem', color: '#6e7681' }}>
                {logs.length} entries fetched · max 200 shown
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
