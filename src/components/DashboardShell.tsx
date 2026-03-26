'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';

function DashboardShellInner({ children }: { children: React.ReactNode }) {
    const { isImpersonating } = useAuth();
    const { isMobileOpen, closeMobileMenu } = useDashboard();

    return (
        <div
            className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`}
            style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}
        >
            <Sidebar isMobileOpen={isMobileOpen} onMobileClose={closeMobileMenu} />

            <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                <div className={`flex-1 flex flex-col min-w-0 bg-[#101011] rounded-t-2xl overflow-hidden border-t border-l border-r mt-2 sm:mt-6 responsive-content-wrapper transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    return (
        <DashboardProvider>
            <DashboardShellInner>{children}</DashboardShellInner>
        </DashboardProvider>
    );
}
