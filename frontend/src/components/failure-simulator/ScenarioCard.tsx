import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Power, Zap, Clock, Shield, Server, Code, Link as LinkIcon, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { failureSimulatorApi } from '../../services/api';
import { FailureScenario, FailureType } from '../../types';

interface ScenarioCardProps { name: string; scenario: FailureScenario; }

const TYPE_META: Record<FailureType, { icon: typeof Zap; color: string; label: string }> = {
  rate_limit: { icon: Zap, color: '#ffc845', label: 'Rate Limit' },
  timeout: { icon: Clock, color: '#fb923c', label: 'Timeout' },
  authentication: { icon: Shield, color: '#f87171', label: 'Auth Error' },
  authorization: { icon: Shield, color: '#f87171', label: 'Authorization' },
  server_error: { icon: Server, color: '#a78bfa', label: 'Server Error' },
  service_unavailable: { icon: Server, color: '#a78bfa', label: 'Unavailable' },
  bad_request: { icon: Code, color: '#60a5fa', label: 'Bad Request' },
  dependency: { icon: LinkIcon, color: '#f472b6', label: 'Dependency' },
  configuration: { icon: Wrench, color: 'var(--text-muted)', label: 'Config' },
};

const ScenarioCard = ({ name, scenario }: ScenarioCardProps) => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [probability, setProbability] = useState(scenario.probability);
  const meta = TYPE_META[scenario.failure_type] || TYPE_META.configuration;
  const Icon = meta.icon;

  const toggleMutation = useMutation({
    mutationFn: () => scenario.enabled
      ? failureSimulatorApi.disableScenario(name)
      : failureSimulatorApi.enableScenario(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failure-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['failure-status'] });
      toast.success(`${name} ${scenario.enabled ? 'disabled' : 'enabled'}`);
    },
  });

  const updateProb = useMutation({
    mutationFn: (p: number) => failureSimulatorApi.updateScenario(name, { probability: p }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['failure-scenarios'] }); toast.success('Probability updated'); },
  });

  return (
    <div
      className="glass"
      style={{
        borderRadius: 'var(--radius-md)',
        border: scenario.enabled
          ? `1px solid ${meta.color}44`
          : '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
        transition: 'border-color 0.3s',
        boxShadow: scenario.enabled ? `0 0 30px ${meta.color}18` : 'none',
      }}
    >
      {/* Header */}
      <div style={{ padding: 'var(--space-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Icon badge */}
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: `${meta.color}18`, border: `1px solid ${meta.color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={18} color={meta.color} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-cream)', textTransform: 'capitalize' }}>
                {name.replace(/_/g, ' ')}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: meta.color, letterSpacing: 1, marginTop: 2 }}>
                {meta.label}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Status badge */}
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '0.6rem', letterSpacing: 2, textTransform: 'uppercase',
              padding: '3px 10px', borderRadius: 'var(--radius-pill)',
              background: scenario.enabled ? `${meta.color}18` : 'var(--bg-elevated)',
              color: scenario.enabled ? meta.color : 'var(--text-muted)',
              border: `1px solid ${scenario.enabled ? meta.color + '44' : 'rgba(255,255,255,0.06)'}`,
            }}>
              {scenario.enabled ? 'Active' : 'Off'}
            </span>

            {/* Power toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              style={{
                width: 32, height: 32, borderRadius: 'var(--radius-sm)', cursor: 'none',
                background: scenario.enabled ? `${meta.color}22` : 'var(--bg-elevated)',
                border: `1px solid ${scenario.enabled ? meta.color + '44' : 'rgba(255,255,255,0.06)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: toggleMutation.isPending ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              <Power size={14} color={scenario.enabled ? meta.color : 'var(--text-muted)'} />
            </motion.button>

            {/* Expand */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setExpanded(!expanded)}
              style={{
                width: 32, height: 32, borderRadius: 'var(--radius-sm)', cursor: 'none',
                background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {expanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
            </motion.button>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 12, fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span>Probability <strong style={{ color: meta.color }}>{(scenario.probability * 100).toFixed(0)}%</strong></span>
          <span>·</span>
          <span>Endpoints <strong style={{ color: 'var(--accent-cream)' }}>{scenario.endpoints.length}</strong></span>
        </div>
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div style={{ padding: 'var(--space-sm)', background: 'var(--bg-elevated)' }}>
              {/* Probability slider */}
              <div style={{ marginBottom: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>Failure Probability</label>
                  <span style={{ fontFamily: 'var(--font-accent)', fontSize: '1.2rem', color: meta.color }}>{(probability * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05" value={probability}
                  onChange={e => setProbability(parseFloat(e.target.value))}
                  onMouseUp={() => { if (probability !== scenario.probability) updateProb.mutate(probability); }}
                  style={{ width: '100%', accentColor: meta.color, cursor: 'none' }}
                />
              </div>

              {/* Endpoints */}
              <div style={{ marginBottom: 'var(--space-sm)' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Affected Endpoints</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {scenario.endpoints.map((ep, i) => (
                    <span key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-void)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--accent-cream)' }}>
                      {ep}
                    </span>
                  ))}
                </div>
              </div>

              {/* Methods */}
              <div style={{ marginBottom: scenario.error_message ? 'var(--space-sm)' : 0 }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>HTTP Methods</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {scenario.methods.map((m, i) => (
                    <span key={i} style={{ fontFamily: 'var(--font-accent)', fontSize: '0.9rem', padding: '2px 10px', borderRadius: 'var(--radius-pill)', background: `${meta.color}20`, border: `1px solid ${meta.color}44`, color: meta.color }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Error message */}
              {scenario.error_message && (
                <div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Error Message</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-void)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)', lineHeight: 1.5 }}>
                    {scenario.error_message}
                  </p>
                </div>
              )}

              {/* Rate limit / timeout extra */}
              {(scenario.rate_limit_requests || scenario.timeout_seconds) && (
                <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                  {scenario.rate_limit_requests && (
                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Limit (req)</p>
                      <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.4rem', color: meta.color }}>{scenario.rate_limit_requests}</p>
                    </div>
                  )}
                  {scenario.rate_limit_window && (
                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Window (s)</p>
                      <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.4rem', color: meta.color }}>{scenario.rate_limit_window}</p>
                    </div>
                  )}
                  {scenario.timeout_seconds && (
                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Timeout (s)</p>
                      <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.4rem', color: meta.color }}>{scenario.timeout_seconds}s</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScenarioCard;
