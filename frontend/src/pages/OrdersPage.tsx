import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Clock } from 'lucide-react';
import { orderApi } from '../services/api';
import { Order } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

// Translucent pills read correctly on both the dark and light theme
const statusColors: Record<string, { color: string; bg: string }> = {
  pending:    { color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)' },
  confirmed:  { color: '#2563eb', bg: 'rgba(37, 99, 235, 0.15)' },
  preparing:  { color: '#9333ea', bg: 'rgba(147, 51, 234, 0.15)' },
  ready:      { color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.15)' },
  picked_up:  { color: '#db2777', bg: 'rgba(219, 39, 119, 0.15)' },
  in_transit: { color: '#ea580c', bg: 'rgba(234, 88, 12, 0.15)' },
  delivered:  { color: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)' },
  cancelled:  { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)' },
};

const OrdersPage = () => {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => orderApi.getMyOrders(),
    select: (res) => res.data,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!orders?.length) {
    return (
      <div className="min-h-screen py-8" style={{ paddingTop: 100 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold crave-heading mb-8">My Orders</h1>
          <div className="crave-card p-12 text-center">
            <Package className="h-16 w-16 crave-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold crave-heading mb-2">
              No orders yet
            </h2>
            <p className="crave-muted mb-6">
              Place your first order to see it here
            </p>
            <Link
              to="/browse"
              className="inline-flex items-center space-x-2 btn-primary"
            >
              <span>Browse Restaurants</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8" style={{ paddingTop: 100 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold crave-heading mb-8">My Orders</h1>

        <div className="space-y-4">
          {orders.map((order: Order) => {
            const pill = statusColors[order.status] ?? { color: 'var(--text-muted)', bg: 'var(--bg-elevated)' };
            return (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block crave-card p-6 transition-transform hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold crave-heading">
                        Order #{order.order_number}
                      </h3>
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={{ color: pill.color, background: pill.bg }}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm crave-muted mt-1">
                      {(order as any).restaurant_name || 'Restaurant'}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm crave-muted">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold" style={{ color: 'var(--accent-gold)' }}>
                      ₹{order.total.toLocaleString('en-IN')}
                    </p>
                    <p className="text-sm crave-muted capitalize">
                      {order.payment_status}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
