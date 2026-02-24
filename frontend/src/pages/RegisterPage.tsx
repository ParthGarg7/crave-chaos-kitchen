import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { authApi } from '../services/api';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'customer',
  });

  const registerMutation = useMutation({
    mutationFn: (data: typeof formData) => authApi.register(data),
    onSuccess: () => {
      toast.success('Registration successful! Please log in.');
      navigate('/login');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Registration failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
        Create an account
      </h2>
      <p className="text-gray-600 text-center mb-8">
        Sign up to start ordering delicious food
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="label">
              First name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="first_name"
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="input pl-10"
                placeholder="John"
              />
            </div>
          </div>
          <div>
            <label htmlFor="last_name" className="label">
              Last name
            </label>
            <input
              id="last_name"
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="input"
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input pl-10"
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="label">
            Phone (optional)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input pl-10"
              placeholder="+1-555-0123"
            />
          </div>
        </div>

        {/* Role */}
        <div>
          <label htmlFor="role" className="label">
            Account type
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="input"
          >
            <option value="customer">Customer</option>
            <option value="restaurant_owner">Restaurant Owner</option>
            <option value="driver">Delivery Driver</option>
          </select>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input pl-10 pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Must be at least 8 characters
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full btn-primary py-3 disabled:opacity-50 mt-6"
        >
          {registerMutation.isPending ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              <span>Creating account...</span>
            </div>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      {/* Login Link */}
      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default RegisterPage;
