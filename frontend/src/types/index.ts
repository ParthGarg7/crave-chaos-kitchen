// User Types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'customer' | 'restaurant_owner' | 'driver' | 'admin';
  is_active: boolean;
  address?: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: string;
  address?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// Restaurant Types
export interface Restaurant {
  id: number;
  name: string;
  description?: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  cuisine_type: string;
  status: string;
  rating: number;
  review_count: number;
  delivery_fee: number;
  min_order_amount: number;
  delivery_time_min: number;
  delivery_time_max: number;
  menu_items?: MenuItem[];
}

export interface MenuItem {
  id: number;
  restaurant_id: number;
  name: string;
  description?: string;
  price: number;
  category: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_spicy: boolean;
  is_available: boolean;
  image_url?: string;
}

// Order Types
export interface OrderItem {
  id: number;
  menu_item_id: number;
  item_name: string;
  item_price: number;
  quantity: number;
  special_instructions?: string;
  subtotal: number;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  restaurant_id: number;
  status: string;
  delivery_address: string;
  delivery_instructions?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  tax: number;
  tip: number;
  total: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
  estimated_delivery_time?: string;
}

export interface CartItem {
  menu_item_id: number;
  quantity: number;
  special_instructions?: string;
}

// Delivery Types
export interface Delivery {
  id: number;
  order_id: number;
  driver_id?: number;
  driver_name?: string;
  status: string;
  driver_latitude?: string;
  driver_longitude?: string;
  location_updated_at?: string;
  estimated_distance_km?: number;
  estimated_duration_min?: number;
  assigned_at: string;
  accepted_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
}

// Failure Simulator Types
export type FailureType = 
  | 'rate_limit'
  | 'timeout'
  | 'authentication'
  | 'authorization'
  | 'server_error'
  | 'service_unavailable'
  | 'bad_request'
  | 'dependency'
  | 'configuration';

export interface FailureScenario {
  name: string;
  enabled: boolean;
  failure_type: FailureType;
  probability: number;
  endpoints: string[];
  methods: string[];
  error_message?: string;
  rate_limit_requests?: number;
  rate_limit_window?: number;
  timeout_seconds?: number;
}

export interface FailureSimulatorStatus {
  enabled: boolean;
  global_failure_rate: number;
  active_scenarios: number;
  total_scenarios: number;
  request_count: number;
  failure_count: number;
  success_rate: number;
  failure_rate: number;
  last_updated: string;
}

export interface FailureSimulatorMetrics {
  total_requests: number;
  failed_requests: number;
  success_rate: number;
  failure_rate: number;
  active_scenarios: number;
  total_scenarios: number;
  last_updated: string;
}

export interface FailurePreset {
  name: string;
  description: string;
  scenarios: Record<string, Partial<FailureScenario>>;
}

// API Error Types
export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  status_code?: number;
}
