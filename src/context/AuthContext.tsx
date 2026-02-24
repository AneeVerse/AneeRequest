'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Profile {
    id: string;
    email: string;
    role: 'super_admin' | 'admin' | 'client' | 'team_member';
    full_name: string;
    avatar_url?: string;
    team_role?: string; // stores 'admin', 'editor', or 'viewer'
    organization?: string;
    accessible_sections?: string[];
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    impersonatedProfile: Profile | null;
    isImpersonating: boolean;
    viewAsProfile: Profile | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    impersonate: (targetProfile: Profile, returnTo?: string) => void;
    stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 1. Load impersonation state
        const stored = sessionStorage.getItem('impersonated_profile');
        if (stored) {
            try {
                setImpersonatedProfile(JSON.parse(stored));
            } catch (e) {
                sessionStorage.removeItem('impersonated_profile');
            }
        }

        // 2. Initial Session & State Listener
        const initAuth = async () => {
            // Get initial session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
                await fetchProfile(session.user.id);
            }
            setIsLoading(false);

            // Start listening for changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                async (event, session) => {
                    if (event === 'SIGNED_OUT') {
                        setProfile(null);
                        setImpersonatedProfile(null);
                        sessionStorage.removeItem('impersonated_profile');
                        setUser(null);
                    } else if (session && event !== 'INITIAL_SESSION') {
                        // Avoid redundant fetch if INITIAL_SESSION (already handled above)
                        setUser(session.user);
                        await fetchProfile(session.user.id);
                    }
                    setIsLoading(false);
                }
            );

            return subscription;
        };

        const authSub = initAuth();

        return () => {
            authSub.then(sub => sub.unsubscribe());
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            // Parallelize database lookups for speed
            const [profileResult, clientResult, teamResult] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
                user?.email ? supabase.from('clients').select('organization').eq('email', user.email).maybeSingle() : Promise.resolve({ data: null }),
                supabase.from('team_members').select('position, accessible_sections').eq('profile_id', userId).maybeSingle()
            ]);

            const profileData = profileResult.data;
            const clientData = clientResult.data;
            const teamData = teamResult.data;

            let updatedProfile: Profile | null = profileData ? { ...profileData } : null;

            // 1. Critical Fix: Identify staff even if profile record is missing
            if (teamData) {
                if (!updatedProfile) {
                    updatedProfile = {
                        id: userId,
                        email: user?.email || '',
                        full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
                        role: 'team_member',
                        team_role: teamData.position || 'viewer'
                    };
                } else {
                    // Update existing profile with team data
                    if (updatedProfile.role !== 'super_admin' && updatedProfile.role !== 'admin') {
                        updatedProfile.role = 'team_member';
                    }
                    updatedProfile.team_role = teamData.position || 'viewer';
                }
                updatedProfile.accessible_sections = teamData.accessible_sections || [];
            }

            // 2. Handle client specific data
            if (updatedProfile) {
                if (clientData?.organization) {
                    updatedProfile.organization = clientData.organization;
                }

                // Fallback for sub-role if missing
                if (updatedProfile.role === 'team_member' && !updatedProfile.team_role) {
                    updatedProfile.team_role = 'viewer';
                }

                setProfile(updatedProfile);

                // Auto-sync database if profiles role is incorrect
                if (profileData && profileData.role !== updatedProfile.role) {
                    supabase.from('profiles').update({ role: updatedProfile.role }).eq('id', userId).then();
                }
            }
        } catch (error) {
            console.error('Error in fetchProfile:', error);
        }
    };

    const signOut = async () => {
        const clearAll = () => {
            setProfile(null);
            setImpersonatedProfile(null);
            setUser(null);
            sessionStorage.removeItem('impersonated_profile');
            localStorage.removeItem('supabase.auth.token'); // Safety clear
            sessionStorage.clear();
        };

        try {
            // Don't wait forever for Supabase to respond
            await Promise.race([
                supabase.auth.signOut(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Sign out timeout')), 2000))
            ]);
        } catch (error) {
            console.warn('Supabase signout issue, clearing local state anyway');
        } finally {
            clearAll();
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    const impersonate = (targetProfile: Profile, returnTo?: string) => {
        if (profile?.role === 'super_admin' || profile?.role === 'admin') {
            setImpersonatedProfile(targetProfile);
            sessionStorage.setItem('impersonated_profile', JSON.stringify(targetProfile));
            if (returnTo) {
                sessionStorage.setItem('impersonate_return_to', returnTo);
            }
        }
    };

    const stopImpersonating = () => {
        setImpersonatedProfile(null);
        sessionStorage.removeItem('impersonated_profile');
        const returnTo = sessionStorage.getItem('impersonate_return_to');
        sessionStorage.removeItem('impersonate_return_to');
        if (returnTo) {
            window.location.href = returnTo;
        }
    };

    const isImpersonating = !!impersonatedProfile;

    // Intelligent role detection from Auth metadata and safeguards
    const getAuthRole = (u: User): Profile['role'] => {
        // 1. Safeguard for known admin emails
        if (u.email?.toLowerCase() === '4d.x.art@gmail.com') return 'super_admin';

        // 2. Custom claims (app_metadata) - preferred source
        const appRole = u.app_metadata?.role;
        if (appRole) return appRole as Profile['role'];

        // 3. User metadata (fallback)
        const userRole = u.user_metadata?.role;
        if (userRole) return userRole as Profile['role'];

        return 'client';
    };

    // Fallback profile if database record is missing or loading
    const authFallbackProfile: Profile | null = user ? {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: getAuthRole(user),
        avatar_url: user.user_metadata?.avatar_url
    } : null;

    const viewAsProfile = impersonatedProfile || profile || authFallbackProfile;

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            impersonatedProfile,
            isImpersonating,
            viewAsProfile,
            isLoading,
            signOut,
            refreshProfile,
            impersonate,
            stopImpersonating
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
