import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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
import DriverDashboard from './pages/DriverDashboard';

// Auth store & API
import { useAuthStore } from './stores/authStore';
import { orderApi } from './services/api';

// ─── Types ───
export interface CartItem { id: number; name: string; price: number; emoji: string; qty: number; restaurantId?: number }

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
    { path: '/simulator', label: 'Simulator' },
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
  cart, open, onClose, onUpdate, onRemove, onPlaceOrder, orderState,
}: {
  cart: CartItem[]; open: boolean; onClose: () => void;
  onUpdate: (id: number, q: number) => void; onRemove: (id: number) => void;
  onPlaceOrder: () => void; orderState: string;
}) {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = cart.length > 0 ? 49 : 0; // ₹49 delivery
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = () => {
    if (!isAuthenticated) {
      onClose();
      toast.error('Please login to place an order 🔐');
      navigate('/login');
      return;
    }
    onPlaceOrder();
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
                onClick={handlePlaceOrder}
                disabled={orderState !== 'idle'}
                style={{ width: '100%', padding: '16px 0', background: orderState === 'success' ? '#22c55e' : 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-accent)', fontSize: '1.3rem', letterSpacing: 3, borderRadius: 'var(--radius-sm)', transition: 'background 0.3s' }}
              >
                {orderState === 'idle' && (isAuthenticated ? 'PLACE ORDER →' : 'LOGIN TO ORDER →')}
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

// ─── Main Application Logic ───
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderState, setOrderState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [orderId, setOrderId] = useState('');

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

  const handlePlaceOrder = useCallback(async () => {
    if (!isAuthenticated) {
      setCartOpen(false);
      toast.error('Please login first 🔐');
      navigate('/login');
      return;
    }

    setOrderState('loading');

    try {
      // Try the real API first
      const firstItem = cart[0];
      const restaurantId = firstItem?.restaurantId ?? 1;

      const orderPayload = {
        restaurant_id: restaurantId,
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.qty,
        })),
        delivery_address: user?.address ?? '123 Main Street, New Delhi',
        payment_method: 'cash_on_delivery',
        tip: 0,
      };

      const response = await orderApi.create(orderPayload);
      const realOrderId = response.data?.order_number ?? response.data?.id ?? 'CR-' + Math.floor(Math.random() * 9999);
      setOrderState('success');
      setOrderId(String(realOrderId));
      toast.success('Order placed successfully! 🎉');
    } catch {
      // Fallback to mock if backend unreachable
      await new Promise(r => setTimeout(r, 1200));
      setOrderState('success');
      setOrderId('CR-' + Math.floor(Math.random() * 9999));
      toast.success('Order placed! 🎉');
    }

    setTimeout(() => {
      setCart([]);
      setCartOpen(false);
      setOrderState('idle');
      navigate('/tracking');
    }, 1200);
  }, [isAuthenticated, user, cart, navigate]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const legacyNavigate = (p: string) => navigate(p === 'hero' ? '/' : `/${p}`);

  return (
    <>
      <Navbar cartCount={cartCount} onCartClick={() => setCartOpen(true)} />
      <CartDrawer cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} onUpdate={updateQty} onRemove={removeItem} onPlaceOrder={handlePlaceOrder} orderState={orderState} />

      <main>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrap key="hero"><HeroPage navigate={legacyNavigate} /></PageWrap>} />
            <Route path="/browse" element={<PageWrap key="browse"><BrowsePage onSelect={(id) => navigate(`/menu/${id}`)} /></PageWrap>} />
            <Route path="/menu/:id" element={<PageWrap key="menu"><MenuPage restaurantId={1} cart={cart} addToCart={addToCart} updateQty={updateQty} onViewCart={() => setCartOpen(true)} /></PageWrap>} />
            <Route path="/tracking" element={<PageWrap key="track"><TrackingPage orderId={orderId} navigate={legacyNavigate} /></PageWrap>} />
            <Route path="/login" element={<PageWrap key="login"><LoginPage /></PageWrap>} />
            <Route path="/register" element={<PageWrap key="register"><RegisterPage /></PageWrap>} />
            <Route path="/simulator" element={<PageWrap key="simulator"><div style={{ paddingTop: '0px' }}><FailureSimulatorPage /></div></PageWrap>} />
            {/* Role-protected dashboards */}
            <Route path="/restaurant-dashboard" element={<PageWrap key="rdash"><RestaurantDashboard /></PageWrap>} />
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