import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Pages
import HeroPage from './pages/HeroPage';
import BrowsePage from './pages/BrowsePage';
import MenuPage from './pages/MenuPage';
import TrackingPage from './pages/TrackingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FailureSimulatorPage from './pages/FailureSimulatorPage';
import RestaurantDashboard from './pages/RestaurantDashboard';
import SetupRestaurantPage from './pages/SetupRestaurantPage';
import DriverDashboard from './pages/DriverDashboard';
import AdminPanel from './pages/AdminPanel';
import DeveloperDashboard from './pages/DeveloperDashboard';
import ChaosEngineer from './pages/ChaosEngineer';
import DualView from './pages/DualView';
import PaymentModal, { PaymentMethod } from './components/PaymentModal';
import ContactSupportModal from './components/ContactSupportModal';

// Auth store & API
import { useAuthStore } from './stores/authStore';
import { orderApi } from './services/api';

// ─── Types ───
export interface CartItem { id: number; name: string; price: number; emoji: string; qty: number; restaurantId: number }

// ─── Custom Cursor ───
function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if ('ontouchstart' in window) return;
    const move = (e: MouseEvent) => { target.current = { x: e.clientX, y: e.clientY }; };
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      setHovering(!!t.closest('button, a, [role="button"], input, select'));
    };
    window.addEventListener('mousemove', move);
    document.addEventListener('mouseover', over);
    let raf: number;
    const loop = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.15;
      pos.current.y += (target.current.y - pos.current.y) * 0.15;
      if (dot.current) { dot.current.style.transform = `translate(${target.current.x - 6}px, ${target.current.y - 6}px)`; }
      if (ring.current) { ring.current.style.transform = `translate(${pos.current.x - 18}px, ${pos.current.y - 18}px) scale(${hovering ? 1.8 : 1})`; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', move); document.removeEventListener('mouseover', over); cancelAnimationFrame(raf); };
  }, [hovering]);

  return <>
    <div ref={dot} style={{ position: 'fixed', width: 12, height: 12, borderRadius: '50%', background: 'var(--accent-fire)', pointerEvents: 'none', zIndex: 99999, transition: 'background 0.2s' }} />
    <div ref={ring} style={{ position: 'fixed', width: 36, height: 36, borderRadius: '50%', border: '1.5px solid var(--accent-fire)', pointerEvents: 'none', zIndex: 99998, transition: 'transform 0.15s ease-out, opacity 0.2s', opacity: hovering ? 0.5 : 0.3 }} />
  </>;
}

