import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Allow individual callers to opt out of auto-toasting
    const skipToast = (error.config as Record<string, unknown>)?.skipToast === true;

    if (!skipToast && error.response) {
      const status = error.response.status;
      const data = error.response.data as { error?: string; message?: string; detail?: string };

      // Handle specific error types
      switch (status) {
        case 400:
          toast.error(data.message || 'Bad request');
          break;
        case 401:
          toast.error('Session expired. Please log in again.');
          localStorage.removeItem('access_token');
          window.location.href = '/login';
          break;
        case 403:
          toast.error('You do not have permission to perform this action.');
          break;
        case 404:
          // 404s for "my-restaurant" are handled silently in the dashboard
          if (!error.config?.url?.includes('my-restaurant')) {
            toast.error(data.detail || data.message || 'Resource not found');
          }
          break;
        case 422:
          toast.error(data.detail || data.message || 'Validation error');
          break;
        case 429:
          toast.error('Too many requests. Please slow down.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        case 502:
          toast.error('External service error.');
          break;
        case 503:
          toast.error('Service temporarily unavailable.');
          break;
        case 504:
          toast.error('Request timed out.');
          break;
        default:
          toast.error(data.message || 'An error occurred');
      }
    } else if (!skipToast && error.request && !error.response) {
      toast.error('Network error. Please check your connection.');
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role?: string;
    address?: string;
  }) => api.post('/auth/register', data),

  getMe: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout'),
};

// Restaurant API
export const restaurantApi = {
  getAll: (params?: { query?: string; cuisine_type?: string; city?: string }) =>
    api.get('/restaurants', { params }),

  getById: (id: number) => api.get(`/restaurants/${id}`),

  // Returns the first restaurant (legacy, single-restaurant flow)
  getMyRestaurant: () => api.get('/restaurants/my-restaurant'),

  // Returns ALL restaurants owned by the current owner
  getMyRestaurants: () => api.get('/restaurants/my-restaurants'),

  create: (data: {
    name: string; description?: string; phone: string; email?: string;
    address: string; city: string; state: string; zip_code: string;
    cuisine_type?: string; delivery_fee?: number; min_order_amount?: number;
    opening_time?: string; closing_time?: string; delivery_time_min?: number; delivery_time_max?: number;
  }) => api.post('/restaurants', data),

  update: (id: number, data: Record<string, unknown>) => api.put(`/restaurants/${id}`, data),

  getMenu: (restaurantId: number, params?: { category?: string; available_only?: boolean }) =>
    api.get(`/restaurants/${restaurantId}/menu`, { params }),

  getCuisineTypes: () => api.get('/restaurants/cuisines'),
};

// Menu API — for restaurant owners to manage their menu
export const menuApi = {
  addItem: (restaurantId: number, data: {
    name: string; description?: string; price: number; category: string;
    is_vegetarian?: boolean; is_vegan?: boolean; is_gluten_free?: boolean;
    is_spicy?: boolean; is_available?: boolean; image_url?: string;
  }) => api.post(`/restaurants/${restaurantId}/menu`, data),

  updateItem: (restaurantId: number, itemId: number, data: {
    name?: string; description?: string; price?: number; category?: string;
    is_vegetarian?: boolean; is_vegan?: boolean; is_gluten_free?: boolean;
    is_spicy?: boolean; is_available?: boolean; image_url?: string;
  }) => api.put(`/restaurants/${restaurantId}/menu/${itemId}`, data),

  deleteItem: (restaurantId: number, itemId: number) =>
    api.delete(`/restaurants/${restaurantId}/menu/${itemId}`),

  toggleAvailability: (restaurantId: number, itemId: number, isAvailable: boolean) =>
    api.put(`/restaurants/${restaurantId}/menu/${itemId}`, { is_available: isAvailable }),
};

// Order API
export const orderApi = {
  getMyOrders: (params?: { status?: string; skip?: number; limit?: number }) =>
    api.get('/orders/my-orders', { params }),

  getRestaurantOrders: (params?: { status?: string; restaurant_id?: number }) =>
    api.get('/orders/restaurant-orders', { params }),

  getById: (id: number) => api.get(`/orders/${id}`),

  create: (data: {
    restaurant_id: number;
    items: Array<{ menu_item_id: number; quantity: number; special_instructions?: string }>;
    delivery_address: string;
    delivery_instructions?: string;
    payment_method: string;
    tip?: number;
  }) => api.post('/orders', data),

  updateStatus: (id: number, status: string, notes?: string) =>
    api.patch(`/orders/${id}/status`, { status, notes }),

  cancel: (id: number, reason?: string) =>
    api.post(`/orders/${id}/cancel`, null, { params: { reason } }),
};

