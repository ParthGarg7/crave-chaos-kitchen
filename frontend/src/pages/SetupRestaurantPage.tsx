import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { restaurantApi } from '../services/api';
import toast from 'react-hot-toast';

const CUISINE_OPTIONS = [
    { value: 'italian', label: '🍕 Italian' },
    { value: 'indian', label: '🍛 Indian' },
    { value: 'chinese', label: '🥢 Chinese' },
    { value: 'mexican', label: '🌮 Mexican' },
    { value: 'american', label: '🍔 American' },
    { value: 'japanese', label: '🍣 Japanese' },
    { value: 'thai', label: '🍜 Thai' },
    { value: 'fast_food', label: '🍟 Fast Food' },
    { value: 'other', label: '🍽️ Other' },
];

const STEPS = ['Basic Info', 'Address', 'Delivery Settings', 'Review'];

interface FormState {
    name: string;
    description: string;
    cuisine_type: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    opening_time: string;
    closing_time: string;
    delivery_fee: string;
    min_order_amount: string;
    delivery_time_min: string;
    delivery_time_max: string;
}

const INITIAL: FormState = {
    name: '', description: '', cuisine_type: 'other',
    phone: '', email: '',
    address: '', city: '', state: '', zip_code: '',
    opening_time: '09:00', closing_time: '22:00',
    delivery_fee: '49', min_order_amount: '99',
    delivery_time_min: '25', delivery_time_max: '45',
};

const inp = {
    width: '100%', padding: '12px 14px',
    background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 'var(--radius-sm)', color: 'var(--accent-cream)',
    fontFamily: 'var(--font-body)', fontSize: '0.84rem', outline: 'none',
    boxSizing: 'border-box' as const,
} as React.CSSProperties;

const lbl = {
    display: 'block', fontFamily: 'var(--font-body)',
    fontSize: '0.62rem', letterSpacing: 2, textTransform: 'uppercase' as const,
    color: 'var(--text-muted)', marginBottom: 6,
};

