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
    impersonate: (targetProfile: Profile) => void;
    stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load impersonation state from session storage if exists
        const stored = sessionStorage.getItem('impersonated_profile');
        if (stored) {
            try {
                setImpersonatedProfile(JSON.parse(stored));
            } catch (e) {
                sessionStorage.removeItem('impersonated_profile');
            }
        }

        // Check active sessions
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                setUser(session.user);
                await fetchProfile(session.user.id);
            }
            setIsLoading(false);
        };

        getSession();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    // Only clear everything on explicit sign out
                    setProfile(null);
                    setImpersonatedProfile(null);
                    sessionStorage.removeItem('impersonated_profile');
                    setUser(null);
                } else if (session) {
                    // For token refreshes or other events, just update user and profile
                    // without killing the existing impersonation state
                    const prevUserId = user?.id;
                    setUser(session.user);

                    if (prevUserId && prevUserId !== session.user.id) {
                        // If the actual user changed (rare without logout), clear impersonation
                        setImpersonatedProfile(null);
                        sessionStorage.removeItem('impersonated_profile');
                    }

                    await fetchProfile(session.user.id);
                }
                setIsLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        // 1. Fetch basic profile
        const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        let profile = profileData as Profile;

        // 2. If client, fetch organization from clients table
        if (profile?.role === 'client' || (!profile && user?.email)) {
            const { data: clientData } = await supabase
                .from('clients')
                .select('organization')
                .eq('email', user?.email || profile?.email)
                .maybeSingle();

            if (clientData?.organization) {
                if (profile) {
                    profile.organization = clientData.organization;
                } else {
                    // If no profile yet, we'll wait for the fallback logic below
                    // or we can attach it to the fallback
                }
            }
        }

        // 3. Critical Fix: Check team_members table regardless of profile role
        // This ensures if someone is in team_members but marked as 'client' in profiles (or profiles record is missing),
        // we correctly identify them as staff.
        const { data: teamData } = await supabase
            .from('team_members')
            .select('position')
            .eq('profile_id', userId)
            .maybeSingle();

        if (teamData) {
            if (!profile) {
                // Fallback for missing profile record
                profile = {
                    id: userId,
                    email: user?.email || '',
                    full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
                    role: 'team_member',
                    team_role: teamData.position || 'viewer'
                };
            } else if (profile.role !== 'super_admin' && profile.role !== 'admin') {
                // Upgrade to team_member if they are in the team table
                profile.role = 'team_member';
                profile.team_role = teamData.position || 'viewer';
            } else {
                // For admins/super_admins who are also in team table, just ensure team_role is set
                profile.team_role = teamData.position || 'viewer';
            }
        } else if (profile && profile.role === 'team_member') {
            // Default sub-role if missing from team_members table but marked as team_member
            profile.team_role = profile.team_role || 'viewer';
        }

        if (profile) {
            // Ensure organization is set if we found it earlier but profile was recreated
            if (!profile.organization && user?.email) {
                const { data: clientData } = await supabase
                    .from('clients')
                    .select('organization')
                    .eq('email', user.email)
                    .maybeSingle();
                if (clientData?.organization) profile.organization = clientData.organization;
            }

            setProfile(profile);

            // Auto-sync database if profiles role is incorrect
            if (profileData && profileData.role !== profile.role && !isLoading) {
                supabase.from('profiles').update({ role: profile.role }).eq('id', userId).then();
            }
        }
    };

    const signOut = async () => {
        // Clear state immediately to prevent flicker on potential slow redirect
        setProfile(null);
        setImpersonatedProfile(null);
        setUser(null);
        sessionStorage.removeItem('impersonated_profile');

        await supabase.auth.signOut();
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    const impersonate = (targetProfile: Profile) => {
        if (profile?.role === 'super_admin' || profile?.role === 'admin') {
            setImpersonatedProfile(targetProfile);
            sessionStorage.setItem('impersonated_profile', JSON.stringify(targetProfile));
        }
    };

    const stopImpersonating = () => {
        setImpersonatedProfile(null);
        sessionStorage.removeItem('impersonated_profile');
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
