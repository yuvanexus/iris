import { createFileRoute, Link } from '@tanstack/react-router'
import { LogIn, Mail, Lock, Camera, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export const Route = createFileRoute('/login')({
    component: Login,
})

function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await login(email, password);
        if (res.success) {
            // Need to reload to fetch user data and then navigate appropriately, or let the root/auth context handle global redirect. We can just route to '/' and the root layout will correctly show the proper nav.
            window.location.href = "/";
        } else {
            setError(res.error);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Background Orbs */}
            <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

            <div className="w-full max-w-md bg-neutral-900/40 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-8 shadow-2xl relative z-10 mx-auto">
                <div className="flex justify-center mb-8">
                    <div className="p-4 bg-teal-500/10 rounded-full border border-teal-500/20 text-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.2)]">
                        <Camera size={32} />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-center text-white mb-2 tracking-tight">Welcome Back</h2>
                <p className="text-center text-neutral-400 mb-8 text-sm">Sign in to access the IrisSync dashboard</p>

                {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">{error}</div>}

                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-1.5 cursor-text">
                        <label className="text-sm font-medium text-neutral-300 ml-1">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                            <input
                                type="email"
                                placeholder="Admin or user email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all font-medium"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 cursor-text">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-sm font-medium text-neutral-300">Password</label>
                            <a href="#" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">Forgot password?</a>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all font-medium"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-8 bg-linear-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold py-3.5 rounded-xl shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:shadow-[0_0_25px_rgba(45,212,191,0.5)] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="text-center text-sm text-neutral-500 mt-8">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
    )
}
