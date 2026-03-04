'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home,
    MessageSquare,
    Calendar,
    Clock,
    Users,
    UserPlus,
    CreditCard,
    BarChart2,
    Settings,
    LogOut,
    FolderOpen,
    MoreHorizontal,
    AlertTriangle,
    X,
    ChevronDown,
    ChevronUp,
    Loader2,
    ChevronsUpDown,
    Sparkles,
    BadgeCheck,
    Bell,
    CheckSquare
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SidebarItemProps {
    item: {
        name: string;
        icon: any;
        path: string;
    };
    isActive: boolean;
    isCollapsed: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ item, isActive, isCollapsed }) => {
    const Icon = item.icon;

    return (
        <Link
            href={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all relative group ${isActive ? 'text-[#279da6] bg-[#279da6]/5' : 'text-storm-gray hover:text-iron hover:bg-shark/20'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
        >
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#279da6] rounded-r-full shadow-[0_0_15px_rgba(39,157,166,0.5)]" />
            )}
            <span className={`flex items-center justify-center shrink-0 ${isActive ? 'text-[#279da6]' : 'text-storm-gray'}`}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            </span>
            {!isCollapsed && <span className="truncate transition-opacity duration-300">{item.name}</span>}
        </Link>
    );
};

interface SidebarProps {
    isCollapsed: boolean;
}

