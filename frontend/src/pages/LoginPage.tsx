import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      authApi.login(data.email, data.password),
    onSuccess: (response) => {
      setAuth(response.data);
      toast.success('Login successful!');
      navigate('/');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Login failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
        Welcome back
      </h2>
      <p className="text-gray-600 text-center mb-8">
        Sign in to your account to continue
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
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
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full btn-primary py-3 disabled:opacity-50"
        >
          {loginMutation.isPending ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              <span>Signing in...</span>
            </div>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      {/* Demo Credentials */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</p>
        <div className="space-y-1 text-sm text-gray-600">
          <p><strong>Customer:</strong> customer@example.com / password123</p>
          <p><strong>Restaurant:</strong> restaurant@example.com / password123</p>
          <p><strong>Driver:</strong> driver@example.com / password123</p>
          <p><strong>Admin:</strong> admin@example.com / admin123</p>
        </div>
      </div>

      {/* Register Link */}
      <p className="mt-6 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary-600 hover:text-primary-500 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
