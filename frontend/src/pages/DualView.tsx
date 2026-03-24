import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { deliveryApi } from '../services/api';
import BrowsePage from './BrowsePage';

// ── Lightweight inline driver delivery list for DualView ─────────────────────
// (We cannot embed full DriverDashboard because it has auth guards that
//  redirect non-driver users away. This panel mimics the "available orders" view.)
function DriverPanel() {
  const [available, setAvailable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [error, setError] = useState('');

  const fetch = async () => {
    try {
      const r = await deliveryApi.getAvailable();
      setAvailable(r.data ?? []);
      setError('');
    } catch {
      setError('Login as driver to see deliveries, or use the full driver dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const t = setInterval(fetch, 4000);
    return () => clearInterval(t);
  }, []);

  const acceptDelivery = async (id: number) => {
    setAccepting(id);
    try {
      await deliveryApi.accept(id);
      await fetch();
    } catch {
      setError('Could not accept — are you logged in as a driver?');
    } finally {
      setAccepting(null);
    }
  };

  if (loading) return (
    <div style={{ padding: 32, color: '#8b949e', fontFamily: 'var(--font-body)', fontSize: '0.75rem' }}>
      Loading available deliveries…
    </div>
  );

  return (
    <div style={{ padding: '20px 16px' }}>
      {error && (
        <div style={{
          marginBottom: 16, padding: '10px 14px',
          background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)',
          borderRadius: 8, fontSize: '0.68rem', color: '#f85149', fontFamily: 'var(--font-body)',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Available', value: available.length, color: '#ffc845' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 16px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--font-accent)', fontSize: '2rem', color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Available orders */}
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#22c55e', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>
        📦 Available Orders
      </p>
      {available.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 16px',
          background: 'var(--bg-elevated)', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🛵</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            No available deliveries right now.
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: '#6e7681', marginTop: 6 }}>
            Place an order as customer → it will appear here
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {available.map((d: any) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'var(--bg-elevated)', borderRadius: 12, padding: '14px 16px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1rem', letterSpacing: 2 }}>
                    #{d.order?.order_number ?? d.order_id}
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--accent-ember)', marginTop: 2 }}>
                    🍽️ {d.order?.restaurant?.name ?? 'Restaurant'}
                  </p>
                </div>
                <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.3rem', color: '#22c55e' }}>
                  ₹{Math.round((d.estimated_distance_km ?? 3) * 12 + 40)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {[
                  { icon: '📍', val: `${d.estimated_distance_km ?? '~3'} km` },
                  { icon: '⏱️', val: `${d.estimated_duration_min ?? 20} min` },
                  { icon: '💰', val: `₹${d.order?.total?.toLocaleString('en-IN') ?? '—'}` },
                ].map(s => (
                  <span key={s.icon} style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.65rem',
                    color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)',
                    padding: '4px 10px', borderRadius: 20,
                  }}>
                    {s.icon} {s.val}
                  </span>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={accepting === d.id}
                onClick={() => acceptDelivery(d.id)}
                style={{
                  width: '100%', padding: '10px 0',
                  background: accepting === d.id ? '#333' : 'var(--accent-fire)',
                  color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '0.68rem', letterSpacing: 2, textTransform: 'uppercase',
                }}
              >
                {accepting === d.id ? '⏳ Accepting…' : '✓ Accept Delivery'}
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}

      <p style={{
        marginTop: 16, textAlign: 'center', fontFamily: 'var(--font-body)',
        fontSize: '0.6rem', color: '#6e7681', letterSpacing: 1,
      }}>
        🔄 Auto-refreshes every 4 seconds
      </p>
    </div>
  );
}

// ── Main DualView ─────────────────────────────────────────────────────────────
export default function DualView() {
  const navigate = useNavigate();

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#0d1117',
      paddingTop: 64,
    }}>
      {/* Tool header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#161b22', borderBottom: '1px solid #30363d',
        padding: '8px 20px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: '#8b949e', letterSpacing: 2, textTransform: 'uppercase' }}>
            🖥️ Dual View — Dev Mode
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ background: 'rgba(88,166,255,0.1)', color: '#58a6ff', border: '1px solid rgba(88,166,255,0.3)', borderRadius: 12, padding: '3px 12px', fontSize: '0.6rem', letterSpacing: 1 }}>
              🛒 Customer View
            </span>
            <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '3px 12px', fontSize: '0.6rem', letterSpacing: 1 }}>
              🛵 Driver View
            </span>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/developer')}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #30363d', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', color: '#8b949e', fontSize: '0.65rem', letterSpacing: 1, fontFamily: 'var(--font-body)' }}
        >
          ← Dashboard
        </motion.button>
      </div>

      {/* Split panels */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Customer panel */}
        <div style={{ width: '55%', borderRight: '2px solid #30363d', overflowY: 'auto' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(88,166,255,0.2)', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.1rem' }}>🛒</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#58a6ff', letterSpacing: 2, textTransform: 'uppercase' }}>Customer View</span>
          </div>
          <BrowsePage onSelect={(id) => navigate(`/menu/${id}`)} />
        </div>

        {/* Driver panel */}
        <div style={{ width: '45%', overflowY: 'auto', background: 'var(--bg-base)' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(34,197,94,0.2)', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.1rem' }}>🛵</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: '#22c55e', letterSpacing: 2, textTransform: 'uppercase' }}>Driver View — Available Orders</span>
          </div>
          <DriverPanel />
        </div>
      </div>
    </div>
  );
}
