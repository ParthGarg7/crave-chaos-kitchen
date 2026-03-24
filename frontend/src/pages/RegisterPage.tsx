import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';

const ROLE_OPTIONS = [
  { value: 'customer', label: 'Customer', icon: '🛒', desc: 'Browse & order food' },
  { value: 'restaurant_owner', label: 'Restaurant', icon: '🍽️', desc: 'Manage your restaurant' },
  { value: 'driver', label: 'Driver', icon: '🛵', desc: 'Deliver orders' },
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'customer',
  });

  const registerMutation = useMutation({
    mutationFn: (data: typeof formData) => authApi.register(data),
    onSuccess: () => {
      toast.success('Account created! Please sign in. 🎉');
      navigate('/login');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Registration failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  const inputStyle = (field: string) => ({
    width: '100%',
    padding: '13px 16px 13px 42px',
    background: 'var(--bg-elevated)',
    border: `1px solid ${focusedField === field ? 'var(--accent-fire)' : 'rgba(255,255,255,0.07)'}`,
    borderRadius: 'var(--radius-sm)',
    color: 'var(--accent-cream)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.85rem',
    outline: 'none',
    boxShadow: focusedField === field ? '0 0 20px var(--glow-fire)' : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    caretColor: 'var(--accent-fire)',
  } as React.CSSProperties);

  const labelStyle = (field: string) => ({
    display: 'block',
    fontFamily: 'var(--font-body)',
    fontSize: '0.63rem',
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
    color: focusedField === field ? 'var(--accent-fire)' : 'var(--text-muted)',
    marginBottom: 7,
    transition: 'color 0.2s',
  });

  const iconStyle = (field: string) => ({
    position: 'absolute' as const,
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: focusedField === field ? 'var(--accent-fire)' : 'var(--text-muted)',
    transition: 'color 0.2s',
    fontSize: '0.9rem',
    pointerEvents: 'none' as const,
  });

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
      paddingBottom: 'var(--space-xl)',
    }}>
      {/* Background glows */}
      <div style={{ position: 'absolute', top: -150, left: -200, width: 500, height: 500, borderRadius: '50%', background: 'var(--glow-fire)', filter: 'blur(160px)', opacity: 0.25, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -180, right: -200, width: 450, height: 450, borderRadius: '50%', background: 'var(--glow-ember)', filter: 'blur(140px)', opacity: 0.2, pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        style={{ width: '100%', maxWidth: 520, margin: '0 var(--space-md)', position: 'relative', zIndex: 10 }}
      >
        <div className="glass" style={{
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl) var(--space-lg)',
          border: '1px solid rgba(255, 69, 0, 0.12)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
        }}>

          {/* Header */}
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
                background: 'linear-gradient(135deg, var(--accent-ember), var(--accent-gold))',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                marginBottom: 'var(--space-sm)',
                boxShadow: '0 0 30px var(--glow-ember)',
              }}
            >
              ✨
            </motion.div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.2rem',
              color: 'var(--accent-cream)',
              letterSpacing: 2,
              marginBottom: 6,
            }}>
              CREATE ACCOUNT
            </h1>
            <p style={{
              fontFamily: 'var(--font-sub)',
              fontStyle: 'italic',
              fontSize: '1rem',
              color: 'var(--text-muted)',
            }}>
              Join CRAVE and satisfy every craving
            </p>
          </div>

          {/* Role Selector */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ marginBottom: 'var(--space-md)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.63rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>
              Account Type
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {ROLE_OPTIONS.map((role) => (
                <motion.button
                  key={role.value}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: role.value })}
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: formData.role === role.value
                      ? 'linear-gradient(135deg, rgba(255,69,0,0.2), rgba(255,140,0,0.1))'
                      : 'var(--bg-elevated)',
                    border: formData.role === role.value
                      ? '1px solid rgba(255,69,0, 0.5)'
                      : '1px solid rgba(255,255,255,0.05)',
                    color: formData.role === role.value ? 'var(--accent-fire)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.65rem',
                    letterSpacing: 1,
                    textAlign: 'center',
                    cursor: 'none',
                    transition: 'all 0.2s',
                    boxShadow: formData.role === role.value ? '0 0 16px var(--glow-fire)' : 'none',
                  }}
                >
                  <span style={{ display: 'block', fontSize: '1.3rem', marginBottom: 4 }}>{role.icon}</span>
                  <span style={{ display: 'block', fontWeight: 600, marginBottom: 2 }}>{role.label}</span>
                  <span style={{ display: 'block', fontSize: '0.6rem', opacity: 0.7 }}>{role.desc}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <form onSubmit={handleSubmit}>
            {/* Name row */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 'var(--space-sm)' }}>
              <div>
                <label style={labelStyle('first_name')}>First Name</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle('first_name')}>👤</span>
                  <input type="text" required value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    onFocus={() => setFocusedField('first_name')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="John"
                    style={inputStyle('first_name')} />
                </div>
              </div>
              <div>
                <label style={labelStyle('last_name')}>Last Name</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ ...iconStyle('last_name'), left: 14 }}>👤</span>
                  <input type="text" required value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    onFocus={() => setFocusedField('last_name')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Doe"
                    style={inputStyle('last_name')} />
                </div>
              </div>
            </motion.div>

            {/* Email */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} style={{ marginBottom: 'var(--space-sm)' }}>
              <label style={labelStyle('email')}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <span style={iconStyle('email')}>✉</span>
                <input type="email" required value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  style={inputStyle('email')} />
              </div>
            </motion.div>

            {/* Phone */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 }} style={{ marginBottom: 'var(--space-sm)' }}>
              <label style={labelStyle('phone')}>Phone <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
              <div style={{ position: 'relative' }}>
                <span style={iconStyle('phone')}>📞</span>
                <input type="tel" value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="+1-555-0123"
                  style={inputStyle('phone')} />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} style={{ marginBottom: 'var(--space-md)' }}>
              <label style={labelStyle('password')}>Password</label>
              <div style={{ position: 'relative' }}>
                <span style={iconStyle('password')}>🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  style={{ ...inputStyle('password'), paddingRight: 48 }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', fontSize: '1.1rem', cursor: 'none',
                  background: 'none', border: 'none', padding: 4, lineHeight: 1,
                }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <p style={{ marginTop: 6, fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: 1 }}>
                Minimum 8 characters
              </p>
            </motion.div>

            {/* Submit */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={registerMutation.isPending}
                className="shimmer"
                style={{
                  width: '100%',
                  padding: '16px 0',
                  background: 'linear-gradient(135deg, var(--accent-fire), var(--accent-ember))',
                  color: '#fff',
                  fontFamily: 'var(--font-accent)',
                  fontSize: '1.3rem',
                  letterSpacing: 4,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: registerMutation.isPending ? 'not-allowed' : 'none',
                  opacity: registerMutation.isPending ? 0.7 : 1,
                  boxShadow: '0 0 30px var(--glow-fire)',
                  transition: 'opacity 0.2s',
                }}
              >
                <AnimatePresence mode="wait">
                  {registerMutation.isPending ? (
                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <span style={{
                        display: 'inline-block', width: 18, height: 18,
                        border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                      }} />
                      CREATING ACCOUNT...
                    </motion.span>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      CREATE ACCOUNT →
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </form>

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
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-fire)', textDecoration: 'none', fontWeight: 600 }}>
              Sign in →
            </Link>
          </motion.p>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default RegisterPage;
