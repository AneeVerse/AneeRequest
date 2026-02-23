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
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <button
                    onClick={onToggleSidebar}
                    className="p-1 text-santas-gray hover:text-white transition-colors cursor-pointer"
                >
                    <PanelLeft size={18} />
                </button>

                {/* Section Label or Page Switcher */}
                {pageSwitcher ? (
                    <div className="flex items-center bg-black/40 border border-shark p-1 rounded-xl overflow-hidden shrink-0">
                        {pageSwitcher.map((page) => (
                            <Link
                                key={page.path}
                                href={page.path}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activePath === page.path
                                    ? 'bg-[#1E1E22] text-[#279da6] border border-[#279da6]/20 shadow-lg'
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
                    <div className="flex items-center bg-black/40 border border-shark p-1 rounded-xl overflow-x-auto no-scrollbar ml-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab?.(tab)}
                                className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === tab
                                    ? 'bg-[#1E1E22] text-[#279da6] border border-[#279da6]/20 shadow-lg'
                                    : 'text-santas-gray hover:text-iron hover:bg-white/5'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
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
