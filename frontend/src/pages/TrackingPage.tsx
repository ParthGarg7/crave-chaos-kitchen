import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Page } from '../App';

const steps = [
    { emoji: '✅', label: 'Order Received', sub: 'Your order has been confirmed' },
    { emoji: '👨‍🍳', label: 'Being Prepared', sub: 'The chef is crafting your meal' },
    { emoji: '🛵', label: 'Out for Delivery', sub: 'Your rider is on the way' },
    { emoji: '🏠', label: 'Delivered', sub: 'Enjoy your meal!' },
];

export default function TrackingPage({ orderId, navigate }: { orderId: string; navigate: (p: Page) => void }) {
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
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 4rem)', marginBottom: 'var(--space-xs)' }}>IT'S ON ITS WAY.</h1>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 'var(--space-lg)' }}>#{orderId || 'CR-2847'}</p>
                </motion.div>

                {/* Timer */}
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Estimated Delivery</p>
                    <span style={{ fontFamily: 'var(--font-accent)', fontSize: 'clamp(3rem, 8vw, 5rem)', color: 'var(--accent-cream)', letterSpacing: 4 }}>{mins}:{secs}</span>
                </motion.div>

                {/* Timeline */}
                <div style={{ position: 'relative', paddingLeft: 40 }}>
                    {/* Progress line */}
                    <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: 'var(--bg-elevated)' }}>
                        <motion.div animate={{ height: `${(activeStep / (steps.length - 1)) * 100}%` }} transition={{ duration: 0.8 }} style={{ width: '100%', background: 'var(--accent-fire)', borderRadius: 1 }} />
                    </div>

                    {steps.map((step, i) => {
                        const completed = i <= activeStep;
                        const isActive = i === activeStep;
                        return (
                            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.15 }} style={{ position: 'relative', marginBottom: i < steps.length - 1 ? 'var(--space-xl)' : 0, paddingLeft: 'var(--space-lg)' }}>
                                {/* Circle */}
                                <div style={{ position: 'absolute', left: -25, top: 2, width: 32, height: 32, borderRadius: '50%', background: completed ? 'var(--accent-fire)' : 'var(--bg-elevated)', border: completed ? 'none' : '2px solid var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', zIndex: 2 }}>
                                    {step.emoji}
                                </div>
                                {/* Pulse ring on active */}
                                {isActive && (
                                    <div style={{ position: 'absolute', left: -25, top: 2, width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--accent-fire)', animation: 'pulse-ring 1.5s ease-out infinite', zIndex: 1 }} />
                                )}
                                <div>
                                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: completed ? 'var(--accent-cream)' : 'var(--text-muted)', marginBottom: 2 }}>{step.label}</p>
                                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{step.sub}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Scooter path */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} style={{ marginTop: 'var(--space-2xl)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', border: '1px solid rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
                    <svg viewBox="0 0 500 120" style={{ width: '100%', height: 120 }}>
                        {/* Dotted path */}
                        <path id="delivery-path" d="M 30 90 C 120 20, 200 100, 280 40 C 360 -10, 420 80, 470 50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="6 4" />
                        {/* Start icon */}
                        <text x="20" y="100" fontSize="20">🍴</text>
                        {/* End icon */}
                        <text x="460" y="60" fontSize="20">🏠</text>
                    </svg>
                    {/* Animated scooter */}
                    <div style={{ position: 'absolute', fontSize: '1.5rem', offsetPath: "path('M 30 90 C 120 20, 200 100, 280 40 C 360 -10, 420 80, 470 50')", animation: 'scooter-ride 6s linear infinite', top: 'var(--space-xl)', left: 0, transform: 'translateY(-50%)' }}>
                        🛵
                    </div>
                </motion.div>

                {/* Bottom */}
                <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('browse')} style={{ padding: '10px 24px', border: '1px solid var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', letterSpacing: 2, textTransform: 'uppercase', borderRadius: 'var(--radius-sm)', color: 'var(--accent-cream)' }}>
                        ORDER AGAIN
                    </motion.button>
                </div>
            </div>
        </section>
    );
}
