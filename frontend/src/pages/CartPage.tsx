import { motion } from 'framer-motion';
import type { Page } from '../App';

export default function CartPage({ navigate }: { navigate: (p: Page) => void }) {
    return (
        <section style={{ minHeight: '100vh', padding: '120px var(--space-lg) var(--space-2xl)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: 640, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-2xl)', textAlign: 'center', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: '5rem', marginBottom: 'var(--space-lg)', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}>
                    🛒
                </motion.div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.5rem', color: 'var(--accent-cream)', marginBottom: 'var(--space-sm)', letterSpacing: -1 }}>Your Cart is Empty</h1>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2xl)', maxWidth: 400, margin: '0 auto var(--space-2xl)' }}>
                    Looks like you haven't added anything yet. Explore our top-rated restaurants and find something delicious.
                </p>
                <motion.button 
                    whileHover={{ scale: 1.03, y: -2 }} 
                    whileTap={{ scale: 0.97 }} 
                    onClick={() => navigate('browse')}
                    className="shimmer" 
                    style={{ padding: '16px 40px', background: 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', borderRadius: 'var(--radius-sm)', boxShadow: '0 10px 30px var(--glow-fire)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s var(--ease-smooth)' }}
                >
                    Browse Restaurants →
                </motion.button>
            </motion.div>
        </section>
    );
}
