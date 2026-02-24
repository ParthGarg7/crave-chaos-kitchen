import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import type { Page } from '../App';

// ─── Three.js 3D Globe ───
function Globe() {
    const mountRef = useRef<HTMLDivElement>(null);
    const mouse = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const el = mountRef.current;
        if (!el) return;
        const w = el.clientWidth, h = el.clientHeight;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
        camera.position.z = 6;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        el.appendChild(renderer.domElement);

        // Wireframe globe
        const geo = new THREE.IcosahedronGeometry(2.5, 2);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff4500, wireframe: true, transparent: true, opacity: 0.15 });
        const globe = new THREE.Mesh(geo, mat);
        scene.add(globe);

        // Glowing inner sphere
        const innerGeo = new THREE.SphereGeometry(2.2, 32, 32);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.03 });
        scene.add(new THREE.Mesh(innerGeo, innerMat));

        // Floating food emoji sprites
        const emojis = ['🍕', '🍜', '🌮', '🍣', '🍔', '🥘', '🍱', '🫕', '🍰', '🍗'];
        const sprites: THREE.Sprite[] = [];
        emojis.forEach((em, i) => {
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d')!;
            ctx.font = '48px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(em, 32, 34);
            const tex = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7 });
            const sprite = new THREE.Sprite(spriteMat);
            const r = 3.2 + Math.random() * 1.2;
            const angle = (i / emojis.length) * Math.PI * 2;
            sprite.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * 3, Math.sin(angle) * r);
            sprite.scale.set(0.6, 0.6, 1);
            sprite.userData = { radius: r, angle, speed: 0.1 + Math.random() * 0.15, yOff: Math.random() * Math.PI * 2 };
            scene.add(sprite);
            sprites.push(sprite);
        });

        // Lights
        scene.add(new THREE.AmbientLight(0xff8c00, 0.3));
        const pt = new THREE.PointLight(0xff4500, 1.5, 20);
        pt.position.set(3, 3, 3);
        scene.add(pt);

        const onMove = (e: MouseEvent) => {
            mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
            mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener('mousemove', onMove);

        let t = 0;
        const animate = () => {
            t += 0.008;
            globe.rotation.y += 0.003;
            globe.rotation.x += 0.001;
            // Mouse parallax
            globe.rotation.y += (mouse.current.x * 0.3 - globe.rotation.y) * 0.02;
            globe.rotation.x += (-mouse.current.y * 0.2 - globe.rotation.x) * 0.02;

            sprites.forEach(s => {
                const d = s.userData;
                const a = d.angle + t * d.speed;
                s.position.x = Math.cos(a) * d.radius;
                s.position.z = Math.sin(a) * d.radius;
                s.position.y = Math.sin(t * 0.5 + d.yOff) * 1.5;
            });

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };
        animate();

        const onResize = () => {
            const nw = el.clientWidth, nh = el.clientHeight;
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
        };
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('resize', onResize);
            renderer.dispose();
            el.removeChild(renderer.domElement);
        };
    }, []);

    return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}

// ─── Counter animation ───
function Counter({ end, suffix }: { end: number; suffix: string }) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        let frame: number;
        const dur = 1500;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(eased * end));
            if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [end]);
    return <span>{val}{suffix}</span>;
}

// ─── Stagger variants ───
const container = { hidden: {}, show: { transition: { staggerChildren: 0.2, delayChildren: 0.5 } } };
const word = { hidden: { opacity: 0, y: 60 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } } };
const fadeIn = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function HeroPage({ navigate }: { navigate: (p: Page) => void }) {
    return (
        <section style={{ minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden' }}>
            {/* Background glow */}
            <div style={{ position: 'absolute', bottom: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: 'var(--glow-fire)', filter: 'blur(200px)', opacity: 0.4, pointerEvents: 'none' }} />
            {/* Scan line */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{ width: '100%', height: 1, background: 'rgba(255,69,0,0.06)', animation: 'scanline 8s linear infinite' }} />
            </div>

            <div className="hero-split" style={{ display: 'flex', width: '100%', maxWidth: 1400, margin: '0 auto', padding: 'var(--space-2xl) var(--space-lg)', paddingTop: 100, alignItems: 'center', gap: 'var(--space-xl)', position: 'relative', zIndex: 1 }}>
                {/* Left 55% */}
                <div className="hero-left" style={{ width: '55%', minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {/* Eyebrow */}
                    <motion.div variants={container} initial="hidden" animate="show" style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                        {['LATE NIGHT', '•', 'PREMIUM DELIVERY', '•', '30 MIN'].map((t, i) => (
                            <motion.span key={i} variants={fadeIn} style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t}</motion.span>
                        ))}
                    </motion.div>

                    {/* Headline */}
                    <motion.h1 variants={container} initial="hidden" animate="show" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.5rem, 8vw, 8rem)', lineHeight: 0.95, marginBottom: 'var(--space-lg)', fontWeight: 900 }}>
                        {['HUNGER', 'HAS NO', 'PATIENCE.'].map((w, i) => (
                            <motion.span key={i} variants={word} style={{ display: 'block' }}>{w}</motion.span>
                        ))}
                    </motion.h1>

                    {/* Sub */}
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} style={{ fontFamily: 'var(--font-sub)', fontStyle: 'italic', fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: 440, lineHeight: 1.6, marginBottom: 'var(--space-xl)' }}>
                        Discover restaurants that cook with obsession. Delivered while it's still perfect.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginBottom: 'var(--space-xl)' }}>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('browse')} className="shimmer" style={{ padding: '16px 36px', background: 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.85rem', letterSpacing: 3, textTransform: 'uppercase', borderRadius: 'var(--radius-sm)', fontWeight: 500, boxShadow: '0 0 40px var(--glow-fire)' }}>
                            EXPLORE RESTAURANTS →
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ padding: '16px 36px', border: '1px solid var(--text-muted)', color: 'var(--accent-cream)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', letterSpacing: 3, textTransform: 'uppercase', borderRadius: 'var(--radius-sm)' }}>
                            HOW IT WORKS ↓
                        </motion.button>
                    </motion.div>

                    {/* Stats */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {[
                            { val: 247, suf: '', label: 'restaurants' },
                            { val: 18, suf: '', label: 'min avg delivery' },
                            { val: 4, suf: '.9★', label: 'rated' },
                        ].map((s, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', paddingRight: 'var(--space-lg)', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                                <span style={{ fontFamily: 'var(--font-accent)', fontSize: '1.8rem', color: 'var(--accent-cream)' }}>
                                    <Counter end={s.val} suffix={s.suf} />
                                </span>
                                <span style={{ letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>{s.label}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Right 45% — 3D Globe */}
                <div className="hero-right" style={{ width: '45%', height: '80vh', position: 'relative' }}>
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 1.2 }} style={{ width: '100%', height: '100%' }}>
                        <Globe />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
