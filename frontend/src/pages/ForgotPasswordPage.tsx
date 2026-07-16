import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', background: 'var(--bg-elevated)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)',
  color: 'var(--accent-cream)', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setSent(true);
      setDevLink(res.data?.dev_link ?? '');
    } catch {
      toast.error('Could not reach the server. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px var(--space-lg) var(--space-2xl)' }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="glass"
        style={{ width: '100%', maxWidth: 420, borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 8, textAlign: 'center' }}>FORGOT PASSWORD?</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 'var(--space-lg)', lineHeight: 1.5 }}>
          Enter your account email and we'll send you a reset link.
        </p>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>📬</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--accent-cream)', marginBottom: 16, lineHeight: 1.6 }}>
              If that email is registered, a reset link is on its way. The link is valid for 30 minutes.
            </p>
            {devLink && (
              <a href={devLink} style={{ display: 'inline-block', padding: '10px 20px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-sm)', color: '#22c55e', fontFamily: 'var(--font-body)', fontSize: '0.7rem', letterSpacing: 1, marginBottom: 16 }}>
                🛠 DEV MODE: open reset link
              </a>
            )}
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Link to="/login" style={{ color: 'var(--accent-fire)' }}>Back to login</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" autoFocus style={{ ...inputStyle, marginBottom: 16 }}
            />
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading || !email.includes('@')}
              style={{ width: '100%', padding: '14px 0', background: 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.8rem', letterSpacing: 2, textTransform: 'uppercase', borderRadius: 'var(--radius-sm)', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </motion.button>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
              Remembered it? <Link to="/login" style={{ color: 'var(--accent-fire)' }}>Log in</Link>
            </p>
          </form>
        )}
      </motion.div>
    </section>
  );
}
