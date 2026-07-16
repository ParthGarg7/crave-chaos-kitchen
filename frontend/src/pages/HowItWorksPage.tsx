import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { AI_PROMPT } from '../content/aiPrompt';

export default function HowItWorksPage() {
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setCopied(true);
      toast.success('Prompt copied! Paste it into your AI.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy — select the text manually.');
    }
  };

  return (
    <section style={{ minHeight: '100vh', padding: '110px var(--space-lg) var(--space-2xl)', maxWidth: 900, margin: '0 auto' }}>
      {/* Headline */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--accent-fire)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>
          How it works
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', lineHeight: 1.1, marginBottom: 16 }}>
          LET YOUR AI EXPLAIN IT.
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 640, margin: '0 auto' }}>
          Instead of reading a wall of documentation, copy the prompt below and paste it into
          <strong style={{ color: 'var(--accent-cream)' }}> ChatGPT, Claude, Gemini, or any AI assistant</strong>.
          It turns your AI into a personal guide to this project — it will ask whether you're technical
          or just curious, then explain everything at exactly your level. New to tech? It teaches with
          everyday analogies. A developer? It talks architecture and trade-offs.
        </p>
      </motion.div>

      {/* Steps */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
        {[
          { n: '1', emoji: '📋', title: 'Copy the prompt', sub: 'One click below' },
          { n: '2', emoji: '🤖', title: 'Paste into your AI', sub: 'ChatGPT, Claude, Gemini…' },
          { n: '3', emoji: '💬', title: 'Ask anything', sub: 'It adapts to your level' },
        ].map(step => (
          <div key={step.n} className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', textAlign: 'center', border: '1px solid var(--border-soft)' }}>
            <p style={{ fontSize: '1.8rem', marginBottom: 8 }}>{step.emoji}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-cream)', marginBottom: 4 }}>{step.n}. {step.title}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{step.sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Copy button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={copyPrompt}
          className="shimmer"
          style={{
            padding: '16px 42px', background: copied ? '#22c55e' : 'var(--accent-fire)', color: '#fff',
            fontFamily: 'var(--font-body)', fontSize: '0.85rem', letterSpacing: 3, textTransform: 'uppercase',
            borderRadius: 'var(--radius-sm)', fontWeight: 500,
            boxShadow: copied ? '0 0 30px rgba(34,197,94,0.4)' : '0 0 40px var(--glow-fire)',
            transition: 'background 0.3s',
          }}
        >
          {copied ? '✓ COPIED!' : '📋 COPY THE PROMPT'}
        </motion.button>
      </motion.div>

      {/* The prompt itself */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="glass" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border-soft)' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
            the-crave-prompt.txt
          </span>
          <button onClick={copyPrompt} style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--accent-fire)', letterSpacing: 1 }}>
            {copied ? '✓ copied' : 'copy'}
          </button>
        </div>
        <pre style={{
          margin: 0, padding: 'var(--space-md)', maxHeight: 480, overflowY: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          fontFamily: 'var(--font-body)', fontSize: '0.74rem', lineHeight: 1.65, color: 'var(--accent-cream)',
          background: 'var(--bg-surface)',
        }}>
          {AI_PROMPT}
        </pre>
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        style={{ textAlign: 'center', marginTop: 'var(--space-md)', fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        The same prompt lives in the{' '}
        <a href="https://github.com/ParthGarg7/crave-chaos-kitchen#-understand-this-project-with-ai" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-fire)' }}>
          GitHub README
        </a>
        {' '}— share it with anyone curious about the project.
      </motion.p>
    </section>
  );
}
