import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { AuthService } from '../services/AuthService';
import { apiClient } from '../api/client';
import { Mail, Lock, LogIn, Smartphone, Eye, EyeOff } from 'lucide-react';
import { getTenantFromUrl } from '../utils/tenant';

export default function LoginView() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [clientId, setClientId] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    useEffect(() => {
        const tenantFromUrl = getTenantFromUrl();
        if (tenantFromUrl) {
            setClientId(tenantFromUrl);
        } else {
            apiClient.get('/config').then(res => {
                setClientId(res.data.default_client_id || '');
            }).catch(() => { });
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await AuthService.login(email, password, clientId);
            const { access_token, ...user } = response;
            setAuth(user, access_token);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-900 p-4">

            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 w-full max-w-[1000px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

                {/* Left Side: Branding / Info */}
                <div className="hidden md:flex flex-1 flex-col justify-between p-12 bg-gradient-to-br from-indigo-600/80 to-purple-800/80 text-white relative">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-overlay opacity-30"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-12">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center p-1 overflow-hidden">
                                <img src="/logo.png" alt="Gurukul ERP Logo" className="w-full h-full object-contain" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight">Gurukul ERP</h1>
                        </div>

                        <div>
                            <h2 className="text-4xl font-extrabold mb-6 leading-tight">Empowering<br />Education<br />Management</h2>
                            <p className="text-indigo-100 text-lg max-w-sm">
                                Access your intuitive dashboard, manage courses, and connect with your campus ecosystem seamlessly.
                            </p>
                            <div className="mt-8 border-t border-white/20 pt-6 inline-block">
                                <p className="text-yellow-400 font-semibold italic text-xl">
                                    "सा विद्या या विमुक्तये"
                                </p>
                                <p className="text-sm text-indigo-200 mt-2 font-medium tracking-wide">
                                    (Knowledge is that which liberates)
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <p className="text-sm text-indigo-200/80">© 2026 Gurukul Systems. All rights reserved.</p>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="flex-1 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white">
                    <div className="max-w-md w-full mx-auto">

                        <div className="md:hidden flex items-center justify-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center p-1 overflow-hidden border border-gray-100">
                                <img src="/logo.png" alt="Gurukul ERP Logo" className="w-full h-full object-contain" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gurukul ERP</h1>
                        </div>

                        <div className="mb-10 text-center md:text-left">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
                            <p className="text-gray-500">Please enter your credentials to continue</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start">
                                    <p className="text-sm text-red-600 font-medium">{error}</p>
                                </div>
                            )}

                            <div className="space-y-5">
                                <div className="relative group">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1 pointer-events-none transition-colors group-focus-within:text-indigo-600">Institution Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <LogIn size={20} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all duration-200 shadow-sm"
                                            placeholder="Database / Institution Name"
                                        />
                                    </div>
                                </div>

                                <div className="relative group">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1 pointer-events-none transition-colors group-focus-within:text-indigo-600">Email Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail size={20} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all duration-200 shadow-sm"
                                            placeholder="student@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="relative group">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1 pointer-events-none transition-colors group-focus-within:text-indigo-600">Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock size={20} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-11 pr-12 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all duration-200 shadow-sm"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-indigo-500 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer transition-colors"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                                        Remember me
                                    </label>
                                </div>

                                <div className="text-sm">
                                    <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                                        Forgot password?
                                    </a>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 mt-8"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing in...
                                    </span>
                                ) : (
                                    <>
                                        Sign in to dashboard
                                        <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <a
                                href="/school_erp.apk"
                                download
                                className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border-2 border-indigo-50 text-indigo-600 font-semibold hover:bg-indigo-50 hover:border-indigo-100 transition-all duration-200"
                            >
                                <Smartphone size={20} />
                                Download Android App
                            </a>
                            <p className="text-center text-xs text-gray-400 mt-3">
                                Tap to download the APK directly to your mobile device
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
