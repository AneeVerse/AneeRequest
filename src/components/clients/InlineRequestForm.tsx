'use client';

import React from 'react';
import { FileText, Pencil, CheckCircle2, Calendar, FolderPlus } from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';

interface InlineRequestFormProps {
    isOpen: boolean;
    isActiveTab: boolean;
    formData: any;
    setFormData: (data: any) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

export default function InlineRequestForm({
    isOpen,
    isActiveTab,
    formData,
    setFormData,
    inputRef
}: InlineRequestFormProps) {
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
                                <FileText size={28} />
                            </div>
                            <p className="text-[10px] font-black text-storm-gray uppercase tracking-widest">Request</p>
                        </div>

                        <div className="flex-1 space-y-6">
                            {/* Top Row: Title & Priority */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Request Title</label>
                                    <div className="relative group">
                                        <Pencil size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="What do you need?"
                                            className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                        />
                                    </div>
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

                            {/* Middle Row: Description & Due Date */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Add more details about this request..."
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

                                    {/* Create Folder Toggle */}
                                    <div className="pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, create_folder: !formData.create_folder })}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${formData.create_folder
                                                ? 'bg-[#279da6]/10 border-[#279da6]/40 text-[#279da6]'
                                                : 'bg-black/40 border-shark/50 text-storm-gray hover:border-shark/80'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <FolderPlus size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Create Drive Folder</span>
                                            </div>
                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${formData.create_folder ? 'bg-[#279da6]' : 'bg-shark'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${formData.create_folder ? 'left-4.5' : 'left-0.5'}`} />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
