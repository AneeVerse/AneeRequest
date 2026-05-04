'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Loader2, ShieldCheck, Lock } from 'lucide-react';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                setIsReady(true);
            }
        });

        const init = async () => {
            const url = new URL(window.location.href);
            const code = url.searchParams.get('code');

            if (code) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                if (exchangeError) {
                    setError(`Reset link invalid or expired: ${exchangeError.message}`);
                    return;
                }
                url.searchParams.delete('code');
                window.history.replaceState({}, '', url.pathname);
                setIsReady(true);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (session) setIsReady(true);
        };
        init();

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setInfo(null);

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Reset link expired or already used. Request a new one from the login page.');
            }

            const updatePromise = supabase.auth.updateUser({ password });
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out. Check your internet and try again.')), 15000)
            );
            const { error: updateError } = await Promise.race([updatePromise, timeoutPromise]) as any;
            if (updateError) throw updateError;
            setInfo('Password updated. Redirecting to login...');
            await supabase.auth.signOut();
            setTimeout(() => router.push('/login'), 1500);
        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(err.message || 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4 font-sans selection:bg-[#279da6]/30">
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#279da6]/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#279da6]/5 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-md animate-slide-up">
                <div className="flex flex-col items-center mb-10">
                    <div className="relative w-24 h-24 mb-4">
                        <Image src="/images/Artboard 7@2x.png" alt="Aneeverse Logo" fill className="object-contain" />
                    </div>
                    <h1 className="text-[20px] font-black tracking-tighter text-[#279da6] select-none uppercase">aneeverse</h1>
                    <p className="text-storm-gray text-[10px] mt-1 font-black uppercase tracking-[0.55em] opacity-80">Reset password</p>
                </div>

                <div className="bg-[#18181B] border border-shark/50 rounded-3xl p-8 shadow-2xl">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-iron">Set a new password</h2>
                        <p className="text-storm-gray text-xs mt-1 font-medium italic">
                            {isReady ? 'Enter a new password for your account.' : 'Verifying your reset link...'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-rose-500/5 border border-rose-500/20 text-rose-500 text-[11px] font-bold p-3 rounded-xl flex items-center gap-2 animate-shake">
                                <ShieldCheck size={14} />
                                {error}
                            </div>
                        )}
                        {info && (
                            <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold p-3 rounded-xl flex items-center gap-2">
                                <ShieldCheck size={14} />
                                {info}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-santas-gray uppercase tracking-widest ml-1">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-storm-gray" size={14} />
                                <input
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="no-native-reveal w-full bg-[#09090B] border border-shark/80 rounded-xl py-3 pl-11 pr-12 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 focus:ring-1 focus:ring-[#279da6]/20 transition-all placeholder:text-storm-gray/40"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white transition-colors">
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-santas-gray uppercase tracking-widest ml-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-storm-gray" size={14} />
                                <input
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="no-native-reveal w-full bg-[#09090B] border border-shark/80 rounded-xl py-3 pl-11 pr-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 focus:ring-1 focus:ring-[#279da6]/20 transition-all placeholder:text-storm-gray/40"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !isReady}
                            className="w-full bg-[#279da6] hover:bg-[#279da6]/90 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#279da6]/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="w-full text-[10px] font-bold text-storm-gray hover:text-white uppercase tracking-widest transition-colors"
                        >
                            Back to Sign In
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
