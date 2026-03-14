import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  Package, 
  MapPin, 
  CreditCard,
  Clock
} from 'lucide-react';
import { orderApi } from '../services/api';
import { Order } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const statusSteps = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'in_transit', label: 'On the Way' },
  { key: 'delivered', label: 'Delivered' },
];

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.getById(Number(id)),
    select: (res) => res.data,
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <p className="text-muted font-body">Order not found</p>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen py-8 pt-24" style={{ background: 'var(--bg-void)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          to="/orders"
          className="inline-flex items-center space-x-2 hover:text-white mb-6 transition-colors"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Back to Orders</span>
        </Link>

        {/* Header */}
        <div className="glass rounded-xl p-6 mb-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p style={{ color: 'var(--accent-fire)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>Order #{order.order_number}</p>
              <h1 className="text-3xl font-bold mt-2" style={{ color: 'var(--accent-cream)', fontFamily: 'var(--font-display)', letterSpacing: -0.5 }}>
                Order Details
              </h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Placed on {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <span
              className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold capitalize"
              style={{
                background: order.status === 'delivered' ? 'rgba(34,197,94,0.1)' : order.status === 'cancelled' ? 'rgba(248,113,113,0.1)' : 'rgba(232,93,4,0.1)',
                color: order.status === 'delivered' ? '#4ade80' : order.status === 'cancelled' ? '#f87171' : 'var(--accent-fire)',
                border: `1px solid ${order.status === 'delivered' ? 'rgba(34,197,94,0.3)' : order.status === 'cancelled' ? 'rgba(248,113,113,0.3)' : 'rgba(232,93,4,0.3)'}`,
                fontFamily: 'var(--font-body)'
              }}
            >
              {order.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Status Tracker */}
        {order.status !== 'cancelled' && (
          <div className="rounded-xl p-6 mb-6 relative overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--accent-cream)', fontFamily: 'var(--font-display)' }}>
              Order Status
            </h2>
            <div className="relative mt-8 mb-4">
              <div className="absolute top-4 left-0 right-0 h-1" style={{ background: 'var(--bg-void)', borderRadius: 'var(--radius-pill)' }}>
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${((currentStepIndex + 1) / statusSteps.length) * 100}%`,
                    background: 'linear-gradient(90deg, var(--accent-ember), var(--accent-fire))',
                    boxShadow: '0 0 10px var(--glow-fire)',
                    borderRadius: 'var(--radius-pill)'
                  }}
                />
              </div>
              <div className="relative flex justify-between z-10">
                {statusSteps.map((step, index) => (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-colors duration-300 ${
                        index <= currentStepIndex
                          ? 'text-white'
                          : 'text-gray-500'
                      }`}
                      style={{
                        background: index <= currentStepIndex ? 'var(--accent-fire)' : 'var(--bg-surface)',
                        border: index <= currentStepIndex ? 'none' : '1px solid var(--border-subtle)',
                        boxShadow: index <= currentStepIndex ? '0 0 15px var(--glow-fire)' : 'none',
                        fontFamily: 'var(--font-display)'
                      }}
                    >
                      {index <= currentStepIndex ? '✓' : index + 1}
                    </div>
                    <span
                      className={`text-xs mt-3 text-center w-24 font-medium transition-colors duration-300 ${
                        index <= currentStepIndex
                          ? 'text-white'
                          : 'text-gray-500'
                      }`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="rounded-xl p-8 mb-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--accent-cream)', fontFamily: 'var(--font-display)' }}>
            Order Items
          </h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-4 border-b last:border-0"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div>
                  <p className="font-semibold text-lg" style={{ color: 'var(--accent-cream)', fontFamily: 'var(--font-body)' }}>
                    <span style={{ color: 'var(--accent-fire)', marginRight: 8 }}>{item.quantity}x</span> {item.item_name}
                  </p>
                  {item.special_instructions && (
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      📝 {item.special_instructions}
                    </p>
                  )}
                </div>
                <p className="font-bold text-lg" style={{ color: 'var(--accent-cream)', fontFamily: 'var(--font-display)' }}>
                  ₹{item.subtotal.toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 pt-6 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)', fontFamily: 'var(--font-body)' }}>
            <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
              <span>Subtotal</span>
              <span style={{ color: 'white' }}>₹{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
              <span>Delivery Fee</span>
              <span style={{ color: 'white' }}>₹{order.delivery_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
              <span>Tax</span>
              <span style={{ color: 'white' }}>₹{order.tax.toFixed(2)}</span>
            </div>
            {order.tip > 0 && (
              <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
                <span>Tip</span>
                <span style={{ color: '#4ade80' }}>₹{order.tip.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-4 mt-2" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--accent-gold)', fontFamily: 'var(--font-display)' }}>
              <span>Total</span>
              <span>₹{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery & Payment Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            {/* Delivery Info */}
            <div className="rounded-xl p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--accent-cream)', fontFamily: 'var(--font-display)' }}>
                Delivery Information
              </h2>
              <div className="space-y-5">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(232,93,4,0.1)' }}>
                      <MapPin className="h-5 w-5" style={{ color: 'var(--accent-fire)' }} />
                  </div>
                  <div>
                    <p className="font-semibold mb-1" style={{ color: 'var(--accent-cream)', fontFamily: 'var(--font-body)' }}>Delivery Address</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{order.delivery_address}</p>
                  </div>
                </div>
                {order.delivery_instructions && (
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Package className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold mb-1" style={{ color: 'var(--accent-cream)', fontFamily: 'var(--font-body)' }}>Delivery Instructions</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{order.delivery_instructions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div className="rounded-xl p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--accent-cream)', fontFamily: 'var(--font-display)' }}>
                Payment Information
              </h2>
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <CreditCard className="h-5 w-5" style={{ color: '#4ade80' }} />
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--accent-cream)', fontFamily: 'var(--font-body)' }}>
                    {order.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    Status: <span style={{ color: order.payment_status === 'completed' ? '#4ade80' : 'var(--accent-fire)', textTransform: 'capitalize' }}>{order.payment_status}</span>
                  </p>
                  {order.payment_transaction_id && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', opacity: 0.7 }}>
                      Txn: {order.payment_transaction_id}
                    </p>
                  )}
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
