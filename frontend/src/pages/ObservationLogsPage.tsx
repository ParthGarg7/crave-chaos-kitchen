import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { observationApi, failureSimulatorApi } from '../services/api';
import { FailureSimulatorMetrics } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ObservationLog {
  timestamp: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  request_id: string;
  service_name: string;
  failure_type: string;
  client_ip: string;
  error_message: string | null;
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

function serviceColor(name: string) {
  return SERVICE_COLORS[name] ?? '#e6edf3';
}

function statusColor(code: number) {
  if (code < 300) return '#22c55e';
  if (code < 400) return '#58a6ff';
  if (code < 500) return '#ffc845';
  return '#f85149';
}

function methodBadgeStyle(method: string): React.CSSProperties {
  const colors: Record<string, { bg: string; color: string }> = {
    GET:    { bg: 'rgba(88,166,255,0.15)',  color: '#58a6ff' },
    POST:   { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
    PATCH:  { bg: 'rgba(255,200,69,0.15)',  color: '#ffc845' },
    DELETE: { bg: 'rgba(248,81,73,0.15)',   color: '#f85149' },
  };
  const c = colors[method.toUpperCase()] ?? { bg: 'rgba(255,255,255,0.1)', color: '#e6edf3' };
  return {
    background: c.bg,
    color: c.color,
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.65rem',
    fontFamily: 'var(--font-accent)',
    letterSpacing: 1,
    display: 'inline-block',
  };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  emoji, label, value, valueColor,
}: { emoji: string; label: string; value: string | number; valueColor?: string }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 'var(--radius-sm)',
      padding: '14px 18px',
      minWidth: 120,
      flex: 1,
    }}>
      <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{emoji}</div>
      <div style={{
        fontFamily: 'var(--font-accent)',
        fontSize: '1.5rem',
        color: valueColor ?? '#e6edf3',
        lineHeight: 1,
        marginBottom: 4,
      }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: '#8b949e', letterSpacing: 1 }}>
        {label}
      </div>
    </div>
  );
}

