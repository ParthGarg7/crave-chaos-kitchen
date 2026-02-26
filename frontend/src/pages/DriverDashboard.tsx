import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { deliveryApi } from '../services/api';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────
interface DeliveryItem {
    id: number;
    order_id: number;
    status: 'assigned' | 'accepted' | 'at_restaurant' | 'picked_up' | 'in_transit' | 'nearby' | 'arrived' | 'delivered' | 'failed';
    driver_id?: number;
    order?: {
        order_number: string;
        total: number;
        delivery_address: string;
        restaurant?: { name: string; address: string; city: string };
        customer?: { first_name?: string; phone?: string };
        items?: { item_name: string; quantity: number }[];
    };
    assigned_at: string;
    accepted_at?: string;
    picked_up_at?: string;
    delivered_at?: string;
    estimated_distance_km?: number;
    estimated_duration_min?: number;
}

const STATUS_FLOW = {
    assigned:      { label: 'Available',          color: '#ffc845', next: null,            nextLabel: '' },
    accepted:      { label: 'Head to Restaurant', color: '#60a5fa', next: 'at_restaurant',  nextLabel: 'Arrived at Restaurant', emoji: '🏃' },
    at_restaurant: { label: 'At Restaurant',      color: '#fb923c', next: 'picked_up',      nextLabel: 'Order Picked Up',       emoji: '🏪' },
    picked_up:     { label: 'Picked Up',          color: '#fb923c', next: 'in_transit',     nextLabel: 'En Route',              emoji: '🛵' },
    in_transit:    { label: 'En Route',           color: '#ffc845', next: 'delivered',      nextLabel: 'Mark Delivered',        emoji: '📍' },
    nearby:        { label: 'Nearby',             color: '#ffc845', next: 'delivered',      nextLabel: 'Mark Delivered',        emoji: '📍' },
    arrived:       { label: 'Arrived',            color: '#a78bfa', next: 'delivered',      nextLabel: 'Confirm Delivery',      emoji: '🚪' },
    delivered:     { label: 'Delivered ✓',        color: '#22c55e', next: null,             nextLabel: '',                      emoji: '🎉' },
    failed:        { label: 'Failed',             color: '#f87171', next: null,             nextLabel: '',                      emoji: '❌' },
};

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ emoji, label, value, color }: { emoji: string; label: string; value: string | number; color?: string }) {
    return (
        <motion.div whileHover={{ y: -3 }} className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: `1px solid ${color ? color + '22' : 'rgba(255,255,255,0.05)'}` }}>
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

// ── Available Card ─────────────────────────────────────────────────────────
function AvailableCard({ delivery, onAccept }: { delivery: DeliveryItem; onAccept: (d: DeliveryItem) => void }) {
    const order = delivery.order;
    const estimatedEarnings = Math.round((delivery.estimated_distance_km ?? 3) * 12 + 40);

    return (
        <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 80 }} className="glass"
            style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.2rem', letterSpacing: 2 }}>#{order?.order_number ?? delivery.order_id}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--accent-ember)', marginTop: 2 }}>🍽️ {order?.restaurant?.name ?? 'Restaurant'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.6rem', color: '#22c55e' }}>₹{estimatedEarnings}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Est. earnings</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                    { icon: '📍', label: 'Distance', val: `${delivery.estimated_distance_km ?? '~3'} km` },
                    { icon: '⏱️', label: 'Est. Time', val: `${delivery.estimated_duration_min ?? 20} min` },
                    { icon: '📦', label: 'Value', val: `₹${order?.total?.toLocaleString('en-IN') ?? '—'}` },
                ].map(({ icon, label, val }) => (
                    <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', textAlign: 'center' }}>
                        <p style={{ fontSize: '1.2rem', marginBottom: 2 }}>{icon}</p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: 1 }}>{label}</p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--accent-cream)', fontWeight: 500 }}>{val}</p>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: 14, fontFamily: 'var(--font-body)', fontSize: '0.72rem' }}>
                <p style={{ color: 'var(--text-muted)' }}>🏪 Pickup: <span style={{ color: 'var(--accent-cream)' }}>{order?.restaurant?.address ?? 'Restaurant address'}, {order?.restaurant?.city ?? ''}</span></p>
                <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>📬 Drop: <span style={{ color: 'var(--accent-cream)' }}>{order?.delivery_address ?? 'Customer address'}</span></p>
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onAccept(delivery)}
                style={{ width: '100%', padding: '12px 0', borderRadius: 'var(--radius-sm)', background: 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase', boxShadow: '0 0 20px var(--glow-fire)', border: 'none', cursor: 'none' }}>
                Accept Delivery →
            </motion.button>
        </motion.div>
    );
}

