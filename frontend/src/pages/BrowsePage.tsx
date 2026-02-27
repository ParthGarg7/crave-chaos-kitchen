import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { restaurantApi } from '../services/api';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } } };

const placeholders = ["Try 'biryani'...", "Try 'pizza'...", "Try 'sushi'...", "Try 'burger'..."];

// Map cuisine_type values to emojis
const CUISINE_EMOJI: Record<string, string> = {
    italian: '🍕', chinese: '🥢', indian: '🍛', mexican: '🌮',
    american: '🍔', japanese: '🍣', thai: '🍜', fast_food: '🍟', other: '🍽️'
};

// Map cuisine_type values to background accent colours
const CUISINE_COLOR: Record<string, string> = {
    italian: '#2a1010', chinese: '#0d1a2a', indian: '#1a0a00',
    mexican: '#1a1200', american: '#1a0d00', japanese: '#001a15',
    thai: '#0d1a1a', fast_food: '#1a1200', other: '#111'
};

// Category filter chips driven by the backend CuisineType enum
const CHIPS = [
    { label: 'All', emoji: '🔥', value: 'all' },
    { label: 'Pizza', emoji: '🍕', value: 'italian' },
    { label: 'Indian', emoji: '🍛', value: 'indian' },
    { label: 'Chinese', emoji: '🥢', value: 'chinese' },
    { label: 'Mexican', emoji: '🌮', value: 'mexican' },
    { label: 'Burgers', emoji: '🍔', value: 'american' },
    { label: 'Sushi', emoji: '🍣', value: 'japanese' },
    { label: 'Thai', emoji: '🍜', value: 'thai' },
    { label: 'Fast Food', emoji: '🍟', value: 'fast_food' },
];

interface ApiRestaurant {
    id: number;
    name: string;
    cuisine_type: string;
    rating: number;
    delivery_time_min: number;
    delivery_time_max: number;
    delivery_fee: number;
    min_order_amount: number;
    description?: string;
    city?: string;
}

export default function BrowsePage({ onSelect }: { onSelect: (id: number) => void }) {
    const [active, setActive] = useState('all');
    const [search, setSearch] = useState('');
    const [phIdx, setPhIdx] = useState(0);
    const [restaurants, setRestaurants] = useState<ApiRestaurant[]>([]);
    const [loading, setLoading] = useState(true);

    // Cycle placeholder text
    useEffect(() => { const t = setInterval(() => setPhIdx(p => (p + 1) % placeholders.length), 3000); return () => clearInterval(t); }, []);

    // Fetch from real API
    useEffect(() => {
        setLoading(true);
        restaurantApi.getAll()
            .then(res => setRestaurants(res.data ?? []))
            .catch(() => setRestaurants([]))
            .finally(() => setLoading(false));
    }, []);

    // Client-side filter (the backend also supports query/cuisine_type params but
    // we do it client-side here so filtering is instant without a round-trip)
    const filtered = restaurants.filter(r => {
        if (active !== 'all' && r.cuisine_type !== active) return false;
        if (search && !r.name.toLowerCase().includes(search.toLowerCase()) &&
            !(r.cuisine_type ?? '').toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <section style={{ minHeight: '100vh', padding: '120px var(--space-lg) var(--space-2xl)', maxWidth: 1280, margin: '0 auto' }}>
            {/* Title */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', lineHeight: 0.95, marginBottom: 'var(--space-sm)' }}>
                    WHERE DO YOU<br />WANT TO EAT?
                </h1>
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.3, duration: 0.8 }} style={{ height: 1, background: 'linear-gradient(90deg, var(--accent-fire), transparent)', marginBottom: 'var(--space-xl)', transformOrigin: 'left' }} />
            </motion.div>

            {/* Search */}
            <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: '14px 20px', marginBottom: 'var(--space-md)', border: '1px solid rgba(255,69,0,0.1)' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholders[phIdx]} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--accent-cream)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', caretColor: 'var(--accent-fire)' }} />
            </div>

            {/* Filter Chips */}
            <div style={{ display: 'flex', gap: 'var(--space-xs)', overflowX: 'auto', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                {CHIPS.map(cat => (
                    <motion.button key={cat.value} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActive(cat.value)} style={{ padding: '8px 18px', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', letterSpacing: 1, whiteSpace: 'nowrap', background: active === cat.value ? 'var(--accent-fire)' : 'var(--bg-elevated)', color: active === cat.value ? '#fff' : 'var(--text-muted)', border: active === cat.value ? 'none' : '1px solid rgba(255,255,255,0.06)', boxShadow: active === cat.value ? '0 0 20px var(--glow-fire)' : 'none', transition: 'all 0.25s' }}>
                        {cat.emoji} {cat.label}
                    </motion.button>
                ))}
            </div>

            {/* Grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="skeleton" style={{ height: 380, borderRadius: 'var(--radius-lg)' }} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    <p style={{ fontSize: '3rem', marginBottom: 12 }}>🍽️</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 8 }}>No restaurants found</p>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {restaurants.length === 0 ? 'Make sure the backend is running.' : 'Try a different search or category.'}
                    </p>
                </motion.div>
            ) : (
                <motion.div variants={container} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
                    <AnimatePresence>
                        {filtered.map(r => {
                            const emoji = CUISINE_EMOJI[r.cuisine_type] ?? '🍽️';
                            const color = CUISINE_COLOR[r.cuisine_type] ?? '#111';
                            const time = `${r.delivery_time_min}–${r.delivery_time_max} min`;
                            const cuisineLabel = r.cuisine_type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '';

                            return (
                                <motion.div
                                    key={r.id}
                                    variants={item}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    layout
                                    whileHover={{ y: -8, boxShadow: '0 20px 60px var(--glow-fire)' }}
                                    onClick={() => onSelect(r.id)}
                                    role="button"
                                    style={{ height: 380, borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'none', border: '1px solid rgba(255,255,255,0.04)', transition: 'border-color 0.3s', background: 'var(--bg-surface)', position: 'relative' }}
                                >
                                    {/* Image / emoji area */}
                                    <div style={{ height: '60%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                        <motion.span whileHover={{ scale: 1.08 }} transition={{ duration: 0.4 }} style={{ fontSize: '5rem', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }}>{emoji}</motion.span>
                                        {/* Delivery fee badge */}
                                        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-pill)', padding: '4px 10px', fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: '#22c55e' }}>
                                            {r.delivery_fee === 0 ? 'FREE delivery' : `₹${r.delivery_fee} delivery`}
                                        </div>
                                    </div>
                                    {/* Info */}
                                    <div className="glass" style={{ padding: 'var(--space-md)', height: '40%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(17,15,18,0.9)' }}>
                                        <div>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--accent-ember)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{cuisineLabel}</p>
                                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--accent-cream)', marginBottom: 4 }}>{r.name}</h3>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description ?? `Delicious ${cuisineLabel} cuisine delivered to your door.`}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: '0.75rem' }}>
                                            <span style={{ fontFamily: 'var(--font-accent)', color: 'var(--accent-gold)', fontSize: '1rem' }}>★ {r.rating.toFixed(1)}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>🕐 {time}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>Min ₹{r.min_order_amount}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            )}
        </section>
    );
}