// ─── Pulse dot style ──────────────────────────────────────────────────────────
const pulseDotStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#22c55e',
  marginRight: 6,
  animation: 'livePulse 1.2s ease-in-out infinite',
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ObservationLogsPage() {
  const navigate = useNavigate();

  // ── Metrics (same source as AnalysisPage left panel) ──────────────────────
  const [metrics, setMetrics] = useState<FailureSimulatorMetrics | null>(null);
  const metricsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await failureSimulatorApi.getMetrics();
      setMetrics(res.data as FailureSimulatorMetrics);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => { void fetchMetrics(); }, [fetchMetrics]);

  useEffect(() => {
    metricsIntervalRef.current = setInterval(() => { void fetchMetrics(); }, 3000);
    return () => { if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current); };
  }, [fetchMetrics]);

  // ── Observation Logs ──────────────────────────────────────────────────────
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [failureFilter, setFailureFilter] = useState('all');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await observationApi.getLogs({ limit: 1000 });
      setLogs((res.data as ObservationLog[]) ?? []);
    } catch { /* silently ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => { void fetchLogs(); }, 5000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchLogs]);

  // ─── Derived values ────────────────────────────────────────────────────────
  // Stats from the same metrics source — consistent with AnalysisPage
  const totalReqs      = metrics?.total_requests  ?? 0;
  const failedCount    = metrics?.failed_requests ?? 0;
  const healthyReqs    = totalReqs - failedCount;
  const failureRate    = metrics?.failure_rate    ?? 0;

  // Avg response time + active services still come from log entries
  // (no equivalent data in the simulator metrics object)
  const avgRespTime = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + (l.response_time_ms ?? 0), 0) / logs.length)
    : 0;
  const activeServices = new Set(logs.map(l => l.service_name).filter(Boolean)).size;

  const failureRateColor = failureRate > 10 ? '#f85149' : failureRate > 0 ? '#ffc845' : '#22c55e';

  // ─── Unique values for dropdowns ───────────────────────────────────────────
  const uniqueServices = Array.from(new Set(logs.map(l => l.service_name).filter(Boolean))).sort();
  const uniqueFailureTags = Array.from(new Set(logs.map(l => l.failure_type).filter(t => t && t !== 'none'))).sort();

  // ─── Filtered logs ─────────────────────────────────────────────────────────
  const filtered = logs
    .filter(l => {
      if (search && !l.endpoint?.toLowerCase().includes(search.toLowerCase())) return false;
      if (serviceFilter !== 'all' && l.service_name !== serviceFilter) return false;
      if (statusFilter === 'healthy' && (l.status_code ?? 0) >= 400) return false;
      if (statusFilter === 'failures' && (l.status_code ?? 0) < 400) return false;
      if (failureFilter !== 'all') {
        if (failureFilter === 'none' && l.failure_type !== 'none') return false;
        if (failureFilter !== 'none' && l.failure_type !== failureFilter) return false;
      }
      return true;
    })
    .slice(0, 200);

  const clearFilters = () => {
    setSearch('');
    setServiceFilter('all');
    setStatusFilter('all');
    setFailureFilter('all');
  };

  // ─── Format time ───────────────────────────────────────────────────────────
  const fmtTime = (ts: string | null) => {
    if (!ts) return '--:--:--';
    const d = new Date(ts);
    return d.toTimeString().slice(0, 8);
  };

  // ─── Shared input/select style ─────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    color: '#e6edf3',
    fontFamily: 'var(--font-body)',
    fontSize: '0.72rem',
    padding: '8px 12px',
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
      {/* pulse keyframe injected inline */}
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.7); }
        }
      `}</style>

      {/* Background glow */}
      <div style={{
        position: 'fixed', top: -300, left: -200, width: 700, height: 700,
        borderRadius: '50%', background: 'rgba(88,166,255,0.06)',
        filter: 'blur(200px)', pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-lg)', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => navigate('/developer')}
            style={{
              marginTop: 6,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#8b949e',
              fontSize: '0.72rem',
              cursor: 'none',
              letterSpacing: 1,
              fontFamily: 'var(--font-body)',
            }}
          >
            ← Back
          </button>
          <div>
            <p style={{ fontSize: '0.65rem', color: '#58a6ff', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
              {autoRefresh && <span style={pulseDotStyle} />}
              {autoRefresh ? 'LIVE' : 'PAUSED'}
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', color: '#e6edf3', lineHeight: 1 }}>
              📡 Observation Logs
            </h1>
            <p style={{ marginTop: 8, color: '#8b949e', fontSize: '0.78rem', fontStyle: 'italic' }}>
              Real-time CRAVE traffic — what Niramay receives
            </p>
          </div>
        </div>

        {/* ── SECTION A: Live metrics bar ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard emoji="📊" label="Total Requests" value={totalReqs.toLocaleString()} />
          <StatCard
            emoji="🔥"
            label="Failure Rate %"
            value={`${failureRate.toFixed(1)}%`}
            valueColor={failureRateColor}
          />
          <StatCard emoji="⏱" label="Avg Resp Time" value={`${avgRespTime}ms`} valueColor={avgRespTime > 300 ? '#f85149' : '#22c55e'} />
          <StatCard emoji="✅" label="Healthy Requests" value={healthyReqs.toLocaleString()} valueColor="#22c55e" />
          <StatCard emoji="❌" label="Failed Requests" value={failedCount.toLocaleString()} valueColor={failedCount > 0 ? '#f85149' : '#e6edf3'} />
          <StatCard emoji="🌐" label="Services Active" value={activeServices} />
        </div>

        {/* ── SECTION B: Filter bar ── */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <input
            type="text"
            placeholder="Search endpoint..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, minWidth: 180, flex: 1 }}
          />

          <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} style={inputStyle}>
            <option value="all">All Services</option>
            {uniqueServices.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="all">All Status</option>
            <option value="healthy">Healthy (2xx/3xx)</option>
            <option value="failures">Failures (4xx/5xx)</option>
          </select>

          <select value={failureFilter} onChange={e => setFailureFilter(e.target.value)} style={inputStyle}>
            <option value="all">All Tags</option>
            {uniqueFailureTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <button
            onClick={clearFilters}
            style={{
              ...inputStyle,
              background: 'rgba(255,255,255,0.05)',
              cursor: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Clear Filters
          </button>

          <button
            onClick={() => { void fetchLogs(); }}
            style={{
              ...inputStyle,
              background: 'rgba(88,166,255,0.12)',
              color: '#58a6ff',
              border: '1px solid rgba(88,166,255,0.25)',
              cursor: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            ↺ Refresh
          </button>

          <button
            onClick={() => setAutoRefresh(p => !p)}
            style={{
              ...inputStyle,
              background: autoRefresh ? 'rgba(34,197,94,0.12)' : 'rgba(248,81,73,0.1)',
              color: autoRefresh ? '#22c55e' : '#f85149',
              border: `1px solid ${autoRefresh ? 'rgba(34,197,94,0.25)' : 'rgba(248,81,73,0.2)'}`,
              cursor: 'none',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-accent)',
              letterSpacing: 1,
            }}
          >
            AUTO {autoRefresh ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* ── SECTION C: Log table ── */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px 140px 1fr 80px 60px 90px 1fr',
            gap: 0,
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '10px 16px',
          }}>
            {['Time', 'Service', 'Endpoint', 'Method', 'Status', 'Resp Time', 'Failure'].map(col => (
              <span key={col} style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.6rem',
                color: '#8b949e',
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}>
                {col}
              </span>
            ))}
          </div>

          {/* Table body */}
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {loading ? (
              // Skeleton rows
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton" style={{
                  height: 40,
                  margin: '4px 16px',
                  borderRadius: 6,
                }} />
              ))
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#8b949e' }}>
                {logs.length === 0 ? (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>📡</div>
                    <p style={{ fontSize: '0.85rem', marginBottom: 6 }}>Waiting for traffic...</p>
                    <p style={{ fontSize: '0.72rem', color: '#6e7681' }}>
                      Start using CRAVE or wait for the traffic generator to produce logs.
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
                    <p style={{ fontSize: '0.85rem' }}>No logs match your filters</p>
                  </>
                )}
              </div>
            ) : (
              filtered.map((log, idx) => {
                const hasFailure = log.failure_type && log.failure_type !== 'none';
                const isOdd = idx % 2 === 1;
                return (
                  <div
                    key={`${log.timestamp}-${idx}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 140px 1fr 80px 60px 90px 1fr',
                      gap: 0,
                      padding: '9px 16px',
                      borderLeft: hasFailure ? '3px solid rgba(248,81,73,0.4)' : '3px solid transparent',
                      background: isOdd ? 'rgba(255,255,255,0.015)' : 'transparent',
                      alignItems: 'center',
                      transition: 'background 0.15s',
                      fontSize: '0.72rem',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = isOdd ? 'rgba(255,255,255,0.015)' : 'transparent'}
                  >
                    {/* Time */}
                    <span style={{ color: '#8b949e', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtTime(log.timestamp)}
                    </span>

                    {/* Service */}
                    <span style={{ color: serviceColor(log.service_name), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.service_name || '—'}
                    </span>

                    {/* Endpoint */}
                    <span style={{ color: '#c9d1d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }} title={log.endpoint}>
                      {log.endpoint?.length > 45 ? `${log.endpoint.slice(0, 45)}…` : (log.endpoint || '—')}
                    </span>

                    {/* Method */}
                    <span>
                      <span style={methodBadgeStyle(log.method ?? '')}>{log.method ?? '?'}</span>
                    </span>

                    {/* Status */}
                    <span style={{ color: statusColor(log.status_code ?? 0), fontVariantNumeric: 'tabular-nums' }}>
                      {log.status_code ?? '?'}
                    </span>

                    {/* Resp Time */}
                    <span style={{
                      color: (log.response_time_ms ?? 0) > 300 ? '#f85149' : '#22c55e',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {log.response_time_ms != null ? `${log.response_time_ms}ms` : '—'}
                    </span>

                    {/* Failure tag */}
                    <span>
                      {hasFailure ? (
                        <span style={{
                          background: 'rgba(248,81,73,0.12)',
                          color: '#f85149',
                          border: '1px solid rgba(248,81,73,0.25)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '0.62rem',
                          fontFamily: 'var(--font-body)',
                          whiteSpace: 'nowrap',
                        }}>
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

          {/* Footer count */}
          {!loading && filtered.length > 0 && (
            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid rgba(255,255,255,0.04)',
              fontSize: '0.62rem',
              color: '#6e7681',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Showing {filtered.length} of {logs.length} logs</span>
              <span>{logs.length} entries fetched · max 200 rows displayed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
