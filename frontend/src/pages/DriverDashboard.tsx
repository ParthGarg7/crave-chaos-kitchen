import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────
interface AvailableDelivery {
    id: string;
    orderNumber: string;
    restaurant: string;
    restaurantAddress: string;
    deliveryAddress: string;
    distance: string;
    estimatedTime: string;
    earnings: number;
    items: number;
}

interface ActiveDelivery extends AvailableDelivery {
    status: 'accepted' | 'picked_up' | 'on_the_way' | 'delivered';
    customer: string;
    customerPhone: string;
}

const DELIVERY_STATUS = {
    accepted: { label: 'Head to Restaurant', next: 'picked_up', nextLabel: 'Order Picked Up', color: '#60a5fa', emoji: '🏃' },
    picked_up: { label: 'Picked Up', next: 'on_the_way', nextLabel: 'En Route', color: '#fb923c', emoji: '🛵' },
    on_the_way: { label: 'En Route', next: 'delivered', nextLabel: 'Mark Delivered', color: '#ffc845', emoji: '📍' },
    delivered: { label: 'Delivered ✓', next: null, nextLabel: '', color: '#22c55e', emoji: '🎉' },
};

const MOCK_AVAILABLE: AvailableDelivery[] = [
    {
        id: 'a1', orderNumber: 'CR-5521', restaurant: 'Blaze Pizza Co.', restaurantAddress: 'CP, New Delhi',
        deliveryAddress: '12 Lajpat Nagar, Delhi', distance: '3.2 km', estimatedTime: '18 min', earnings: 68, items: 3
    },
    {
        id: 'a2', orderNumber: 'CR-8833', restaurant: 'Spice Route', restaurantAddress: 'Hauz Khas, Delhi',
        deliveryAddress: '45 GK-1, Delhi', distance: '5.7 km', estimatedTime: '28 min', earnings: 95, items: 2
    },
    {
        id: 'a3', orderNumber: 'CR-2240', restaurant: 'Zen Sushi Bar', restaurantAddress: 'Banjara Hills, Hyderabad',
        deliveryAddress: 'Jubilee Hills, Hyderabad', distance: '4.1 km', estimatedTime: '22 min', earnings: 78, items: 4
    },
];

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ emoji, label, value, color }: { emoji: string; label: string; value: string | number; color?: string }) {
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
                </div>
                <span style={{ fontSize: '2rem' }}>{emoji}</span>
            </div>
        </motion.div>
    );
}

// ── Available Delivery Card ────────────────────────────────────────────────
function AvailableCard({ delivery, onAccept }: { delivery: AvailableDelivery; onAccept: (d: AvailableDelivery) => void }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 80 }}
            className="glass"
            style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.2rem', letterSpacing: 2 }}>{delivery.orderNumber}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--accent-ember)', marginTop: 2 }}>🍽️ {delivery.restaurant}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.6rem', color: '#22c55e' }}>₹{delivery.earnings}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Est. earnings</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                    { icon: '📍', label: 'Distance', val: delivery.distance },
                    { icon: '⏱️', label: 'Est. Time', val: delivery.estimatedTime },
                    { icon: '📦', label: 'Items', val: `${delivery.items} items` },
                ].map(({ icon, label, val }) => (
                    <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', textAlign: 'center' }}>
                        <p style={{ fontSize: '1.2rem', marginBottom: 2 }}>{icon}</p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: 1 }}>{label}</p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--accent-cream)', fontWeight: 500 }}>{val}</p>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: 14, fontFamily: 'var(--font-body)', fontSize: '0.72rem' }}>
                <p style={{ color: 'var(--text-muted)' }}>🏪 Pickup: <span style={{ color: 'var(--accent-cream)' }}>{delivery.restaurantAddress}</span></p>
                <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>📬 Drop: <span style={{ color: 'var(--accent-cream)' }}>{delivery.deliveryAddress}</span></p>
            </div>

            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAccept(delivery)}
                style={{
                    width: '100%', padding: '12px 0', borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-fire)', color: '#fff',
                    fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase',
                    boxShadow: '0 0 20px var(--glow-fire)', border: 'none', cursor: 'none',
                }}
            >
                Accept Delivery →
            </motion.button>
        </motion.div>
    );
}