// ─── Profile Dropdown ───
function ProfileDropdown({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    toast.success('See you soon! 👋');
    navigate('/');
    onClose();
  };

  const getDashboard = () => {
    if (user?.role === 'admin') return { path: '/admin', label: '⚙️ Admin Panel' };
    if (user?.role === 'restaurant_owner') return { path: '/restaurant-dashboard', label: '🍽️ My Kitchen' };
    if (user?.role === 'driver') return { path: '/driver-dashboard', label: '🛵 My Deliveries' };
    return null;
  };
  const dash = getDashboard();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute', top: 'calc(100% + 12px)', right: 0, minWidth: 220,
        background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 'var(--radius-md)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        overflow: 'hidden', zIndex: 2000,
      }}
    >
      {/* User info */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--accent-cream)', fontWeight: 600 }}>
          {user?.first_name} {user?.last_name}
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</p>
        <span style={{
          display: 'inline-block', marginTop: 8, fontFamily: 'var(--font-body)', fontSize: '0.6rem',
          letterSpacing: 2, textTransform: 'uppercase', padding: '3px 10px',
          borderRadius: 'var(--radius-pill)', background: 'rgba(255,69,0,0.12)',
          color: 'var(--accent-fire)', border: '1px solid rgba(255,69,0,0.25)',
        }}>
          {user?.role?.replace('_', ' ')}
        </span>
      </div>

      {/* Links */}
      <div style={{ padding: '8px 0' }}>
        {dash && (
          <button
            onClick={() => { navigate(dash.path); onClose(); }}
            style={{
              width: '100%', textAlign: 'left', padding: '10px 20px', cursor: 'none',
              fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--accent-cream)',
              background: 'none', border: 'none', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {dash.label}
          </button>
        )}

        <button
          onClick={handleLogout}
          style={{
            width: '100%', textAlign: 'left', padding: '10px 20px', cursor: 'none',
            fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#f87171',
            background: 'none', border: 'none', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          🚪 Sign Out
        </button>
      </div>
    </motion.div>
  );
}

// ─── Navbar ───
function Navbar({ cartCount, onCartClick }: { cartCount: number; onCartClick: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [bounce, setBounce] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const prevCount = useRef(cartCount);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', s, { passive: true });
    return () => window.removeEventListener('scroll', s);
  }, []);

  useEffect(() => {
    if (cartCount > prevCount.current) { setBounce(true); setTimeout(() => setBounce(false), 500); }
    prevCount.current = cartCount;
  }, [cartCount]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/browse', label: 'Browse' },
    ...(!isAuthenticated ? [{ path: '/login', label: 'Login' }] : []),
    // Admin/developer tools — visible to admin only
    ...(user?.role === 'admin' ? [{ path: '/developer', label: '🛠 Dev' }] : []),
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <nav className="glass" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, padding: '0 var(--space-lg)', borderBottom: scrolled ? '1px solid var(--glow-fire)' : '1px solid transparent', transition: 'border-color 0.3s' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <button onClick={() => navigate('/')} style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.8rem', color: 'var(--accent-fire)', fontWeight: 700, letterSpacing: 2 }}>CRAVE</button>
        <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
          {navLinks.map(link => (
            <button key={link.path} onClick={() => navigate(link.path)} style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: location.pathname === link.path ? 'var(--accent-cream)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, position: 'relative', padding: '4px 0', transition: 'color 0.2s' }}>
              {link.label}
              {location.pathname === link.path && <motion.span layoutId="nav-underline" style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 2, background: 'var(--accent-fire)', borderRadius: 1 }} />}
            </button>
          ))}

          {/* Cart */}
          <button onClick={onCartClick} style={{ position: 'relative', padding: 8, animation: bounce ? 'shake 0.4s ease' : 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cream)" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" /></svg>
            {cartCount > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', top: 0, right: -2, background: 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-accent)', fontSize: '0.75rem', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</motion.span>}
          </button>

          {/* Profile avatar (when authenticated) */}
          {isAuthenticated && user && (
            <div ref={profileRef} style={{ position: 'relative' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setProfileOpen(prev => !prev)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-fire), var(--accent-ember))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-accent)', fontSize: '1rem', color: '#fff',
                  boxShadow: profileOpen ? '0 0 20px var(--glow-fire)' : 'none',
                  transition: 'box-shadow 0.2s', cursor: 'none',
                  border: profileOpen ? '2px solid var(--accent-fire)' : '2px solid transparent',
                }}
              >
                {user.first_name?.charAt(0).toUpperCase() || '?'}
              </motion.button>
              <AnimatePresence>
                {profileOpen && <ProfileDropdown onClose={() => setProfileOpen(false)} />}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Cart Drawer ───
