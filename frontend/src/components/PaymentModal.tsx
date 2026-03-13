import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────
export type PaymentMethod = 'card' | 'upi' | 'cash' | 'paypal';

interface CartSummaryItem {
    name: string;
    emoji: string;
    qty: number;
    price: number;
}

interface PaymentModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (method: PaymentMethod) => void;
    total: number;
    cartItems: CartSummaryItem[];
    orderState: 'idle' | 'loading' | 'success';
    errorMessage?: string; // Inline error from order creation (shown as red banner)
}

// ─── Inline SVG QR Code (decorative, represents UPI/QR) ──────
function QrCodeSvg() {
    return (
        <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
        >
            {/* Outer border */}
            <rect x="4" y="4" width="152" height="152" rx="8" fill="none" stroke="rgba(255,69,0,0.4)" strokeWidth="2" />
            {/* Top-left finder */}
            <rect x="12" y="12" width="44" height="44" rx="4" fill="rgba(255,69,0,0.15)" stroke="var(--accent-fire)" strokeWidth="2" />
            <rect x="22" y="22" width="24" height="24" rx="2" fill="var(--accent-fire)" />
            {/* Top-right finder */}
            <rect x="104" y="12" width="44" height="44" rx="4" fill="rgba(255,69,0,0.15)" stroke="var(--accent-fire)" strokeWidth="2" />
            <rect x="114" y="22" width="24" height="24" rx="2" fill="var(--accent-fire)" />
            {/* Bottom-left finder */}
            <rect x="12" y="104" width="44" height="44" rx="4" fill="rgba(255,69,0,0.15)" stroke="var(--accent-fire)" strokeWidth="2" />
            <rect x="22" y="114" width="24" height="24" rx="2" fill="var(--accent-fire)" />
            {/* Data modules (decorative grid) */}
            {[
                [70, 12], [80, 12], [90, 12], [70, 22], [90, 22], [80, 32], [70, 42], [90, 42],
                [12, 70], [12, 80], [12, 90], [22, 70], [22, 90], [32, 80], [42, 70], [42, 90],
                [70, 70], [80, 70], [90, 70], [100, 70], [110, 70], [120, 70], [130, 70], [140, 70],
                [70, 80], [100, 80], [130, 80], [70, 90], [80, 90], [110, 90], [140, 90],
                [70, 100], [90, 100], [110, 100], [130, 100], [70, 110], [80, 110], [100, 110], [120, 110],
                [70, 120], [90, 120], [110, 120], [140, 120], [80, 130], [100, 130], [120, 130], [140, 130],
                [70, 140], [80, 140], [100, 140], [110, 140], [130, 140],
            ].map(([x, y], i) => (
                <rect key={i} x={x} y={y} width="8" height="8" rx="1"
                    fill={`rgba(255, 140, 0, ${0.4 + (i % 5) * 0.1})`} />
            ))}
        </svg>
    );
}

