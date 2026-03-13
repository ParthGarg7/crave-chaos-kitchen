import { useState, useEffect, useCallback, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApiCall {
  id: string;
  method: string;
  path: string;
  full_url: string;
  status: 'active' | 'completed';
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  status_code?: number;
  client_ip?: string;
}

interface Endpoint {
  path: string;
  methods: string[];
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const METHOD_COLORS: Record<string, string> = {
  GET: '#3fb950', POST: '#58a6ff', PUT: '#d29922',
  PATCH: '#a78bfa', DELETE: '#f85149', HEAD: '#8b949e', OPTIONS: '#8b949e',
};

const getMethodColor = (m: string) => METHOD_COLORS[m.toUpperCase()] ?? '#8b949e';

const getStatusColor = (code?: number) => {
  if (!code) return '#8b949e';
  if (code < 300) return '#3fb950';
  if (code < 400) return '#d29922';
  return '#f85149';
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span style={{
      background: `${getMethodColor(method)}22`,
      color: getMethodColor(method),
      border: `1px solid ${getMethodColor(method)}55`,
      borderRadius: 4, padding: '2px 8px',
      fontSize: '0.62rem', fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace',
    }}>
      {method}
    </span>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{
        fontFamily: 'var(--font-body)', fontSize: '0.7rem',
        letterSpacing: 3, textTransform: 'uppercase',
        color: '#58a6ff', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChaosEngineer() {
  const navigate = useNavigate();
  const [activeCalls, setActiveCalls] = useState<ApiCall[]>([]);
  const [recentCalls, setRecentCalls] = useState<ApiCall[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [pathFilter, setPathFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch endpoint registry once
  useEffect(() => {
    api.get('/developer/endpoints')
      .then(r => setEndpoints(r.data.endpoints ?? []))
      .catch(() => setError('Failed to load endpoints. Are you logged in as admin?'));
  }, []);

  // Poll active/recent calls every 2s
  const pollCalls = useCallback(() => {
    api.get('/developer/active-calls')
      .then(r => {
        setActiveCalls(r.data.active ?? []);
        setRecentCalls(r.data.recent ?? []);
        setLoading(false);
        setError('');
      })
      .catch(err => {
        setLoading(false);
        if (err.response?.status === 403) {
          setError('Access denied. Admin role required.');
        }
      });
  }, []);

  useEffect(() => {
    pollCalls();
    const interval = setInterval(pollCalls, 2000);
    return () => clearInterval(interval);
  }, [pollCalls]);

  const filteredEndpoints = endpoints.filter(ep => {
    const matchPath = ep.path.toLowerCase().includes(pathFilter.toLowerCase());
    const matchMethod = methodFilter === 'ALL' || ep.methods.includes(methodFilter);
    return matchPath && matchMethod;
  });

  if (error && loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f85149', fontFamily: 'monospace', fontSize: '0.9rem' }}>
        ⚠ {error}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117',
      color: '#e6edf3', fontFamily: 'monospace',
      paddingTop: 88, paddingBottom: 60,
    }}>
      {/* Fixed background glow */}
      <div style={{ position: 'fixed', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: 'rgba(240,136,62,0.06)', filter: 'blur(180px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-lg)', position: 'relative', zIndex: 1 }}>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div>
            <p style={{ fontSize: '0.62rem', color: '#f0883e', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Developer Tools</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', color: '#e6edf3', lineHeight: 1 }}>
              ⚡ Chaos Engineer
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.3)',
              borderRadius: 20, padding: '6px 14px',
              fontSize: '0.62rem', color: '#3fb950', letterSpacing: 1,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3fb950', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
              LIVE — refreshing every 2s
            </span>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/developer')}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', cursor: 'none', color: '#8b949e', fontSize: '0.68rem', letterSpacing: 1 }}
            >
              ← Dashboard
            </motion.button>
          </div>
        </div>

        {/* SECTION 1: Active calls */}
        <Section title={`🔴 Active Calls (${activeCalls.length} in flight)`}>
          {activeCalls.length === 0 ? (
            <p style={{ color: '#8b949e', fontSize: '0.72rem' }}>No requests in flight right now.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeCalls.map(call => (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderLeft: '4px solid #f0883e',
                    borderRadius: 6, padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    fontSize: '0.75rem',
                  }}
                >
                  <MethodBadge method={call.method} />
                  <span style={{ flex: 1, color: '#e6edf3' }}>{call.full_url}</span>
                  <span style={{ color: '#8b949e', fontSize: '0.62rem' }}>
                    {new Date(call.start_time).toLocaleTimeString()}
                  </span>
                  <span style={{
                    background: 'rgba(240,136,62,0.15)', color: '#f0883e',
                    borderRadius: 12, padding: '2px 10px', fontSize: '0.6rem',
                    animation: 'pulse-dot 1.5s ease-in-out infinite',
                  }}>
                    ● IN FLIGHT
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </Section>

        {/* SECTION 2: Endpoint registry */}
        <Section title={`📋 Registered Endpoints (${endpoints.length} total)`}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input
              type="text" placeholder="Filter by path..."
              value={pathFilter} onChange={e => setPathFilter(e.target.value)}
              style={{
                flex: 1, background: '#161b22', border: '1px solid #30363d',
                color: '#e6edf3', padding: '8px 12px', borderRadius: 6,
                fontSize: '0.72rem', outline: 'none', fontFamily: 'monospace',
              }}
            />
            <select
              value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
              style={{
                background: '#161b22', border: '1px solid #30363d', color: '#e6edf3',
                padding: '8px 12px', borderRadius: 6, fontSize: '0.72rem', cursor: 'none',
                outline: 'none',
              }}
            >
              {['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
            {filteredEndpoints.map((ep, i) => (
              <div key={i} style={{
                background: '#161b22', border: '1px solid #21262d',
                borderRadius: 6, padding: '8px 14px',
                display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.72rem',
              }}>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {ep.methods.map(m => <MethodBadge key={m} method={m} />)}
                </div>
                <span style={{ flex: 1, color: '#e6edf3' }}>{ep.path}</span>
                {ep.name && <span style={{ color: '#8b949e', fontSize: '0.6rem' }}>{ep.name}</span>}
              </div>
            ))}
            {filteredEndpoints.length === 0 && (
              <p style={{ color: '#8b949e', fontSize: '0.72rem', padding: 8 }}>No endpoints match your filter.</p>
            )}
          </div>
        </Section>

        {/* SECTION 3: Recent history */}
        <Section title={`📜 Recent Calls (last ${recentCalls.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 480, overflowY: 'auto' }}>
            {recentCalls.length === 0 ? (
              <p style={{ color: '#8b949e', fontSize: '0.72rem' }}>No completed calls in history yet. Interact with the app to populate this.</p>
            ) : (
              recentCalls.map((call, i) => (
                <div key={i} style={{
                  background: '#161b22', border: '1px solid #21262d',
                  borderLeft: `4px solid ${getStatusColor(call.status_code)}`,
                  borderRadius: 6, padding: '7px 14px',
                  display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.72rem',
                }}>
                  <MethodBadge method={call.method} />
                  <span style={{ flex: 1, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {call.path}
                  </span>
                  <span style={{
                    color: getStatusColor(call.status_code),
                    fontWeight: 700, width: 36, textAlign: 'right',
                  }}>
                    {call.status_code ?? '—'}
                  </span>
                  <span style={{ color: '#8b949e', width: 64, textAlign: 'right' }}>
                    {call.duration_ms != null ? `${call.duration_ms}ms` : '—'}
                  </span>
                  <span style={{ color: '#6e7681', fontSize: '0.6rem', flexShrink: 0 }}>
                    {call.start_time ? new Date(call.start_time).toLocaleTimeString() : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </Section>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
