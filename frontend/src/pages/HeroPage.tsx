import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
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

        // Low-poly 90s wireframe shape
        const geo = new THREE.IcosahedronGeometry(2.5, 0); // 0 detail for sharp triangles
        const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true, transparent: true, opacity: 0.8 });
        const globe = new THREE.Mesh(geo, mat);
        scene.add(globe);

        // Inner solid shape
        const innerGeo = new THREE.IcosahedronGeometry(2.4, 0);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
        scene.add(new THREE.Mesh(innerGeo, innerMat));

        // Floating food emoji sprites
        const emojis = ['🍕', '👾', '🌮', '💾', '🍔', '☎️', '🍱', '📺', '🍰', '🕹️'];
        const sprites: THREE.Sprite[] = [];
        emojis.forEach((em, i) => {
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d')!;
            ctx.font = '48px "VT323", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(em, 32, 34);
            const tex = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 1 });
            const sprite = new THREE.Sprite(spriteMat);
            const r = 3.5 + Math.random() * 1.5;
            const angle = (i / emojis.length) * Math.PI * 2;
            sprite.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * 3, Math.sin(angle) * r);
            sprite.scale.set(0.8, 0.8, 1);
            sprite.userData = { radius: r, angle, speed: 0.1 + Math.random() * 0.15, yOff: Math.random() * Math.PI * 2 };
            scene.add(sprite);
            sprites.push(sprite);
        });

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const pt = new THREE.PointLight(0xff00ff, 2.0, 20);
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
const container = { hidden: {}, show: { transition: { staggerChildren: 0.15, delayChildren: 0.4 } } };
const word = { hidden: { opacity: 0, y: 50 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } } };

export default function HeroPage({ navigate }: { navigate: (p: string) => void }) {
    return (
        <section style={{ minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden', background: 'var(--bg-void)' }}>
            {/* Background elements (Cleaned for light mode) */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to bottom, transparent, var(--bg-surface))', zIndex: 0 }} />

            <div className="hero-split" style={{ display: 'flex', width: '100%', maxWidth: 1400, margin: '0 auto', padding: 'var(--space-2xl) var(--space-lg)', paddingTop: 100, alignItems: 'center', gap: 'var(--space-xl)', position: 'relative', zIndex: 1 }}>
                {/* Left Bento Area */}
                <div className="hero-left" style={{ width: '55%', minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    
                    <motion.div variants={container} initial="hidden" animate="show" style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)', alignItems: 'center', background: 'var(--accent-lime)', padding: '8px 16px', width: 'fit-content', border: '4px solid var(--border-subtle)', boxShadow: '4px 4px 0 #000' }}>
                        <span style={{ width: 12, height: 12, background: 'var(--accent-cream)' }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent-cream)', fontWeight: 700 }}>SYSTEM: ONLINE</span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1 variants={container} initial="hidden" animate="show" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(4rem, 8vw, 7.5rem)', lineHeight: 0.9, letterSpacing: -2, marginBottom: 'var(--space-lg)', fontWeight: 400, color: 'var(--accent-cream)', textShadow: '4px 4px 0 var(--accent-cyan)' }}>
                        {['RADICAL', 'FLAVOR.', 'DELIVERED.'].map((w, i) => (
                            <motion.span key={i} variants={word} style={{ display: 'block', color: i === 0 ? 'var(--accent-fire)' : 'inherit' }}>{w}</motion.span>
                        ))}
                    </motion.h1>

                    {/* Sub */}
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} style={{ fontFamily: 'var(--font-body)', fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: 480, lineHeight: 1.6, marginBottom: 'var(--space-xl)', fontWeight: 700 }}>
                        FOOD IN THE FAST LANE. HIGH SCORES IN EVERY BITE.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginBottom: 'var(--space-2xl)' }}>
                        <motion.button whileHover={{ y: -4, boxShadow: '8px 8px 0 #000' }} whileTap={{ scale: 0.98, boxShadow: '2px 2px 0 #000', y: 2 }} onClick={() => navigate('browse')} style={{ padding: '16px 36px', background: 'var(--accent-cyan)', color: 'var(--accent-cream)', fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, letterSpacing: 1, border: '4px solid #000', boxShadow: '4px 4px 0 #000', transition: 'all 0.1s', cursor: 'pointer', textTransform: 'uppercase' }}>
                            START_RUN
                        </motion.button>
                        <motion.button whileHover={{ y: -4, boxShadow: '8px 8px 0 #000' }} whileTap={{ scale: 0.98, boxShadow: '2px 2px 0 #000', y: 2 }} style={{ padding: '16px 36px', background: 'var(--bg-surface)', border: '4px solid #000', color: 'var(--accent-cream)', fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, letterSpacing: 1, boxShadow: '4px 4px 0 #000', transition: 'all 0.1s', cursor: 'pointer', textTransform: 'uppercase' }}>
                            READ_MANUAL
                        </motion.button>
                    </motion.div>

                    {/* Stats */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        {[
                            { val: 99, suf: '+', label: 'LEVELS', bg: 'var(--accent-fire)' },
                            { val: 15, suf: 'M', label: 'PING (SPEED)', bg: 'var(--accent-gold)' },
                            { val: 10, suf: 'K', label: 'PLAYERS', bg: 'var(--accent-lime)' },
                        ].map((s, i) => (
                            <div key={i} style={{ background: s.bg, padding: '20px', border: '4px solid var(--border-subtle)', boxShadow: '4px 4px 0 #000', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.5rem', color: '#000', letterSpacing: -1, textShadow: '2px 2px 0 #fff' }}>
                                    <Counter end={s.val} suffix={s.suf} />
                                </span>
                                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, color: '#000', marginTop: 8, fontSize: '0.9rem', background: '#fff', border: '2px solid #000', padding: '2px 6px' }}>{s.label}</span>
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
