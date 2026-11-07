import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ShoppingBag, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import api, { setAuthToken } from '../services/api.js';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

type LoginFields = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const switchView = (newView: 'LOGIN' | 'FORGOT' | 'RESET') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setView(newView);
  };
  const [view, setView] = useState<'LOGIN' | 'FORGOT' | 'RESET'>('LOGIN');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFields) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/auth/login', data);
      const { accessToken, refreshToken, user } = res.data;
      
      setAuthToken(accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      setSuccessMsg(res.data.message);
      // Automatically transition to reset view and populate OTP if returned (for easy dev)
      if (res.data.otp) {
        setOtp(res.data.otp);
      }
      setView('RESET');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail,
        otp,
        newPassword,
      });
      setSuccessMsg('Password has been successfully updated. You can login now.');
      setView('LOGIN');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-950 via-zinc-900 to-gray-900 px-4">
      <div className="w-full max-w-md bg-white/5 dark:bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Decorative ambient background light */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-600/10 rounded-full blur-3xl" />

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="p-4 bg-brand-500 rounded-2xl text-white shadow-xl shadow-brand-500/30 mb-3">
            <ShoppingBag size={28} className="animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">PalMart Enterprise</h2>
          <p className="text-gray-400 text-sm mt-1">POS & Inventory Management Suite</p>
        </div>

        {errorMsg && (
          <div className="p-4 mb-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm text-center font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-4 mb-4 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400 text-sm text-center font-medium">
            {successMsg}
          </div>
        )}

        {view === 'LOGIN' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="email"
                  placeholder="admin@martpro.com"
                  {...register('email')}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => switchView('FORGOT')}
                  className="text-xs text-brand-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 text-white rounded-xl py-2.5 pl-10 pr-10 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-3 font-semibold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Access Account'}
            </button>
          </form>
        )}

        {view === 'FORGOT' && (
          <form onSubmit={handleForgotSubmit} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="email"
                  placeholder="Enter registered email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => switchView('LOGIN')}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-3 font-semibold transition-all border border-zinc-700/50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-3 font-semibold transition-all flex items-center justify-center"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Send OTP'}
              </button>
            </div>
          </form>
        )}

        {view === 'RESET' && (
          <form onSubmit={handleResetSubmit} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">6-Digit OTP</label>
              <input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 text-white rounded-xl py-2.5 text-center tracking-widest font-bold outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-lg"
                maxLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">New Password</label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 text-white rounded-xl py-2.5 px-4 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => switchView('LOGIN')}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-3 font-semibold transition-all border border-zinc-700/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-3 font-semibold transition-all flex items-center justify-center"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