// Payment API
export const paymentApi = {
  process: (orderId: number, paymentData?: {
    card_number?: string;
    expiry_month?: string;
    expiry_year?: string;
    cvv?: string;
  }) => api.post('/payments/process', { order_id: orderId, ...paymentData }),

  getMethods: () => api.get('/payments/methods'),
};

// Delivery API
export const deliveryApi = {
  getAvailable: () => api.get('/delivery/available'),

  getMyDeliveries: (params?: { status?: string }) =>
    api.get('/delivery/my-deliveries', { params }),

  getById: (id: number) => api.get(`/delivery/${id}`),

  accept: (id: number) => api.post(`/delivery/${id}/accept`),

  updateLocation: (id: number, latitude: string, longitude: string) =>
    api.post(`/delivery/${id}/location`, { latitude, longitude }),

  getLocation: (id: number) => api.get(`/delivery/${id}/location`),

  updateStatus: (id: number, status: string, notes?: string) =>
    api.post(`/delivery/${id}/status`, { status, notes }),

  complete: (id: number, data: { delivery_notes?: string; customer_rating?: number; customer_feedback?: string }) =>
    api.post(`/delivery/${id}/complete`, data),
};

// Admin API
export const adminApi = {
  getSessionRegistry: (params?: { role?: string; session_status?: string }) =>
    api.get('/admin/session-registry', { params }),

  exportRegistry: () =>
    api.get('/admin/session-registry/export', { responseType: 'blob' }),

  listUsers: (params?: { role?: string; is_active?: boolean; skip?: number; limit?: number }) =>
    api.get('/admin/users', { params }),

  activateUser: (userId: number) =>
    api.patch(`/admin/users/${userId}/activate`),

  deactivateUser: (userId: number) =>
    api.patch(`/admin/users/${userId}/deactivate`),

  listRestaurants: () => api.get('/admin/restaurants'),

  approveRestaurant: (restaurantId: number) =>
    api.patch(`/admin/restaurants/${restaurantId}/approve`),
};

// Failure Simulator API (admin only)
export const failureSimulatorApi = {
  getStatus: () => api.get('/failure-simulator/status'),

  getMetrics: () => api.get('/failure-simulator/metrics'),

  getScenarios: () => api.get('/failure-simulator/scenarios'),

  getScenario: (name: string) => api.get(`/failure-simulator/scenarios/${name}`),

  enableScenario: (name: string) => api.post(`/failure-simulator/scenarios/${name}/enable`),

  disableScenario: (name: string) => api.post(`/failure-simulator/scenarios/${name}/disable`),

  updateScenario: (name: string, data: Partial<{
    enabled?: boolean;
    probability?: number;
    endpoints?: string[];
    methods?: string[];
    error_message?: string;
  }>) => api.patch(`/failure-simulator/scenarios/${name}`, data),

  resetAll: () => api.post('/failure-simulator/reset'),

  setGlobalRate: (rate: number) =>
    api.post('/failure-simulator/global-rate', null, { params: { rate } }),

  getPresets: () => api.get('/failure-simulator/presets'),

  applyPreset: (presetName: string) =>
    api.post(`/failure-simulator/presets/${presetName}/apply`),

  toggle: (enabled: boolean) =>
    api.post('/failure-simulator/toggle', null, { params: { enabled } }),

  healthCheck: () => api.get('/failure-simulator/health'),
};

// Contact Support API
export const contactApi = {
  submit: (data: { name: string; email: string; message: string }) =>
    api.post<{
      success: boolean;
      message: string;
      ticket_id: string;
      timestamp: string;
    }>('/contact-support', data),
};

// Chaos Engineer API (admin only)
export const chaosApi = {
  getExperiments: () => api.get('/chaos/experiments'),
  toggleExperiment: (id: string) => api.post(`/chaos/experiments/${id}/toggle`),
  reset: () => api.post('/chaos/reset'),
  getImpactLog: (limit = 100) => api.get('/chaos/impact-log', { params: { limit } }),
  getState: () => api.get('/chaos/state'),
};

export default api;