export default function SetupRestaurantPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<FormState>(INITIAL);
    const [saving, setSaving] = useState(false);

    // Guard
    if (!user || (user.role !== 'restaurant_owner' && user.role !== 'admin')) {
        navigate('/login');
        return null;
    }

    const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));
    const pct = ((step + 1) / STEPS.length) * 100;

    const validateStep = (): boolean => {
        if (step === 0) {
            if (!form.name.trim()) { toast.error('Restaurant name is required'); return false; }
            if (!form.phone.trim()) { toast.error('Phone number is required'); return false; }
        }
        if (step === 1) {
            if (!form.address.trim()) { toast.error('Address is required'); return false; }
            if (!form.city.trim()) { toast.error('City is required'); return false; }
            if (!form.state.trim()) { toast.error('State is required'); return false; }
            if (!form.zip_code.trim()) { toast.error('Zip code is required'); return false; }
        }
        if (step === 2) {
            const fee = parseFloat(form.delivery_fee);
            const min = parseFloat(form.min_order_amount);
            if (isNaN(fee) || fee < 0) { toast.error('Invalid delivery fee'); return false; }
            if (isNaN(min) || min < 0) { toast.error('Invalid minimum order amount'); return false; }
        }
        return true;
    };

    const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
    const back = () => setStep(s => Math.max(s - 1, 0));

    const handleSubmit = async () => {
        setSaving(true);
        try {
            await restaurantApi.create({
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                cuisine_type: form.cuisine_type,
                phone: form.phone.trim(),
                email: form.email.trim() || undefined,
                address: form.address.trim(),
                city: form.city.trim(),
                state: form.state.trim(),
                zip_code: form.zip_code.trim(),
                opening_time: form.opening_time,
                closing_time: form.closing_time,
                delivery_fee: parseFloat(form.delivery_fee) || 49,
                min_order_amount: parseFloat(form.min_order_amount) || 99,
                delivery_time_min: parseInt(form.delivery_time_min) || 25,
                delivery_time_max: parseInt(form.delivery_time_max) || 45,
            });
            toast.success('🎉 Restaurant created! Welcome aboard!');
            navigate('/restaurant-dashboard');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { detail?: string } } };
            toast.error(e?.response?.data?.detail || 'Failed to create restaurant. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px var(--space-lg) var(--space-xl)' }}>
            {/* Background glow */}
            <div style={{ position: 'fixed', top: -300, right: -200, width: 700, height: 700, borderRadius: '50%', background: 'var(--glow-fire)', filter: 'blur(200px)', opacity: 0.12, pointerEvents: 'none' }} />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', maxWidth: 640 }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                    <motion.div
                        animate={{ rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        style={{ fontSize: '3.5rem', marginBottom: 12 }}
                    >🏪</motion.div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: 8 }}>
                        Set Up Your Restaurant
                    </h1>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Get ready to receive orders in just a few steps
                    </p>
                </div>

                {/* Step indicators */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 0 }}>
                    {STEPS.map((label, i) => (
                        <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                background: i <= step ? 'var(--accent-fire)' : 'var(--bg-elevated)',
                                border: i <= step ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'var(--font-accent)', fontSize: '0.75rem', color: '#fff',
                                boxShadow: i === step ? '0 0 16px var(--glow-fire)' : 'none',
                                transition: 'all 0.3s',
                            }}>
                                {i < step ? '✓' : i + 1}
                            </div>
                            {i < STEPS.length - 1 && (
                                <div style={{ flex: 1, height: 2, background: i < step ? 'var(--accent-fire)' : 'rgba(255,255,255,0.07)', transition: 'background 0.4s' }} />
                            )}
                        </div>
                    ))}
                </div>
                {/* Progress bar */}
                <div style={{ height: 3, background: 'var(--bg-elevated)', borderRadius: 2, marginBottom: 'var(--space-xl)', overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} style={{ height: '100%', background: 'var(--accent-fire)', borderRadius: 2 }} />
                </div>

                {/* Card */}
                <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', border: '1px solid rgba(255,69,0,0.15)', position: 'relative', overflow: 'hidden' }}>
                    <AnimatePresence mode="wait">
                        {/* ── STEP 0: Basic Info ── */}
                        {step === 0 && (
                            <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 'var(--space-md)' }}>Basic Information</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <label style={lbl}>Restaurant Name *</label>
                                        <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Spice Garden" />
                                    </div>
                                    <div>
                                        <label style={lbl}>Description</label>
                                        <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Tell customers what makes your restaurant special..." />
                                    </div>
                                    <div>
                                        <label style={lbl}>Cuisine Type</label>
                                        <select style={{ ...inp }} value={form.cuisine_type} onChange={e => set('cuisine_type', e.target.value)}>
                                            {CUISINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={lbl}>Phone *</label>
                                            <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
                                        </div>
                                        <div>
                                            <label style={lbl}>Email</label>
                                            <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="orders@yourplace.com" />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={lbl}>Opening Time</label>
                                            <input style={inp} type="time" value={form.opening_time} onChange={e => set('opening_time', e.target.value)} />
                                        </div>
                                        <div>
                                            <label style={lbl}>Closing Time</label>
                                            <input style={inp} type="time" value={form.closing_time} onChange={e => set('closing_time', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 1: Address ── */}
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 'var(--space-md)' }}>Restaurant Location</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <label style={lbl}>Street Address *</label>
                                        <input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="e.g. 42, MG Road" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={lbl}>City *</label>
                                            <input style={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Bangalore" />
                                        </div>
                                        <div>
                                            <label style={lbl}>State *</label>
                                            <input style={inp} value={form.state} onChange={e => set('state', e.target.value)} placeholder="e.g. Karnataka" />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={lbl}>PIN Code *</label>
                                        <input style={inp} value={form.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="e.g. 560001" />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 2: Delivery Settings ── */}
                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 'var(--space-md)' }}>Delivery Settings</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={lbl}>Delivery Fee (₹)</label>
                                            <input style={inp} type="number" min="0" value={form.delivery_fee} onChange={e => set('delivery_fee', e.target.value)} placeholder="49" />
                                        </div>
                                        <div>
                                            <label style={lbl}>Min Order Amount (₹)</label>
                                            <input style={inp} type="number" min="0" value={form.min_order_amount} onChange={e => set('min_order_amount', e.target.value)} placeholder="99" />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={lbl}>Estimated Delivery Time (minutes)</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div>
                                                <input style={inp} type="number" min="1" value={form.delivery_time_min} onChange={e => set('delivery_time_min', e.target.value)} placeholder="Min (e.g. 25)" />
                                            </div>
                                            <div>
                                                <input style={inp} type="number" min="1" value={form.delivery_time_max} onChange={e => set('delivery_time_max', e.target.value)} placeholder="Max (e.g. 45)" />
                                            </div>
                                        </div>
                                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>Customers will see "{form.delivery_time_min || '?'}–{form.delivery_time_max || '?'} min" on the menu.</p>
                                    </div>

                                    {/* Preview tip box */}
                                    <div style={{ background: 'rgba(255,69,0,0.06)', border: '1px solid rgba(255,69,0,0.15)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
                                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Preview</p>
                                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--accent-cream)' }}>
                                            ₹{form.delivery_fee || 0} delivery · {form.delivery_time_min || '?'}–{form.delivery_time_max || '?'} min · Min order ₹{form.min_order_amount || 0}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 3: Review ── */}
                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 'var(--space-md)' }}>Review &amp; Confirm</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {[
                                        { label: '🏪 Name', value: form.name },
                                        { label: '🍽️ Cuisine', value: CUISINE_OPTIONS.find(o => o.value === form.cuisine_type)?.label ?? form.cuisine_type },
                                        { label: '📞 Phone', value: form.phone },
                                        { label: '📍 Address', value: `${form.address}, ${form.city}, ${form.state} ${form.zip_code}` },
                                        { label: '🕐 Hours', value: `${form.opening_time} – ${form.closing_time}` },
                                        { label: '🛵 Delivery', value: `₹${form.delivery_fee} fee · ${form.delivery_time_min}–${form.delivery_time_max} min` },
                                        { label: '💰 Min Order', value: `₹${form.min_order_amount}` },
                                    ].map(row => (
                                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.label}</span>
                                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--accent-cream)', fontWeight: 500, maxWidth: '55%', textAlign: 'right' }}>{row.value}</span>
                                        </div>
                                    ))}
                                    <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-sm)' }}>
                                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#22c55e' }}>
                                            ✅ Your restaurant will be live immediately. You can add menu items from your dashboard.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation buttons */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 'var(--space-xl)' }}>
                        {step > 0 && (
                            <motion.button
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={back}
                                style={{ flex: 1, padding: '14px 0', background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', letterSpacing: 2, textTransform: 'uppercase', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.07)' }}
                            >
                                ← Back
                            </motion.button>
                        )}
                        {step < STEPS.length - 1 ? (
                            <motion.button
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={next}
                                style={{ flex: 2, padding: '14px 0', background: 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-accent)', fontSize: '1.1rem', letterSpacing: 2, borderRadius: 'var(--radius-sm)', border: 'none', boxShadow: '0 0 24px var(--glow-fire)' }}
                            >
                                Next →
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={handleSubmit}
                                disabled={saving}
                                style={{ flex: 2, padding: '14px 0', background: saving ? 'var(--bg-elevated)' : 'var(--accent-fire)', color: '#fff', fontFamily: 'var(--font-accent)', fontSize: '1.1rem', letterSpacing: 2, borderRadius: 'var(--radius-sm)', border: 'none', boxShadow: saving ? 'none' : '0 0 24px var(--glow-fire)', transition: 'all 0.3s', opacity: saving ? 0.7 : 1 }}
                            >
                                {saving ? '⏳ Creating...' : '🚀 Launch Restaurant'}
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
