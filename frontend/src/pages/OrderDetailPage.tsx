import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  Package,
  MapPin,
  CreditCard
} from 'lucide-react';
import { orderApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const statusSteps = [
  { key: 'pending',    label: 'Order Placed', icon: '📋', subtitle: 'We received your order' },
  { key: 'confirmed',  label: 'Confirmed',    icon: '✅', subtitle: 'Restaurant accepted' },
  { key: 'preparing',  label: 'Preparing',    icon: '👨‍🍳', subtitle: 'Being cooked fresh' },
  { key: 'ready',      label: 'Ready',        icon: '📦', subtitle: 'Packed and waiting' },
  { key: 'picked_up',  label: 'Picked Up',   icon: '🛵', subtitle: 'Driver collected' },
  { key: 'in_transit', label: 'On the Way',  icon: '🚀', subtitle: 'Heading to you' },
  { key: 'delivered',  label: 'Delivered',   icon: '🎉', subtitle: 'Enjoy your meal!' },
];

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.getById(Number(id)),
    select: (res) => res.data,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);
  const safeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          to="/orders"
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Back to Orders</span>
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Order #{order.order_number}</p>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">
                Order Details
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Placed on {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${order.status === 'delivered'
                ? 'bg-green-100 text-green-800'
                : order.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
                }`}
            >
              {order.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Status Tracker */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                  fontSize: '0.82rem', color: '#6b7280',
                  margin: '2px 0 0 0',
                }}>
                  {statusSteps[safeIndex]?.subtitle}
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200">
                <div
                  className="h-full bg-primary-600 transition-all"
                  style={{
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
                          : 'rgba(255,255,255,0.08)',
                        color: index <= safeIndex ? '#fff' : '#6b7280',
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
                  </div>
                ))}
              </div>
            </div>

            {/* Status info box */}
            <div style={{
              marginTop: 20, padding: '12px 16px',
              borderRadius: 8, background: '#f9fafb',
              border: '1px solid #e5e7eb',
            }}>
              <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: 0 }}>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Order Items
          </h2>
          <div className="space-y-4">
            {order.items.map((item: { id: number; quantity: number; item_name: string; special_instructions?: string; subtotal: number }) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {item.quantity}x {item.item_name}
                  </p>
                  {item.special_instructions && (
                    <p className="text-sm text-gray-500">
                      Note: {item.special_instructions}
                    </p>
                  )}
                </div>
                <p className="font-medium text-gray-900">
                  ₹{item.subtotal.toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery Fee</span>
              <span>₹{order.delivery_fee.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span>₹{order.tax.toLocaleString('en-IN')}</span>
            </div>
            {order.tip > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tip</span>
                <span>₹{order.tip.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>₹{order.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Delivery Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Delivery Address</p>
                <p className="text-gray-600">{order.delivery_address}</p>
              </div>
            </div>
            {order.delivery_instructions && (
              <div className="flex items-start space-x-3">
                <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Delivery Instructions</p>
                  <p className="text-gray-600">{order.delivery_instructions}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Information
          </h2>
          <div className="flex items-start space-x-3">
            <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">
                {order.payment_method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </p>
              <p className="text-gray-600 capitalize">
                Status: {order.payment_status}
              </p>
              {order.payment_transaction_id && (
                <p className="text-sm text-gray-500">
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
