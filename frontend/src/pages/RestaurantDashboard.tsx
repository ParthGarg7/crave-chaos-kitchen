import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────
interface IncomingOrder {
    id: string;
    orderNumber: string;
    customer: string;
    items: { name: string; qty: number; price: number }[];
    total: number;
    status: 'pending' | 'accepted' | 'preparing' | 'ready';
    time: string;
    address: string;
}

interface MenuItemMgmt {
    id: number;
    name: string;
    category: string;
    price: number;
    emoji: string;
    available: boolean;
}

// ── Mock initial data ───────────────────────────────────────────────────────
const MOCK_ORDERS: IncomingOrder[] = [
    {
        id: '1', orderNumber: 'CR-4821', customer: 'Riya Sharma', address: '12 Lajpat Nagar, Delhi',
        items: [{ name: 'Margherita Inferno', qty: 2, price: 849 }, { name: 'Garlic Bread Knots', qty: 1, price: 349 }],
        total: 2047, status: 'pending', time: '2 min ago',
    },
    {
        id: '2', orderNumber: 'CR-3317', customer: 'Arjun Mehta', address: '5 Koramangala, Bangalore',
        items: [{ name: 'Truffle Funghi', qty: 1, price: 999 }, { name: 'Tiramisu Classico', qty: 1, price: 449 }],
        total: 1448, status: 'accepted', time: '8 min ago',
    },
    {
        id: '3', orderNumber: 'CR-7764', customer: 'Priya Patel', address: '88 Andheri West, Mumbai',
        items: [{ name: 'Diavola', qty: 3, price: 949 }, { name: 'Affogato', qty: 2, price: 349 }],
        total: 3545, status: 'preparing', time: '15 min ago',
    },
];

const MOCK_MENU: MenuItemMgmt[] = [
    { id: 101, name: 'Garlic Bread Knots', category: 'Starters', price: 349, emoji: '🧄', available: true },
    { id: 102, name: 'Burrata Bruschetta', category: 'Starters', price: 599, emoji: '🫙', available: true },
    { id: 201, name: 'Margherita Inferno', category: 'Mains', price: 849, emoji: '🍕', available: true },
    { id: 202, name: 'Truffle Funghi', category: 'Mains', price: 999, emoji: '🍄', available: false },
    { id: 203, name: 'Diavola', category: 'Mains', price: 949, emoji: '🌶️', available: true },
    { id: 301, name: 'Tiramisu Classico', category: 'Desserts', price: 449, emoji: '☕', available: true },
    { id: 302, name: 'Affogato', category: 'Desserts', price: 349, emoji: '🍨', available: true },
];

const STATUS_CONFIG = {
    pending: { label: 'Pending', color: '#ffc845', bg: 'rgba(255,200,69,0.12)' },
    accepted: { label: 'Accepted', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
    preparing: { label: 'Preparing', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
    ready: { label: 'Ready ✓', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
};

const NEXT_STATUS: Record<IncomingOrder['status'], IncomingOrder['status'] | null> = {
    pending: 'accepted',
    accepted: 'preparing',
    preparing: 'ready',
    ready: null,
};

const NEXT_LABEL: Record<IncomingOrder['status'], string> = {
    pending: 'Accept',
    accepted: 'Start Preparing',
    preparing: 'Mark Ready',
    ready: '',
};

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ emoji, label, value, sub, color }: { emoji: string; label: string; value: string | number; sub?: string; color?: string }) {
    return (
        <motion.div
            whileHover={{ y: -3 }}
            className="glass"
            style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: `1px solid ${color ? color + '22' : 'rgba(255,255,255,0.05)'}` }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{label}</p>
                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '2.4rem', color: color || 'var(--accent-cream)', lineHeight: 1 }}>{value}</p>
                    {sub && <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>}
                </div>
                <span style={{ fontSize: '2rem' }}>{emoji}</span>
            </div>
        </motion.div>
    );
}

