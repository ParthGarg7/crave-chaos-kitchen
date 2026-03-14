import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
const steps = [
    { emoji: '✅', label: 'Order Received', sub: 'Your order has been confirmed' },
    { emoji: '👨‍🍳', label: 'Being Prepared', sub: 'The chef is crafting your meal' },
    { emoji: '🛵', label: 'Out for Delivery', sub: 'Your rider is on the way' },
    { emoji: '🏠', label: 'Delivered', sub: 'Enjoy your meal!' },
];

export default function TrackingPage({ orderId, navigate }: { orderId: string; navigate: (p: string) => void }) {
    const [activeStep, setActiveStep] = useState(0);
    const [time, setTime] = useState(23 * 60 + 47); // 23:47

    // Auto-advance steps
    useEffect(() => {
        if (activeStep >= 3) return;
        const t = setTimeout(() => setActiveStep(s => s + 1), 5000);
        return () => clearTimeout(t);
    }, [activeStep]);

    // Countdown
    useEffect(() => {
        if (time <= 0) return;
        const t = setInterval(() => setTime(s => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [time]);

    const mins = Math.floor(time / 60).toString().padStart(2, '0');
    const secs = (time % 60).toString().padStart(2, '0');

    return (
        <section style={{ minHeight: '100vh', padding: '120px var(--space-lg) var(--space-2xl)', display: 'flex', justifyContent: 'center' }}>
            <div style={{ maxWidth: 600, width: '100%' }}>
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'clamp(3rem, 7vw, 4.5rem)', marginBottom: 'var(--space-md)', lineHeight: 0.9, color: 'var(--accent-cream)', letterSpacing: -1, textShadow: '4px 4px 0 var(--accent-magenta)' }}>IT'S ON ITS WAY.</h1>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, color: '#000', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 'var(--space-xl)', background: 'var(--accent-lime)', border: '2px solid #000', display: 'inline-block', padding: '4px 8px' }}>ORDER #{orderId || 'CR-2847'}</p>
                </motion.div>

                {/* Timer */}
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)', background: 'var(--bg-surface)', padding: 'var(--space-xl)', border: '4px solid #000', boxShadow: '8px 8px 0 #000' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: '#000', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 'var(--space-sm)' }}>Estimated Delivery</p>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(4rem, 10vw, 6rem)', color: 'var(--accent-fire)', letterSpacing: -1, textShadow: '4px 4px 0 #000' }}>{mins}:{secs}</span>
                </motion.div>

                {/* Timeline */}
                <div style={{ position: 'relative', paddingLeft: 40 }}>
                    {/* Progress line */}
                    <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 4, background: '#000' }}>
                        <motion.div animate={{ height: `${(activeStep / (steps.length - 1)) * 100}%` }} transition={{ duration: 0.8 }} style={{ width: '100%', background: 'var(--accent-cyan)' }} />
                    </div>

                    {steps.map((step, i) => {
                        const completed = i <= activeStep;
                        const isActive = i === activeStep;
                        return (
                            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.15 }} style={{ position: 'relative', marginBottom: i < steps.length - 1 ? 'var(--space-xl)' : 0, paddingLeft: 'var(--space-lg)' }}>
                                {/* Circle */}
                                <div style={{ position: 'absolute', left: -25, top: 2, width: 32, height: 32, borderRadius: 0, background: completed ? '#ffffff' : 'var(--bg-surface)', border: completed ? '4px solid var(--accent-cyan)' : '4px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', zIndex: 2, boxShadow: completed ? '4px 4px 0 #000' : 'none', transition: 'all 0.1s' }}>
                                    {isActive ? <div style={{ width: 16, height: 16, background: 'var(--accent-cyan)' }} /> : (completed ? '✓' : '')}
                                </div>
                                {/* Pulse ring on active */}
                                {isActive && (
                                    <div style={{ position: 'absolute', left: -25, top: 2, width: 32, height: 32, border: '4px solid var(--accent-cyan)', animation: 'pulse-ring 1.5s ease-out infinite', zIndex: 1 }} />
                                )}
                                <div style={{ opacity: completed ? 1 : 0.5, transition: 'opacity 0.1s', marginTop: -4 }}>
                                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: completed ? 'var(--accent-cream)' : '#000', marginBottom: 4, letterSpacing: -0.5, textTransform: 'uppercase' }}>{step.label} {step.emoji}</p>
                                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: completed ? 'var(--text-muted)' : '#000', fontWeight: 700 }}>{step.sub}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Scooter path */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} style={{ marginTop: 'var(--space-2xl)', background: 'var(--accent-gold)', padding: 'var(--space-xl)', border: '4px solid #000', boxShadow: '8px 8px 0 #000', position: 'relative', overflow: 'hidden' }}>
                    <svg viewBox="0 0 500 120" style={{ width: '100%', height: 120 }}>
                        {/* Dotted path */}
                        <path id="delivery-path" d="M 30 90 L 120 20 L 200 100 L 280 40 L 360 110 L 420 80 L 470 50" fill="none" stroke="#000" strokeWidth="4" strokeDasharray="12 12" />
                        {/* Start icon */}
                        <text x="15" y="100" fontSize="32">🍴</text>
                        {/* End icon */}
                        <text x="450" y="60" fontSize="32">🏠</text>
                    </svg>
                    {/* Animated scooter */}
                    <div style={{ position: 'absolute', fontSize: '3rem', offsetPath: "path('M 30 90 L 120 20 L 200 100 L 280 40 L 360 110 L 420 80 L 470 50')", animation: 'scooter-ride 8s linear infinite', top: 'var(--space-xl)', left: 0, transform: 'translateY(-50%)' }}>
                        🛵
                    </div>
                </motion.div>

                {/* Bottom */}
                <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <motion.button whileHover={{ scale: 1.03, y: -4, boxShadow: '8px 8px 0 #000' }} whileTap={{ scale: 0.97, y: 2, boxShadow: '2px 2px 0 #000' }} onClick={() => navigate('browse')} style={{ padding: '16px 32px', border: '4px solid #000', background: 'var(--bg-surface)', boxShadow: '4px 4px 0 #000', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent-cyan)', transition: 'all 0.1s', cursor: 'pointer' }}>
                        ORDER AGAIN
                    </motion.button>
                </div>
            </div>
        </section>
    );
}
