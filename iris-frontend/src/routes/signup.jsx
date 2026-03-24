import { createFileRoute, Link } from '@tanstack/react-router'
import { UserPlus, Mail, Lock, Camera, Loader2, User } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api, fetchJson } from '../lib/api'

export const Route = createFileRoute('/signup')({
  component: Signup,
})

function Signup() {
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: ''
  })

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Register the new account (default role will be set to parent in backend)
      await fetchJson(api.register(), {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password,
          role: 'parent' // ensure explicit default just in case
        })
      });

      // 2. Automatically log the user in
      const loginRes = await login(formData.email, formData.password);

      if (loginRes.success) {
        // Let the root layout handle redirection dynamically
        window.location.href = "/";
      } else {
        setError("Registration succeeded, but login failed: " + loginRes.error);
        setLoading(false);
      }

    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.message || 'Registration failed. Please try a different email.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background Orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="w-full max-w-md bg-neutral-900/40 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-8 shadow-2xl relative z-10 mx-auto">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <UserPlus size={32} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-2 tracking-tight">Create Account</h2>
        <p className="text-center text-neutral-400 mb-8 text-sm">Join IrisSync to connect with your students</p>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">{error}</div>}

        <form className="space-y-4" onSubmit={handleSubmit}>

          <div className="space-y-1.5 cursor-text">
            <label className="text-sm font-medium text-neutral-300 ml-1">Full Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
              <input
                type="text"
                name="full_name"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 cursor-text">
            <label className="text-sm font-medium text-neutral-300 ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-teal-400 transition-colors" size={18} />
              <input
                type="email"
                name="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                required
                minLength={3}
              />
            </div>
          </div>

          <div className="space-y-1.5 cursor-text">
            <label className="text-sm font-medium text-neutral-300 ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold py-3.5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  )
}