// ── Order Card ─────────────────────────────────────────────────────────────
function OrderCard({ order, onAdvance }: { order: IncomingOrder; onAdvance: (id: string) => void }) {
    const cfg = STATUS_CONFIG[order.status];
    const nextLabel = NEXT_LABEL[order.status];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -80 }}
            className="glass"
            style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.2rem', letterSpacing: 2 }}>{order.orderNumber}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>👤 {order.customer} · {order.time}</p>
                </div>
                <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.65rem', letterSpacing: 2, textTransform: 'uppercase',
                    color: cfg.color, background: cfg.bg, padding: '4px 12px', borderRadius: 'var(--radius-pill)',
                    border: `1px solid ${cfg.color}44`,
                }}>
                    {cfg.label}
                </span>
            </div>

            {/* Items */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12, marginBottom: 12 }}>
                {order.items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '0.75rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--accent-cream)' }}>{it.qty}x {it.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>₹{(it.qty * it.price).toLocaleString('en-IN')}</span>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>📍 {order.address}</p>
                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.4rem', color: 'var(--accent-gold)', marginTop: 2 }}>₹{order.total.toLocaleString('en-IN')}</p>
                </div>
                {nextLabel && (
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onAdvance(order.id)}
                        style={{
                            padding: '10px 20px', borderRadius: 'var(--radius-sm)',
                            background: order.status === 'pending' ? 'var(--accent-fire)' : 'var(--bg-elevated)',
                            color: order.status === 'pending' ? '#fff' : 'var(--accent-cream)',
                            border: order.status === 'pending' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: 1,
                            boxShadow: order.status === 'pending' ? '0 0 20px var(--glow-fire)' : 'none',
                            cursor: 'none',
                        }}
                    >
                        {nextLabel} →
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}

// ── Menu Toggle Item ───────────────────────────────────────────────────────
function MenuToggleItem({ item, onToggle }: { item: MenuItemMgmt; onToggle: (id: number) => void }) {
    return (
        <motion.div
            layout
            className="glass"
            style={{ borderRadius: 'var(--radius-sm)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(255,255,255,0.04)' }}
        >
            <span style={{ fontSize: '1.8rem', width: 36, textAlign: 'center' }}>{item.emoji}</span>
            <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 500, color: item.available ? 'var(--accent-cream)' : 'var(--text-muted)' }}>{item.name}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.category}</p>
            </div>
            <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.2rem', color: 'var(--accent-gold)', minWidth: 80, textAlign: 'right' }}>₹{item.price}</p>
            {/* Toggle */}
            <button
                onClick={() => onToggle(item.id)}
                style={{
                    width: 52, height: 28, borderRadius: 14, cursor: 'none',
                    background: item.available ? 'var(--accent-fire)' : 'var(--bg-elevated)',
                    border: item.available ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    position: 'relative', transition: 'background 0.25s',
                    boxShadow: item.available ? '0 0 12px var(--glow-fire)' : 'none',
                    flexShrink: 0,
                }}
            >
                <motion.span
                    animate={{ x: item.available ? 24 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{ position: 'absolute', top: 4, width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'block' }}
                />
            </button>
        </motion.div>
    );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function RestaurantDashboard() {
    const { user, clearAuth } = useAuthStore();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<IncomingOrder[]>(MOCK_ORDERS);
    const [menu, setMenu] = useState<MenuItemMgmt[]>(MOCK_MENU);
    const [tab, setTab] = useState<'orders' | 'menu'>('orders');

    const advanceOrder = (id: string) => {
        setOrders(prev => prev.map(o => {
            if (o.id !== id) return o;
            const next = NEXT_STATUS[o.status];
            if (!next) return o;
            toast.success(`Order ${o.orderNumber} → ${STATUS_CONFIG[next].label}`);
            return { ...o, status: next };
        }));
    };

    const toggleMenu = (id: number) => {
        setMenu(prev => prev.map(m => {
            if (m.id !== id) return m;
            const newVal = !m.available;
            toast.success(`${m.name} marked ${newVal ? 'Available' : 'Unavailable'}`);
            return { ...m, available: newVal };
        }));
    };

    const handleLogout = () => {
        clearAuth();
        toast.success('Logged out');
        navigate('/login');
    };

    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const acceptedCount = orders.filter(o => o.status === 'accepted' || o.status === 'preparing').length;
    const todayRevenue = orders.reduce((s, o) => s + o.total, 0);
    const availableItems = menu.filter(m => m.available).length;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-void)', paddingTop: 80, paddingBottom: 60 }}>
            {/* Ambient glow */}
            <div style={{ position: 'fixed', top: -300, right: -200, width: 700, height: 700, borderRadius: '50%', background: 'var(--glow-fire)', filter: 'blur(200px)', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }} />

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-lg)', position: 'relative', zIndex: 1 }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
                    <div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Restaurant Dashboard</p>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1 }}>
                            {user?.first_name ? `Welcome, ${user.first_name}` : 'Kitchen Control'}
                        </h1>
                        <p style={{ fontFamily: 'var(--font-sub)', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: 6, fontSize: '1.1rem' }}>
                            Manage incoming orders and your live menu
                        </p>
                    </div>
                    {pendingCount > 0 && (
                        <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            style={{ background: 'rgba(255,69,0,0.15)', border: '1px solid rgba(255,69,0,0.4)', borderRadius: 'var(--radius-sm)', padding: '10px 20px', textAlign: 'center' }}
                        >
                            <p style={{ fontFamily: 'var(--font-accent)', fontSize: '2rem', color: 'var(--accent-fire)', lineHeight: 1 }}>{pendingCount}</p>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--accent-fire)', letterSpacing: 2, textTransform: 'uppercase' }}>New Orders</p>
                        </motion.div>
                    )}
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                    <StatCard emoji="🔥" label="Pending Orders" value={pendingCount} color="var(--accent-fire)" />
                    <StatCard emoji="🍳" label="Active Orders" value={acceptedCount} color="#60a5fa" />
                    <StatCard emoji="💰" label="Today's Revenue" value={`₹${todayRevenue.toLocaleString('en-IN')}`} color="var(--accent-gold)" />
                    <StatCard emoji="✅" label="Menu Available" value={`${availableItems}/${menu.length}`} color="#22c55e" />
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-md)' }}>
                    {(['orders', 'menu'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{
                                padding: '10px 28px', borderRadius: 'var(--radius-sm)', cursor: 'none',
                                background: tab === t ? 'var(--accent-fire)' : 'var(--bg-elevated)',
                                color: tab === t ? '#fff' : 'var(--text-muted)',
                                fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase',
                                border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                boxShadow: tab === t ? '0 0 20px var(--glow-fire)' : 'none',
                                transition: 'all 0.25s',
                            }}
                        >
                            {t === 'orders' ? '📋 Orders' : '🍽️ Menu'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {tab === 'orders' && (
                        <motion.div key="orders" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                            {orders.length === 0
                                ? <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>No orders right now. Take a breather! 🍵</p>
                                : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-md)' }}>
                                        <AnimatePresence>
                                            {orders.map(order => <OrderCard key={order.id} order={order} onAdvance={advanceOrder} />)}
                                        </AnimatePresence>
                                    </div>
                                )}
                        </motion.div>
                    )}

                    {tab === 'menu' && (
                        <motion.div key="menu" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)', letterSpacing: 1 }}>
                                Toggle items to mark them as available or unavailable on your live menu.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <AnimatePresence>
                                    {menu.map(item => <MenuToggleItem key={item.id} item={item} onToggle={toggleMenu} />)}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
