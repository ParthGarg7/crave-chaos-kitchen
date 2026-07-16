import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ChevronLeft,
  Package,
  MapPin,
  CreditCard,
  Clock,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { orderApi, deliveryApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const statusSteps = [
  { key: 'pending',    label: 'Order Placed', icon: '📋', subtitle: 'We received your order', ts: 'created_at' },
  { key: 'confirmed',  label: 'Confirmed',    icon: '✅', subtitle: 'Restaurant accepted', ts: 'confirmed_at' },
  { key: 'preparing',  label: 'Preparing',    icon: '👨‍🍳', subtitle: 'Being cooked fresh', ts: null },
  { key: 'ready',      label: 'Ready',        icon: '📦', subtitle: 'Packed and waiting', ts: 'prepared_at' },
  { key: 'picked_up',  label: 'Picked Up',   icon: '🛵', subtitle: 'Driver collected', ts: 'picked_up_at' },
  { key: 'in_transit', label: 'On the Way',  icon: '🚀', subtitle: 'Heading to you', ts: null },
  { key: 'delivered',  label: 'Delivered',   icon: '🎉', subtitle: 'Enjoy your meal!', ts: 'delivered_at' },
];

const formatTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.getById(Number(id)),
    select: (res) => res.data,
    refetchInterval: 15000,
  });

  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const handleRate = async () => {
    if (!order?.delivery || stars < 1) return;
    setSubmittingRating(true);
    try {
      await deliveryApi.rate(order.delivery.id, stars, feedback.trim() || undefined);
      toast.success('Thanks for rating your delivery! ⭐');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    } catch {
      // error toast handled by api interceptor
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleCancel = async () => {
    if (!order || !window.confirm('Cancel this order?')) return;
    setCancelling(true);
    try {
      await orderApi.cancel(order.id);
      toast.success('Order cancelled');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    } catch {
      // error toast handled by api interceptor
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="crave-muted">Order not found</p>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);
  const safeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className="min-h-screen py-8" style={{ paddingTop: 100 }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          to="/orders"
          className="inline-flex items-center space-x-2 crave-muted  mb-6"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Back to Orders</span>
        </Link>

        {/* Header */}
        <div className="crave-card p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm crave-muted">Order #{order.order_number}</p>
              <h1 className="text-2xl font-bold crave-heading mt-1">
                Order Details
              </h1>
              <p className="text-sm crave-muted mt-1">
                Placed on {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize"
                style={order.status === 'delivered'
                  ? { color: '#16a34a', background: 'rgba(22,163,74,0.15)' }
                  : order.status === 'cancelled'
                    ? { color: '#dc2626', background: 'rgba(220,38,38,0.15)' }
                    : { color: '#2563eb', background: 'rgba(37,99,235,0.15)' }}
              >
                {order.status.replace('_', ' ')}
              </span>
              {order.estimated_delivery_time &&
                !['delivered', 'cancelled'].includes(order.status) && (
                <span className="inline-flex items-center text-sm crave-muted">
                  <Clock className="h-4 w-4 mr-1" />
                  ETA {formatTime(order.estimated_delivery_time)}
                </span>
              )}
              {order.status === 'pending' && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-red-500 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {cancelling ? 'Cancelling…' : 'Cancel Order'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Tracker */}
        {order.status !== 'cancelled' && (
          <div className="crave-card p-6 mb-6">
            <h2 className="text-lg font-semibold crave-heading mb-4">
              Order Status
            </h2>

            {/* Live status banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '16px 20px', marginBottom: 24,
              borderRadius: 12,
              background: order.status === 'delivered'
                ? 'rgba(34,197,94,0.08)' : 'rgba(255,69,0,0.08)',
              border: order.status === 'delivered'
                ? '1px solid rgba(34,197,94,0.2)'
                : '1px solid rgba(255,69,0,0.2)',
            }}>
              <span style={{
                fontSize: '2rem',
                display: 'inline-block',
                animation: order.status !== 'delivered'
                  ? 'pulse 2s infinite' : 'none',
              }}>
                {statusSteps[safeIndex]?.icon}
              </span>
              <div>
                <p style={{
                  fontSize: '1.1rem', fontWeight: 600, margin: 0,
                  color: order.status === 'delivered'
                    ? '#22c55e' : '#ff4500',
                }}>
                  {statusSteps[safeIndex]?.label}
                </p>
                <p style={{
                  fontSize: '0.82rem', color: 'var(--text-muted)',
                  margin: '2px 0 0 0',
                }}>
                  {statusSteps[safeIndex]?.subtitle}
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute top-4 left-0 right-0 h-1" style={{ background: 'var(--bg-elevated)' }}>
                <div
                  className="h-full transition-all"
                  style={{
                    background: 'var(--accent-fire)',
                    width: `${((safeIndex + 1) / statusSteps.length) * 100}%`,
                  }}
                />
              </div>
              <div className="relative flex justify-between">
                {statusSteps.map((step, index) => (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{
                        background: index < safeIndex
                          ? '#22c55e'
                          : index === safeIndex
                          ? '#ff4500'
                          : 'var(--bg-elevated)',
                        color: index <= safeIndex ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      {index < safeIndex ? '✓' : step.icon}
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem', marginTop: 8, textAlign: 'center',
                        width: 80, display: 'block',
                        color: index < safeIndex
                          ? '#22c55e'
                          : index === safeIndex
                          ? '#ff4500'
                          : 'var(--text-muted, #6b7280)',
                        fontWeight: index <= safeIndex ? 500 : 400,
                      }}
                    >
                      {step.label}
                    </span>
                    {step.ts && index <= safeIndex && formatTime((order as Record<string, any>)[step.ts]) && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, opacity: 0.8 }}>
                        {formatTime((order as Record<string, any>)[step.ts])}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Status info box */}
            <div style={{
              marginTop: 20, padding: '12px 16px',
              borderRadius: 8, background: 'var(--bg-elevated)',
              border: '1px solid var(--border-soft)',
            }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                {order.status === 'pending' &&
                  '⏳ Waiting for restaurant to confirm your order'}
                {order.status === 'confirmed' &&
                  '✅ Restaurant confirmed! Preparing soon'}
                {order.status === 'preparing' &&
                  '👨‍🍳 Your food is being freshly prepared'}
                {order.status === 'ready' &&
                  '📦 Food packed — driver being assigned'}
                {order.status === 'picked_up' &&
                  '🛵 Driver has your order and is on the way'}
                {order.status === 'in_transit' &&
                  '🚀 Almost there! Your order is nearby'}
                {order.status === 'delivered' &&
                  '🎉 Delivered! Enjoy your meal!'}
              </p>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="crave-card p-6 mb-6">
          <h2 className="text-lg font-semibold crave-heading mb-4">
            Order Items
          </h2>
          <div className="space-y-4">
            {order.items.map((item: { id: number; quantity: number; item_name: string; special_instructions?: string; subtotal: number }) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 border-b crave-border last:border-0"
              >
                <div>
                  <p className="font-medium crave-heading">
                    {item.quantity}x {item.item_name}
                  </p>
                  {item.special_instructions && (
                    <p className="text-sm crave-muted">
                      Note: {item.special_instructions}
                    </p>
                  )}
                </div>
                <p className="font-medium crave-heading">
                  ₹{item.subtotal.toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t crave-border mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="crave-muted">Subtotal</span>
              <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="crave-muted">Delivery Fee</span>
              <span>₹{order.delivery_fee.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="crave-muted">Tax</span>
              <span>₹{order.tax.toLocaleString('en-IN')}</span>
            </div>
            {order.tip > 0 && (
              <div className="flex justify-between text-sm">
                <span className="crave-muted">Tip</span>
                <span>₹{order.tip.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t crave-border">
              <span>Total</span>
              <span>₹{order.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Rate your delivery — after it's delivered, once */}
        {order.status === 'delivered' && order.delivery && !order.delivery.customer_rating && (
          <div className="crave-card p-6 mb-6">
            <h2 className="text-lg font-semibold crave-heading mb-2">
              Rate your delivery
            </h2>
            <p className="text-sm crave-muted mb-4">How was your experience?</p>
            <div className="flex items-center space-x-1 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHoverStars(n)}
                  onMouseLeave={() => setHoverStars(0)}
                  className="text-3xl transition-transform hover:scale-110"
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >
                  {(hoverStars || stars) >= n ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              placeholder="Any feedback for your driver? (optional)"
              className="w-full crave-input rounded-lg p-3 text-sm mb-3 resize-none"
            />
            <button
              onClick={handleRate}
              disabled={stars < 1 || submittingRating}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-40"
            >
              {submittingRating ? 'Submitting…' : 'Submit Rating'}
            </button>
          </div>
        )}

        {order.status === 'delivered' && order.delivery?.customer_rating && (
          <div className="crave-card p-6 mb-6">
            <p className="text-sm crave-muted">
              You rated this delivery {'⭐'.repeat(order.delivery.customer_rating)} — thank you!
            </p>
          </div>
        )}

        {/* Driver Info — visible once a driver has accepted the delivery */}
        {order.delivery?.driver && order.status !== 'cancelled' && (
          <div className="crave-card p-6 mb-6">
            <h2 className="text-lg font-semibold crave-heading mb-4">
              Your Driver
            </h2>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full crave-card flex items-center justify-center text-xl">
                🛵
              </div>
              <div>
                <p className="font-medium crave-heading">
                  {order.delivery.driver.first_name ?? 'Driver'}
                </p>
                {order.delivery.driver.phone && (
                  <p className="text-sm crave-muted">{order.delivery.driver.phone}</p>
                )}
                <p className="text-sm crave-muted capitalize">
                  {String(order.delivery.status).replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Info */}
        <div className="crave-card p-6 mb-6">
          <h2 className="text-lg font-semibold crave-heading mb-4">
            Delivery Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 crave-muted mt-0.5" />
              <div>
                <p className="font-medium crave-heading">Delivery Address</p>
                <p className="crave-muted">{order.delivery_address}</p>
              </div>
            </div>
            {order.delivery_instructions && (
              <div className="flex items-start space-x-3">
                <Package className="h-5 w-5 crave-muted mt-0.5" />
                <div>
                  <p className="font-medium crave-heading">Delivery Instructions</p>
                  <p className="crave-muted">{order.delivery_instructions}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Info */}
        <div className="crave-card p-6">
          <h2 className="text-lg font-semibold crave-heading mb-4">
            Payment Information
          </h2>
          <div className="flex items-start space-x-3">
            <CreditCard className="h-5 w-5 crave-muted mt-0.5" />
            <div>
              <p className="font-medium crave-heading">
                {order.payment_method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </p>
              <p className="crave-muted capitalize">
                Status: {order.payment_status}
              </p>
              {order.payment_transaction_id && (
                <p className="text-sm crave-muted">
                  Transaction: {order.payment_transaction_id}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
};

export default OrderDetailPage;
