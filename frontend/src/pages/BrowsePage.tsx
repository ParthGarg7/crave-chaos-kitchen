import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { restaurantApi } from '../services/api';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };

const placeholders = ["Try 'biryani'...", "Try 'pizza'...", "Try 'sushi'...", "Try 'burger'..."];

// Map cuisine_type values to emojis
const CUISINE_EMOJI: Record<string, string> = {
    italian: '🍕', chinese: '🥢', indian: '🍛', mexican: '🌮',
    american: '🍔', japanese: '🍣', thai: '🍜', fast_food: '🍟', other: '🍽️'
};

// Map cuisine_type values to background accent colours (light mode)
const CUISINE_COLOR: Record<string, string> = {
    italian: '#ffebe5', chinese: '#e5edff', indian: '#fff4e5',
    mexican: '#fefce8', american: '#fef0e6', japanese: '#e6f8f5',
    thai: '#e5f6f4', fast_food: '#fefce8', other: '#f3f4f6'
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
        <section style={{ minHeight: '100vh', padding: '120px var(--space-lg) var(--space-2xl)', maxWidth: 1280, margin: '0 auto', background: 'var(--bg-void)' }}>
            {/* Title */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'clamp(3rem, 6vw, 5rem)', lineHeight: 0.9, marginBottom: 'var(--space-sm)', color: 'var(--accent-cream)', textShadow: '4px 4px 0 var(--accent-magenta)' }}>
                    WHERE DO YOU<br />WANT TO EAT?
                </h1>
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.3, duration: 0.8 }} style={{ height: 8, background: 'var(--accent-fire)', marginBottom: 'var(--space-xl)', transformOrigin: 'left', borderRadius: 0, maxWidth: 120, border: '2px solid #000' }} />
            </motion.div>

            {/* Search */}
            <div style={{ padding: '16px 24px', marginBottom: 'var(--space-md)', border: '4px solid var(--border-subtle)', background: 'var(--bg-surface)', boxShadow: '6px 6px 0 #000' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholders[phIdx]} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--accent-cream)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 500 }} />
            </div>

            {/* Filter Chips */}
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                {CHIPS.map(cat => (
                    <motion.button key={cat.value} whileHover={{ y: -4, boxShadow: '6px 6px 0 #000' }} whileTap={{ scale: 0.95 }} onClick={() => setActive(cat.value)} style={{
                        padding: '10px 20px', borderRadius: '0',
                        fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600,
                        letterSpacing: 0.5, whiteSpace: 'nowrap', cursor: 'pointer',
                        background: active === cat.value ? 'var(--accent-cyan)' : 'var(--bg-surface)',
                        color: '#000',
                        border: '4px solid #000',
                        boxShadow: active === cat.value ? 'inset 4px 4px 0 rgba(255,255,255,0.5), 2px 2px 0 #000' : '4px 4px 0 #000',
                        transition: 'all 0.1s',
                    }}>
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
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', marginBottom: 8 }}>No restaurants found</p>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {restaurants.length === 0 ? 'Make sure the backend is running.' : 'Try a different search or category.'}
                    </p>
                </motion.div>
            ) : (
                <motion.div variants={container} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
                    <AnimatePresence>
                        {filtered.map(r => {
                            const emoji = CUISINE_EMOJI[r.cuisine_type] ?? '🍽️';
                            const color = CUISINE_COLOR[r.cuisine_type] ?? '#0e0e14';
                            const time = `${r.delivery_time_min}–${r.delivery_time_max} min`;
                            const cuisineLabel = r.cuisine_type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '';

                            return (
                                <motion.div
                                    key={r.id}
                                    variants={item}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    layout
                                    onClick={() => onSelect(r.id)}
                                    role="button"
                                    style={{ height: 380, borderRadius: 0, overflow: 'hidden', cursor: 'pointer', border: '4px solid #000', transition: 'all 0.1s', background: 'var(--bg-surface)', boxShadow: '8px 8px 0 #000', position: 'relative', display: 'flex', flexDirection: 'column' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-4px, -4px)'; e.currentTarget.style.boxShadow = '12px 12px 0 #000'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '8px 8px 0 #000'; }}
                                >
                                    {/* Image / emoji area */}
                                    <div style={{ height: '55%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', borderBottom: '4px solid #000' }}>
                                        <motion.span whileHover={{ scale: 1.15 }} transition={{ duration: 0.4 }} style={{ fontSize: '6rem' }}>{emoji}</motion.span>
                                        {/* Delivery fee badge */}
                                        <div style={{ position: 'absolute', top: 16, right: 16, background: 'var(--accent-gold)', border: '2px solid #000', boxShadow: '2px 2px 0 #000', padding: '6px 12px', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 700, color: '#000' }}>
                                            {r.delivery_fee === 0 ? 'FREE DELIVERY' : `₹${r.delivery_fee} DELIVERY`}
                                        </div>
                                    </div>
                                    {/* Info */}
                                    <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--bg-surface)' }}>
                                        <div>
                                            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-fire)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, background: 'var(--bg-elevated)', border: '2px solid #000', display: 'inline-block', padding: '2px 6px' }}>{cuisineLabel}</p>
                                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', color: 'var(--accent-cream)', marginBottom: 8, lineHeight: 1.1 }}>{r.name}</h3>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description ?? `Delicious ${cuisineLabel} cuisine delivered to your door.`}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-body)', color: '#000' }}>
                                            <span style={{ background: 'var(--accent-lime)', border: '2px solid #000', padding: '2px 6px' }}>★ {r.rating.toFixed(1)}</span>
                                            <span style={{ borderBottom: '2px solid #000' }}>{time}</span>
                                            <span style={{ borderBottom: '2px solid #000' }}>MIN ₹{r.min_order_amount}</span>
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
