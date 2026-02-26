import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Play, AlertTriangle, CheckCircle, Server, Clock, Shield, Activity } from 'lucide-react';
import { FailurePreset } from '../../types';

interface PresetSelectorProps {
  presets: Record<string, FailurePreset>;
  onApplyPreset: (presetName: string) => void;
  isApplying: boolean;
}

const PRESET_META: Record<string, { icon: typeof Zap; color: string; accent: string }> = {
  demo_rate_limiting: { icon: Clock, color: '#ffc845', accent: 'rgba(255,200,69,0.12)' },
  demo_auth_failures: { icon: Shield, color: '#f87171', accent: 'rgba(248,113,113,0.12)' },
  demo_payment_issues: { icon: Zap, color: '#60a5fa', accent: 'rgba(96,165,250,0.12)' },
  demo_server_errors: { icon: Server, color: '#a78bfa', accent: 'rgba(167,139,250,0.12)' },
  demo_all_failures: { icon: Activity, color: '#fb923c', accent: 'rgba(251,146,60,0.12)' },
  chaos_mode: { icon: AlertTriangle, color: '#ef4444', accent: 'rgba(239,68,68,0.12)' },
  clear_all: { icon: CheckCircle, color: '#22c55e', accent: 'rgba(34,197,94,0.12)' },
};

const PresetSelector = ({ presets, onApplyPreset, isApplying }: PresetSelectorProps) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleApply = (key: string) => {
    setSelected(key);
    onApplyPreset(key);
  };

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', letterSpacing: 1 }}>
        Instantly apply predefined failure configurations to simulate realistic outage scenarios.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
        {Object.entries(presets).map(([key, preset]) => {
          const meta = PRESET_META[key] || { icon: Zap, color: 'var(--accent-fire)', accent: 'rgba(255,69,0,0.12)' };
          const Icon = meta.icon;
          const scenarioCount = Object.keys(preset.scenarios || {}).length;
          const isActive = selected === key && isApplying;

          return (
            <motion.div
              key={key}
              whileHover={{ y: -4 }}
              className="glass"
              style={{
                borderRadius: 'var(--radius-md)', padding: 'var(--space-md)',
                border: selected === key ? `1px solid ${meta.color}55` : '1px solid rgba(255,255,255,0.05)',
                boxShadow: selected === key ? `0 0 30px ${meta.color}15` : 'none',
                display: 'flex', flexDirection: 'column', gap: 14,
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: meta.accent, border: `1px solid ${meta.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={22} color={meta.color} />
                </div>
                {scenarioCount > 0 && (
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-pill)', padding: '3px 10px', letterSpacing: 1 }}>
                    {scenarioCount} scenarios
                  </span>
                )}
              </div>

              {/* Info */}
              <div>
                <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cream)', marginBottom: 6 }}>{preset.name}</h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{preset.description}</p>
              </div>

              {/* Preview chips */}
              {scenarioCount > 0 && (
                <div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Includes</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.keys(preset.scenarios).slice(0, 3).map(sk => (
                      <span key={sk} style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}>
                        {sk.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {scenarioCount > 3 && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}>
                        +{scenarioCount - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Apply button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleApply(key)}
                disabled={isApplying}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '11px 0', borderRadius: 'var(--radius-sm)', cursor: 'none',
                  background: key === 'chaos_mode' ? 'rgba(239,68,68,0.15)' : key === 'clear_all' ? 'rgba(34,197,94,0.15)' : `${meta.color}15`,
                  border: `1px solid ${meta.color}44`,
                  color: meta.color,
                  fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase',
                  opacity: isApplying && !isActive ? 0.5 : 1,
                  transition: 'all 0.2s',
                  marginTop: 'auto',
                }}
              >
                {isActive ? (
                  <>
                    <span style={{ width: 14, height: 14, border: `2px solid ${meta.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Applying...
                  </>
                ) : (
                  <>
                    <Play size={13} />
                    Apply Preset
                  </>
                )}
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="glass" style={{ marginTop: 'var(--space-lg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: '1px solid rgba(255,140,0,0.15)' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--accent-ember)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>ℹ️ About Presets</p>
        <ul style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 2, paddingLeft: 20 }}>
          <li><strong style={{ color: 'var(--accent-cream)' }}>Demo presets</strong> — Moderate failure rates for demonstration purposes</li>
          <li><strong style={{ color: '#ef4444' }}>Chaos Mode</strong> — High failure rates for stress testing</li>
          <li><strong style={{ color: '#22c55e' }}>Clear All</strong> — Disable all failure scenarios and reset</li>
        </ul>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PresetSelector;
