import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { restaurants, allMenus, fetchMenu } from '../data/mockData';
import type { CartItem } from '../App';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } } };

export default function MenuPage({ restaurantId, cart, addToCart, updateQty, onViewCart }: {
    restaurantId: number;
    cart: CartItem[];
    addToCart: (item: { id: number; name: string; price: number; emoji: string }) => void;
    updateQty: (id: number, qty: number) => void;
    onViewCart: () => void;
}) {
    const rest = restaurants.find(r => r.id === restaurantId) || restaurants[0];
    const [menu, setMenu] = useState<Record<string, { id: number; name: string; desc: string; price: number; emoji: string }[]> | null>(null);
    const [activeCat, setActiveCat] = useState('');
    const [addedId, setAddedId] = useState<number | null>(null);

    useEffect(() => {
        fetchMenu(restaurantId).then(data => {
            setMenu(data);
            const cats = Object.keys(data);
            if (cats.length > 0) setActiveCat(cats[0]);
        });
    }, [restaurantId]);

    const cartCount = cart.reduce((s, i) => s + i.qty, 0);
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

    const handleAdd = (item: { id: number; name: string; price: number; emoji: string }) => {
        addToCart(item);
        setAddedId(item.id);
        setTimeout(() => setAddedId(null), 600);
    };

    const categories = menu ? Object.keys(menu) : [];

    return (
        <section className="menu-split" style={{ minHeight: '100vh', display: 'flex', paddingTop: 64 }}>
            {/* Sidebar */}
            <aside className="menu-sidebar glass" style={{ width: '30%', position: 'sticky', top: 64, height: 'calc(100vh - 64px)', padding: 'var(--space-xl) var(--space-lg)', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.04)', overflowY: 'auto' }}>
                {/* Animated emoji */}
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: '5rem', textAlign: 'center', marginBottom: 'var(--space-md)', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }}>
                    {rest.emoji}
                </motion.div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', textAlign: 'center', marginBottom: 'var(--space-xs)' }}>{rest.name}</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                    <span style={{ fontFamily: 'var(--font-accent)', color: 'var(--accent-gold)' }}>★ {rest.rating}</span>
                    <span>🕐 {rest.time}</span>
                    <span>{rest.priceRange}</span>
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
                {!menu ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />)}
                    </div>
                ) : categories.map(cat => (
                    <div key={cat} id={`cat-${cat}`} style={{ marginBottom: 'var(--space-2xl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                            <h3 style={{ fontFamily: 'var(--font-sub)', fontStyle: 'italic', fontSize: '1.8rem', textTransform: 'capitalize' }}>{cat}</h3>
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                        </div>
                        <motion.div className="menu-items-grid" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                            {menu[cat].map(mi => {
                                const inCart = cart.find(c => c.id === mi.id);
                                const justAdded = addedId === mi.id;
                                return (
                                    <motion.div key={mi.id} variants={fadeUp} whileHover={{ scale: 1.02 }} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.04)', transition: 'border-color 0.3s' }}>
                                        {/* Emoji */}
                                        <div style={{ width: 70, height: 70, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, rgba(255,69,0,0.1), rgba(255,140,0,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', flexShrink: 0 }}>
                                            {mi.emoji}
                                        </div>
                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 500 }}>{mi.name}</p>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{mi.desc}</p>
                                            <p style={{ fontFamily: 'var(--font-accent)', color: 'var(--accent-gold)', fontSize: '1.2rem', marginTop: 4 }}>₹{mi.price.toLocaleString('en-IN')}</p>
                                        </div>
                                        {/* Add / Qty */}
                                        {inCart ? (
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
