import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { restaurantApi } from '../services/api';
import type { CartItem } from '../App';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } } };

const CUISINE_EMOJI: Record<string, string> = {
    italian: '🍕', chinese: '🥢', indian: '🍛', mexican: '🌮',
    american: '🍔', japanese: '🍣', thai: '🍜', fast_food: '🍟', other: '🍽️'
};

interface DbMenuItem {
    id: number;
    name: string;
    description?: string;
    price: number;
    category: string;
    is_available: boolean;
    is_vegetarian: boolean;
    is_vegan: boolean;
    is_spicy: boolean;
    is_gluten_free: boolean;
}

interface DbRestaurant {
    id: number;
    name: string;
    cuisine_type: string;
    rating: number;
    delivery_time_min: number;
    delivery_time_max: number;
    delivery_fee: number;
    description?: string;
}

export default function MenuPage({ restaurantId, cart, addToCart, updateQty, onViewCart }: {
    restaurantId: number;
    cart: CartItem[];
    addToCart: (item: { id: number; name: string; price: number; emoji: string; restaurantId: number }) => void;
    updateQty: (id: number, qty: number) => void;
    onViewCart: () => void;
}) {
    const [restaurant, setRestaurant] = useState<DbRestaurant | null>(null);
    const [menuByCategory, setMenuByCategory] = useState<Record<string, DbMenuItem[]>>({});
    const [activeCat, setActiveCat] = useState('');
    const [addedId, setAddedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');

        Promise.all([
            restaurantApi.getById(restaurantId),
            restaurantApi.getMenu(restaurantId, { available_only: false })
        ])
            .then(([restRes, menuRes]) => {
                const rest: DbRestaurant = restRes.data;
                setRestaurant(rest);

                const items: DbMenuItem[] = menuRes.data ?? [];
                // Group by category
                const grouped: Record<string, DbMenuItem[]> = {};
                items.forEach(item => {
                    const cat = item.category || 'Other';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(item);
                });
                setMenuByCategory(grouped);

                const cats = Object.keys(grouped);
                if (cats.length > 0) setActiveCat(cats[0]);
            })
            .catch(() => setError('Could not load menu. Is the backend running?'))
            .finally(() => setLoading(false));
    }, [restaurantId]);

    const cartCount = cart.reduce((s, i) => s + i.qty, 0);
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

    const handleAdd = (item: DbMenuItem) => {
        const emoji = CUISINE_EMOJI[restaurant?.cuisine_type ?? 'other'] ?? '🍽️';
        addToCart({ id: item.id, name: item.name, price: item.price, emoji, restaurantId });
        setAddedId(item.id);
        setTimeout(() => setAddedId(null), 600);
    };

    const categories = Object.keys(menuByCategory);
    const cuisineLabel = restaurant?.cuisine_type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '';
    const emoji = CUISINE_EMOJI[restaurant?.cuisine_type ?? 'other'] ?? '🍽️';

    if (loading) {
        return (
            <section style={{ minHeight: '100vh', paddingTop: 64, display: 'grid', gridTemplateColumns: '30% 1fr' }}>
                <aside style={{ padding: 'var(--space-xl)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)', marginBottom: 16 }} />
                    <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)' }} />
                </aside>
                <div style={{ padding: 'var(--space-xl)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', alignContent: 'start' }}>
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />)}
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 64 }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: 8 }}>Could not load menu</p>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{error}</p>
                </div>
            </section>
        );
    }

    return (
        <section className="menu-split" style={{ minHeight: '100vh', display: 'flex', paddingTop: 64 }}>
            {/* Sidebar */}
            <aside className="menu-sidebar glass" style={{ width: '30%', position: 'sticky', top: 64, height: 'calc(100vh - 64px)', padding: 'var(--space-xl) var(--space-lg)', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.04)', overflowY: 'auto' }}>
                {/* Animated emoji */}
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: '5rem', textAlign: 'center', marginBottom: 'var(--space-md)', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }}>
                    {emoji}
                </motion.div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', textAlign: 'center', marginBottom: 'var(--space-xs)' }}>{restaurant?.name}</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-accent)', color: 'var(--accent-gold)' }}>★ {restaurant?.rating.toFixed(1)}</span>
                    <span>🕐 {restaurant?.delivery_time_min}–{restaurant?.delivery_time_max} min</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                    <span style={{ fontFamily: 'var(--font-body)', letterSpacing: 1, textTransform: 'uppercase' }}>{cuisineLabel}</span>
                    {restaurant && restaurant.delivery_fee > 0 && (
                        <span style={{ marginLeft: 8, color: '#22c55e' }}>• ₹{restaurant.delivery_fee} delivery</span>
                    )}
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 'var(--space-md)' }} />

                {/* Category nav */}
                {categories.map(cat => (
                    <button key={cat} onClick={() => {
                        setActiveCat(cat);
                        document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', marginBottom: 4, borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', textTransform: 'capitalize', letterSpacing: 1, color: activeCat === cat ? 'var(--accent-cream)' : 'var(--text-muted)', background: activeCat === cat ? 'rgba(255,69,0,0.08)' : 'transparent', borderLeft: activeCat === cat ? '2px solid var(--accent-fire)' : '2px solid transparent', transition: 'all 0.2s' }}>
                        {cat}
                    </button>
                ))}

                {/* Mini cart */}
                <div style={{ marginTop: 'auto', paddingTop: 'var(--space-lg)' }}>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 'var(--space-md)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 'var(--space-sm)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{cartCount} items</span>
                        <span style={{ fontFamily: 'var(--font-accent)', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onViewCart} style={{ width: '100%', padding: '12px 0', background: cartCount > 0 ? 'var(--accent-fire)' : 'var(--bg-elevated)', color: cartCount > 0 ? '#fff' : 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', letterSpacing: 2, textTransform: 'uppercase', borderRadius: 'var(--radius-sm)', transition: 'background 0.3s' }}>
                        View Cart
                    </motion.button>
                </div>
            </aside>

            {/* Right content */}
            <div style={{ flex: 1, padding: 'var(--space-xl) var(--space-lg)', overflowY: 'auto' }}>
                {categories.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                        <p style={{ fontSize: '3rem', marginBottom: 12 }}>📭</p>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: 8 }}>Menu is empty</p>
                        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>The restaurant hasn't added any items yet.</p>
                    </div>
                ) : categories.map(cat => (
                    <div key={cat} id={`cat-${cat}`} style={{ marginBottom: 'var(--space-2xl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                            <h3 style={{ fontFamily: 'var(--font-sub)', fontStyle: 'italic', fontSize: '1.8rem', textTransform: 'capitalize' }}>{cat}</h3>
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                        </div>
                        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                            {menuByCategory[cat].map(mi => {
                                const inCart = cart.find(c => c.id === mi.id);
                                const justAdded = addedId === mi.id;
                                return (
                                    <motion.div
                                        key={mi.id}
                                        variants={fadeUp}
                                        whileHover={{ scale: 1.02 }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                                            padding: 'var(--space-sm)', background: 'var(--bg-surface)',
                                            borderRadius: 'var(--radius-md)', border: `1px solid ${mi.is_available ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'}`,
                                            transition: 'border-color 0.3s', opacity: mi.is_available ? 1 : 0.45
                                        }}
                                    >
                                        {/* Emoji */}
                                        <div style={{ width: 70, height: 70, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, rgba(255,69,0,0.1), rgba(255,140,0,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', flexShrink: 0, position: 'relative' }}>
                                            {CUISINE_EMOJI[restaurant?.cuisine_type ?? 'other'] ?? '🍽️'}
                                            {!mi.is_available && (
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#f87171', fontFamily: 'var(--font-body)', letterSpacing: 1, textTransform: 'uppercase' }}>sold out</div>
                                            )}
                                        </div>
                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 500 }}>
                                                {mi.name}
                                                {mi.is_vegetarian && <span style={{ marginLeft: 4, fontSize: '0.7rem' }}>🟢</span>}
                                                {mi.is_spicy && <span style={{ marginLeft: 4, fontSize: '0.7rem' }}>🌶️</span>}
                                                {mi.is_vegan && <span style={{ marginLeft: 4, fontSize: '0.7rem' }}>🌱</span>}
                                            </p>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{mi.description}</p>
                                            <p style={{ fontFamily: 'var(--font-accent)', color: 'var(--accent-gold)', fontSize: '1.2rem', marginTop: 4 }}>₹{mi.price.toLocaleString('en-IN')}</p>
                                        </div>
                                        {/* Add / Qty */}
                                        {!mi.is_available ? null : inCart ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <button onClick={() => updateQty(mi.id, inCart.qty > 1 ? inCart.qty - 1 : 0)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>−</button>
                                                <span style={{ fontFamily: 'var(--font-accent)', fontSize: '1.1rem', width: 20, textAlign: 'center' }}>{inCart.qty}</span>
                                                <button onClick={() => updateQty(mi.id, inCart.qty + 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>+</button>
                                            </div>
                                        ) : (
                                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleAdd(mi)} style={{ width: 36, height: 36, borderRadius: '50%', background: justAdded ? '#22c55e' : 'var(--accent-fire)', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px var(--glow-fire)', transition: 'background 0.3s' }}>
                                                {justAdded ? '✓' : '+'}
                                            </motion.button>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>
                ))}
            </div>
        </section>
    );
}
