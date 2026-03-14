import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { restaurantApi } from '../services/api';
import type { CartItem } from '../App';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } };

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
                <aside style={{ padding: 'var(--space-xl)', borderRight: '1px solid var(--border-subtle)' }}>
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
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', marginBottom: 8 }}>Could not load menu</p>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{error}</p>
                </div>
            </section>
        );
    }

    return (
        <section className="menu-split" style={{ minHeight: '100vh', display: 'flex', paddingTop: 64, background: 'var(--bg-void)' }}>
            {/* Sidebar */}
            <aside className="menu-sidebar" style={{ width: '30%', minWidth: 280, position: 'sticky', top: 64, height: 'calc(100vh - 64px)', padding: 'var(--space-2xl) var(--space-xl)', display: 'flex', flexDirection: 'column', borderRight: '4px solid #000', background: 'var(--bg-surface)', boxShadow: '6px 0px 0 #000', overflowY: 'auto' }}>
                {/* Animated emoji */}
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: '5rem', textAlign: 'center', marginBottom: 'var(--space-md)' }}>
                    {emoji}
                </motion.div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.5rem', textAlign: 'center', marginBottom: 'var(--space-xs)', lineHeight: 1.1, color: '#000', letterSpacing: -1, textShadow: '2px 2px 0 var(--accent-magenta)' }}>{restaurant?.name}</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)', fontSize: '1rem', color: '#000', marginBottom: 'var(--space-xs)', fontWeight: 700 }}>
                    <span style={{ fontFamily: 'var(--font-body)', background: 'var(--accent-lime)', border: '2px solid #000', padding: '2px 6px' }}>★ {restaurant?.rating.toFixed(1)}</span>
                    <span style={{ fontFamily: 'var(--font-body)', borderBottom: '2px solid #000' }}>🕐 {restaurant?.delivery_time_min}–{restaurant?.delivery_time_max} MIN</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#000', marginBottom: 'var(--space-xl)', fontWeight: 700 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: 1.5, textTransform: 'uppercase', background: 'var(--accent-cyan)', border: '2px solid #000', padding: '2px 6px', display: 'inline-block' }}>{cuisineLabel}</span>
                    {restaurant && restaurant.delivery_fee > 0 && (
                        <span style={{ marginLeft: 8, color: '#000', fontFamily: 'var(--font-body)', borderBottom: '2px solid #000' }}>• ₹{restaurant.delivery_fee} DELIVERY</span>
                    )}
                </div>

                <div style={{ height: 4, background: '#000', marginBottom: 'var(--space-xl)' }} />

                {/* Category nav */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                    {categories.map(cat => (
                        <button key={cat} onClick={() => {
                            setActiveCat(cat);
                            document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', marginBottom: 6, borderRadius: 0, fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer', color: activeCat === cat ? '#000' : 'var(--text-muted)', background: activeCat === cat ? 'var(--accent-gold)' : 'transparent', border: activeCat === cat ? '2px solid #000' : '2px solid transparent', boxShadow: activeCat === cat ? '2px 2px 0 #000' : 'none', transition: 'all 0.1s' }}>
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Mini cart */}
                <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
                    <div style={{ height: 4, background: '#000', marginBottom: 'var(--space-md)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginBottom: 'var(--space-md)', fontWeight: 700 }}>
                        <span style={{ color: '#000', fontFamily: 'var(--font-body)' }}>{cartCount} ITEMS</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: '#000', fontSize: '1.5rem', letterSpacing: -0.5 }}>₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <motion.button whileHover={{ scale: 1.02, y: -2, boxShadow: '4px 4px 0 #000' }} whileTap={{ scale: 0.98, boxShadow: '2px 2px 0 #000' }} onClick={onViewCart} style={{ width: '100%', padding: '14px 0', background: cartCount > 0 ? 'var(--accent-fire)' : 'var(--bg-void)', border: '4px solid #000', color: cartCount > 0 ? '#fff' : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', borderRadius: 0, transition: 'all 0.1s', boxShadow: cartCount > 0 ? '4px 4px 0 #000' : 'none', cursor: cartCount > 0 ? 'pointer' : 'default', textShadow: cartCount > 0 ? '2px 2px 0 #000' : 'none' }}>
                        VIEW CART
                    </motion.button>
                </div>
            </aside>

            {/* Right content */}
            <div style={{ flex: 1, padding: 'var(--space-2xl)', overflowY: 'auto' }}>
                {categories.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                        <p style={{ fontSize: '3rem', marginBottom: 12 }}>📭</p>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', marginBottom: 8 }}>Menu is empty</p>
                        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>The restaurant hasn't added any items yet.</p>
                    </div>
                ) : categories.map(cat => (
                    <div key={cat} id={`cat-${cat}`} style={{ marginBottom: 'var(--space-2xl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', fontSize: '2.5rem', textTransform: 'capitalize', color: 'var(--accent-cream)', letterSpacing: -1 }}>{cat}</h3>
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                        </div>
                        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 'var(--space-xl)' }}>
                            {menuByCategory[cat].map(mi => {
                                const inCart = cart.find(c => c.id === mi.id);
                                const justAdded = addedId === mi.id;
                                return (
                                    <motion.div
                                        key={mi.id}
                                        variants={fadeUp}
                                        whileHover={{ y: mi.is_available ? -4 : 0, boxShadow: mi.is_available ? '10px 10px 0 #000' : 'none' }}
                                        style={{
                                            display: 'flex', gap: 'var(--space-md)',
                                            padding: 'var(--space-lg)', background: 'var(--bg-surface)',
                                            borderRadius: 0, border: '4px solid #000',
                                            boxShadow: '6px 6px 0 #000',
                                            transition: 'all 0.1s', opacity: mi.is_available ? 1 : 0.5,
                                            position: 'relative'
                                        }}
                                    >
                                        {/* Info */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-cream)', lineHeight: 1.1, paddingRight: 8 }}>
                                                    {mi.name}
                                                    {mi.is_vegetarian && <span style={{ marginLeft: 6, fontSize: '1rem' }}>🟢</span>}
                                                    {mi.is_spicy && <span style={{ marginLeft: 6, fontSize: '1rem' }}>🌶️</span>}
                                                    {mi.is_vegan && <span style={{ marginLeft: 6, fontSize: '1rem' }}>🌱</span>}
                                                </h4>
                                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-cream)', fontSize: '1.8rem', letterSpacing: -0.5, textShadow: '2px 2px 0 var(--accent-gold)' }}>₹{mi.price.toLocaleString('en-IN')}</span>
                                            </div>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>{mi.description}</p>
                                            
                                            <div style={{ marginTop: 'auto' }}>
                                                {!mi.is_available ? (
                                                    <span style={{ display: 'inline-block', padding: '6px 12px', background: 'var(--bg-void)', border: '2px solid #000', color: '#000', fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>SOLD OUT</span>
                                                ) : inCart ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--accent-gold)', padding: '6px', border: '2px solid #000', width: 'fit-content', boxShadow: '2px 2px 0 #000' }}>
                                                        <button onClick={() => updateQty(mi.id, inCart.qty > 1 ? inCart.qty - 1 : 0)} style={{ width: 32, height: 32, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#000', border: '2px solid #000', cursor: 'pointer' }}>−</button>
                                                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', width: 24, textAlign: 'center', color: '#000', userSelect: 'none' }}>{inCart.qty}</span>
                                                        <button onClick={() => updateQty(mi.id, inCart.qty + 1)} style={{ width: 32, height: 32, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#000', border: '2px solid #000', cursor: 'pointer' }}>+</button>
                                                    </div>
                                                ) : (
                                                    <motion.button whileHover={{ y: -2, boxShadow: '4px 4px 0 #000' }} whileTap={{ scale: 0.95 }} onClick={() => handleAdd(mi)} style={{ padding: '8px 24px', background: justAdded ? 'var(--accent-lime)' : 'var(--bg-elevated)', color: '#000', fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, border: '2px solid #000', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '2px 2px 0 #000', transition: 'all 0.1s', cursor: 'pointer', textTransform: 'uppercase' }}>
                                                        {justAdded ? 'ADDED ✓' : '+ ADD'}
                                                    </motion.button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Image (Placeholder) */}
                                        <div style={{ width: 120, height: 120, background: 'var(--accent-cyan)', border: '4px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', flexShrink: 0, boxShadow: 'inset 4px 4px 0 rgba(255,255,255,0.4)' }}>
                                            {CUISINE_EMOJI[restaurant?.cuisine_type ?? 'other'] ?? '🍽️'}
                                        </div>
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
