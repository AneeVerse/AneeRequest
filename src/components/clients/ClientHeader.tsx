'use client';

import React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Header from '@/components/Header';

interface ClientHeaderProps {
    client: any;
    tabs: string[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onMobileMenuToggle: () => void;
    setIsNewMenuOpen: (open: boolean) => void;
    isNewMenuOpen: boolean;
    handleCreateNew: () => void;
    isCreating: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isSubmitting: boolean;
    driveActions: React.ReactNode;
    requestsCount: number;
    tasksCount: number;
    driveBreadcrumbs: { id: string; name: string }[];
    navigateToDriveBreadcrumb: (index: number) => void;
}

export default function ClientHeader({
    client,
    tabs,
    activeTab,
    setActiveTab,
    onMobileMenuToggle,
    setIsNewMenuOpen,
    isNewMenuOpen,
    handleCreateNew,
    isCreating,
    onConfirm,
    onCancel,
    isSubmitting,
    driveActions,
    requestsCount,
    tasksCount,
    driveBreadcrumbs,
    navigateToDriveBreadcrumb
}: ClientHeaderProps) {
    return (
        <div className="border-b border-shark">
            <Header
                onMobileMenuToggle={onMobileMenuToggle}
                label={client?.organization || client?.name || 'Loading...'}
                labelIcon={
                    <div className="w-7 h-7 rounded-full bg-shark/80 border border-white/5 overflow-hidden flex items-center justify-center text-[10px] text-white font-black bg-gradient-to-br from-[#279da6]/20 to-transparent shrink-0">
                        {client?.avatar_url ? (
                            <Image
                                src={client.avatar_url}
                                alt={client.organization || client.name}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#279da6]/10 text-[#279da6] text-xl font-black uppercase">
                                {client?.organization?.[0] || client?.name?.[0]}
                            </div>
                        )}
                    </div>
                }
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onCreate={
                    activeTab === 'Drive'
                        ? () => setIsNewMenuOpen(!isNewMenuOpen)
                        : (activeTab === 'Requests' || activeTab === 'Tasks' || activeTab === 'Invoices')
                            ? handleCreateNew
                            : undefined
                }
                isCreating={isCreating}
                onConfirm={onConfirm}
                onCancel={onCancel}
                isSubmitting={isSubmitting}
                rightToolbar={activeTab === 'Drive' ? driveActions : undefined}
                tabCounts={{
                    Requests: requestsCount,
                    Tasks: tasksCount
                }}
            >
                {activeTab === 'Drive' && (
                    <div className="flex items-center gap-2 text-sm overflow-hidden min-w-0">
                        {driveBreadcrumbs.length > 1 && (
                            <button
                                onClick={() => navigateToDriveBreadcrumb(driveBreadcrumbs.length - 2)}
                                className="p-0.5 text-santas-gray hover:text-white transition-colors group active:scale-95 shrink-0"
                                title="Go to parent folder"
                            >
                                <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                        )}
                        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                            {driveBreadcrumbs.slice(1).map((crumb, i) => (
                                <React.Fragment key={crumb.id}>
                                    <ChevronRight size={20} className="text-storm-gray shrink-0" />
                                    <button
                                        onClick={() => navigateToDriveBreadcrumb(i + 1)}
                                        className={`font-black uppercase tracking-widest text-[12px] transition-all truncate ${i === driveBreadcrumbs.length - 2 ? 'text-[#279da6]' : 'text-storm-gray hover:text-iron'} ${i < driveBreadcrumbs.length - 3 ? 'hidden md:block' : ''}`}
                                    >
                                        {i < driveBreadcrumbs.length - 3 && (i + 1) !== 0 ? '...' : crumb.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}
            </Header>
        </div>
    );
}