function CartDrawer({
  cart, open, onClose, onUpdate, onRemove, onProceedToPayment, orderState,
}: {
  cart: CartItem[]; open: boolean; onClose: () => void;
  onUpdate: (id: number, q: number) => void; onRemove: (id: number) => void;
  onProceedToPayment: () => void; orderState: string;
}) {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = cart.length > 0 ? 49 : 0; // ₹49 delivery
  const total = subtotal + deliveryFee;

  const handleProceedToPayment = () => {
    if (!isAuthenticated) {
      onClose();
      toast.error('Please login to place an order 🔐');
      navigate('/login');
      return;
    }
    onProceedToPayment();
  };

  return (
    <AnimatePresence>
      {open && <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 2000 }} />
        <motion.div initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 480, background: 'var(--bg-surface)', borderLeft: '1px solid rgba(255,255,255,0.05)', zIndex: 2001, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 'var(--space-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>YOUR ORDER</h2>
            <button onClick={onClose} style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-md)' }}>
            {cart.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-xl)' }}>Your cart is empty</p> : (
              <AnimatePresence>
                {cart.map(item => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-xs)' }}>
                    <span style={{ fontSize: '1.8rem', width: 44, textAlign: 'center' }}>{item.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.name}</p>
                      <p style={{ fontFamily: 'var(--font-accent)', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>₹{(item.price * item.qty).toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => item.qty <= 1 ? onRemove(item.id) : onUpdate(item.id, item.qty - 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>−</button>
                      <span style={{ fontFamily: 'var(--font-accent)', fontSize: '1.1rem', width: 20, textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => onUpdate(item.id, item.qty + 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>+</button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          {cart.length > 0 && (
            <div style={{ padding: 'var(--space-lg)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}><span>Delivery</span><span>₹{deliveryFee}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontFamily: 'var(--font-accent)', marginBottom: 'var(--space-md)' }}><span>Total</span><span style={{ color: 'var(--accent-gold)' }}>₹{total.toLocaleString('en-IN')}</span></div>
              {!isAuthenticated && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--accent-fire)', textAlign: 'center', marginBottom: 12, letterSpacing: 1 }}>
                  🔐 Login required to place order
                </p>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleProceedToPayment}
                disabled={orderState !== 'idle'}
                style={{ width: '100%', padding: '16px 0', background: orderState === 'success' ? '#22c55e' : 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-accent)', fontSize: '1.3rem', letterSpacing: 3, borderRadius: 'var(--radius-sm)', transition: 'background 0.3s' }}
              >
                {orderState === 'idle' && (isAuthenticated ? 'PROCEED TO PAYMENT →' : 'LOGIN TO ORDER →')}
                {orderState === 'loading' && '⏳ PLACING...'}
                {orderState === 'success' && 'ORDER PLACED! 🎉'}
              </motion.button>
            </div>
          )}
        </motion.div>
      </>}
    </AnimatePresence>
  );
}

// ─── Page Wrapper ───
function PageWrap({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      {children}
    </motion.div>
  );
}

// ─── Role Guard ───
function RequireRole({ role, children }: { role: string; children: ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) toast.error('Please login to continue 🔐');
    else if (user?.role !== role) toast.error('Access denied');
  }, [isAuthenticated, user, role]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ─── Menu Page Wrapper (reads :id from URL) ───
function MenuPageWrapper(props: {
  cart: CartItem[];
  addToCart: (item: { id: number; name: string; price: number; emoji: string; restaurantId?: number }) => void;
  updateQty: (id: number, qty: number) => void;
  onViewCart: () => void;
}) {
  const { id } = useParams<{ id: string }>();
  const restaurantId = parseInt(id ?? '1', 10);
  return (
    <PageWrap key={`menu-${restaurantId}`}>
      <MenuPage restaurantId={restaurantId} {...props} />
    </PageWrap>
  );
}

// ─── Main Application Logic ───
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [orderState, setOrderState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [orderId, setOrderId] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const addToCart = useCallback((item: { id: number; name: string; price: number; emoji: string; restaurantId?: number }) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const updateQty = useCallback((id: number, qty: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty } : c));
  }, []);

  const removeItem = useCallback((id: number) => {
    setCart(prev => prev.filter(c => c.id !== id));
  }, []);

  const handlePlaceOrder = useCallback(async (paymentMethod: PaymentMethod = 'cash') => {
    if (!isAuthenticated) {
      setCartOpen(false);
      setPaymentOpen(false);
      toast.error('Please login first 🔐');
      navigate('/login');
      return;
    }

    if (cart.length === 0) return;
    setOrderState('loading');
    setPaymentError('');

    // Map PaymentMethod to backend-accepted value
    const backendPaymentMethod =
      paymentMethod === 'card' ? 'card' :
        paymentMethod === 'upi' ? 'upi' :
          paymentMethod === 'paypal' ? 'paypal' :
            'cash';

    try {
      const restaurantId = cart[0].restaurantId;

      const orderPayload = {
        restaurant_id: restaurantId,
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.qty,
        })),
        delivery_address: user?.address ?? '123 Main Street, New Delhi',
        payment_method: backendPaymentMethod,
        tip: 0,
      };

      const response = await orderApi.create(orderPayload);
      const realOrderId = response.data?.order_number ?? response.data?.id ?? 'CR-' + Math.floor(Math.random() * 9999);
      setOrderState('success');
      setOrderId(String(realOrderId));
      toast.success('Order placed successfully! 🎉');

      setTimeout(() => {
        setCart([]);
        setCartOpen(false);
      setPaymentOpen(false);
        setOrderState('idle');
        navigate('/tracking');
      }, 1200);

    } catch (err: unknown) {
      setOrderState('idle');
      const e = err as { response?: { data?: { detail?: string }; status?: number } };
      const detail = e?.response?.data?.detail;
      const errorMsg = detail || (e?.response ? 'Payment failed. Please try again.' : 'Could not reach server. Is Docker running?');
      setPaymentError(errorMsg);
      if (!e?.response) {
        toast.error('Could not reach server. Is Docker running?');
      }
    }
  }, [isAuthenticated, user, cart, navigate]);

  const handleProceedToPayment = useCallback(() => {
    setCartOpen(false);
    setPaymentError('');
    setPaymentOpen(true);
  }, []);

  const handlePaymentConfirmed = useCallback((method: PaymentMethod) => {
    handlePlaceOrder(method);
  }, [handlePlaceOrder]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const legacyNavigate = (p: string) => navigate(p === 'hero' ? '/' : `/${p}`);

  return (
    <>
      <Navbar cartCount={cartCount} onCartClick={() => setCartOpen(true)} />
      <CartDrawer cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} onUpdate={updateQty} onRemove={removeItem} onProceedToPayment={handleProceedToPayment} orderState={orderState} />
      <PaymentModal
        open={paymentOpen}
        onClose={() => { setPaymentOpen(false); setPaymentError(''); setCartOpen(true); }}
        onConfirm={handlePaymentConfirmed}
        total={cart.reduce((s, i) => s + i.price * i.qty, 0) + (cart.length > 0 ? 49 : 0)}
        cartItems={cart.map(i => ({ name: i.name, emoji: i.emoji, qty: i.qty, price: i.price }))}
        orderState={orderState}
        errorMessage={paymentError}
      />

      <ContactSupportModal open={contactOpen} onClose={() => setContactOpen(false)} />

      {/* Floating Support Button */}
      <button
        id="contact-support-btn"
        onClick={() => setContactOpen(true)}
        title="Contact Support"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 2500,
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--bg-surface)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.25rem', color: 'var(--accent-cream)',
          cursor: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-fire)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.5), 0 0 16px var(--glow-fire)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
        }}
      >
        💬
      </button>

      <main>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrap key="hero"><HeroPage navigate={legacyNavigate} /></PageWrap>} />
            <Route path="/browse" element={<PageWrap key="browse"><BrowsePage onSelect={(id) => navigate(`/menu/${id}`)} /></PageWrap>} />
            {/* Fixed: now passes the actual :id param from the URL instead of hardcoded 1 */}
            <Route path="/menu/:id" element={<MenuPageWrapper cart={cart} addToCart={addToCart} updateQty={updateQty} onViewCart={() => setCartOpen(true)} />} />
            <Route path="/tracking" element={<PageWrap key="track"><TrackingPage orderId={orderId} navigate={legacyNavigate} /></PageWrap>} />
            <Route path="/login" element={<PageWrap key="login"><LoginPage /></PageWrap>} />
            <Route path="/register" element={<PageWrap key="register"><RegisterPage /></PageWrap>} />
            {/* Admin-only routes */}
            <Route path="/simulator" element={<RequireRole role="admin"><PageWrap key="simulator"><div style={{ paddingTop: '0px' }}><FailureSimulatorPage /></div></PageWrap></RequireRole>} />
            <Route path="/admin" element={<RequireRole role="admin"><PageWrap key="admin"><AdminPanel /></PageWrap></RequireRole>} />
            {/* Developer/Admin routes */}
            <Route path="/developer" element={<RequireRole role="admin"><PageWrap key="dev"><DeveloperDashboard /></PageWrap></RequireRole>} />
            <Route path="/developer/chaos-engineer" element={<RequireRole role="admin"><PageWrap key="chaos"><ChaosEngineer /></PageWrap></RequireRole>} />
            <Route path="/developer/dual-view" element={<RequireRole role="admin"><DualView /></RequireRole>} />
            <Route path="/developer/failure-simulator" element={<RequireRole role="admin"><PageWrap key="fsim"><div style={{ paddingTop: '0px' }}><FailureSimulatorPage /></div></PageWrap></RequireRole>} />
            {/* Role-protected dashboards — auth guards handled inside each dashboard */}
            <Route path="/restaurant-dashboard" element={<PageWrap key="rdash"><RestaurantDashboard /></PageWrap>} />
            <Route path="/setup-restaurant" element={<PageWrap key="setup-rest"><SetupRestaurantPage /></PageWrap>} />
            <Route path="/driver-dashboard" element={<PageWrap key="ddash"><DriverDashboard /></PageWrap>} />
          </Routes>
        </AnimatePresence>
      </main>
    </>
  );
}

// ─── Entry Component ───
export default function App() {
  return (
    <BrowserRouter>
      <div className="grain" />
      <CustomCursor />
      <AppContent />
    </BrowserRouter>
  );
}