// ── Active Delivery Card ───────────────────────────────────────────────────
function ActiveCard({ delivery, onAdvance }: { delivery: DeliveryItem; onAdvance: (id: number, next: string) => void }) {
    const cfg = STATUS_FLOW[delivery.status] ?? { label: delivery.status, color: '#fff', emoji: '📦' };
    const steps = ['accepted', 'at_restaurant', 'picked_up', 'in_transit', 'delivered'];
    const currentIdx = steps.indexOf(delivery.status);
    const order = delivery.order;

    return (
        <motion.div layout className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: `1px solid ${cfg.color}22`, gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase' }}>Active Delivery</p>
                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.6rem', letterSpacing: 2 }}>#{order?.order_number ?? delivery.order_id}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `${cfg.color}15`, border: `1px solid ${cfg.color}44`, borderRadius: 'var(--radius-sm)', padding: '8px 16px' }}>
                    <span style={{ fontSize: '1.4rem' }}>{(cfg as { emoji?: string }).emoji ?? '🛵'}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: cfg.color, letterSpacing: 1 }}>{cfg.label}</span>
                </div>
            </div>

            {/* Progress */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {steps.map((s, i) => (
                    <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= currentIdx ? cfg.color : 'var(--bg-elevated)', transition: 'background 0.4s' }} />
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 4 }}>RESTAURANT</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>🍽️ {order?.restaurant?.name ?? '—'}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{order?.restaurant?.city ?? ''}</p>
                </div>
                <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 4 }}>DELIVERY TO</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>📍 {order?.delivery_address?.slice(0, 40) ?? '—'}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {(order?.items ?? []).length} item{(order?.items ?? []).length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.6rem', color: '#22c55e' }}>
                    ₹{order?.total?.toLocaleString('en-IN') ?? '—'}
                </p>
                {cfg.next && (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onAdvance(delivery.id, cfg.next!)}
                        style={{ padding: '12px 28px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase', boxShadow: '0 0 20px var(--glow-fire)', border: 'none', cursor: 'none' }}>
                        {(cfg as { nextLabel?: string }).nextLabel ?? 'Next'} →
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}

// ── Empty Driver Onboarding ────────────────────────────────────────────────
function NoDeliveriesPanel({ online, onGoOnline }: { online: boolean; onGoOnline: () => void }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
            <p style={{ fontSize: '4rem', marginBottom: 12 }}>{online ? '🔍' : '😴'}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 8 }}>
                {online ? 'No Deliveries Available' : "You're Offline"}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                {online
                    ? 'All caught up! New orders will appear here automatically.'
                    : 'Toggle your status to start accepting deliveries in your area.'}
            </p>
            {!online && (
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onGoOnline}
                    style={{ padding: '12px 32px', background: '#22c55e', color: '#fff', borderRadius: 'var(--radius-sm)', border: 'none', fontFamily: 'var(--font-body)', fontSize: '0.82rem', letterSpacing: 1, boxShadow: '0 0 20px rgba(34,197,94,0.3)', cursor: 'none' }}>
                    Go Online →
                </motion.button>
            )}
        </motion.div>
    );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function DriverDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [available, setAvailable] = useState<DeliveryItem[]>([]);
    const [active, setActive] = useState<DeliveryItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [online, setOnline] = useState(true);
    const [todayCount, setTodayCount] = useState(0);
    const [todayEarnings, setTodayEarnings] = useState(0);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auth guard
    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        if (user.role !== 'driver' && user.role !== 'admin') {
            toast.error('Access denied');
            navigate('/');
        }
    }, [user, navigate]);

    const fetchDeliveries = useCallback(async () => {
        try {
            const [avail, mine] = await Promise.all([
                deliveryApi.getAvailable(),
                deliveryApi.getMyDeliveries(),
            ]);

            const myDeliveries: DeliveryItem[] = mine.data ?? [];
            const availDeliveries: DeliveryItem[] = avail.data ?? [];

            // Find active (non-completed) delivery
            const currentActive = myDeliveries.find(d =>
                !['delivered', 'failed'].includes(d.status)
            ) ?? null;
            setActive(currentActive);
            setAvailable(availDeliveries);

            // Calculate today's stats
            const today = new Date().toDateString();
            const todayDone = myDeliveries.filter(d =>
                d.status === 'delivered' &&
                d.delivered_at &&
                new Date(d.delivered_at).toDateString() === today
            );
            setTodayCount(todayDone.length);
            setTodayEarnings(todayDone.reduce((s, d) =>
                s + Math.round((d.estimated_distance_km ?? 3) * 12 + 40), 0
            ));

            setError('');
        } catch {
            setError('Failed to load deliveries. Is the backend running?');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (online) {
            fetchDeliveries();
            pollRef.current = setInterval(fetchDeliveries, 15000);
        } else {
            if (pollRef.current) clearInterval(pollRef.current);
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [fetchDeliveries, online]);

    const handleAccept = async (delivery: DeliveryItem) => {
        try {
            await deliveryApi.accept(delivery.id);
            toast.success(`Accepted order #${delivery.order?.order_number ?? delivery.id}! Head to the restaurant.`);
            fetchDeliveries();
        } catch {
            // handled by interceptor
        }
    };

    const handleAdvance = async (deliveryId: number, nextStatus: string) => {
        try {
            await deliveryApi.updateStatus(deliveryId, nextStatus);
            if (nextStatus === 'delivered') {
                toast.success('🎉 Delivery completed!');
                setTodayCount(c => c + 1);
                if (active) {
                    const earned = Math.round((active.estimated_distance_km ?? 3) * 12 + 40);
                    setTodayEarnings(e => e + earned);
                }
            } else {
                const cfg = STATUS_FLOW[nextStatus as keyof typeof STATUS_FLOW];
                if (cfg) toast.success(cfg.label);
            }
            fetchDeliveries();
        } catch {
            // handled by interceptor
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{ width: 48, height: 48, border: '3px solid rgba(96,165,250,0.2)', borderTopColor: '#60a5fa', borderRadius: '50%', margin: '0 auto 16px' }}
                    />
                    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', fontSize: '0.82rem', letterSpacing: 2 }}>LOADING DASHBOARD...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                    <p style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 10 }}>Connection Error</p>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>{error}</p>
                    <button onClick={fetchDeliveries} style={{ padding: '12px 28px', background: '#60a5fa', color: '#fff', borderRadius: 'var(--radius-sm)', border: 'none', fontFamily: 'var(--font-body)', fontSize: '0.82rem', cursor: 'none' }}>Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-void)', paddingTop: 80, paddingBottom: 60 }}>
            <div style={{ position: 'fixed', top: -300, left: -200, width: 700, height: 700, borderRadius: '50%', background: 'rgba(96,165,250,0.15)', filter: 'blur(200px)', opacity: 0.4, pointerEvents: 'none', zIndex: 0 }} />

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-lg)', position: 'relative', zIndex: 1 }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
                    <div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Driver Dashboard</p>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1 }}>
                            {user?.first_name ? `Hey, ${user.first_name}! 🛵` : 'Driver Control'}
                        </h1>
                        <p style={{ fontFamily: 'var(--font-sub)', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: 6, fontSize: '1rem' }}>
                            Live updates every 15s
                        </p>
                    </div>

                    {/* Online Toggle */}
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
                    <StatCard emoji="⚡" label="Available Orders" value={available.length} color="var(--accent-fire)" />
                    <StatCard emoji="📊" label="Status" value={online ? 'Online' : 'Offline'} color={online ? '#22c55e' : '#9ca3af'} />
                </div>

                {/* Active Delivery */}
                <AnimatePresence>
                    {active && (
                        <motion.div key="active" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: 'var(--space-md)' }}>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: '#22c55e', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Active Delivery</p>
                            <div style={{ display: 'grid' }}>
                                <ActiveCard delivery={active} onAdvance={handleAdvance} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Available Deliveries */}
                {online ? (
                    <div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 'var(--space-sm)' }}>
                            {available.length > 0 ? `${available.length} Available Deliveries` : 'No Deliveries Near You'}
                        </p>
                        {available.length === 0 && !active ? (
                            <NoDeliveriesPanel online={online} onGoOnline={() => setOnline(true)} />
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
                                <AnimatePresence>
                                    {available.map(d => (
                                        <AvailableCard key={d.id} delivery={d} onAccept={handleAccept} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                ) : (
                    <NoDeliveriesPanel online={false} onGoOnline={() => setOnline(true)} />
                )}
            </div>
        </div>
    );
}
