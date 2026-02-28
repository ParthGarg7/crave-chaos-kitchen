import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AxiosError } from 'axios';
import { contactApi } from '../services/api';

interface Props {
    open: boolean;
    onClose: () => void;
}

type FormState = 'idle' | 'loading' | 'success' | 'error';

interface TicketResult {
    ticket_id: string;
    message: string;
}

interface ApiError {
    status?: number;
    message: string;
}

export default function ContactSupportModal({ open, onClose }: Props) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [formState, setFormState] = useState<FormState>('idle');
    const [ticket, setTicket] = useState<TicketResult | null>(null);
    const [apiError, setApiError] = useState<ApiError | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    // Focus first field when modal opens
    useEffect(() => {
        if (open) {
            setTimeout(() => nameRef.current?.focus(), 120);
        }
    }, [open]);

    // Reset state when modal is closed
    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setName('');
                setEmail('');
                setMessage('');
                setFormState('idle');
                setTicket(null);
                setApiError(null);
            }, 300);
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    const isValid = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email) && message.trim().length >= 10;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid || formState === 'loading') return;

        setFormState('loading');
        setApiError(null);

        try {
            const res = await contactApi.submit({ name: name.trim(), email: email.trim(), message: message.trim() });
            setTicket({ ticket_id: res.data.ticket_id, message: res.data.message });
            setFormState('success');
        } catch (err) {
            const axiosErr = err as AxiosError<{ message?: string; detail?: string }>;
            const status = axiosErr.response?.status;
            const detail = axiosErr.response?.data?.detail ?? axiosErr.response?.data?.message;

            let errorMessage = 'Something went wrong. Please try again.';
            if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
                errorMessage = 'Request timed out. The server took too long to respond.';
            } else if (status === 500) {
                errorMessage = detail ?? 'Internal Server Error — something went wrong on our end.';
            } else if (status === 503) {
                errorMessage = detail ?? 'Service Unavailable — the support service is temporarily offline.';
            } else if (status === 422) {
                errorMessage = 'Please double-check your name, email, and message (at least 10 characters).';
            } else if (detail) {
                errorMessage = detail;
            }

            setApiError({ status, message: errorMessage });
            setFormState('error');
        }
    };

    const handleRetry = () => {
        setFormState('idle');
        setApiError(null);
    };

    // ── Shared styles ──
    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 14px',
        background: 'var(--bg-elevated)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--accent-cream)',
        fontFamily: 'var(--font-body)',
        fontSize: '0.85rem',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontFamily: 'var(--font-body)',
        fontSize: '0.68rem',
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: 6,
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop + centering wrapper */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.65)',
                            backdropFilter: 'blur(10px)',
                            zIndex: 3000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '24px 16px',
                            overflowY: 'auto',
                        }}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.93, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.93, y: 24 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            width: '100%', maxWidth: 500,
                            maxHeight: 'calc(100vh - 48px)',
                            background: 'var(--bg-surface)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
                            zIndex: 3001,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '24px 28px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        }}>
                            <div>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 4 }}>
                                    CONTACT SUPPORT
                                </h2>
                                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    We'll get back to you as soon as possible.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                style={{ fontSize: '1.4rem', color: 'var(--text-muted)', lineHeight: 1, marginTop: 2 }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px 28px 28px', overflowY: 'auto', flex: 1 }}>
                            <AnimatePresence mode="wait">

                                {/* ── Success screen ── */}
                                {formState === 'success' && ticket && (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        style={{ textAlign: 'center', padding: '12px 0 4px' }}
                                    >
                                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
                                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: 8, color: '#4ade80' }}>
                                            Message Sent!
                                        </h3>
                                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--accent-cream)', lineHeight: 1.6, marginBottom: 20 }}>
                                            {ticket.message}
                                        </p>
                                        <div style={{
                                            display: 'inline-block', padding: '8px 20px',
                                            background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
                                            borderRadius: 'var(--radius-pill)',
                                            fontFamily: 'var(--font-accent)', fontSize: '0.9rem', color: '#4ade80',
                                            letterSpacing: 2, marginBottom: 24,
                                        }}>
                                            {ticket.ticket_id}
                                        </div>
                                        <br />
                                        <motion.button
                                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                            onClick={onClose}
                                            style={{
                                                padding: '12px 36px',
                                                background: 'var(--accent-fire)', color: '#fff',
                                                fontFamily: 'var(--font-accent)', fontSize: '1rem', letterSpacing: 2,
                                                borderRadius: 'var(--radius-sm)',
                                            }}
                                        >
                                            CLOSE
                                        </motion.button>
                                    </motion.div>
                                )}

                                {/* ── Error screen ── */}
                                {formState === 'error' && apiError && (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <div style={{
                                            padding: '16px 18px',
                                            background: 'rgba(239,68,68,0.08)',
                                            border: '1px solid rgba(239,68,68,0.25)',
                                            borderRadius: 'var(--radius-sm)',
                                            marginBottom: 20,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                                <span style={{
                                                    fontFamily: 'var(--font-accent)', fontSize: '0.78rem',
                                                    letterSpacing: 2, color: '#f87171',
                                                }}>
                                                    {apiError.status ? `HTTP ${apiError.status}` : 'ERROR'}
                                                </span>
                                            </div>
                                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--accent-cream)', lineHeight: 1.6 }}>
                                                {apiError.message}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                                onClick={handleRetry}
                                                style={{
                                                    flex: 1, padding: '12px 0',
                                                    background: 'var(--accent-fire)', color: '#fff',
                                                    fontFamily: 'var(--font-accent)', fontSize: '1rem', letterSpacing: 2,
                                                    borderRadius: 'var(--radius-sm)',
                                                }}
                                            >
                                                RETRY
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                                onClick={onClose}
                                                style={{
                                                    padding: '12px 20px',
                                                    background: 'transparent', color: 'var(--text-muted)',
                                                    fontFamily: 'var(--font-body)', fontSize: '0.82rem',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: 'var(--radius-sm)',
                                                }}
                                            >
                                                Cancel
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── Form (idle / loading) ── */}
                                {(formState === 'idle' || formState === 'loading') && (
                                    <motion.form
                                        key="form"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onSubmit={handleSubmit}
                                        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
                                    >
                                        {/* Name */}
                                        <div>
                                            <label style={labelStyle}>Name</label>
                                            <input
                                                ref={nameRef}
                                                type="text"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                placeholder="Your full name"
                                                required
                                                disabled={formState === 'loading'}
                                                style={inputStyle}
                                                onFocus={e => (e.target.style.borderColor = 'var(--accent-fire)')}
                                                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                                            />
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label style={labelStyle}>Email</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                required
                                                disabled={formState === 'loading'}
                                                style={inputStyle}
                                                onFocus={e => (e.target.style.borderColor = 'var(--accent-fire)')}
                                                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                                            />
                                        </div>

                                        {/* Message */}
                                        <div>
                                            <label style={labelStyle}>
                                                Message
                                                <span style={{ marginLeft: 8, color: message.length < 10 && message.length > 0 ? '#f87171' : 'var(--text-muted)' }}>
                                                    ({message.length}/2000)
                                                </span>
                                            </label>
                                            <textarea
                                                value={message}
                                                onChange={e => setMessage(e.target.value)}
                                                placeholder="Describe your issue…"
                                                required
                                                rows={5}
                                                maxLength={2000}
                                                disabled={formState === 'loading'}
                                                style={{ ...inputStyle, resize: 'vertical', minHeight: 110 }}
                                                onFocus={e => (e.target.style.borderColor = 'var(--accent-fire)')}
                                                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                                            />
                                            {message.length > 0 && message.length < 10 && (
                                                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#f87171', marginTop: 4 }}>
                                                    Minimum 10 characters required.
                                                </p>
                                            )}
                                        </div>

                                        {/* Submit */}
                                        <motion.button
                                            type="submit"
                                            whileHover={isValid && formState !== 'loading' ? { scale: 1.02 } : {}}
                                            whileTap={isValid && formState !== 'loading' ? { scale: 0.98 } : {}}
                                            disabled={!isValid || formState === 'loading'}
                                            style={{
                                                width: '100%', padding: '14px 0',
                                                background: isValid ? 'var(--accent-fire)' : 'rgba(255,255,255,0.06)',
                                                color: isValid ? '#fff' : 'var(--text-muted)',
                                                fontFamily: 'var(--font-accent)', fontSize: '1.1rem', letterSpacing: 3,
                                                borderRadius: 'var(--radius-sm)',
                                                transition: 'background 0.25s, color 0.25s',
                                                cursor: isValid && formState !== 'loading' ? 'none' : 'not-allowed',
                                            }}
                                        >
                                            {formState === 'loading' ? '⏳ SENDING…' : 'SEND MESSAGE →'}
                                        </motion.button>
                                    </motion.form>
                                )}

                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