// ─── Card Input Helpers ───────────────────────────────────────
function formatCardNumber(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

// ─── Input component (styled for dark theme) ─────────────────
function PayInput({
    label, value, onChange, placeholder, maxLength, type = 'text', icon,
}: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; maxLength?: number; type?: string; icon?: string;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
                fontFamily: 'var(--font-body)', fontSize: '0.65rem',
                letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)',
            }}>{label}</label>
            <div style={{ position: 'relative' }}>
                {icon && (
                    <span style={{
                        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                        fontSize: '1rem', pointerEvents: 'none',
                    }}>{icon}</span>
                )}
                <input
                    type={type}
                    value={value}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onChange={e => onChange(e.target.value)}
                    style={{
                        width: '100%',
                        padding: icon ? '12px 12px 12px 38px' : '12px 14px',
                        background: 'var(--bg-elevated)',
                        border: `1px solid ${focused ? 'var(--accent-fire)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--accent-cream)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        cursor: 'none',
                        letterSpacing: focused ? 1 : 0,
                    }}
                />
            </div>
        </div>
    );
}

// ─── Tab button ───────────────────────────────────────────────
function TabBtn({
    active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: string; label: string }) {
    return (
        <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClick}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 5, padding: '10px 8px', borderRadius: 'var(--radius-sm)',
                background: active ? 'rgba(255,69,0,0.14)' : 'var(--bg-elevated)',
                border: `1px solid ${active ? 'var(--accent-fire)' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'none', flex: 1,
                transition: 'all 0.2s',
                boxShadow: active ? '0 0 12px rgba(255,69,0,0.18)' : 'none',
            }}
        >
            <span style={{ fontSize: '1.3rem' }}>{icon}</span>
            <span style={{
                fontFamily: 'var(--font-body)', fontSize: '0.55rem',
                letterSpacing: 1, textTransform: 'uppercase',
                color: active ? 'var(--accent-fire)' : 'var(--text-muted)',
                transition: 'color 0.2s',
            }}>{label}</span>
        </motion.button>
    );
}

