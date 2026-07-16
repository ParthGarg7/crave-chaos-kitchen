import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi, formatApiDetail } from '../services/api';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', background: 'var(--bg-elevated)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)',
  color: 'var(--accent-cream)', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
};

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Password reset! Log in with your new password.');
      navigate('/login');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { detail?: unknown } } };
      setError(formatApiDetail(e2?.response?.data?.detail) || 'Invalid or expired link. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔗</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>This reset link is incomplete.</p>
          <Link to="/forgot-password" style={{ color: 'var(--accent-fire)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}>Request a new one</Link>
        </div>
      </section>
    );
  }

  return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px var(--space-lg) var(--space-2xl)' }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="glass"
        style={{ width: '100%', maxWidth: 420, borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 8, textAlign: 'center' }}>NEW PASSWORD</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          Choose a new password for your account.
        </p>
        <form onSubmit={submit}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="New password (min 8 characters)" autoFocus style={{ ...inputStyle, marginBottom: 12 }} />
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Confirm new password" style={{ ...inputStyle, marginBottom: 12 }} />
          {error && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#f85149', marginBottom: 12 }}>⚠️ {error}</p>
          )}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
            style={{ width: '100%', padding: '14px 0', background: 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.8rem', letterSpacing: 2, textTransform: 'uppercase', borderRadius: 'var(--radius-sm)', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </motion.button>
        </form>
      </motion.div>
    </section>
  );
}
