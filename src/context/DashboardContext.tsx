'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface DashboardContextType {
    isMobileOpen: boolean;
    openMobileMenu: () => void;
    closeMobileMenu: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const openMobileMenu = useCallback(() => setIsMobileOpen(true), []);
    const closeMobileMenu = useCallback(() => setIsMobileOpen(false), []);

    return (
        <DashboardContext.Provider value={{ isMobileOpen, openMobileMenu, closeMobileMenu }}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (!context) throw new Error('useDashboard must be used within DashboardProvider');
    return context;
}
