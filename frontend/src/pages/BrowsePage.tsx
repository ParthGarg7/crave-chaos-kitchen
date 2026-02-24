import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { restaurants, categories } from '../data/mockData';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } } };

const placeholders = ["Try 'spicy ramen'...", "Try 'wood-fired pizza'...", "Try 'crispy tacos'...", "Try 'fresh sushi'..."];

export default function BrowsePage({ onSelect }: { onSelect: (id: number) => void }) {
    const [active, setActive] = useState('all');
    const [search, setSearch] = useState('');
    const [phIdx, setPhIdx] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => { const t = setTimeout(() => setLoading(false), 300); return () => clearTimeout(t); }, []);
    useEffect(() => { const t = setInterval(() => setPhIdx(p => (p + 1) % placeholders.length), 3000); return () => clearInterval(t); }, []);

    const filtered = restaurants.filter(r => {
        if (active !== 'all' && !r.cuisine.includes(active)) return false;
        if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.cuisine.toLowerCase().includes(search.toLowerCase())) return false;
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
                {categories.map(cat => (
                    <motion.button key={cat.value} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActive(cat.value)} style={{ padding: '8px 18px', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', letterSpacing: 1, whiteSpace: 'nowrap', background: active === cat.value ? 'var(--accent-fire)' : 'var(--bg-elevated)', color: active === cat.value ? '#fff' : 'var(--text-muted)', border: active === cat.value ? 'none' : '1px solid rgba(255,255,255,0.06)', boxShadow: active === cat.value ? '0 0 20px var(--glow-fire)' : 'none', transition: 'all 0.25s' }}>
                        {cat.emoji} {cat.label}
                    </motion.button>
                ))}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="restaurant-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="skeleton" style={{ height: 380, borderRadius: 'var(--radius-lg)' }} />
                    ))}
                </div>
            ) : (
                <motion.div className="restaurant-grid" variants={container} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
                    <AnimatePresence>
                        {filtered.map(r => (
                            <motion.div key={r.id} variants={item} exit={{ scale: 0.8, opacity: 0 }} layout whileHover={{ y: -8, boxShadow: '0 20px 60px var(--glow-fire)' }} onClick={() => onSelect(r.id)} role="button" style={{ height: 380, borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'none', border: '1px solid rgba(255,255,255,0.04)', transition: 'border-color 0.3s', background: 'var(--bg-surface)', position: 'relative' }}>
                                {/* Image area */}
                                <div style={{ height: '60%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                    <motion.span whileHover={{ scale: 1.08 }} transition={{ duration: 0.4 }} style={{ fontSize: '5rem', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }}>{r.emoji}</motion.span>
                                </div>
                                {/* Info */}
                                <div className="glass" style={{ padding: 'var(--space-md)', height: '40%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(17,15,18,0.9)' }}>
                                    <div>
                                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--accent-ember)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{r.cuisine}</p>
                                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--accent-cream)', marginBottom: 4 }}>{r.name}</h3>
                                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: '0.75rem' }}>
                                        <span style={{ fontFamily: 'var(--font-accent)', color: 'var(--accent-gold)', fontSize: '1rem' }}>★ {r.rating}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>🕐 {r.time}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{r.priceRange}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </section>
    );
}
