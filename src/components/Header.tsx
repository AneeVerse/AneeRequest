'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Plus,
    ListFilter,
    Shield,
    Settings,
    Check,
    X,
    Loader2,
    ChevronLeft,
    Menu
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ImpersonationWarning from '@/components/ImpersonationWarning';

interface HeaderProps {
    onToggleSidebar?: () => void;
    onMobileMenuToggle?: () => void;
    label: string;
    labelIcon?: React.ReactNode;
    tabs?: (string | { label: string; icon?: React.ReactNode })[];
    activeTab?: string;
    setActiveTab?: (tab: string) => void;
    onCreate?: () => void;
    onEdit?: () => void;
    onConfirm?: () => void;
    onCancel?: () => void;
    isCreating?: boolean;
    isSubmitting?: boolean;
    confirmLabel?: string;
    tabCounts?: Record<string, number>;
    pageSwitcher?: { name: string; path: string }[];
    activePath?: string;
    children?: React.ReactNode;
    rightToolbar?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
    onToggleSidebar,
    onMobileMenuToggle,
    label,
    labelIcon,
    tabs,
    activeTab,
    setActiveTab,
    onCreate,
    onEdit,
    onConfirm,
    onCancel,
    isCreating,
    isSubmitting,
    confirmLabel = 'Create',
    tabCounts,
    pageSwitcher,
    activePath,
    children,
    rightToolbar
}) => {
    const { isImpersonating, viewAsProfile, stopImpersonating } = useAuth();
    const router = useRouter();

    return (
        <header className="h-14 lg:h-16 flex items-center justify-between px-3 sm:px-4 lg:px-6 z-30 shrink-0 gap-2">
            {/* Left side: Mobile Menu + Sidebar Toggle + Category Label + Tabs */}
            <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
                {/* Mobile hamburger menu button */}
                <button
                    onClick={onMobileMenuToggle || onToggleSidebar}
                    className="p-1.5 text-santas-gray hover:text-white transition-colors cursor-pointer lg:hidden"
                    title="Open menu"
                >
                    <Menu size={20} />
                </button>

                {/* Desktop back button */}
                <button
                    onClick={() => router.back()}
                    className="p-1 text-santas-gray hover:text-white transition-colors cursor-pointer hidden lg:block"
                    title="Go back"
                >
                    <ChevronLeft size={20} />
                </button>

                {/* Section Label / User Card */}
                <div className="flex items-center gap-2 shrink-0 overflow-hidden">
                    {labelIcon || <ListFilter size={16} className="text-[#279da6] hidden sm:block" />}
                    <span className="text-xs font-black text-iron truncate max-w-[120px] sm:max-w-[200px] uppercase tracking-tight">{label}</span>
                </div>

                {children}

                {/* Page Switcher */}
                {pageSwitcher && (
                    <div className="hidden sm:flex items-center bg-black/60 border border-shark/50 p-1 rounded-xl overflow-hidden shrink-0 ml-2">
                        {pageSwitcher.filter(page => {
                            // 1. Super Admin/Admin (Global) bypasses all restrictions
                            if (viewAsProfile?.role === 'super_admin' || viewAsProfile?.role === 'admin') return true;

                            // 2. Specific section checks
                            const sections = viewAsProfile?.accessible_sections || [];
                            if (page.path === '/clients' && !sections.includes('clients')) return false;
                            if (page.path === '/team' && !sections.includes('team')) return false;

                            return true;
                        }).map((page) => (
                            <Link
                                key={page.path}
                                href={page.path}
                                className={`px-3 lg:px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activePath === page.path
                                    ? 'bg-shark/80 text-[#279da6] shadow-lg'
                                    : 'text-santas-gray hover:text-iron hover:bg-white/5'
                                    }`}
                            >
                                {page.name}
                            </Link>
                        ))}
                    </div>
                )}

                {/* Dynamic Sub-Navigation — scrollable on mobile */}
                {tabs && tabs.length > 0 && (
                    <div className="flex items-center bg-black/60 border border-shark/50 p-1 rounded-xl overflow-visible ml-1 sm:ml-2 min-w-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {tabs.map((tabItem) => {
                            const tabLabel = typeof tabItem === 'string' ? tabItem : tabItem.label;
                            const icon = typeof tabItem === 'string' ? null : tabItem.icon;
                            const count = tabCounts?.[tabLabel];
                            return (
                                <button
                                    key={tabLabel}
                                    onClick={() => setActiveTab?.(tabLabel)}
                                    className={`relative px-2.5 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer tracking-tight flex items-center gap-1.5 shrink-0 ${activeTab === tabLabel
                                        ? 'bg-shark/80 text-[#279da6] shadow-lg'
                                        : 'text-storm-gray hover:text-iron hover:bg-white/5'
                                        }`}
                                >
                                    {icon}
                                    {tabLabel}
                                    {count !== undefined && count > 0 && (
                                        <span className="absolute -top-3 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center rounded-full text-[12px] font-black px-1 border border-[#09090B] shadow-md bg-[#279da6] text-black z-[20]">
                                            {count > 99 ? '99+' : count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Impersonation Warning — hidden on very small screens */}
                <div className="hidden sm:block">
                    <ImpersonationWarning />
                </div>
            </div>

            {/* Right side: New + Theme + Notification */}
            <div className="flex items-center gap-2 lg:gap-3 ml-2 lg:ml-4 h-full shrink-0">
                {isCreating ? (
                    <div className="flex items-center gap-2 animate-zoom-in">
                        <button
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-[#279da6] text-white rounded-lg hover:bg-[#279da6]/90 transition-all font-bold text-xs shadow-lg shadow-[#279da6]/20 active:scale-95 disabled:opacity-30"
                        >
                            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            <span className="hidden sm:inline">{confirmLabel}</span>
                        </button>
                        <button
                            onClick={onCancel}
                            className="p-1.5 bg-white/5 text-storm-gray rounded-lg hover:text-white hover:bg-white/10 transition-all active:scale-95"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    onCreate && (
                        <button
                            onClick={onCreate}
                            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold text-santas-gray hover:text-white transition-colors group cursor-pointer"
                        >
                            <Plus size={16} className="group-hover:text-white" />
                            <span className="hidden sm:inline">new</span>
                        </button>
                    )
                )}

                <div className="h-4 w-[1px] bg-shark hidden sm:block" />

                {rightToolbar}

                {onEdit && (
                    <>
                        <div className="h-4 w-[1px] bg-shark hidden sm:block" />
                        <button
                            onClick={onEdit}
                            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold text-santas-gray hover:text-white transition-colors group cursor-pointer"
                        >
                            <Settings size={16} className="group-hover:text-white" />
                            <span className="hidden sm:inline">edit</span>
                        </button>
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;
