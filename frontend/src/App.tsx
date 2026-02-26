import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Pages
import HeroPage from './pages/HeroPage';
import BrowsePage from './pages/BrowsePage';
import MenuPage from './pages/MenuPage';
import TrackingPage from './pages/TrackingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FailureSimulatorPage from './pages/FailureSimulatorPage';

// ─── Types ───
export interface CartItem { id: number; name: string; price: number; emoji: string; qty: number }

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

// ─── Navbar ───
function Navbar({ cartCount, onCartClick }: { cartCount: number; onCartClick: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [bounce, setBounce] = useState(false);
  const prevCount = useRef(cartCount);

  useEffect(() => {
    const s = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', s, { passive: true });
    return () => window.removeEventListener('scroll', s);
  }, []);

  useEffect(() => {
    if (cartCount > prevCount.current) { setBounce(true); setTimeout(() => setBounce(false), 500); }
    prevCount.current = cartCount;
  }, [cartCount]);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/browse', label: 'Browse' },
    { path: '/login', label: 'Login' },
    { path: '/simulator', label: 'Simulator' }
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
          <button onClick={onCartClick} style={{ position: 'relative', padding: 8, animation: bounce ? 'shake 0.4s ease' : 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cream)" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" /></svg>
            {cartCount > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', top: 0, right: -2, background: 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-accent)', fontSize: '0.75rem', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</motion.span>}
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── Cart Drawer ───
function CartDrawer({ cart, open, onClose, onUpdate, onRemove, onPlaceOrder, orderState }: { cart: CartItem[]; open: boolean; onClose: () => void; onUpdate: (id: number, q: number) => void; onRemove: (id: number) => void; onPlaceOrder: () => void; orderState: string }) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = cart.length > 0 ? 2.99 : 0;
  const total = subtotal + deliveryFee;

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
                      <p style={{ fontFamily: 'var(--font-accent)', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>${(item.price * item.qty).toFixed(2)}</p>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}><span>Delivery</span><span>${deliveryFee.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontFamily: 'var(--font-accent)', marginBottom: 'var(--space-md)' }}><span>Total</span><span style={{ color: 'var(--accent-gold)' }}>${total.toFixed(2)}</span></div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onPlaceOrder} disabled={orderState !== 'idle'} style={{ width: '100%', padding: '16px 0', background: orderState === 'success' ? '#22c55e' : 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-accent)', fontSize: '1.3rem', letterSpacing: 3, borderRadius: 'var(--radius-sm)', transition: 'background 0.3s' }}>
                {orderState === 'idle' && 'PLACE ORDER →'}
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
// This component sits inside BrowserRouter so it can use routing hooks safely
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderState, setOrderState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [orderId, setOrderId] = useState('');

  const addToCart = useCallback((item: { id: number; name: string; price: number; emoji: string }) => {
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
    setOrderState('loading');
    const { placeOrder } = await import('./data/mockData');
    const result = await placeOrder();
    setOrderState('success');
    setOrderId(result.orderId);
    setTimeout(() => {
      setCart([]);
      setCartOpen(false);
      setOrderState('idle');
      navigate('/tracking');
    }, 1200);
  }, [navigate]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // Helper for HeroPage and TrackingPage which expect a 'navigate' prop in the old format
  const legacyNavigate = (p: string) => navigate(p === 'hero' ? '/' : `/${p}`);

  return (
    <>
      <Navbar cartCount={cartCount} onCartClick={() => setCartOpen(true)} />
      <CartDrawer cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} onUpdate={updateQty} onRemove={removeItem} onPlaceOrder={handlePlaceOrder} orderState={orderState} />

      <main>
        {/* AnimatePresence combined with the location key forces pages to slide cleanly */}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrap key="hero"><HeroPage navigate={legacyNavigate} /></PageWrap>} />
            <Route path="/browse" element={<PageWrap key="browse"><BrowsePage onSelect={(id) => navigate(`/menu/${id}`)} /></PageWrap>} />
            <Route path="/menu/:id" element={<PageWrap key="menu"><MenuPage restaurantId={1} cart={cart} addToCart={addToCart} updateQty={updateQty} onViewCart={() => setCartOpen(true)} /></PageWrap>} />
            <Route path="/tracking" element={<PageWrap key="track"><TrackingPage orderId={orderId} navigate={legacyNavigate} /></PageWrap>} />

            {/* Standard React Component Pages Wrapped for Styling & Animations */}
            <Route path="/login" element={<PageWrap key="login"><LoginPage /></PageWrap>} />
            <Route path="/register" element={<PageWrap key="register"><RegisterPage /></PageWrap>} />
            <Route path="/simulator" element={<PageWrap key="simulator"><div style={{ paddingTop: '100px' }}><FailureSimulatorPage /></div></PageWrap>} />
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