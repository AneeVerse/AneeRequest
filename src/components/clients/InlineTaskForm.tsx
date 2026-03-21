'use client';

import React from 'react';
import { LayoutGrid, Pencil, CheckCircle2, Calendar, Users, FileText } from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';

interface InlineTaskFormProps {
    isOpen: boolean;
    isActiveTab: boolean;
    formData: any;
    setFormData: (data: any) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    teamMembers: any[];
    requests?: any[];
}

export default function InlineTaskForm({
    isOpen,
    isActiveTab,
    formData,
    setFormData,
    inputRef,
    teamMembers,
    requests = []
}: InlineTaskFormProps) {
    return (
        <div
            className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen && isActiveTab
                ? 'max-h-[600px] opacity-100 mb-8 translate-y-0 scale-100 blur-0'
                : 'max-h-0 opacity-0 mb-0 -translate-y-4 scale-95 blur-md pointer-events-none'
                }`}
        >
            <div className="p-1 bg-[#101011]/90 backdrop-blur-2xl border border-[#279da6]/30 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(39,157,166,0.08)] ring-1 ring-white/5 relative overflow-hidden">
                <div className="p-6 space-y-6">
                    <div className="flex items-start gap-6">
                        <div className="flex flex-col items-center gap-3 shrink-0">
                            <div className="w-14 h-14 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] shadow-inner ring-1 ring-[#279da6]/20">
                                <LayoutGrid size={28} />
                            </div>
                            <p className="text-[10px] font-black text-storm-gray uppercase tracking-widest">Task</p>
                        </div>

                        <div className="flex-1 space-y-6">
                            {/* Top Row: Title & Assignee & Priority */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Task Title</label>
                                    <div className="relative group">
                                        <Pencil size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="What needs to be done?"
                                            className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Assign To</label>
                                    <CustomDropdown
                                        value={formData.assigned_to}
                                        onChange={(val: any) => setFormData({ ...formData, assigned_to: val })}
                                        placeholder="Unassigned"
                                        options={[
                                            { label: 'Unassigned', value: '' },
                                            ...teamMembers.map(tm => ({
                                                label: tm.name || tm.full_name || 'Member',
                                                value: tm.profile_id || '',
                                                icon: <Users size={14} className="text-[#279da6]" />
                                            }))
                                        ]}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Priority</label>
                                    <CustomDropdown
                                        value={formData.priority}
                                        onChange={(val: any) => setFormData({ ...formData, priority: val })}
                                        options={[
                                            { label: 'Low', value: 'Low', icon: <CheckCircle2 size={14} className="text-storm-gray" /> },
                                            { label: 'Medium', value: 'Medium', icon: <CheckCircle2 size={14} className="text-malibu" /> },
                                            { label: 'High', value: 'High', icon: <CheckCircle2 size={14} className="text-[#279da6]" /> },
                                            { label: 'Critical', value: 'Critical', icon: <CheckCircle2 size={14} className="text-rose-500" /> }
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* Bottom Row: Description, Due Date & Link Request */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Add task details..."
                                        className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 px-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold min-h-[80px] resize-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Due Date</label>
                                    <div className="relative group">
                                        <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                        <input
                                            type="date"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                            className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                                {requests.length > 0 && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Link Request</label>
                                        <CustomDropdown
                                            value={formData.request_ids?.[0] || ''}
                                            onChange={(val: any) => setFormData({ ...formData, request_ids: val ? [val] : [] })}
                                            placeholder="Select Request"
                                            options={[
                                                { label: 'No Request', value: '' },
                                                ...requests.map((r: any) => ({
                                                    label: r.title,
                                                    value: r.id,
                                                    icon: <FileText size={14} className="text-[#279da6]" />
                                                }))
                                            ]}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
