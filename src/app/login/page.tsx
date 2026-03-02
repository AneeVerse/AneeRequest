'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;

            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4 font-sans selection:bg-[#279da6]/30">
            {/* Background Glows */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#279da6]/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#279da6]/5 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-md animate-slide-up">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative w-24 h-24 mb-4">
                        <Image
                            src="/images/Artboard 7@2x.png"
                            alt="Aneeverse Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <h1 className="text-[20px] font-black tracking-tighter text-[#279da6] select-none uppercase">
                        aneeverse
                    </h1>
                    <p className="text-storm-gray text-[10px] mt-1 font-black uppercase tracking-[0.55em] opacity-80">
                        Request hub
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-[#18181B] border border-shark/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#279da6]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-iron">Welcome back</h2>
                        <p className="text-storm-gray text-xs mt-1 font-medium italic">Enter your credentials to access your dashboard</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-rose-500/5 border border-rose-500/20 text-rose-500 text-[11px] font-bold p-3 rounded-xl flex items-center gap-2 animate-shake">
                                <ShieldCheck size={14} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-santas-gray uppercase tracking-widest ml-1">
                                Email Address
                            </label>
                            <input
                                required
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#09090B] border border-shark/80 rounded-xl py-3 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 focus:ring-1 focus:ring-[#279da6]/20 transition-all placeholder:text-storm-gray/40"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-bold text-santas-gray uppercase tracking-widest">
                                    Password
                                </label>
                                <button type="button" className="text-[10px] font-bold text-[#279da6] hover:text-[#279da6]/80 transition-colors uppercase tracking-widest">
                                    Forgot?
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#09090B] border border-shark/80 rounded-xl py-3 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 focus:ring-1 focus:ring-[#279da6]/20 transition-all placeholder:text-storm-gray/40"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-storm-gray hover:text-iron transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#279da6] text-white py-3.5 rounded-xl font-bold text-xs shadow-lg shadow-[#279da6]/20 hover:bg-[#279da6]/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:active:scale-100"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <LogIn size={16} className="group-hover:translate-x-1 transition-transform" />
                                    Sign In to Dashboard
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-storm-gray text-[10px] font-bold uppercase tracking-widest">
                        Official Client Portal of <span className="text-iron">AneeVerse</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
