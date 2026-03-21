'use client';

import React from 'react';
import { MessageSquare, CheckSquare, FolderOpen } from 'lucide-react';
import Header from '@/components/Header';

interface RequestHeaderProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
    activeTab: 'request' | 'tasks' | 'files';
    setActiveTab: (tab: 'request' | 'tasks' | 'files') => void;
    linkedTasksCount: number;
    requestFilesCount: number;
    isSuperAdmin: boolean;
    isTeamAdmin: boolean;
    isAdmin: boolean;
    isCreatingTask: boolean;
    setIsCreatingTask: (creating: boolean) => void;
    handleCreateLinkedTask: () => void;
    onCancelCreateTask: () => void;
    request: {
        request_number?: number;
        title: string;
    };
    isOnline: boolean;
}

const RequestHeader: React.FC<RequestHeaderProps> = ({
    isMobileOpen,
    setIsMobileOpen,
    activeTab,
    setActiveTab,
    linkedTasksCount,
    requestFilesCount,
    isSuperAdmin,
    isTeamAdmin,
    isAdmin,
    isCreatingTask,
    setIsCreatingTask,
    handleCreateLinkedTask,
    onCancelCreateTask,
    request,
    isOnline
}) => {
    return (
        <div className="border-b border-shark">
            <Header
                onMobileMenuToggle={() => setIsMobileOpen(true)}
                labelIcon={<MessageSquare size={20} className="text-[#279da6]" />}
                tabs={[
                    { label: 'request', icon: <MessageSquare size={12} /> },
                    { label: 'tasks', icon: <CheckSquare size={12} /> },
                    ...(isSuperAdmin || isTeamAdmin ? [{ label: 'files', icon: <FolderOpen size={12} /> }] : [])
                ]}
                activeTab={activeTab}
                setActiveTab={(tab) => setActiveTab(tab as any)}
                tabCounts={{
                    tasks: linkedTasksCount,
                    files: requestFilesCount
                }}
                onCreate={(isAdmin && activeTab === 'tasks') ? () => setIsCreatingTask(true) : undefined}
                isCreating={activeTab === 'tasks' ? isCreatingTask : false}
                onConfirm={handleCreateLinkedTask}
                onCancel={onCancelCreateTask}
                label={
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500'}`} />
                        <span className="text-[12px] text-storm-gray font-black uppercase tracking-[0.2em] opacity-70">
                            {isOnline ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                }
            >
                <div className="hidden lg:flex items-center ml-4 flex-1 min-w-0">
                    <h2 className="text-[22px] font-bold text-white uppercase tracking-tight truncate">
                        #{request.request_number} {request.title}
                    </h2>
                </div>
            </Header>
        </div>
    );
};

export default RequestHeader;
