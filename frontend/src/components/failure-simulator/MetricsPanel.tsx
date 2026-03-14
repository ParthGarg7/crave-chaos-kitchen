import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Activity, CheckCircle, XCircle, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { FailureSimulatorMetrics } from '../../types';

interface MetricsPanelProps { metrics: FailureSimulatorMetrics | null; }

// ── Dark custom tooltip ────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '10px 16px' }}>
      {label && <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontFamily: 'var(--font-accent)', fontSize: '1.2rem', color: p.fill || p.color || 'var(--accent-cream)' }}>
          {typeof p.value === 'number' && p.name === 'value' ? `${p.value.toFixed(1)}%` : p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const MetricsPanel = ({ metrics }: MetricsPanelProps) => {
  if (!metrics) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
        <Activity size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 8 }}>No Metrics Yet</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Start making API requests to see metrics populate here.</p>
      </div>
    );
  }

  const successCount = metrics.total_requests - metrics.failed_requests;
  const pieData = [
    { name: 'Success', value: successCount, color: '#22c55e' },
    { name: 'Failed', value: metrics.failed_requests, color: '#ef4444' },
  ];
  const barData = [
    { name: 'Success Rate', value: metrics.success_rate, fill: '#22c55e' },
    { name: 'Failure Rate', value: metrics.failure_rate, fill: '#ef4444' },
  ];

  const cards = [
    { Icon: CheckCircle, label: 'Successful', value: successCount.toLocaleString(), color: '#22c55e' },
    { Icon: XCircle, label: 'Failed', value: metrics.failed_requests.toLocaleString(), color: '#ef4444' },
    { Icon: TrendingUp, label: 'Success Rate', value: `${metrics.success_rate.toFixed(1)}%`, color: '#22c55e' },
    { Icon: TrendingDown, label: 'Failure Rate', value: `${metrics.failure_rate.toFixed(1)}%`, color: '#ef4444' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-sm)' }}>
        {cards.map(({ Icon, label, value, color }) => (
          <div key={label} className="glass" style={{ borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)', border: `1px solid ${color}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={color} />
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 1 }}>{label}</p>
            </div>
            <p style={{ fontFamily: 'var(--font-accent)', fontSize: '2rem', color, lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
        {/* Pie */}
        <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Request Distribution</p>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
                <Legend formatter={(v: string) => <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar */}
        <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>Success vs Failure Rate</p>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={18} color="var(--text-muted)" />
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>Last Updated</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--accent-cream)', marginTop: 3 }}>{new Date(metrics.last_updated).toLocaleString()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Activity size={18} color="var(--text-muted)" />
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>Active Scenarios</p>
            <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.6rem', color: 'var(--accent-cream)', lineHeight: 1.2 }}>{metrics.active_scenarios} / {metrics.total_scenarios}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrendingUp size={18} color="var(--text-muted)" />
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>Total Requests</p>
            <p style={{ fontFamily: 'var(--font-accent)', fontSize: '1.6rem', color: 'var(--accent-cream)', lineHeight: 1.2 }}>{metrics.total_requests.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
