import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  text?: string;
}

const LoadingSpinner = ({
  fullScreen = false,
  text = 'LOADING...',
}: LoadingSpinnerProps) => {
  const spinner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{
          width: 48,
          height: 48,
          border: '3px solid rgba(255,69,0,0.2)',
          borderTopColor: 'var(--accent-fire)',
          borderRadius: '50%',
        }}
      />
      {text && (
        <p style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--text-muted)',
          fontSize: '0.82rem',
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-void)'
      }}>
        {spinner}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
