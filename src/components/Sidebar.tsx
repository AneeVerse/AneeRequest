'use client';

import React, { useState, useEffect } from 'react';
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
    Receipt,
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
    CheckSquare,
    Menu
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SidebarItemProps {
    item: {
        name: string;
        icon: any;
        path: string;
    };
    isActive: boolean;
    isMobileMode: boolean;
    onNavigate?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ item, isActive, isMobileMode, onNavigate }) => {
    const Icon = item.icon;

    if (isMobileMode) {
        // Mobile: show full text
        return (
            <Link
                href={item.path}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all relative group ${isActive ? 'text-[#279da6] bg-[#279da6]/5' : 'text-storm-gray hover:text-iron hover:bg-shark/20'
                    }`}
            >
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#279da6] rounded-r-full shadow-[0_0_15px_rgba(39,157,166,0.5)]" />
                )}
                <span className={`flex items-center justify-center shrink-0 ${isActive ? 'text-[#279da6]' : 'text-storm-gray'}`}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span className="truncate transition-opacity duration-300">{item.name}</span>
            </Link>
        );
    }

    // Desktop: icon-only with hover tooltip
    return (
        <Link
            href={item.path}
            onClick={onNavigate}
            className={`flex items-center justify-center py-2.5 rounded-xl transition-all relative group ${isActive ? 'text-[#279da6] bg-[#279da6]/5' : 'text-storm-gray hover:text-iron hover:bg-shark/20'
                }`}
        >
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#279da6] rounded-r-full shadow-[0_0_15px_rgba(39,157,166,0.5)]" />
            )}
            <span className={`flex items-center justify-center shrink-0 ${isActive ? 'text-[#279da6]' : 'text-storm-gray'}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </span>
            {/* Hover tooltip */}
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#1e1e22] border border-shark/60 rounded-lg text-xs font-bold text-iron whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-xl pointer-events-none">
                {item.name}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#1e1e22] border-l border-b border-shark/60 rotate-45" />
            </div>
        </Link>
    );
};

interface SidebarProps {
    isCollapsed?: boolean;
    isMobileOpen?: boolean;
    onMobileClose?: () => void;
}

export default function Sidebar({ isCollapsed, isMobileOpen = false, onMobileClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { profile, viewAsProfile, isImpersonating, stopImpersonating, signOut, isLoading } = useAuth();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const displayProfile = viewAsProfile || profile;

    // Close mobile sidebar on route change
    useEffect(() => {
        if (onMobileClose) {
            onMobileClose();
        }
    }, [pathname]);

    const handleSignOut = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        try {
            await Promise.race([
                signOut(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Sign out timeout')), 1500))
            ]);
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            window.localStorage.clear();
            window.sessionStorage.clear();
            window.location.href = '/login';
        }
    };

    const isSuperAdmin = displayProfile?.role === 'super_admin';
    const isAdminRole = displayProfile?.role === 'admin';
    const isTeamMember = displayProfile?.role === 'team_member';
    const isInternal = isSuperAdmin || isAdminRole || isTeamMember || !!displayProfile?.team_role;

    const menuItems = [
        { name: 'Overview', icon: Home, path: '/', id: 'dashboard' },
        { name: 'Requests', icon: MessageSquare, path: '/requests', id: 'requests' },
        { name: 'Tasks', icon: CheckSquare, path: '/tasks', isInternalOnly: true, id: 'tasks' },
        { name: 'DRIVE', icon: FolderOpen, path: '/files', id: 'files' },
        { name: 'INVOICES', icon: Receipt, path: '/invoices', id: 'invoices' },
        { name: 'Users', icon: Users, path: '/clients', id: 'users' },
    ];

    const filteredItems = menuItems.filter(item => {
        if (isSuperAdmin || isAdminRole) return true;
        const sections = displayProfile?.accessible_sections || [];
        if (item.id === 'dashboard' && !sections.includes('dashboard')) return false;
        if (item.id === 'requests' && !sections.includes('requests')) return false;
        if (item.id === 'tasks' && !sections.includes('tasks')) return false;
        if (item.id === 'files' && !sections.includes('files')) return false;
        if (item.id === 'invoices' && !sections.includes('invoices')) return false;
        if (item.id === 'users') {
            if (!isInternal) return false;
            if (!sections.includes('clients') && !sections.includes('team')) return false;
        }
        if (item.isInternalOnly && !isInternal) return false;
        return true;
    });

    const handleMobileNavigate = () => {
        if (onMobileClose) onMobileClose();
    };

    const initials = (displayProfile?.organization || displayProfile?.full_name || displayProfile?.email || 'U')
        .split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

    // ── Desktop sidebar: always icon-only ──
    const desktopSidebar = (
        <aside className="fixed left-0 top-0 bottom-0 flex flex-col bg-[#09090B] h-full w-[60px] z-40">
            {/* Logo */}
            <div className="p-2 pt-10 pb-2 flex items-center justify-center">
                <div className="relative w-10 h-10 flex-shrink-0">
                    <Image
                        src="/images/Artboard 7@2x.png"
                        alt="Aneeverse Logo"
                        fill
                        className="object-contain"
                    />
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-2 py-4 flex flex-col gap-1 overflow-visible no-scrollbar">
                {filteredItems.map((item) => (
                    <SidebarItem
                        key={item.name}
                        item={item}
                        isMobileMode={false}
                        isActive={pathname.startsWith(item.path) && (item.path !== '/' || pathname === '/')}
                    />
                ))}
            </div>

            {/* User Avatar — icon only with tooltip + popup menu */}
            <div className="p-2 mt-auto relative">
                {showProfileMenu && (
                    <div className="absolute bottom-0 left-full ml-2 w-56 bg-[#101011] border border-shark/60 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-slide-up">
                        <div className="p-4 border-b border-shark/40 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-shark flex items-center justify-center text-sm font-black text-white bg-gradient-to-br from-[#279da6]/30 to-transparent ring-1 ring-white/5 relative overflow-hidden shrink-0">
                                {displayProfile?.avatar_url ? (
                                    <Image
                                        src={displayProfile.avatar_url}
                                        alt="Avatar"
                                        fill
                                        unoptimized
                                        className="object-cover"
                                    />
                                ) : (
                                    initials
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-sm font-black text-white truncate">
                                    {displayProfile?.organization || displayProfile?.full_name || (displayProfile?.role === 'super_admin' ? 'Super Admin' : displayProfile?.email || 'User Account')}
                                </p>
                                <p className="text-xs text-storm-gray font-bold truncate tracking-tight">{displayProfile?.email}</p>
                            </div>
                        </div>

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
                    className={`w-full p-1.5 rounded-xl flex items-center justify-center hover:bg-shark/40 transition-all group/profile cursor-pointer relative ${showProfileMenu ? 'bg-shark/40' : ''}`}
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
                            initials
                        )}
                    </div>
                    {/* Hover tooltip for profile */}
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#1e1e22] border border-shark/60 rounded-lg text-xs font-bold text-iron whitespace-nowrap opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all duration-200 z-[100] shadow-xl pointer-events-none">
                        {displayProfile?.organization || displayProfile?.full_name || 'Account'}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#1e1e22] border-l border-b border-shark/60 rotate-45" />
                    </div>
                </button>
            </div>
        </aside>
    );

    // ── Mobile sidebar: full width with text ──
    const mobileSidebar = (
        <aside className="flex flex-col bg-[#09090B] h-full w-64">
            {/* Brand Header */}
            <div className="p-6 mb-2 flex items-center gap-3">
                <div className="relative w-12 h-12 flex-shrink-0">
                    <Image
                        src="/images/Artboard 7@2x.png"
                        alt="Aneeverse Logo"
                        fill
                        className="object-contain"
                    />
                </div>
                <div className="flex flex-col -mt-1 flex-1">
                    <h1 className="text-xl font-black tracking-tighter text-[#279da6] select-none uppercase">aneeverse</h1>
                    <p className="text-[12px] text-storm-gray -mt-1 font-black tracking-widest uppercase opacity-80">Request hub</p>
                </div>
                {onMobileClose && (
                    <button
                        onClick={onMobileClose}
                        className="p-2 text-storm-gray hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 px-4 py-2 flex flex-col gap-1 overflow-y-auto no-scrollbar">
                {filteredItems.map((item) => (
                    <SidebarItem
                        key={item.name}
                        item={item}
                        isMobileMode={true}
                        isActive={pathname.startsWith(item.path) && (item.path !== '/' || pathname === '/')}
                        onNavigate={handleMobileNavigate}
                    />
                ))}
            </div>

            {/* User Footer */}
            <div className="p-4 mt-auto relative">
                {showProfileMenu && (
                    <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#101011] border border-shark/60 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
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
                                    initials
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-sm font-black text-white truncate">
                                    {displayProfile?.organization || displayProfile?.full_name || (displayProfile?.role === 'super_admin' ? 'Super Admin' : displayProfile?.email || 'User Account')}
                                </p>
                                <p className="text-xs text-storm-gray font-bold truncate tracking-tight">{displayProfile?.email}</p>
                            </div>
                        </div>

                        <div className="p-2 space-y-1">
                            <button
                                onClick={() => {
                                    setShowProfileMenu(false);
                                    handleMobileNavigate();
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
                    className={`w-full p-2 rounded-2xl flex items-center gap-3 hover:bg-shark/40 transition-all group/profile cursor-pointer ${showProfileMenu ? 'bg-shark/40' : ''}`}
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
                            initials
                        )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                        {isLoading ? (
                            <div className="space-y-1.5">
                                <div className="h-2.5 w-24 bg-shark/60 animate-pulse rounded" />
                                <div className="h-2 w-32 bg-shark/40 animate-pulse rounded" />
                            </div>
                        ) : (
                            <>
                                <p className="text-sm font-black text-white truncate leading-none mb-1.5">
                                    {displayProfile?.organization || displayProfile?.full_name || (displayProfile?.role === 'super_admin' ? 'Super Admin' : displayProfile?.email || 'User Account')}
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
                    <ChevronsUpDown size={14} className="text-storm-gray group-hover/profile:text-iron" />
                </button>
            </div>
        </aside>
    );

    return (
        <>
            {/* Desktop sidebar — fixed icon-only + spacer */}
            <div className="hidden lg:block w-[60px] shrink-0" />
            <div className="hidden lg:block">
                {desktopSidebar}
            </div>

            {/* Mobile sidebar — overlay mode with full text */}
            {isMobileOpen && (
                <>
                    <div className="sidebar-overlay lg:hidden" onClick={onMobileClose} />
                    <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-slide-in-left">
                        {mobileSidebar}
                    </div>
                </>
            )}

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
                        <p className="text-storm-gray text-sm mb-8">Are you sure you want to sign out? You&apos;ll need to login again to access your dashboard.</p>
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
