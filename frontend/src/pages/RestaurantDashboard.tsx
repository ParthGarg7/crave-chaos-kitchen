import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { restaurantApi, menuApi, orderApi } from '../services/api';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────
interface RealMenuItem {
    id: number;
    name: string;
    description?: string;
    category: string;
    price: number;
    is_available: boolean;
    is_vegetarian: boolean;
    is_vegan: boolean;
    is_gluten_free: boolean;
    is_spicy: boolean;
    image_url?: string;
    restaurant_id: number;
}

interface RealOrder {
    id: number;
    order_number: string;
    customer_id: number;
    delivery_address: string;
    items: { item_name: string; quantity: number; item_price: number; subtotal: number }[];
    total: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
    created_at: string;
}

interface Restaurant {
    id: number;
    name: string;
    description?: string;
    status: string;
    cuisine_type: string;
    city: string;
    menu_items: RealMenuItem[];
    rating: number;
    delivery_fee: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pending', color: '#ffc845', bg: 'rgba(255,200,69,0.12)' },
    confirmed: { label: 'Confirmed', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
    preparing: { label: 'Preparing', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
    ready: { label: 'Ready ✓', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
};

const NEXT_STATUS: Record<string, string | null> = {
    pending: 'confirmed',
    confirmed: 'preparing',
    preparing: 'ready',
    ready: null,
};

const NEXT_LABEL: Record<string, string> = {
    pending: 'Accept Order',
    confirmed: 'Start Preparing',
    preparing: 'Mark Ready',
    ready: '',
};

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

// ── Add Item Modal ─────────────────────────────────────────────────────────
function AddItemModal({
    restaurantId,
    onClose,
    onSaved,
    editItem,
}: {
    restaurantId: number;
    onClose: () => void;
    onSaved: () => void;
    editItem?: RealMenuItem | null;
}) {
    const [form, setForm] = useState({
        name: editItem?.name ?? '',
        description: editItem?.description ?? '',
        category: editItem?.category ?? '',
        price: editItem?.price?.toString() ?? '',
        is_vegetarian: editItem?.is_vegetarian ?? false,
        is_vegan: editItem?.is_vegan ?? false,
        is_spicy: editItem?.is_spicy ?? false,
        is_gluten_free: editItem?.is_gluten_free ?? false,
        is_available: editItem?.is_available ?? true,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.category.trim() || !form.price) {
            toast.error('Name, category and price are required');
            return;
        }
        const price = parseFloat(form.price);
        if (isNaN(price) || price <= 0) {
            toast.error('Price must be a positive number');
            return;
        }
        setSaving(true);
        try {
            if (editItem) {
                await menuApi.updateItem(restaurantId, editItem.id, { ...form, price });
                toast.success(`${form.name} updated!`);
            } else {
                await menuApi.addItem(restaurantId, { ...form, price });
                toast.success(`${form.name} added to menu!`);
            }
            onSaved();
            onClose();
        } catch {
            // Error handled by interceptor
        } finally {
            setSaving(false);
        }
    };

    const inp = {
        width: '100%', padding: '10px 12px',
        background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--radius-sm)', color: 'var(--accent-cream)',
        fontFamily: 'var(--font-body)', fontSize: '0.82rem', outline: 'none',
    } as React.CSSProperties;

    const lbl = {
        display: 'block', fontFamily: 'var(--font-body)',
        fontSize: '0.63rem', letterSpacing: 2, textTransform: 'uppercase' as const,
        color: 'var(--text-muted)', marginBottom: 6,
    };

    const chkRow = (key: keyof typeof form, label: string) => (
        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'none', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <input
                type="checkbox"
                checked={form[key] as boolean}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                style={{ accentColor: 'var(--accent-fire)', width: 16, height: 16 }}
            />
            {label}
        </label>
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="glass"
                style={{ width: '100%', maxWidth: 520, borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', border: '1px solid rgba(255,69,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>
                        {editItem ? '✏️ Edit Item' : '+ Add Menu Item'}
                    </h2>
                    <button onClick={onClose} style={{ fontSize: '1.5rem', color: 'var(--text-muted)', background: 'none', border: 'none' }}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={lbl}>Item Name *</label>
                        <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Margherita Pizza" required />
                    </div>
                    <div>
                        <label style={lbl}>Description</label>
                        <textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description..." />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={lbl}>Category *</label>
                            <input style={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Mains, Desserts" required />
                        </div>
                        <div>
                            <label style={lbl}>Price (₹) *</label>
                            <input style={inp} type="number" step="0.01" min="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="249.00" required />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                        {chkRow('is_vegetarian', '🟢 Vegetarian')}
                        {chkRow('is_vegan', '🌱 Vegan')}
                        {chkRow('is_spicy', '🌶️ Spicy')}
                        {chkRow('is_gluten_free', '✅ Gluten Free')}
                        {chkRow('is_available', '🟡 Available')}
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: '14px 0', background: 'var(--accent-fire)', color: '#fff',
                            fontFamily: 'var(--font-accent)', fontSize: '1.1rem', letterSpacing: 2,
                            borderRadius: 'var(--radius-sm)', border: 'none', opacity: saving ? 0.7 : 1,
                            boxShadow: '0 0 24px var(--glow-fire)', cursor: 'none',
                        }}
                    >
                        {saving ? 'Saving...' : editItem ? 'Update Item' : 'Add to Menu'}
                    </motion.button>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ── Order Card ─────────────────────────────────────────────────────────────
function OrderCard({ order, onAdvance }: { order: RealOrder; onAdvance: (id: number, nextStatus: string) => void }) {
    const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: '#fff', bg: 'rgba(255,255,255,0.08)' };
    const nextStatus = NEXT_STATUS[order.status];
    const nextLabel = NEXT_LABEL[order.status] ?? '';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -80 }}
            className="glass"
            style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.2rem', letterSpacing: 2 }}>#{order.order_number}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.65rem', letterSpacing: 2, textTransform: 'uppercase',
                    color: cfg.color, background: cfg.bg, padding: '4px 12px', borderRadius: 'var(--radius-pill)',
                    border: `1px solid ${cfg.color}44`,
                }}>
                    {cfg.label}
                </span>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12, marginBottom: 12 }}>
                {order.items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '0.75rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--accent-cream)' }}>{it.quantity}x {it.item_name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>₹{it.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>📍 {order.delivery_address.slice(0, 40)}...</p>
                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.4rem', color: 'var(--accent-gold)', marginTop: 2 }}>₹{order.total.toLocaleString('en-IN')}</p>
                </div>
                {nextLabel && nextStatus && (
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onAdvance(order.id, nextStatus)}
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

// ── Menu Item Row ──────────────────────────────────────────────────────────
function MenuItemRow({
    item, restaurantId, onToggle, onDelete, onEdit,
}: {
    item: RealMenuItem; restaurantId: number;
    onToggle: (id: number, val: boolean) => void;
    onDelete: (id: number) => void;
    onEdit: (item: RealMenuItem) => void;
}) {
    const [toggling, setToggling] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleToggle = async () => {
        setToggling(true);
        try {
            await menuApi.toggleAvailability(restaurantId, item.id, !item.is_available);
            onToggle(item.id, !item.is_available);
            toast.success(`${item.name} marked ${!item.is_available ? 'Available' : 'Unavailable'}`);
        } catch {
            // handled by interceptor
        } finally {
            setToggling(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${item.name}" from menu?`)) return;
        setDeleting(true);
        try {
            await menuApi.deleteItem(restaurantId, item.id);
            onDelete(item.id);
            toast.success(`${item.name} removed from menu`);
        } catch {
            // handled by interceptor
        } finally {
            setDeleting(false);
        }
    };

    return (
        <motion.div
            layout
            className="glass"
            style={{ borderRadius: 'var(--radius-sm)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(255,255,255,0.04)' }}
        >
            <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 500, color: item.is_available ? 'var(--accent-cream)' : 'var(--text-muted)' }}>
                    {item.name}
                    {item.is_vegetarian && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#22c55e' }}>🟢</span>}
                    {item.is_spicy && <span style={{ marginLeft: 4, fontSize: '0.7rem' }}>🌶️</span>}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.category}</p>
            </div>

            <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.2rem', color: 'var(--accent-gold)', minWidth: 70, textAlign: 'right' }}>₹{item.price}</p>

            {/* Edit */}
            <button
                onClick={() => onEdit(item)}
                style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', cursor: 'none' }}
            >
                ✏️
            </button>

            {/* Delete */}
            <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: '#f87171', cursor: 'none', opacity: deleting ? 0.5 : 1 }}
            >
                🗑️
            </button>

            {/* Toggle */}
            <button
                onClick={handleToggle}
                disabled={toggling}
                style={{
                    width: 52, height: 28, borderRadius: 14, cursor: 'none',
                    background: item.is_available ? 'var(--accent-fire)' : 'var(--bg-elevated)',
                    border: item.is_available ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    position: 'relative', transition: 'background 0.25s', flexShrink: 0,
                    boxShadow: item.is_available ? '0 0 12px var(--glow-fire)' : 'none',
                    opacity: toggling ? 0.6 : 1,
                }}
            >
                <motion.span
                    animate={{ x: item.is_available ? 24 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{ position: 'absolute', top: 4, width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'block' }}
                />
            </button>
        </motion.div>
    );
}

// ── Empty Restaurant Onboarding ────────────────────────────────────────────
function NoRestaurantPanel() {
    const navigate = useNavigate();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                maxWidth: 560, margin: '80px auto 0', textAlign: 'center',
                padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)',
                background: 'rgba(255,69,0,0.04)', border: '1px solid rgba(255,69,0,0.12)',
            }}
            className="glass"
        >
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🍽️</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 10 }}>Set Up Your Restaurant</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>
                Welcome! You haven't created your restaurant profile yet. Set it up to start receiving orders, managing your menu, and tracking earnings.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 'var(--space-lg)', textAlign: 'left' }}>
                {[
                    { icon: '🏪', title: 'Create Profile', desc: 'Add your restaurant name, address, and cuisine type' },
                    { icon: '🍕', title: 'Build Menu', desc: 'Add dishes, set prices, and toggle availability' },
                    { icon: '📦', title: 'Receive Orders', desc: 'Accept and manage incoming customer orders' },
                    { icon: '💰', title: 'Track Revenue', desc: 'Monitor daily earnings and order history' },
                ].map(step => (
                    <div key={step.title} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
                        <p style={{ fontSize: '1.4rem', marginBottom: 6 }}>{step.icon}</p>
                        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem', color: 'var(--accent-cream)', marginBottom: 4 }}>{step.title}</p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.67rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</p>
                    </div>
                ))}
            </div>
            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/setup-restaurant')}
                style={{
                    padding: '14px 40px', background: 'var(--accent-fire)', color: '#fff',
                    fontFamily: 'var(--font-accent)', fontSize: '1.1rem', letterSpacing: 2,
                    borderRadius: 'var(--radius-sm)', border: 'none',
                    boxShadow: '0 0 30px var(--glow-fire)', cursor: 'none',
                }}
            >
                CREATE MY RESTAURANT →
            </motion.button>
        </motion.div>
    );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function RestaurantDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [orders, setOrders] = useState<RealOrder[]>([]);
    const [menuItems, setMenuItems] = useState<RealMenuItem[]>([]);
    const [tab, setTab] = useState<'orders' | 'menu'>('orders');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editItem, setEditItem] = useState<RealMenuItem | null>(null);
    const [noRestaurant, setNoRestaurant] = useState(false);
    const [showRestaurantPicker, setShowRestaurantPicker] = useState(false);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auth guard
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (user.role !== 'restaurant_owner' && user.role !== 'admin') {
            toast.error('Access denied');
            navigate('/');
        }
    }, [user, navigate]);

    const loadOrdersForRestaurant = useCallback(async (restId: number) => {
        try {
            const ordRes = await orderApi.getRestaurantOrders({ restaurant_id: restId });
            setOrders(ordRes.data ?? []);
        } catch {
            // silently ignore order fetch failures
        }
    }, []);

    const selectRestaurant = useCallback((r: Restaurant) => {
        setRestaurant(r);
        setMenuItems(r.menu_items ?? []);
        setShowRestaurantPicker(false);
        loadOrdersForRestaurant(r.id);
    }, [loadOrdersForRestaurant]);

    const fetchRestaurantData = useCallback(async () => {
        try {
            const res = await restaurantApi.getMyRestaurants();
            const list: Restaurant[] = res.data ?? [];
            setAllRestaurants(list);

            if (list.length === 0) {
                setNoRestaurant(true);
            } else {
                setNoRestaurant(false);
                setError('');
                // Keep current selection if still valid, otherwise pick first
                setRestaurant(prev => {
                    const current = prev ? list.find(r => r.id === prev.id) ?? list[0] : list[0];
                    setMenuItems(current.menu_items ?? []);
                    loadOrdersForRestaurant(current.id);
                    return current;
                });
            }
        } catch (err: unknown) {
            const e = err as { response?: { status?: number } };
            if (e?.response?.status === 404) {
                setNoRestaurant(true);
            } else {
                setError('Failed to load restaurant data. Is the backend running?');
            }
        } finally {
            setLoading(false);
        }
    }, [loadOrdersForRestaurant]);

    useEffect(() => {
        fetchRestaurantData();
        // Poll every 15 seconds for real-time order updates
        pollRef.current = setInterval(fetchRestaurantData, 15000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchRestaurantData]);

    const handleAdvanceOrder = async (orderId: number, nextStatus: string) => {
        try {
            await orderApi.updateStatus(orderId, nextStatus);
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus as RealOrder['status'] } : o));
            toast.success(`Order updated to ${STATUS_CONFIG[nextStatus]?.label ?? nextStatus}`);
        } catch {
            // handled by interceptor
        }
    };

    const handleToggleItem = (itemId: number, newVal: boolean) => {
        setMenuItems(prev => prev.map(m => m.id === itemId ? { ...m, is_available: newVal } : m));
    };

    const handleDeleteItem = (itemId: number) => {
        setMenuItems(prev => prev.filter(m => m.id !== itemId));
    };

    const handleSaved = () => {
        fetchRestaurantData();
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{ width: 48, height: 48, border: '3px solid rgba(255,69,0,0.2)', borderTopColor: 'var(--accent-fire)', borderRadius: '50%', margin: '0 auto 16px' }}
                    />
                    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', fontSize: '0.82rem', letterSpacing: 2 }}>LOADING DASHBOARD...</p>
                </div>
            </div>
        );
    }

    if (noRestaurant) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-void)', paddingTop: 80 }}>
                <div style={{ position: 'fixed', top: -300, right: -200, width: 700, height: 700, borderRadius: '50%', background: 'var(--glow-fire)', filter: 'blur(200px)', opacity: 0.12, pointerEvents: 'none' }} />
                <NoRestaurantPanel />
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
                    <button onClick={fetchRestaurantData} style={{ padding: '12px 28px', background: 'var(--accent-fire)', color: '#fff', borderRadius: 'var(--radius-sm)', border: 'none', fontFamily: 'var(--font-body)', fontSize: '0.82rem', cursor: 'none' }}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const activeCount = orders.filter(o => ['confirmed', 'preparing'].includes(o.status)).length;
    const todayRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
    const availableItems = menuItems.filter(m => m.is_available).length;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-void)', paddingTop: 80, paddingBottom: 60 }}>
            <div style={{ position: 'fixed', top: -300, right: -200, width: 700, height: 700, borderRadius: '50%', background: 'var(--glow-fire)', filter: 'blur(200px)', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }} />

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-lg)', position: 'relative', zIndex: 1 }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
                    <div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Restaurant Dashboard</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1 }}>
                                {restaurant?.name ?? (user?.first_name ? `Welcome, ${user.first_name}` : 'Kitchen Control')}
                            </h1>
                            {/* Multi-restaurant switcher */}
                            {allRestaurants.length > 1 && (
                                <div style={{ position: 'relative' }}>
                                    <motion.button
                                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                        onClick={() => setShowRestaurantPicker(p => !p)}
                                        style={{ padding: '6px 14px', background: 'var(--bg-elevated)', border: '1px solid rgba(255,69,0,0.3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--accent-fire)', letterSpacing: 1, cursor: 'none' }}
                                    >
                                        🔀 Switch ({allRestaurants.length})
                                    </motion.button>
                                    <AnimatePresence>
                                        {showRestaurantPicker && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                                style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: 220, background: 'var(--bg-surface)', border: '1px solid rgba(255,69,0,0.2)', borderRadius: 'var(--radius-md)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden', zIndex: 500 }}
                                            >
                                                {allRestaurants.map(r => (
                                                    <button
                                                        key={r.id}
                                                        onClick={() => selectRestaurant(r)}
                                                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: r.id === restaurant?.id ? 'rgba(255,69,0,0.10)' : 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: r.id === restaurant?.id ? 'var(--accent-fire)' : 'var(--accent-cream)', cursor: 'none', transition: 'background 0.15s' }}
                                                    >
                                                        {r.id === restaurant?.id ? '✓ ' : ''}{r.name}
                                                        <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{r.status?.toUpperCase()}</span>
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => { setShowRestaurantPicker(false); navigate('/setup-restaurant'); }}
                                                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#22c55e', cursor: 'none' }}
                                                >
                                                    + Add Another Restaurant
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                            {allRestaurants.length === 1 && (
                                <motion.button
                                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                    onClick={() => navigate('/setup-restaurant')}
                                    style={{ padding: '6px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#22c55e', letterSpacing: 1, cursor: 'none' }}
                                >
                                    + Add Restaurant
                                </motion.button>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                            <span style={{
                                fontFamily: 'var(--font-body)', fontSize: '0.6rem', letterSpacing: 2, textTransform: 'uppercase',
                                padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                                background: restaurant?.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(255,200,69,0.12)',
                                color: restaurant?.status === 'active' ? '#22c55e' : '#ffc845',
                                border: `1px solid ${restaurant?.status === 'active' ? '#22c55e44' : '#ffc84544'}`,
                            }}>
                                {restaurant?.status?.toUpperCase()}
                            </span>
                            <p style={{ fontFamily: 'var(--font-sub)', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Live updates every 15s
                            </p>
                        </div>
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
                    <StatCard emoji="🍳" label="Active Orders" value={activeCount} color="#60a5fa" />
                    <StatCard emoji="💰" label="Today's Revenue" value={`₹${todayRevenue.toLocaleString('en-IN')}`} color="var(--accent-gold)" />
                    <StatCard emoji="✅" label="Menu Available" value={`${availableItems}/${menuItems.length}`} color="#22c55e" />
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-md)', alignItems: 'center' }}>
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
                    {tab === 'menu' && (
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => { setEditItem(null); setShowAddModal(true); }}
                            style={{
                                marginLeft: 'auto', padding: '10px 22px', borderRadius: 'var(--radius-sm)', cursor: 'none',
                                background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                                fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: 1,
                                border: '1px solid rgba(34,197,94,0.3)', transition: 'all 0.2s',
                            }}
                        >
                            + Add Item
                        </motion.button>
                    )}
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {tab === 'orders' && (
                        <motion.div key="orders" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                            {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                                    <p style={{ fontSize: '3rem', marginBottom: 12 }}>🍵</p>
                                    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }}>No active orders right now. Take a breather!</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-md)' }}>
                                    <AnimatePresence>
                                        {orders
                                            .filter(o => !['delivered', 'cancelled'].includes(o.status))
                                            .map(order => (
                                                <OrderCard key={order.id} order={order} onAdvance={handleAdvanceOrder} />
                                            ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {tab === 'menu' && (
                        <motion.div key="menu" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                            {menuItems.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                                    <p style={{ fontSize: '3rem', marginBottom: 12 }}>📭</p>
                                    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', marginBottom: 16 }}>No menu items yet. Add your first dish!</p>
                                    <button
                                        onClick={() => { setEditItem(null); setShowAddModal(true); }}
                                        style={{ padding: '12px 28px', background: 'var(--accent-fire)', color: '#fff', borderRadius: 'var(--radius-sm)', border: 'none', fontFamily: 'var(--font-body)', fontSize: '0.82rem', cursor: 'none', boxShadow: '0 0 20px var(--glow-fire)' }}
                                    >
                                        + Add First Item
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <AnimatePresence>
                                        {menuItems.map(item => (
                                            <MenuItemRow
                                                key={item.id}
                                                item={item}
                                                restaurantId={restaurant!.id}
                                                onToggle={handleToggleItem}
                                                onDelete={handleDeleteItem}
                                                onEdit={i => { setEditItem(i); setShowAddModal(true); }}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showAddModal && restaurant && (
                    <AddItemModal
                        restaurantId={restaurant.id}
                        onClose={() => { setShowAddModal(false); setEditItem(null); }}
                        onSaved={handleSaved}
                        editItem={editItem}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
