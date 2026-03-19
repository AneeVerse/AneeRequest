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
    label: React.ReactNode;
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
        <header className="flex flex-col h-auto px-3 sm:px-4 lg:px-6 z-30 shrink-0 gap-1 lg:gap-0 border-b border-shark/30 lg:border-none group backdrop-blur-xl bg-black/40 sticky top-0">
            {/* --- ROW 1: MOBILE TITLE BAR / DESKTOP HEADER --- */}
            <div className="h-13 lg:h-16 flex items-center justify-between gap-2 lg:gap-4 w-full min-w-0">
                <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
                    {/* Mobile hamburger menu button */}
                    <button
                        onClick={onMobileMenuToggle || onToggleSidebar}
                        className="p-1.5 text-santas-gray hover:text-white transition-all cursor-pointer lg:hidden shrink-0 active:scale-95 bg-shark/20 rounded-lg border border-white/5"
                        title="Open menu"
                    >
                        <Menu size={16} />
                    </button>

                    {/* Desktop back button */}
                    <button
                        onClick={() => router.back()}
                        className="p-1 text-santas-gray hover:text-white transition-colors cursor-pointer hidden lg:block"
                        title="Go back"
                    >
                        <ChevronLeft size={16} />
                    </button>


                    {/* DESKTOP Label Icon (Always first if exists) */}
                    {labelIcon && (
                        <div className="hidden lg:flex items-center ml-2 shrink-0">
                            {labelIcon}
                        </div>
                    )}

                    {/* Section Label (Text only) - Positioned between icon and tabs */}
                    {label && (
                        <div className="flex items-center gap-2 shrink-0 overflow-hidden ml-1 sm:ml-0 lg:ml-2">
                            {!labelIcon && <ListFilter size={16} className="text-[#279da6] hidden sm:block" />}
                            <span className={`text-[12px] sm:text-[12px] font-black text-white truncate uppercase tracking-tight ${isCreating ? 'max-w-[80px]' : 'max-w-[120px]'} sm:max-w-[200px]`}>{label}</span>
                        </div>
                    )}

                    {/* DESKTOP Page Switcher (Hidden on Mobile Row 1) */}
                    {pageSwitcher && (
                        <div className="hidden lg:flex items-center bg-black/60 border border-shark/50 p-1 rounded-xl overflow-hidden shrink-0 ml-2">
                            {pageSwitcher.filter(page => {
                                if (viewAsProfile?.role === 'super_admin' || viewAsProfile?.role === 'admin') return true;
                                const sections = viewAsProfile?.accessible_sections || [];
                                if (page.path === '/clients' && !sections.includes('clients')) return false;
                                if (page.path === '/team' && !sections.includes('team')) return false;
                                return true;
                            }).map((page) => (
                                <Link
                                    key={page.path}
                                    href={page.path}
                                    className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer ${activePath === page.path
                                        ? 'bg-shark/80 text-[#279da6] shadow-lg'
                                        : 'text-santas-gray hover:text-iron hover:bg-white/5'
                                        }`}
                                >
                                    {page.name}
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* DESKTOP Sub-Navigation (Hidden on Mobile Row 1) */}
                    {tabs && tabs.length > 0 && (
                        <div className="hidden lg:flex items-center bg-black/60 border border-shark/50 p-1 rounded-xl overflow-visible ml-2 min-w-0">
                            {tabs.map((tabItem) => {
                                const tabLabel = typeof tabItem === 'string' ? tabItem : tabItem.label;
                                const icon = typeof tabItem === 'string' ? null : tabItem.icon;
                                const count = tabCounts?.[tabLabel];
                                return (
                                    <button
                                        key={tabLabel}
                                        onClick={() => setActiveTab?.(tabLabel)}
                                        className={`relative px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer tracking-tight flex items-center gap-1.5 shrink-0 uppercase ${activeTab === tabLabel
                                            ? 'bg-shark/80 text-[#279da6] shadow-lg'
                                            : 'text-storm-gray hover:text-iron hover:bg-white/5'
                                            }`}
                                    >
                                        {icon && React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 16 }) : icon}
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


                    <div className="hidden lg:block">
                        {children}
                    </div>

                    <div className="hidden sm:block">
                        <ImpersonationWarning />
                    </div>
                </div>

                {/* Right side Actions (Mobile & Desktop) */}
                <div className="flex items-center gap-1.5 lg:gap-3 ml-2 shrink-0">
                    {isCreating ? (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={onConfirm}
                                disabled={isSubmitting}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#279da6] text-white rounded-lg hover:bg-[#279da6]/90 transition-all font-bold text-[12px] shadow-lg shadow-[#279da6]/20 active:scale-95 disabled:opacity-30 uppercase"
                            >
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                <span className="hidden sm:inline">{confirmLabel}</span>
                            </button>
                            <button
                                onClick={onCancel}
                                className="p-1.5 bg-white/5 text-storm-gray rounded-lg hover:text-white hover:bg-white/10 transition-all active:scale-95"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        onCreate && (
                            <button
                                onClick={onCreate}
                                className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 sm:py-1.5 text-[12px] font-bold text-santas-gray hover:text-[#279da6] bg-shark/20 border border-shark/50 rounded-lg transition-all active:scale-95 group/new"
                            >
                                <Plus size={16} className="group-hover/new:rotate-90 transition-transform" />
                                <span className="hidden sm:inline ml-1.5 uppercase">new</span>
                            </button>
                        )
                    )}

                    {!isCreating && onEdit && (
                        <button
                            onClick={onEdit}
                            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 sm:py-1.5 text-[12px] font-bold text-santas-gray hover:text-white transition-colors group cursor-pointer bg-shark/20 border border-shark/50 rounded-lg lg:bg-transparent lg:border-none"
                        >
                            <Settings size={16} className="group-hover:text-white" />
                            <span className="hidden sm:inline ml-1.5 uppercase">edit</span>
                        </button>
                    )}

                    <div className="h-4 w-[1px] bg-shark/60 hidden lg:block" />

                    <div className={`flex items-center ${isCreating ? 'hidden lg:flex' : ''}`}>
                        {rightToolbar}
                    </div>
                </div>
            </div>

            {/* --- ROW 1.5: MOBILE CHILDREN (Breadcrumbs, etc) --- */}
            {children && (
                <div className="lg:hidden flex items-center justify-between gap-2 px-3 sm:px-4 pb-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    {children}
                </div>
            )}

            {/* --- ROW 2: MOBILE PAGE SWITCHER (Clients / Team) --- */}
            {pageSwitcher && (
                <div className="lg:hidden flex items-center px-0.5 pb-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex items-center bg-black/40 border border-shark/50 p-0.5 rounded-xl overflow-hidden w-full">
                        {pageSwitcher.filter(page => {
                            if (viewAsProfile?.role === 'super_admin' || viewAsProfile?.role === 'admin') return true;
                            const sections = viewAsProfile?.accessible_sections || [];
                            if (page.path === '/clients' && !sections.includes('clients')) return false;
                            if (page.path === '/team' && !sections.includes('team')) return false;
                            return true;
                        }).map((page) => (
                            <Link
                                key={`mob-sw-${page.path}`}
                                href={page.path}
                                className={`flex-1 text-center py-1.5 rounded-lg text-[12px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${activePath === page.path
                                    ? 'bg-[#279da6] text-black shadow-lg'
                                    : 'text-storm-gray hover:text-iron'
                                    }`}
                            >
                                {page.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* --- ROW 3: MOBILE TABS (Requests, Tasks, etc) --- */}
            {tabs && tabs.length > 0 && (
                <div className="lg:hidden flex items-center min-h-[40px] px-0.5 pb-2 overflow-x-auto scrollbar-hide gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                    {tabs.map((tabItem) => {
                        const tabLabel = typeof tabItem === 'string' ? tabItem : tabItem.label;
                        const icon = typeof tabItem === 'string' ? null : tabItem.icon;
                        const count = tabCounts?.[tabLabel];
                        return (
                            <button
                                key={`mob-tab-${tabLabel}`}
                                onClick={() => setActiveTab?.(tabLabel)}
                                className={`relative px-2.5 py-1.5 rounded-lg text-[12px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${activeTab === tabLabel
                                    ? 'bg-[#279da6] text-black shadow-[0_0_15px_rgba(39,157,166,0.2)]'
                                    : 'bg-shark/20 text-storm-gray border border-white/5 active:bg-shark/40'
                                    }`}
                            >
                                {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
                                {tabLabel}
                                {count !== undefined && count > 0 && (
                                    <span className={`min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[8px] font-black px-1 ${activeTab === tabLabel ? 'bg-black text-[#279da6]' : 'bg-[#279da6] text-black'}`}>
                                        {count > 99 ? '99+' : count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </header>
    );
};

export default Header;