// ─── Main Component ───────────────────────────────────────────
export default function PaymentModal({
    open, onClose, onConfirm, total, cartItems, orderState, errorMessage = '',
}: PaymentModalProps) {
    const [tab, setTab] = useState<PaymentMethod>('card');

    // Card fields
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [cardError, setCardError] = useState('');

    // UPI
    const [upiId, setUpiId] = useState('');
    const [upiMode, setUpiMode] = useState<'qr' | 'id'>('qr');

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setTab('card');
            setCardNumber(''); setExpiry(''); setCvv(''); setCardError('');
            setUpiId(''); setUpiMode('qr');
        }
    }, [open]);

    const handleConfirm = () => {
        if (tab === 'card') {
            const rawNum = cardNumber.replace(/\s/g, '');
            if (rawNum.length < 16) { setCardError('Enter a valid 16-digit card number'); return; }
            if (expiry.length < 5) { setCardError('Enter expiry as MM/YY'); return; }
            if (cvv.length < 3) { setCardError('Enter a valid CVV'); return; }
            setCardError('');
        }
        if (tab === 'upi' && upiMode === 'id' && !upiId.includes('@')) {
            return; // silent — button will be disabled
        }
        onConfirm(tab);
    };

    const isConfirmDisabled = orderState !== 'idle' || (
        tab === 'upi' && upiMode === 'id' && !upiId.includes('@')
    );

    const confirmLabel =
        orderState === 'loading' ? '⏳ PROCESSING...' :
            orderState === 'success' ? '✅ CONFIRMED!' :
                tab === 'card' ? `PAY  ₹${total.toLocaleString('en-IN')}` :
                    tab === 'upi' ? 'PAY VIA UPI →' :
                        tab === 'cash' ? 'CONFIRM ORDER →' :
                            'PAY VIA PAYPAL →';

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="pay-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={orderState === 'idle' ? onClose : undefined}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.75)',
                            backdropFilter: 'blur(12px)',
                            zIndex: 2100,
                        }}
                    />

                    {/* Modal panel */}
                    <motion.div
                        key="pay-panel"
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        style={{
                            position: 'fixed', bottom: 0, left: 0, right: 0,
                            maxWidth: 520, margin: '0 auto',
                            background: 'var(--bg-surface)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderTop: '1px solid rgba(255,69,0,0.2)',
                            borderRadius: '24px 24px 0 0',
                            zIndex: 2101,
                            display: 'flex', flexDirection: 'column',
                            maxHeight: '92vh', overflow: 'hidden',
                        }}
                    >
                        {/* ── Header ── */}
                        <div style={{
                            padding: '20px 24px 14px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
                        }}>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={orderState === 'idle' ? onClose : undefined}
                                disabled={orderState !== 'idle'}
                                style={{
                                    width: 34, height: 34, borderRadius: '50%',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.85rem', color: 'var(--text-muted)',
                                    flexShrink: 0, cursor: 'none',
                                }}
                            >←</motion.button>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.6rem', lineHeight: 1.1 }}>
                                    PAYMENT
                                </p>
                                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: 1 }}>
                                    Choose your payment method
                                </p>
                            </div>
                            <div style={{
                                fontFamily: 'var(--font-accent)', fontSize: '1.5rem',
                                color: 'var(--accent-gold)',
                            }}>
                                ₹{total.toLocaleString('en-IN')}
                            </div>
                        </div>

                        {/* ── Scrollable body ── */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

                            {/* Order mini-summary */}
                            <div style={{
                                background: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '10px 14px',
                                marginBottom: 18,
                                display: 'flex', gap: 6, flexWrap: 'wrap',
                            }}>
                                {cartItems.map((item, i) => (
                                    <span key={i} style={{
                                        fontFamily: 'var(--font-body)', fontSize: '0.68rem',
                                        color: 'var(--text-muted)',
                                        background: 'rgba(255,255,255,0.04)',
                                        borderRadius: 'var(--radius-pill)',
                                        padding: '3px 10px',
                                    }}>
                                        {item.emoji} {item.name} ×{item.qty}
                                    </span>
                                ))}
                            </div>

                            {/* ── Payment Method Tabs ── */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
                                <TabBtn active={tab === 'card'} onClick={() => setTab('card')} icon="💳" label="Card" />
                                <TabBtn active={tab === 'upi'} onClick={() => setTab('upi')} icon="📱" label="UPI" />
                                <TabBtn active={tab === 'cash'} onClick={() => setTab('cash')} icon="🚪" label="Cash" />
                                <TabBtn active={tab === 'paypal'} onClick={() => setTab('paypal')} icon="🅿️" label="PayPal" />
                            </div>

                            {/* ── Tab Content ── */}
                            <AnimatePresence mode="wait">

                                {/* ─ Card ─ */}
                                {tab === 'card' && (
                                    <motion.div
                                        key="card-tab"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.18 }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                                    >
                                        {/* Card preview */}
                                        <motion.div
                                            initial={{ rotateY: -8 }}
                                            animate={{ rotateY: 0 }}
                                            style={{
                                                background: 'linear-gradient(135deg, #1c191e 0%, #2d2330 50%, #1c191e 100%)',
                                                border: '1px solid rgba(255,69,0,0.25)',
                                                borderRadius: 16,
                                                padding: '20px 22px',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                marginBottom: 4,
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                            }}
                                        >
                                            {/* Holographic shimmer */}
                                            <div style={{
                                                position: 'absolute', inset: 0,
                                                background: 'linear-gradient(135deg, rgba(255,69,0,0.06) 0%, transparent 50%, rgba(255,197,67,0.06) 100%)',
                                                pointerEvents: 'none',
                                            }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                                                <div style={{
                                                    width: 36, height: 28,
                                                    background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-ember))',
                                                    borderRadius: 4, opacity: 0.9,
                                                }} />
                                                <span style={{ fontFamily: 'var(--font-accent)', fontSize: '1.2rem', color: 'rgba(255,255,255,0.4)' }}>CRAVE+</span>
                                            </div>
                                            <p style={{
                                                fontFamily: 'var(--font-accent)', fontSize: '1.35rem',
                                                letterSpacing: 4, color: 'var(--accent-cream)',
                                                marginBottom: 14,
                                            }}>
                                                {cardNumber || '•••• •••• •••• ••••'}
                                            </p>
                                            <div style={{ display: 'flex', gap: 28 }}>
                                                <div>
                                                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.5rem', color: 'var(--text-muted)', letterSpacing: 1 }}>EXPIRES</p>
                                                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '0.9rem', color: 'var(--accent-cream)' }}>{expiry || 'MM/YY'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.5rem', color: 'var(--text-muted)', letterSpacing: 1 }}>CVV</p>
                                                    <p style={{ fontFamily: 'var(--font-accent)', fontSize: '0.9rem', color: 'var(--accent-cream)' }}>{cvv ? '•••' : '•••'}</p>
                                                </div>
                                            </div>
                                        </motion.div>

                                        <PayInput
                                            label="Card Number"
                                            icon="💳"
                                            value={cardNumber}
                                            placeholder="1234 5678 9012 3456"
                                            maxLength={19}
                                            onChange={v => setCardNumber(formatCardNumber(v))}
                                        />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <PayInput
                                                label="Expiry"
                                                icon="📅"
                                                value={expiry}
                                                placeholder="MM/YY"
                                                maxLength={5}
                                                onChange={v => setExpiry(formatExpiry(v))}
                                            />
                                            <PayInput
                                                label="CVV"
                                                icon="🔒"
                                                value={cvv}
                                                placeholder="•••"
                                                maxLength={4}
                                                type="password"
                                                onChange={v => setCvv(v.replace(/\D/g, '').slice(0, 4))}
                                            />
                                        </div>

                                        {cardError && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                style={{
                                                    fontFamily: 'var(--font-body)', fontSize: '0.68rem',
                                                    color: '#f87171', letterSpacing: 0.5,
                                                }}
                                            >
                                                ⚠ {cardError}
                                            </motion.p>
                                        )}

                                        <div style={{
                                            display: 'flex', gap: 10, padding: '10px 14px',
                                            background: 'rgba(255,197,67,0.06)', borderRadius: 'var(--radius-sm)',
                                            border: '1px solid rgba(255,197,67,0.12)',
                                            alignItems: 'center',
                                        }}>
                                            <span style={{ fontSize: '1rem' }}>🔐</span>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: 0.5 }}>
                                                256-bit SSL encrypted · Your card data is never stored
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ─ UPI ─ */}
                                {tab === 'upi' && (
                                    <motion.div
                                        key="upi-tab"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.18 }}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}
                                    >
                                        {/* Mode toggle */}
                                        <div style={{
                                            display: 'flex', width: '100%',
                                            background: 'var(--bg-elevated)',
                                            borderRadius: 'var(--radius-pill)',
                                            padding: 3,
                                        }}>
                                            {(['qr', 'id'] as const).map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setUpiMode(m)}
                                                    style={{
                                                        flex: 1, padding: '8px 0',
                                                        borderRadius: 'var(--radius-pill)',
                                                        background: upiMode === m ? 'var(--accent-fire)' : 'transparent',
                                                        color: upiMode === m ? '#fff' : 'var(--text-muted)',
                                                        fontFamily: 'var(--font-body)', fontSize: '0.68rem',
                                                        letterSpacing: 1, textTransform: 'uppercase',
                                                        transition: 'all 0.2s', cursor: 'none',
                                                    }}
                                                >
                                                    {m === 'qr' ? '📷 Scan QR' : '⌨️ UPI ID'}
                                                </button>
                                            ))}
                                        </div>

                                        <AnimatePresence mode="wait">
                                            {upiMode === 'qr' ? (
                                                <motion.div
                                                    key="qr"
                                                    initial={{ opacity: 0, scale: 0.85 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.85 }}
                                                    style={{
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                                                        padding: 28, background: 'var(--bg-elevated)',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid rgba(255,69,0,0.2)',
                                                        width: '100%',
                                                    }}
                                                >
                                                    <div style={{
                                                        background: '#fff', padding: 12, borderRadius: 12,
                                                        boxShadow: '0 0 32px rgba(255,69,0,0.25)',
                                                    }}>
                                                        <QrCodeSvg />
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--accent-cream)', marginBottom: 4 }}>
                                                            Scan with any UPI app
                                                        </p>
                                                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: 0.5 }}>
                                                            GPay · PhonePe · Paytm · BHIM
                                                        </p>
                                                    </div>
                                                    <div style={{
                                                        padding: '8px 18px',
                                                        background: 'rgba(255,69,0,0.08)',
                                                        borderRadius: 'var(--radius-pill)',
                                                        border: '1px solid rgba(255,69,0,0.2)',
                                                    }}>
                                                        <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1rem', color: 'var(--accent-fire)', letterSpacing: 2 }}>
                                                            crave@upi
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="upiid"
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}
                                                >
                                                    <PayInput
                                                        label="Your UPI ID"
                                                        icon="@"
                                                        value={upiId}
                                                        placeholder="yourname@upi"
                                                        onChange={setUpiId}
                                                    />
                                                    {upiId.length > 0 && !upiId.includes('@') && (
                                                        <motion.p
                                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                            style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: '#f87171' }}
                                                        >
                                                            ⚠ Enter a valid UPI ID (e.g. name@okaxis)
                                                        </motion.p>
                                                    )}
                                                    <div style={{
                                                        display: 'flex', gap: 8, flexWrap: 'wrap',
                                                    }}>
                                                        {['@okaxis', '@oksbi', '@ybl', '@ptyes'].map(s => (
                                                            <button
                                                                key={s}
                                                                onClick={() => setUpiId(prev => prev.split('@')[0] + s)}
                                                                style={{
                                                                    padding: '4px 12px',
                                                                    borderRadius: 'var(--radius-pill)',
                                                                    background: 'var(--bg-elevated)',
                                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                                    fontFamily: 'var(--font-body)', fontSize: '0.6rem',
                                                                    color: 'var(--text-muted)', cursor: 'none',
                                                                }}
                                                            >{s}</button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}

                                {/* ─ Cash on Delivery ─ */}
                                {tab === 'cash' && (
                                    <motion.div
                                        key="cash-tab"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.18 }}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            gap: 20, padding: '10px 0',
                                        }}
                                    >
                                        <motion.div
                                            animate={{ y: [0, -6, 0] }}
                                            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                                            style={{ fontSize: '5rem', lineHeight: 1 }}
                                        >
                                            🛵
                                        </motion.div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.6rem', marginBottom: 8 }}>
                                                CASH ON DELIVERY
                                            </p>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.8, maxWidth: 300 }}>
                                                Pay in cash when your order arrives at your door. Our delivery partner will bring change.
                                            </p>
                                        </div>
                                        <div style={{
                                            width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                                        }}>
                                            {[
                                                { icon: '✅', label: 'No transaction fee' },
                                                { icon: '🔒', label: 'Secure & trusted' },
                                                { icon: '💵', label: 'Pay on arrival' },
                                                { icon: '🕐', label: '30–45 min ETA' },
                                            ].map(({ icon, label }) => (
                                                <div key={label} style={{
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                    padding: '10px 12px',
                                                    background: 'var(--bg-elevated)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                }}>
                                                    <span style={{ fontSize: '0.9rem' }}>{icon}</span>
                                                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>{label}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{
                                            width: '100%', padding: '12px 16px',
                                            background: 'rgba(255,197,67,0.06)',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid rgba(255,197,67,0.12)',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Amount to pay at door</span>
                                            <span style={{ fontFamily: 'var(--font-accent)', fontSize: '1.2rem', color: 'var(--accent-gold)' }}>
                                                ₹{total.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ─ PayPal ─ */}
                                {tab === 'paypal' && (
                                    <motion.div
                                        key="paypal-tab"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.18 }}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            gap: 22, padding: '10px 0',
                                        }}
                                    >
                                        {/* PayPal logo area */}
                                        <div style={{
                                            background: '#003087',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '28px 36px',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                            width: '100%',
                                            border: '1px solid rgba(0, 112, 186, 0.4)',
                                            boxShadow: '0 8px 32px rgba(0,48,135,0.4)',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: '2rem' }}>🅿️</span>
                                                <div>
                                                    <span style={{
                                                        fontFamily: 'var(--font-accent)', fontSize: '2rem',
                                                        color: '#009cde', letterSpacing: 2,
                                                    }}>Pay</span>
                                                    <span style={{
                                                        fontFamily: 'var(--font-accent)', fontSize: '2rem',
                                                        color: '#012169', letterSpacing: 2,
                                                        WebkitTextStroke: '0.5px #009cde',
                                                    }}>Pal</span>
                                                </div>
                                            </div>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
                                                The safer, easier way to pay
                                            </p>
                                        </div>

                                        <div style={{ textAlign: 'center', width: '100%' }}>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 16 }}>
                                                You'll be redirected to PayPal to complete your purchase securely.
                                                Your order will be confirmed upon successful payment.
                                            </p>
                                        </div>

                                        {[
                                            { icon: '🔒', label: 'PayPal Buyer Protection' },
                                            { icon: '⚡', label: 'Instant payment confirmation' },
                                            { icon: '🌍', label: 'Accepted worldwide' },
                                        ].map(({ icon, label }) => (
                                            <div key={label} style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                width: '100%', padding: '10px 14px',
                                                background: 'var(--bg-elevated)',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                            }}>
                                                <span style={{ fontSize: '1rem' }}>{icon}</span>
                                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{label}</span>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </div>

                        {/* ── Footer CTA ── */}
                        <div style={{
                            padding: '16px 24px 24px',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            flexShrink: 0,
                        }}>
                            {/* Error banner — shown when order creation fails */}
                            {errorMessage && orderState === 'idle' && (
                                <div style={{
                                    marginBottom: 12,
                                    padding: '10px 14px',
                                    background: 'rgba(248,81,73,0.1)',
                                    border: '1px solid rgba(248,81,73,0.35)',
                                    borderRadius: 8,
                                    display: 'flex', alignItems: 'flex-start', gap: 8,
                                }}>
                                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
                                    <p style={{
                                        fontFamily: 'var(--font-body)', fontSize: '0.72rem',
                                        color: '#f85149', lineHeight: 1.5, margin: 0,
                                    }}>
                                        {errorMessage}
                                    </p>
                                </div>
                            )}
                            <motion.button
                                whileHover={orderState === 'idle' ? { scale: 1.02 } : {}}
                                whileTap={orderState === 'idle' ? { scale: 0.98 } : {}}
                                onClick={handleConfirm}
                                disabled={isConfirmDisabled}
                                style={{
                                    width: '100%', padding: '16px 0',
                                    background: orderState === 'success'
                                        ? '#22c55e'
                                        : tab === 'paypal'
                                            ? 'linear-gradient(90deg, #003087, #009cde)'
                                            : 'var(--accent-fire)',
                                    color: '#fff',
                                    fontFamily: 'var(--font-accent)', fontSize: '1.3rem', letterSpacing: 3,
                                    borderRadius: 'var(--radius-sm)', cursor: 'none',
                                    transition: 'background 0.3s, opacity 0.2s',
                                    opacity: isConfirmDisabled && orderState === 'idle' ? 0.5 : 1,
                                    position: 'relative', overflow: 'hidden',
                                }}
                            >
                                {/* Moving shimmer on idle */}
                                {orderState === 'idle' && (
                                    <span style={{
                                        position: 'absolute', inset: 0,
                                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 2s ease-in-out infinite',
                                    }} />
                                )}
                                <span style={{ position: 'relative', zIndex: 1 }}>{confirmLabel}</span>
                            </motion.button>
                            <p style={{
                                fontFamily: 'var(--font-body)', fontSize: '0.58rem',
                                color: 'var(--text-muted)', textAlign: 'center',
                                marginTop: 10, letterSpacing: 0.5,
                            }}>
                                🔐 Payments are encrypted end-to-end
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
