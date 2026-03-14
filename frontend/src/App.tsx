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
      if (dot.current) { dot.current.style.transform = `translate(${target.current.x - 5}px, ${target.current.y - 5}px)`; }
      if (ring.current) { ring.current.style.transform = `translate(${pos.current.x - 16}px, ${pos.current.y - 16}px) scale(${hovering ? 1.6 : 1})`; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', move); document.removeEventListener('mouseover', over); cancelAnimationFrame(raf); };
  }, [hovering]);

  return <>
    <div ref={dot} style={{ position: 'fixed', width: 14, height: 14, background: 'var(--accent-fire)', pointerEvents: 'none', zIndex: 99999, transition: 'background 0.2s' }} />
    <div ref={ring} style={{ position: 'fixed', width: 44, height: 44, border: '4px solid var(--accent-cyan)', pointerEvents: 'none', zIndex: 99998, transition: 'transform 0.1s ease-out', opacity: hovering ? 1 : 0.4 }} />
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
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute', top: 'calc(100% + 12px)', right: 0, minWidth: 220,
        background: 'var(--bg-surface)', border: '4px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-hover)',
        overflow: 'hidden', zIndex: 2000,
      }}
    >
      {/* User info */}
      <div style={{ padding: '20px 24px', borderBottom: '4px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--accent-cream)', fontWeight: 700 }}>
          {user?.first_name} {user?.last_name}
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.email}</p>
        <span style={{
          display: 'inline-block', marginTop: 12, fontFamily: 'var(--font-body)', fontSize: '0.8rem',
          letterSpacing: 1.5, textTransform: 'uppercase', padding: '4px 12px', fontWeight: 600,
          background: 'var(--accent-lime)',
          color: 'var(--accent-cream)', border: '2px solid var(--border-subtle)', boxShadow: '2px 2px 0 #000'
        }}>
          {user?.role?.replace('_', ' ')}
        </span>
      </div>

      {/* Links */}
      <div style={{ padding: '12px 0', background: 'var(--bg-surface)' }}>
        {dash && (
          <button
            onClick={() => { navigate(dash.path); onClose(); }}
            style={{
              width: '100%', textAlign: 'left', padding: '12px 24px', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--accent-cream)', fontWeight: 500,
              background: 'none', border: 'none', transition: 'all 0.2s var(--ease-smooth)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; e.currentTarget.style.paddingLeft = '28px'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.paddingLeft = '24px'; }}
          >
            {dash.label}
          </button>
        )}

        <button
          onClick={handleLogout}
          style={{
            width: '100%', textAlign: 'left', padding: '12px 24px', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#ff3b30', fontWeight: 500,
            background: 'none', border: 'none', transition: 'all 0.2s var(--ease-smooth)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 59, 48, 0.08)'; e.currentTarget.style.paddingLeft = '28px'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.paddingLeft = '24px'; }}
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
    // Simulator only visible to admin users
    ...(user?.role === 'admin' ? [{ path: '/simulator', label: 'Simulator' }] : []),
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      padding: '0 var(--space-lg)',
      borderBottom: '4px solid var(--border-subtle)',
      transition: 'background 0.2s',
      background: scrolled ? 'var(--bg-void)' : 'var(--bg-surface)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        <button onClick={() => navigate('/')} style={{
          fontFamily: 'var(--font-display)', fontSize: '2.5rem',
          color: 'var(--accent-fire)', fontWeight: 800, letterSpacing: -0.5,
          textShadow: '3px 3px 0 var(--accent-cyan)'
        }}>crave.</button>
        <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
          {navLinks.map(link => (
            <button key={link.path} onClick={() => navigate(link.path)} style={{
              fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600,
              color: 'var(--accent-cream)', background: location.pathname === link.path ? 'var(--accent-lime)' : 'transparent',
              border: location.pathname === link.path ? '2px solid var(--border-subtle)' : '2px solid transparent',
              boxShadow: location.pathname === link.path ? '2px 2px 0 #000' : 'none',
              textTransform: 'uppercase', letterSpacing: 1, position: 'relative',
              padding: '6px 12px', transition: 'all 0.2s', cursor: 'pointer'
            }}>
              {link.label}
            </button>
          ))}

          {/* Cart */}
          <button onClick={onCartClick} style={{ position: 'relative', padding: '8px 16px', background: 'var(--accent-cyan)', border: '2px solid var(--border-subtle)', boxShadow: '4px 4px 0 #000', animation: bounce ? 'shake 0.4s ease' : 'none', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translate(-2px, -2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translate(0, 0)'}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: '#000' }}>CART</span>
            <AnimatePresence>
              {cartCount > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ position: 'absolute', top: -10, right: -10, background: 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', width: 28, height: 28, border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</motion.span>}
            </AnimatePresence>
          </button>

          {/* Profile avatar (when authenticated) */}
          {isAuthenticated && user && (
            <div ref={profileRef} style={{ position: 'relative' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setProfileOpen(prev => !prev)}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-fire)',
                  boxShadow: profileOpen ? 'var(--shadow-hover)' : 'var(--shadow-bento)',
                  transition: 'all 0.2s var(--ease-smooth)', cursor: 'pointer',
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', zIndex: 2000 }} />
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 500, background: 'var(--bg-void)', borderLeft: '6px solid var(--border-subtle)', boxShadow: '-16px 0 0px rgba(0,0,0,1)', zIndex: 2001, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 'var(--space-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid var(--border-subtle)', background: 'var(--accent-cyan)' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.5rem', letterSpacing: -0.5, color: '#000', textShadow: '2px 2px 0 #fff' }}>YOUR CART</h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: '#000', fontWeight: 600 }}>Ready for satisfaction?</p>
            </div>
            <button onClick={onClose} style={{ width: 44, height: 44, background: 'var(--accent-fire)', border: '4px solid var(--border-subtle)', boxShadow: '4px 4px 0 #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#fff', transition: 'all 0.1s', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 #000'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0 #000'; }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-md)' }}>
            {cart.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '30vh', fontFamily: 'var(--font-body)', fontSize: '1.1rem' }}>No cravings added yet.</p> : (
              <AnimatePresence>
                {cart.map(item => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-surface)', marginBottom: 'var(--space-sm)', border: '4px solid var(--border-subtle)', boxShadow: 'var(--shadow-bento)'}}>
                    <span style={{ fontSize: '2.5rem', width: 60, height: 60, background: 'var(--bg-elevated)', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent-cream)', marginBottom: 2 }}>{item.name}</p>
                      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '1rem' }}>₹{(item.price * item.qty).toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--accent-yellow)', padding: '4px 8px', border: '2px solid var(--border-subtle)', boxShadow: '2px 2px 0 #000' }}>
                      <button onClick={() => item.qty <= 1 ? onRemove(item.id) : onUpdate(item.id, item.qty - 1)} style={{ width: 32, height: 32, background: '#fff', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#000', cursor: 'pointer' }}>−</button>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', width: 24, textAlign: 'center', color: 'var(--accent-cream)' }}>{item.qty}</span>
                      <button onClick={() => onUpdate(item.id, item.qty + 1)} style={{ width: 32, height: 32, background: '#fff', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#000', cursor: 'pointer' }}>+</button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          {cart.length > 0 && (
            <div style={{ padding: 'var(--space-lg)', borderTop: '4px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginBottom: 8 }}><span>Subtotal</span><span style={{fontWeight: 700}}>₹{subtotal.toLocaleString('en-IN')}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginBottom: 20 }}><span>Delivery Fee</span><span style={{fontWeight: 700}}>₹{deliveryFee}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 'var(--space-lg)' }}><span style={{color: 'var(--accent-cream)'}}>Total</span><span style={{ color: 'var(--accent-fire)', textShadow: '2px 2px 0 #000' }}>₹{total.toLocaleString('en-IN')}</span></div>
              {!isAuthenticated && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', background: 'var(--accent-gold)', border: '2px solid #000', padding: '8px', textAlign: 'center', marginBottom: 16, fontWeight: 700, boxShadow: '2px 2px 0 #000' }}>
                  🔐 Sign in to complete your order
                </p>
              )}
              <button
                onClick={handleProceedToPayment}
                disabled={orderState !== 'idle'}
                style={{ width: '100%', padding: '18px 0', background: orderState === 'success' ? 'var(--accent-lime)' : 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: 2, border: '4px solid var(--border-subtle)', boxShadow: '6px 6px 0 #000', cursor: 'pointer', transition: 'transform 0.1s', textShadow: '2px 2px 0 #000' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translate(-2px, -2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                {orderState === 'idle' && (isAuthenticated ? 'CHECKOUT NOW >' : 'LOGIN TO ORDER >')}
                {orderState === 'loading' && 'PROCESSING...'}
                {orderState === 'success' && 'CONFIRMED!'}
              </button>
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

  const addToCart = useCallback((item: { id: number; name: string; price: number; emoji: string; restaurantId?: number }) => {
    setCart((prev: CartItem[]) => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      // Fallback to 1 if missing for safety
      return [...prev, { ...item, qty: 1, restaurantId: item.restaurantId ?? 1 }];
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
      if (detail) {
        toast.error(detail);
      } else if (!e?.response) {
        // Backend unreachable — fall back gracefully
        toast.error('Could not reach server. Is Docker running?');
      }
      // 400/422 messages are shown inline via the detail field above
    }
  }, [isAuthenticated, user, cart, navigate]);

  const handleProceedToPayment = useCallback(() => {
    setCartOpen(false);
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
        onClose={() => { setPaymentOpen(false); setCartOpen(true); }}
        onConfirm={handlePaymentConfirmed}
        total={cart.reduce((s, i) => s + i.price * i.qty, 0) + (cart.length > 0 ? 49 : 0)}
        cartItems={cart.map(i => ({ name: i.name, emoji: i.emoji, qty: i.qty, price: i.price }))}
        orderState={orderState}
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
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.25rem', color: 'var(--accent-cream)',
          cursor: 'none',
          transition: 'all 0.2s var(--ease-smooth)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-fire)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.5), 0 0 16px var(--glow-fire)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
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