// ── Active Delivery Card ───────────────────────────────────────────────────
function ActiveCard({ delivery, onAdvance }: { delivery: ActiveDelivery; onAdvance: (id: string) => void }) {
    const cfg = DELIVERY_STATUS[delivery.status];
    const steps: Array<ActiveDelivery['status']> = ['accepted', 'picked_up', 'on_the_way', 'delivered'];
    const currentIdx = steps.indexOf(delivery.status);

    return (
        <motion.div
            layout
            className="glass"
            style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: `1px solid ${cfg.color}22`, gridColumn: '1 / -1' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase' }}>Active Delivery</p>
                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.6rem', letterSpacing: 2 }}>{delivery.orderNumber}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `${cfg.color}15`, border: `1px solid ${cfg.color}44`, borderRadius: 'var(--radius-sm)', padding: '8px 16px' }}>
                    <span style={{ fontSize: '1.4rem' }}>{cfg.emoji}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: cfg.color, letterSpacing: 1 }}>{cfg.label}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {steps.map((s, i) => (
                    <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= currentIdx ? cfg.color : 'var(--bg-elevated)', transition: 'background 0.4s' }} />
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 4 }}>RESTAURANT</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>🍽️ {delivery.restaurant}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{delivery.restaurantAddress}</p>
                </div>
                <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 4 }}>CUSTOMER</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>👤 {delivery.customer}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{delivery.deliveryAddress}</p>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.6rem', color: '#22c55e' }}>₹{delivery.earnings}</p>
                {cfg.next && (
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onAdvance(delivery.id)}
                        style={{
                            padding: '12px 28px', borderRadius: 'var(--radius-sm)',
                            background: 'var(--accent-fire)', color: '#fff',
                            fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase',
                            boxShadow: '0 0 20px var(--glow-fire)', border: 'none', cursor: 'none',
                        }}
                    >
                        {cfg.nextLabel} →
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function DriverDashboard() {
    const { user, clearAuth } = useAuthStore();
    const navigate = useNavigate();
    const [available, setAvailable] = useState<AvailableDelivery[]>(MOCK_AVAILABLE);
    const [active, setActive] = useState<ActiveDelivery | null>(null);
    const [todayCount, setTodayCount] = useState(3);
    const [todayEarnings, setTodayEarnings] = useState(285);
    const [online, setOnline] = useState(true);

    const acceptDelivery = (d: AvailableDelivery) => {
        setActive({
            ...d,
            status: 'accepted',
            customer: 'Riya Sharma',
            customerPhone: '+91 98765 43210',
        });
        setAvailable(prev => prev.filter(a => a.id !== d.id));
        toast.success(`Accepted ${d.orderNumber}! Head to ${d.restaurant}.`);
    };

    const advanceDelivery = (id: string) => {
        if (!active || active.id !== id) return;
        const cfg = DELIVERY_STATUS[active.status];
        if (!cfg.next) return;
        const next = cfg.next as ActiveDelivery['status'];
        if (next === 'delivered') {
            toast.success(`🎉 ${active.orderNumber} delivered! You earned ₹${active.earnings}.`);
            setTodayCount(c => c + 1);
            setTodayEarnings(e => e + active.earnings);
            setActive(null);
        } else {
            setActive({ ...active, status: next });
            toast.success(DELIVERY_STATUS[next].label);
        }
    };

    const handleLogout = () => {
        clearAuth();
        toast.success('Logged out');
        navigate('/login');
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-void)', paddingTop: 80, paddingBottom: 60 }}>
            {/* Ambient glow */}
            <div style={{ position: 'fixed', top: -300, left: -200, width: 700, height: 700, borderRadius: '50%', background: 'rgba(96,165,250,0.15)', filter: 'blur(200px)', opacity: 0.4, pointerEvents: 'none', zIndex: 0 }} />

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-lg)', position: 'relative', zIndex: 1 }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
                    <div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Driver Dashboard</p>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1 }}>
                            {user?.first_name ? `Hey, ${user.first_name}! 🛵` : 'Delivery Control'}
                        </h1>
                        <p style={{ fontFamily: 'var(--font-sub)', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: 6, fontSize: '1.1rem' }}>
                            Accept deliveries and update your status
                        </p>
                    </div>
                    {/* Online toggle */}
                    <div className="glass" style={{ borderRadius: 'var(--radius-sm)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>STATUS</span>
                        <button
                            onClick={() => { setOnline(v => !v); toast.success(online ? 'You are now offline' : 'You are now online!'); }}
                            style={{
                                width: 64, height: 32, borderRadius: 16, cursor: 'none', flexShrink: 0,
                                background: online ? '#22c55e' : 'var(--bg-elevated)',
                                border: online ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                position: 'relative', transition: 'background 0.25s',
                                boxShadow: online ? '0 0 16px rgba(34,197,94,0.4)' : 'none',
                            }}
                        >
                            <motion.span
                                animate={{ x: online ? 32 : 4 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                style={{ position: 'absolute', top: 4, width: 24, height: 24, borderRadius: '50%', background: '#fff', display: 'block' }}
                            />
                        </button>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: online ? '#22c55e' : 'var(--text-muted)', fontWeight: 600 }}>
                            {online ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                    <StatCard emoji="📦" label="Today's Deliveries" value={todayCount} color="#60a5fa" />
                    <StatCard emoji="💰" label="Today's Earnings" value={`₹${todayEarnings}`} color="#22c55e" />
                    <StatCard emoji="⭐" label="Driver Rating" value="4.9" color="var(--accent-gold)" />
                    <StatCard emoji="⚡" label="Available Orders" value={available.length} color="var(--accent-fire)" />
                </div>

                {/* Active Delivery */}
                <AnimatePresence>
                    {active && (
                        <motion.div key="active" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: 'var(--space-md)' }}>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: '#22c55e', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Active Delivery</p>
                            <div style={{ display: 'grid' }}>
                                <ActiveCard delivery={active} onAdvance={advanceDelivery} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Available orders */}
                {online && (
                    <div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 'var(--space-sm)' }}>
                            {available.length > 0 ? `${available.length} Available Deliveries` : 'No Available Deliveries Near You'}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
                            <AnimatePresence>
                                {available.map(d => (
                                    <AvailableCard key={d.id} delivery={d} onAccept={acceptDelivery} />
                                ))}
                            </AnimatePresence>
                            {available.length === 0 && !active && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', padding: 'var(--space-xl)', textAlign: 'center', gridColumn: '1/-1' }}>
                                    No deliveries available right now. Hang tight! 🛵
                                </motion.p>
                            )}
                        </div>
                    </div>
                )}

                {!online && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                        <p style={{ fontSize: '4rem', marginBottom: 16 }}>😴</p>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 8 }}>You're Offline</p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Toggle online above to start accepting deliveries</p>
                    </div>
                )}
            </div>
        </div>
    );
}
