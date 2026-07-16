import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi, formatApiDetail } from '../services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, setState] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This verification link is incomplete.');
      return;
    }
    authApi.verifyEmail(token)
      .then(() => setState('success'))
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { detail?: unknown } } };
        setState('error');
        setMessage(formatApiDetail(e?.response?.data?.detail) || 'Invalid or expired link.');
      });
  }, [token]);

  return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px var(--space-lg) var(--space-2xl)' }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="glass"
        style={{ width: '100%', maxWidth: 420, borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
        {state === 'verifying' && (
          <>
            <motion.p animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} style={{ fontSize: '2.5rem', marginBottom: 12, display: 'inline-block' }}>⏳</motion.p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verifying your email…</p>
          </>
        )}
        {state === 'success' && (
          <>
            <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 8 }}>EMAIL VERIFIED!</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Your account is confirmed. Time to get hungry.
            </p>
            <Link to="/login" style={{ display: 'inline-block', padding: '12px 32px', background: 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.8rem', letterSpacing: 2, textTransform: 'uppercase', borderRadius: 'var(--radius-sm)' }}>
              Log In
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 8 }}>LINK PROBLEM</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>{message}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Link to="/login" style={{ color: 'var(--accent-fire)' }}>Back to login</Link>
            </p>
          </>
        )}
      </motion.div>
    </section>
  );
}
