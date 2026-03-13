import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

// ─── Floating particle background ───
function Particles() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: Math.random() * 3 + 1,
          height: Math.random() * 3 + 1,
          borderRadius: '50%',
          background: i % 3 === 0 ? 'var(--accent-fire)' : i % 3 === 1 ? 'var(--accent-ember)' : 'var(--accent-gold)',
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          opacity: Math.random() * 0.5 + 0.1,
          animation: `float-particle-${i} ${Math.random() * 8 + 6}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 4}s`,
        }} />
      ))}
    </div>
  );
}

// Demo credentials quick-fill
const DEMO_CREDS = [
  { label: 'Customer', email: 'customer@example.com', password: 'password123', icon: '🛒', color: 'var(--accent-fire)' },
  { label: 'Restaurant', email: 'restaurant@example.com', password: 'password123', icon: '🍽️', color: 'var(--accent-ember)' },
  { label: 'Driver', email: 'driver@example.com', password: 'password123', icon: '🛵', color: 'var(--accent-gold)' },
  { label: 'Admin', email: 'admin@example.com', password: 'admin123', icon: '⚙️', color: '#a78bfa' },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      authApi.login(data.email, data.password),
    onSuccess: (response) => {
      setAuth(response.data);
      toast.success('Welcome back! 🔥');
      // Role-based redirect
      const role = response.data?.user?.role;
      if (role === 'admin') {
        navigate('/developer');
      } else if (role === 'restaurant_owner') {
        navigate('/restaurant-dashboard');
      } else if (role === 'driver') {
        navigate('/driver-dashboard');
      } else {
        navigate('/');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Login failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  const fillDemo = (idx: number) => {
    setActivePreset(idx);
    setFormData({ email: DEMO_CREDS[idx].email, password: DEMO_CREDS[idx].password });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-void)',
      position: 'relative',
      overflow: 'hidden',
      paddingTop: '64px',
    }}>
      {/* Background glows */}
      <div style={{ position: 'absolute', top: -200, right: -200, width: 500, height: 500, borderRadius: '50%', background: 'var(--glow-fire)', filter: 'blur(160px)', opacity: 0.3, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -200, left: -200, width: 400, height: 400, borderRadius: '50%', background: 'var(--glow-ember)', filter: 'blur(140px)', opacity: 0.2, pointerEvents: 'none' }} />

      <Particles />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '0 var(--space-md)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Glass card */}
        <div className="glass" style={{
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl) var(--space-lg)',
          border: '1px solid rgba(255, 69, 0, 0.12)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
        }}>

          {/* Logo + Head */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
              style={{
                display: 'inline-flex',
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-fire), var(--accent-ember))',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                marginBottom: 'var(--space-sm)',
                boxShadow: '0 0 30px var(--glow-fire)',
              }}
            >
              🔥
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.4rem',
                color: 'var(--accent-cream)',
                letterSpacing: 2,
                marginBottom: 6,
              }}
            >
              WELCOME BACK
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                fontFamily: 'var(--font-sub)',
                fontStyle: 'italic',
                fontSize: '1rem',
                color: 'var(--text-muted)',
              }}
            >
              Sign in to continue your cravings
            </motion.p>
          </div>

          {/* Demo presets */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{ marginBottom: 'var(--space-md)' }}
          >
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              letterSpacing: 3,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              Quick Demo Access
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DEMO_CREDS.map((cred, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => fillDemo(idx)}
                  style={{
                    flex: '1 1 auto',
                    minWidth: 90,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: activePreset === idx
                      ? `linear-gradient(135deg, ${cred.color}33, ${cred.color}11)`
                      : 'var(--bg-elevated)',
                    border: activePreset === idx
                      ? `1px solid ${cred.color}55`
                      : '1px solid rgba(255,255,255,0.05)',
                    color: activePreset === idx ? cred.color : 'var(--text-muted)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.7rem',
                    letterSpacing: 1,
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    boxShadow: activePreset === idx ? `0 0 16px ${cred.color}33` : 'none',
                    cursor: 'none',
                  }}
                >
                  <span style={{ display: 'block', fontSize: '1.1rem', marginBottom: 2 }}>{cred.icon}</span>
                  {cred.label}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-md)' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 2 }}>OR ENTER MANUALLY</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} style={{ marginBottom: 'var(--space-sm)' }}>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-body)',
                fontSize: '0.65rem',
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: focusedField === 'email' ? 'var(--accent-fire)' : 'var(--text-muted)',
                marginBottom: 8,
                transition: 'color 0.2s',
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: focusedField === 'email' ? 'var(--accent-fire)' : 'var(--text-muted)',
                  transition: 'color 0.2s',
                  fontSize: '1rem',
                  pointerEvents: 'none',
                }}>✉</span>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 42px',
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${focusedField === 'email' ? 'var(--accent-fire)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-cream)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxShadow: focusedField === 'email' ? '0 0 20px var(--glow-fire)' : 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    caretColor: 'var(--accent-fire)',
                  }}
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-body)',
                fontSize: '0.65rem',
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: focusedField === 'password' ? 'var(--accent-fire)' : 'var(--text-muted)',
                marginBottom: 8,
                transition: 'color 0.2s',
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: focusedField === 'password' ? 'var(--accent-fire)' : 'var(--text-muted)',
                  transition: 'color 0.2s',
                  fontSize: '1rem',
                  pointerEvents: 'none',
                }}>🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 42px',
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${focusedField === 'password' ? 'var(--accent-fire)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-cream)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxShadow: focusedField === 'password' ? '0 0 20px var(--glow-fire)' : 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    caretColor: 'var(--accent-fire)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    fontSize: '1.1rem',
                    cursor: 'none',
                    background: 'none',
                    border: 'none',
                    padding: 4,
                    lineHeight: 1,
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </motion.div>

            {/* Submit */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loginMutation.isPending}
                className="shimmer"
                style={{
                  width: '100%',
                  padding: '16px 0',
                  background: 'var(--accent-fire)',
                  color: '#fff',
                  fontFamily: 'var(--font-accent)',
                  fontSize: '1.3rem',
                  letterSpacing: 4,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: loginMutation.isPending ? 'not-allowed' : 'none',
                  opacity: loginMutation.isPending ? 0.7 : 1,
                  boxShadow: '0 0 30px var(--glow-fire)',
                  transition: 'opacity 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <AnimatePresence mode="wait">
                  {loginMutation.isPending ? (
                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <span style={{
                        display: 'inline-block',
                        width: 18,
                        height: 18,
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }} />
                      SIGNING IN...
                    </motion.span>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      SIGN IN →
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </form>

          {/* Footer link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            style={{
              marginTop: 'var(--space-md)',
              textAlign: 'center',
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              letterSpacing: 1,
            }}
          >
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-fire)', textDecoration: 'none', fontWeight: 600 }}>
              Create one →
            </Link>
          </motion.p>
        </div>
      </motion.div>

      {/* Inline spin keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float-particle-0 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-25px) translateX(12px)} }
        @keyframes float-particle-1 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-18px) translateX(-10px)} }
        @keyframes float-particle-2 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-30px) translateX(7px)} }
        @keyframes float-particle-3 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes float-particle-4 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-14px) translateX(16px)} }
        @keyframes float-particle-5 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-22px) translateX(-8px)} }
        @keyframes float-particle-6 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-17px) translateX(5px)} }
        @keyframes float-particle-7 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-28px)} }
        @keyframes float-particle-8 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px) translateX(-13px)} }
        @keyframes float-particle-9 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-24px) translateX(9px)} }
        @keyframes float-particle-10 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-19px)} }
        @keyframes float-particle-11 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-32px) translateX(-6px)} }
        @keyframes float-particle-12 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px) translateX(11px)} }
        @keyframes float-particle-13 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-21px) translateX(-15px)} }
        @keyframes float-particle-14 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-26px) translateX(4px)} }
        @keyframes float-particle-15 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
        @keyframes float-particle-16 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-29px) translateX(-7px)} }
        @keyframes float-particle-17 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-13px) translateX(14px)} }
      `}</style>
    </div>
  );
};

export default LoginPage;
