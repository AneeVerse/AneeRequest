'use client';

import React from 'react';
import Image from 'next/image';
import {
    Circle,
    Loader2,
    Eye,
    Check,
    Flag,
    UserCog,
    Trash2
} from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';
import CustomDatePicker from '@/components/CustomDatePicker';

interface RequestSidebarProps {
    activeTab: string;
    request: any;
    formatDate: (date: string) => string;
    handleUpdateField: (field: string, value: any) => void;
    handleUpdateDueDate: (date: string | null) => void;
    teamMembers: any[];
    involvedMembers: any[];
    isSuperAdmin: boolean;
    setIsDeleteModalOpen: (open: boolean) => void;
}

const RequestSidebar: React.FC<RequestSidebarProps> = ({
    activeTab,
    request,
    formatDate,
    handleUpdateField,
    handleUpdateDueDate,
    teamMembers,
    involvedMembers,
    isSuperAdmin,
    setIsDeleteModalOpen
}) => {
    if (activeTab === 'tasks') return null;

    return (
        <div className="hidden lg:flex w-[340px] border-l border-shark bg-[#101011] flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-8 mt-2">
                {/* Base Info */}
                <div>
                    <h4 className="text-[18px] font-bold text-white mb-1 uppercase tracking-tight leading-tight">{request.title}</h4>
                    <div className="text-[12px] text-[#ff2056] font-bold uppercase tracking-wider">
                        <span>Created: {formatDate(request.created_at)}</span>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-shark">
                    <div className="flex items-center justify-between gap-4">
                        <span className="w-20 text-[12px] font-bold text-storm-gray shrink-0 uppercase tracking-wider">Client:</span>
                        <div className="flex-1 flex items-center gap-2.5 bg-transparent border-none px-3.5 py-2.5 cursor-pointer transition-all">
                            <div className="w-[46px] h-[46px] rounded-full bg-shark flex items-center justify-center text-sm text-[#279da6] font-black shrink-0 border border-white/5 shadow-inner overflow-hidden relative">
                                {request.client?.avatar_url ? (
                                    <Image src={request.client.avatar_url} alt={request.client.full_name || 'Client'} fill unoptimized className="object-cover" />
                                ) : (
                                    request.client?.full_name?.split(' ').map((n: string) => n[0]).join('')
                                )}
                            </div>
                            <div className="min-w-0 pr-1 flex flex-col">
                                {request.client?.organization && (
                                    <p className="text-[12px] font-black text-[#279da6] uppercase tracking-wider truncate mb-0.5">{request.client.organization}</p>
                                )}
                                <p className="text-[12px] font-bold text-iron leading-tight truncate uppercase tracking-wider">{request.client?.full_name}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-storm-gray w-20 uppercase tracking-wider">Status</span>
                        <CustomDropdown
                            value={request.status}
                            onChange={(val: any) => handleUpdateField('status', val)}
                            options={[
                                { label: 'Todo', value: 'Todo', icon: <Circle size={14} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                { label: 'In Progress', value: 'In Progress', icon: <Loader2 size={14} className="text-amber-500" />, color: 'text-amber-500' },
                                { label: 'Review', value: 'Review', icon: <Eye size={14} className="text-blue-400" />, color: 'text-blue-400' },
                                { label: 'Done', value: 'Done', icon: <Check size={14} className="text-emerald-500" />, color: 'text-emerald-500' },
                            ]}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-storm-gray w-20 uppercase tracking-wider">Priority</span>
                        <CustomDropdown
                            value={request.priority}
                            onChange={(val: any) => handleUpdateField('priority', val)}
                            options={[
                                { label: 'Low', value: 'Low', icon: <Flag size={14} className="text-storm-gray" />, color: 'text-storm-gray' },
                                { label: 'Medium', value: 'Medium', icon: <Flag size={14} className="text-blue-400" />, color: 'text-blue-400' },
                                { label: 'High', value: 'High', icon: <Flag size={14} className="text-amber-500" />, color: 'text-amber-500' },
                                { label: 'Critical', value: 'Critical', icon: <Flag size={14} className="text-rose-500" />, color: 'text-rose-500' },
                            ]}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-storm-gray w-20 uppercase tracking-wider">Assigned To</span>
                        <CustomDropdown
                            value={request.assigned_to || ''}
                            onChange={(val: any) => handleUpdateField('assigned_to', val)}
                            options={[
                                { label: 'Unassigned', value: '' },
                                ...teamMembers.filter((tm: any) => tm.profile_id).map((tm: any) => ({
                                    label: tm.name || tm.profile?.full_name || tm.profile?.email || 'Unknown',
                                    value: tm.profile_id,
                                    icon: tm.avatar_url ? (
                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 relative">
                                            <Image src={tm.avatar_url} alt={tm.name} fill unoptimized className="object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-shark flex items-center justify-center text-[8px] text-[#279da6] font-black shrink-0 border border-white/5 shadow-inner">
                                            {tm.name?.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                    )
                                }))
                            ]}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4 h-11">
                        <span className="w-20 text-[12px] font-bold text-storm-gray shrink-0 uppercase tracking-wider">Due Date:</span>
                        <div className="flex-1 flex justify-start">
                            <CustomDatePicker
                                value={request.due_date}
                                onChange={(dateString) => handleUpdateDueDate(dateString || null)}
                                placeholder="NOT SET"
                                variant="minimal"
                            />
                        </div>
                    </div>
                </div>

                {/* Team Members - Derived from Tasks */}
                <div className="pt-6 border-t border-shark">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-storm-gray">Team Members</h4>
                    </div>
                    {involvedMembers.length === 0 ? (
                        <p className="text-[11px] text-storm-gray/50 italic">No team members assigned to tasks.</p>
                    ) : (
                        <div className="space-y-2">
                            {involvedMembers.map(tm => (
                                <div key={tm.id} className="flex items-center gap-3 p-2 rounded-lg bg-shark/20 border border-shark/40 transition-all">
                                    <div className="w-[46px] h-[46px] rounded-full bg-shark flex items-center justify-center text-sm font-black text-[#279da6] shrink-0 overflow-hidden border border-white/5 shadow-inner relative">
                                        {tm.avatar_url ? (
                                            <Image src={tm.avatar_url} alt={tm.name || 'Team Member'} fill unoptimized className="object-cover" />
                                        ) : (
                                            tm.name?.split(' ').map((n: string) => n[0]).join('')
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-bold text-iron truncate uppercase tracking-wider">{tm.name}</p>
                                        <p className="text-[12px] font-black uppercase tracking-widest text-[#279da6]">Assignee</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isSuperAdmin && (
                    <div className="pt-6 border-t border-shark mt-auto">
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/10 transition-all font-black text-[12px] uppercase tracking-widest group"
                        >
                            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                            Delete Request
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestSidebar;
