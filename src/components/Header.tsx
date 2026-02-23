'use client';

import React, { useState, useEffect } from 'react';
import {
    Bell,
    PanelLeft,
    Moon,
    Sun,
    Plus,
    ListFilter,
    Shield
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ImpersonationWarning from '@/components/ImpersonationWarning';
import Link from 'next/link';

interface HeaderProps {
    onToggleSidebar: () => void;
    label: string;
    labelIcon?: React.ReactNode;
    tabs?: string[];
    activeTab?: string;
    setActiveTab?: (tab: string) => void;
    onCreate?: () => void;
    tabCounts?: Record<string, number>;
    pageSwitcher?: { name: string; path: string }[];
    activePath?: string;
}

const Header: React.FC<HeaderProps> = ({
    onToggleSidebar,
    label,
    labelIcon,
    tabs,
    activeTab,
    setActiveTab,
    onCreate,
    tabCounts,
    pageSwitcher,
    activePath
}) => {
    const { isImpersonating, viewAsProfile, stopImpersonating } = useAuth();
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    // Theme toggle effect
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'light') {
            root.classList.add('light');
        } else {
            root.classList.remove('light');
        }
    }, [theme]);

    return (
        <header className="h-16 flex items-center justify-between px-6 z-30 shrink-0">
            {/* Left side: Sidebar Toggle + Category Label + Tabs */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <button
                    onClick={onToggleSidebar}
                    className="p-1 text-santas-gray hover:text-white transition-colors cursor-pointer"
                >
                    <PanelLeft size={18} />
                </button>

                {/* Section Label or Page Switcher */}
                {pageSwitcher ? (
                    <div className="flex items-center bg-black/60 border border-shark/50 p-1 rounded-xl overflow-hidden shrink-0">
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
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activePath === page.path
                                    ? 'bg-shark/80 text-[#279da6] shadow-lg'
                                    : 'text-santas-gray hover:text-iron hover:bg-white/5'
                                    }`}
                            >
                                {page.name}
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-shark/40 border border-shark rounded-lg shrink-0">
                        {labelIcon || <ListFilter size={16} className="text-santas-gray" />}
                        <span className="text-xs font-bold text-iron">{label}</span>
                    </div>
                )}

                {/* Dynamic Sub-Navigation */}
                {tabs && tabs.length > 0 && (
                    <div className="flex items-center bg-black/60 border border-shark/50 p-1 pt-2 rounded-xl overflow-visible ml-2 shrink-0">
                        {tabs.map((tab) => {
                            const count = tabCounts?.[tab];
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab?.(tab)}
                                    className={`relative px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer tracking-tight ${activeTab === tab
                                        ? 'bg-shark/80 text-[#279da6] shadow-lg'
                                        : 'text-storm-gray hover:text-iron hover:bg-white/5'
                                        }`}
                                >
                                    {tab}
                                    {count !== undefined && count > 0 && (
                                        <span className="absolute -top-1.5 right-1 min-w-[17px] h-[17px] flex items-center justify-center rounded-full text-[9px] font-black px-1 border border-[#09090B] shadow-md bg-[#279da6] text-white z-[20]">
                                            {count > 99 ? '99+' : count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Impersonation Warning */}
                <ImpersonationWarning />
            </div>

            {/* Right side: New + Theme + Notification */}
            <div className="flex items-center gap-3 ml-4">
                <button
                    onClick={onCreate}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-santas-gray hover:text-white transition-colors group cursor-pointer"
                >
                    <Plus size={16} className="group-hover:text-white" />
                    <span>new</span>
                </button>
                <div className="h-4 w-[1px] bg-shark" />
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 text-santas-gray hover:text-white rounded-lg hover:bg-shark/40 transition-all cursor-pointer"
                >
                    {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button className="p-2 text-santas-gray hover:text-white rounded-lg hover:bg-shark/40 transition-all relative cursor-pointer">
                    <Bell size={18} />
                    <div className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-black" />
                </button>
            </div>
        </header>
    );
};

export default Header;