export default function Sidebar({ isCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { profile, viewAsProfile, isImpersonating, stopImpersonating, signOut, isLoading } = useAuth();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isUsersExpanded, setIsUsersExpanded] = useState(pathname.includes('/clients') || pathname.includes('/team'));

    const displayProfile = viewAsProfile || profile;

    const handleSignOut = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        try {
            // Attempt clean sign out but don't let it hang the UI
            await Promise.race([
                signOut(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Sign out timeout')), 1500))
            ]);
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            // Always clear storage and redirect regardless of clean signout success
            window.localStorage.clear();
            window.sessionStorage.clear();

            // Force redirect to login
            window.location.href = '/login';
        }
    };

    const isSuperAdmin = displayProfile?.role === 'super_admin';
    const isAdminRole = displayProfile?.role === 'admin';
    const isTeamMember = displayProfile?.role === 'team_member';

    // Internal if they have any team-related role or sub-role
    const isInternal = isSuperAdmin || isAdminRole || isTeamMember || !!displayProfile?.team_role;

    // Admin if they are super_admin, platform admin, or a team admin
    const isAdmin = isSuperAdmin || isAdminRole || (isTeamMember && displayProfile?.team_role === 'admin');

    const menuItems = [
        { name: 'Overview', icon: Home, path: '/', id: 'dashboard' },
        { name: 'Requests', icon: MessageSquare, path: '/requests', id: 'requests' },
        { name: 'Tasks', icon: CheckSquare, path: '/tasks', isInternalOnly: true, id: 'tasks' },
        { name: 'Files', icon: FolderOpen, path: '/files', id: 'files' },
        { name: 'Users', icon: Users, path: '/clients', id: 'users' },
    ];

    const filteredItems = menuItems.filter(item => {
        // 1. Super Admin/Admin (Global) bypasses all restrictions
        if (isSuperAdmin || isAdminRole) return true;

        // 2. Section Access Enforcement
        const sections = displayProfile?.accessible_sections || [];

        if (item.id === 'dashboard' && !sections.includes('dashboard')) return false;
        if (item.id === 'requests' && !sections.includes('requests')) return false;
        if (item.id === 'tasks' && !sections.includes('tasks')) return false;
        if (item.id === 'files' && !sections.includes('files')) return false;

        // 3. User section (Clients/Team)
        if (item.id === 'users') {
            // Internal check
            if (!isInternal) return false;
            // Check if team member has either 'clients' or 'team' permission
            if (!sections.includes('clients') && !sections.includes('team')) return false;
        }

        if (item.isInternalOnly && !isInternal) return false;

        return true;
    });
    const isUsersActive = pathname.includes('/clients') || pathname.includes('/team');

    return (
        <>
            <aside className={`flex flex-col bg-[#09090B] transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
                {/* Brand Header */}
                <div className={`${isCollapsed ? 'p-4 justify-center' : 'p-6 gap-3'} mb-2 flex items-center`}>
                    <div className="relative w-12 h-12 flex-shrink-0">
                        <Image
                            src="/images/Artboard 7@2x.png"
                            alt="Aneeverse Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col -mt-1">
                            <h1 className="text-xl font-black tracking-tighter text-[#279da6] select-none uppercase">aneeverse</h1>
                            <p className="text-[12px] text-storm-gray -mt-1 font-black tracking-widest uppercase opacity-80">Request hub</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex-1 px-4 py-2 flex flex-col gap-1 overflow-y-auto no-scrollbar">
                    {filteredItems.map((item) => (
                        <SidebarItem key={item.name} item={item} isCollapsed={isCollapsed} isActive={pathname.startsWith(item.path) && (item.path !== '/' || pathname === '/')} />
                    ))}
                </div>

                {/* User Footer - show even during impersonation to verify settings */}
                <div className="p-4 mt-auto relative">
                    {showProfileMenu && (
                        <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#121214] border border-shark/60 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
                            {!isCollapsed && (
                                <div className="p-4 border-b border-shark/40 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-shark flex items-center justify-center text-sm font-black text-white bg-gradient-to-br from-[#279da6]/30 to-transparent ring-1 ring-white/5 relative overflow-hidden">
                                        {displayProfile?.avatar_url ? (
                                            <Image
                                                src={displayProfile.avatar_url}
                                                alt="Avatar"
                                                fill
                                                unoptimized
                                                className="object-cover"
                                            />
                                        ) : (
                                            (displayProfile?.organization || displayProfile?.full_name || displayProfile?.email || 'U').split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <p className="text-sm font-black text-white truncate">
                                            {displayProfile?.organization || displayProfile?.full_name || (displayProfile?.role === 'super_admin' ? 'Super Admin' : 'User Account')}
                                        </p>
                                        <p className="text-xs text-storm-gray font-bold truncate tracking-tight">{displayProfile?.email}</p>
                                    </div>
                                </div>
                            )}

                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => {
                                        setShowProfileMenu(false);
                                        router.push('/account');
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-iron hover:bg-shark transition-all text-left group cursor-pointer"
                                >
                                    <BadgeCheck size={18} className="text-storm-gray group-hover:text-[#279da6]" />
                                    <span>Account</span>
                                </button>

                                <div className="h-px bg-shark/40 mx-2 my-1" />
                                {isImpersonating ? (
                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            stopImpersonating();
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#279da6] hover:bg-[#279da6]/10 transition-all text-left cursor-pointer"
                                    >
                                        <Users size={18} />
                                        <span>Stop Impersonating</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            setShowLogoutConfirm(true);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition-all text-left cursor-pointer"
                                    >
                                        <LogOut size={18} />
                                        <span>Log out</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className={`w-full p-2 rounded-2xl flex items-center gap-3 hover:bg-shark/40 transition-all group/profile cursor-pointer ${showProfileMenu ? 'bg-shark/40' : ''} ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <div className="w-9 h-9 rounded-full bg-shark relative shrink-0 overflow-hidden flex items-center justify-center text-xs font-black text-white bg-gradient-to-br from-[#279da6]/20 to-transparent group-hover/profile:ring-2 group-hover/profile:ring-[#279da6]/30 transition-all">
                            {isLoading ? (
                                <Loader2 size={16} className="text-[#279da6] animate-spin" />
                            ) : displayProfile?.avatar_url ? (
                                <Image
                                    src={displayProfile.avatar_url}
                                    alt="Avatar"
                                    fill
                                    unoptimized
                                    className="object-cover"
                                />
                            ) : (
                                (displayProfile?.organization || displayProfile?.full_name || displayProfile?.email || 'U').split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                            )}
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col min-w-0 flex-1 text-left">
                                {isLoading ? (
                                    <div className="space-y-1.5">
                                        <div className="h-2.5 w-24 bg-shark/60 animate-pulse rounded" />
                                        <div className="h-2 w-32 bg-shark/40 animate-pulse rounded" />
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm font-black text-white truncate leading-none mb-1.5">
                                            {displayProfile?.organization || displayProfile?.full_name || (displayProfile?.role === 'super_admin' ? 'Super Admin' : 'User Account')}
                                        </p>
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <p className="text-[12px] text-[#279da6] font-black uppercase tracking-tighter shrink-0">
                                                {displayProfile?.team_role ? `${displayProfile.team_role} · ` : ''}
                                                {displayProfile?.role?.replace('_', ' ') || 'User'}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {!isCollapsed && <ChevronsUpDown size={14} className="text-storm-gray group-hover/profile:text-iron" />}
                    </button>
                </div>
            </aside>

            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#18181B] border border-shark rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-up">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                <AlertTriangle size={24} />
                            </div>
                            <button onClick={() => setShowLogoutConfirm(false)} className="text-storm-gray hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <h2 className="text-xl font-bold text-iron mb-2">Sign out?</h2>
                        <p className="text-storm-gray text-sm mb-8">Are you sure you want to sign out? You'll need to login again to access your dashboard.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleSignOut} disabled={isLoggingOut} className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                                {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Sign Out'}
                            </button>
                            <button onClick={() => setShowLogoutConfirm(false)} disabled={isLoggingOut} className="w-full bg-shark/50 hover:bg-shark text-iron py-3 rounded-xl font-bold text-sm transition-all">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
