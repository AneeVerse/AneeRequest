'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    LayoutList,
    Plus,
    Pencil,
    Check,
    X,
    Loader2,
    Calendar,
    FileText,
    Building
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ChatDrawer from '@/components/ChatDrawer';
import RequestsTable from '@/components/RequestsTable';
import CustomDropdown from '@/components/CustomDropdown';
import type { RequestItem, Profile, TeamMember } from '@/lib/data/requests';

interface RequestsClientProps {
    initialRequests: RequestItem[];
    initialProfiles: Profile[];
    initialTeamMembers: TeamMember[];
}

export default function RequestsClient({
    initialRequests,
    initialProfiles,
    initialTeamMembers
}: RequestsClientProps) {
    const router = useRouter();
    const { isImpersonating, profile, viewAsProfile } = useAuth();
    const displayProfile = viewAsProfile || profile;

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [requestFormData, setRequestFormData] = useState({
        title: '',
        priority: 'Medium',
        description: '',
        due_date: '',
        client_id: '',
        create_folder: false
    });

    const inlineRequestInputRef = React.useRef<HTMLInputElement>(null);

    const subTabs = ['All', 'Assigned', 'Open', 'Unassigned', 'Completed'];

    const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
    const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);

    // Update state when initial props change (from SSR refresh)
    React.useEffect(() => {
        setRequests(initialRequests);
        setProfiles(initialProfiles);
        setTeamMembers(initialTeamMembers);
    }, [initialRequests, initialProfiles, initialTeamMembers]);

    useEffect(() => {
        if (isCreating && inlineRequestInputRef.current) {
            inlineRequestInputRef.current.focus();
        }
    }, [isCreating]);

    const handleInlineCreate = async () => {
        if (!requestFormData.title.trim()) return;
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...requestFormData,
                    status: 'Todo'
                })
            });

            if (res.ok) {
                setIsCreating(false);
                setRequestFormData({ title: '', priority: 'Medium', description: '', due_date: '', client_id: '', create_folder: false });
                router.refresh();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create request');
            }
        } catch (e) {
            console.error(e);
            alert('Error creating request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateField = async (requestId: string, field: string, value: any) => {
        const originalRequests = [...requests];

        // Optimistic UI update
        const updatedRequests = requests.map((req: RequestItem) => {
            if (req.id === requestId) {
                const updatedReq = { ...req, [field]: value };
                if (field === 'assigned_to') {
                    const profile = profiles.find((p: Profile) => p.id === value);
                    updatedReq.assignee = profile ? { id: profile.id, full_name: profile.full_name } : null;
                }
                return updatedReq;
            }
            return req;
        });

        // Update local state immediately
        setRequests(updatedRequests);

        try {
            const response = await fetch(`/api/requests?id=${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });

            if (!response.ok) {
                // Rollback on error
                setRequests(originalRequests);
                alert(`Failed to update ${field}`);
            } else {
                // Revalidate to get fresh data from server
                router.refresh();
            }
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            setRequests(originalRequests);
        }
    };

    // Data visibility logic
    const isTeamMember = displayProfile?.role === 'team_member';
    const isTeamAdmin = displayProfile?.team_role === 'admin';
    const isClient = displayProfile?.role === 'client';

    const visibleRequests = (() => {
        if (isClient) {
            return requests.filter((req: RequestItem) => req.client?.id === displayProfile?.id);
        }
        if (isTeamMember && !isTeamAdmin) {
            return requests.filter((req: RequestItem) => req.assigned_to === displayProfile?.id);
        }
        return requests;
    })();

    const tabFilteredRequests = visibleRequests.filter((req: RequestItem) => {
        // Tab filters
        let matchesTab = true;
        if (activeTab === 'Assigned') matchesTab = !!req.assigned_to;
        else if (activeTab === 'Unassigned') matchesTab = !req.assigned_to;
        else if (activeTab === 'Open') matchesTab = req.status !== 'Done';
        else if (activeTab === 'Completed') matchesTab = req.status === 'Done';

        return matchesTab;
    });

    // Compute counts per tab for notification badges
    const tabCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        subTabs.forEach(tab => {
            counts[tab] = visibleRequests.filter(req => {
                if (tab === 'All') return true;
                if (tab === 'Assigned') return !!req.assigned_to;
                if (tab === 'Unassigned') return !req.assigned_to;
                if (tab === 'Open') return req.status !== 'Done';
                if (tab === 'Completed') return req.status === 'Done';
                return true;
            }).length;
        });
        return counts;
    }, [visibleRequests, subTabs]);

    return (
        <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
            <Sidebar isCollapsed={isSidebarCollapsed} />

            <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                <div className={`flex-1 flex flex-col min-w-0 bg-[#121214] rounded-t-2xl overflow-hidden border-t border-l border-r mt-6 mr-6 transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
                    <div className="border-b border-shark">
                        <Header
                            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            label="Requests"
                            labelIcon={<LayoutList size={16} className="text-[#279da6]" />}
                            tabs={subTabs}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            tabCounts={tabCounts}
                            onCreate={(displayProfile?.role === 'super_admin' || displayProfile?.team_role === 'admin') ? () => setIsCreating(true) : undefined}
                            isCreating={isCreating}
                            onConfirm={handleInlineCreate}
                            onCancel={() => {
                                setIsCreating(false);
                                setRequestFormData({ title: '', priority: 'Medium', description: '', due_date: '', client_id: '', create_folder: false });
                            }}
                            isSubmitting={isSubmitting}
                        />
                    </div>

                    <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#18181B]">
                        <div className="p-8">

                            {/* Inline Creation Row */}
                            <div
                                className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCreating
                                    ? 'max-h-[500px] opacity-100 mb-8 translate-y-0 scale-100 blur-0'
                                    : 'max-h-0 opacity-0 mb-0 -translate-y-4 scale-95 blur-md pointer-events-none'
                                    }`}
                            >
                                <div className="p-1 bg-[#121214]/90 backdrop-blur-2xl border border-[#279da6]/30 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(39,157,166,0.08)] ring-1 ring-white/5 relative overflow-hidden">
                                    <div className="p-6 space-y-6">
                                        <div className="flex items-start gap-6">
                                            <div className="flex flex-col items-center gap-3 shrink-0">
                                                <div className="w-14 h-14 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] shadow-inner ring-1 ring-[#279da6]/20">
                                                    <FileText size={28} />
                                                </div>
                                                <p className="text-[10px] font-black text-storm-gray uppercase tracking-widest">Request</p>
                                            </div>

                                            <div className="flex-1 space-y-6">
                                                {/* Top Row: Title & Priority & Client */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                                    <div className="space-y-1.5 md:col-span-2">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Request Title</label>
                                                        <div className="relative group">
                                                            <Pencil size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                ref={inlineRequestInputRef}
                                                                type="text"
                                                                value={requestFormData.title}
                                                                onChange={(e) => setRequestFormData({ ...requestFormData, title: e.target.value })}
                                                                placeholder="What do you need?"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Priority</label>
                                                        <CustomDropdown
                                                            value={requestFormData.priority}
                                                            onChange={(val: any) => setRequestFormData({ ...requestFormData, priority: val })}
                                                            options={[
                                                                { label: 'Low', value: 'Low', icon: <div className="w-2 h-2 rounded-full bg-storm-gray" /> },
                                                                { label: 'Medium', value: 'Medium', icon: <div className="w-2 h-2 rounded-full bg-malibu" /> },
                                                                { label: 'High', value: 'High', icon: <div className="w-2 h-2 rounded-full bg-amber-500" /> },
                                                                { label: 'Critical', value: 'Critical', icon: <div className="w-2 h-2 rounded-full bg-rose-500" /> }
                                                            ]}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Client</label>
                                                        <CustomDropdown
                                                            value={requestFormData.client_id}
                                                            onChange={(val: any) => setRequestFormData({ ...requestFormData, client_id: val })}
                                                            options={[
                                                                { label: 'Select Client', value: '' },
                                                                ...profiles.filter(p => p.role === 'client').map(p => ({
                                                                    label: p.full_name || p.email,
                                                                    value: p.id,
                                                                    icon: <Building size={14} className="text-[#279da6]" />
                                                                }))
                                                            ]}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Bottom Row: Description & Due Date & Folder */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                                    <div className="space-y-1.5 md:col-span-2">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Description</label>
                                                        <div className="relative group/input">
                                                            <FileText size={14} className="absolute left-3.5 top-3 text-storm-gray group-focus-within/input:text-[#279da6] transition-colors" />
                                                            <textarea
                                                                value={requestFormData.description}
                                                                onChange={(e) => setRequestFormData({ ...requestFormData, description: e.target.value })}
                                                                placeholder="Add details about your request..."
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold min-h-[42px] max-h-[120px] custom-scrollbar"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Due Date</label>
                                                        <div className="relative group/input">
                                                            <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within/input:text-[#279da6] transition-colors z-10" />
                                                            <input
                                                                type="date"
                                                                value={requestFormData.due_date}
                                                                onChange={(e) => setRequestFormData({ ...requestFormData, due_date: e.target.value })}
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold [color-scheme:dark]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Google Drive</label>
                                                        <button
                                                            onClick={() => setRequestFormData({ ...requestFormData, create_folder: !requestFormData.create_folder })}
                                                            className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border transition-all ${requestFormData.create_folder
                                                                ? 'bg-[#279da6]/10 border-[#279da6]/40 text-white'
                                                                : 'bg-black/40 border-shark/50 text-storm-gray hover:border-shark/80'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Plus size={14} className={requestFormData.create_folder ? 'text-[#279da6]' : ''} />
                                                                <span className="text-[11px] font-bold">Create Folder</span>
                                                            </div>
                                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${requestFormData.create_folder ? 'bg-[#279da6]' : 'bg-shark'}`}>
                                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${requestFormData.create_folder ? 'right-0.5' : 'left-0.5'}`} />
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <RequestsTable
                                requests={tabFilteredRequests}
                                profiles={profiles}
                                teamMembers={teamMembers}
                                showClientColumn={true}
                                onUpdateField={handleUpdateField}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                            />
                        </div>
                    </main>
                </div>
            </div>

            <ChatDrawer
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                requestId={selectedRequest?.id || ''}
                requestTitle={selectedRequest?.title || ''}
            />
        </div >
    );
}
