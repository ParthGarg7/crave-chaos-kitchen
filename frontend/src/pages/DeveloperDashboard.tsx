import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

// ─── Dashboard card ───────────────────────────────────────────────────────────
function DevCard({
  icon, title, description, onClick, accentColor,
}: {
  icon: string; title: string; description: string;
  onClick: () => void; accentColor: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${accentColor}33`,
        borderRadius: 'var(--radius-md)',
        padding: 28,
        cursor: 'none',
        transition: 'box-shadow 0.25s',
        boxShadow: `0 0 0 0 ${accentColor}`,
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 32px ${accentColor}22`}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}
    >
      <div style={{ fontSize: '2.6rem', marginBottom: 14 }}>{icon}</div>
      <p style={{
        fontFamily: 'var(--font-accent)', fontSize: '1.15rem',
        color: accentColor, marginBottom: 8, letterSpacing: 1,
      }}>
        {title}
      </p>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '0.75rem',
        color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        {description}
      </p>
    </motion.div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const logout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      paddingTop: 88,
      paddingBottom: 60,
      fontFamily: 'var(--font-body)',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: -300, right: -200, width: 700, height: 700,
        borderRadius: '50%', background: 'rgba(88,166,255,0.08)',
        filter: 'blur(200px)', pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--space-lg)', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: '0.65rem', color: '#58a6ff', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
              Admin · Developer Mode
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '#e6edf3', lineHeight: 1 }}>
              🛠️ Developer Dashboard
            </h1>
            <p style={{ marginTop: 10, color: '#8b949e', fontSize: '0.82rem', fontStyle: 'italic' }}>
              Logged in as {user?.first_name} {user?.last_name} · {user?.email}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={logout}
            style={{
              background: 'rgba(248,81,73,0.15)', color: '#f85149',
              border: '1px solid rgba(248,81,73,0.3)', borderRadius: 8,
              padding: '10px 20px', cursor: 'none',
              fontSize: '0.75rem', letterSpacing: 1,
              fontFamily: 'var(--font-body)',
            }}
          >
            🚪 Logout
          </motion.button>
        </div>

        {/* Card grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          <DevCard
            icon="⚡"
            title="Chaos Engineer"
            description="Monitor live API calls, registered endpoints, and call history in real time."
            onClick={() => navigate('/developer/chaos-engineer')}
            accentColor="#f0883e"
          />
          <DevCard
            icon="💥"
            title="Failure Simulator"
            description="Inject controlled failures into API endpoints to test system resilience."
            onClick={() => navigate('/simulator')}
            accentColor="#f85149"
          />
          <DevCard
            icon="🖥️"
            title="Dual View"
            description="View Customer & Driver interfaces side-by-side for rapid development testing."
            onClick={() => navigate('/developer/dual-view')}
            accentColor="#3fb950"
          />
          <DevCard
            icon="⚙️"
            title="Admin Panel"
            description="Manage users, restaurants, and view system-level data."
            onClick={() => navigate('/admin')}
            accentColor="#a78bfa"
          />
        </div>

        {/* Info banner */}
        <div style={{
          marginTop: 40, padding: '16px 24px',
          background: 'rgba(88,166,255,0.07)',
          border: '1px solid rgba(88,166,255,0.2)',
          borderRadius: 10,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>ℹ️</span>
          <p style={{ fontSize: '0.72rem', color: '#8b949e', lineHeight: 1.8 }}>
            These tools are only accessible to <strong style={{ color: '#58a6ff' }}>admin</strong> users.
            Regular customers and drivers are automatically redirected away from these routes.
            Demo credentials: <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 4 }}>admin@example.com</code> / <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 4 }}>admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
