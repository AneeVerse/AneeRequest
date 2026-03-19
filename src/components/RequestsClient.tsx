'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    MessageSquare,
    Plus,
    Pencil,
    Check,
    X,
    Loader2,
    Calendar,
    FileText,
    Building,
    Search,
    Filter,
    ChevronDown,
    SlidersHorizontal,
    LayoutList,
    Circle,
    Eye,
    Flag,
    User as UserIcon
} from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ChatDrawer from '@/components/ChatDrawer';
import RequestsTable from '@/components/RequestsTable';
import CustomDropdown from '@/components/CustomDropdown';
import CustomDateRangePicker from '@/components/CustomDateRangePicker';

import type { RequestItem, Profile, Client } from '@/lib/data/requests';
import type { TeamMember } from '@/lib/data/team';

interface RequestsClientProps {
    initialRequests: RequestItem[];
    initialProfiles: Profile[];
    initialTeamMembers: TeamMember[];
    initialClients: Client[];
}

export default function RequestsClient({
    initialRequests,
    initialProfiles,
    initialTeamMembers,
    initialClients
}: RequestsClientProps) {
    const router = useRouter();
    const { isImpersonating, profile, viewAsProfile } = useAuth();
    const displayProfile = viewAsProfile || profile;

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const initialTabFromUrl = searchParams.get('status')?.toUpperCase();
    const activeTab = (initialTabFromUrl && ['ACTIVE', 'COMPLETED', 'ALL', '00'].includes(initialTabFromUrl))
        ? initialTabFromUrl
        : 'ACTIVE';

    const setActiveTab = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('status', tab.toLowerCase());
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };
    const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        title: '',
        client: '',
        assigned_to: '',
        status: '',
        priority: '',
        due_date_from: '',
        due_date_to: ''
    });

    const [requestFormData, setRequestFormData] = useState({
        title: '',
        description: '',
        due_date: '',
        client_id: '',
        create_folder: false
    });

    const inlineRequestInputRef = React.useRef<HTMLInputElement>(null);

    const subTabs = ['ACTIVE', 'COMPLETED', 'ALL', '00'];

    const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
    const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
    const [clients, setClients] = useState<Client[]>(initialClients);

    // Update state when initial props change (from SSR refresh)
    React.useEffect(() => {
        setRequests(initialRequests);
        setProfiles(initialProfiles);
        setTeamMembers(initialTeamMembers);
        setClients(initialClients);
    }, [initialRequests, initialProfiles, initialTeamMembers, initialClients]);

    useEffect(() => {
        // Initial check for mobile to auto-collapse
        if (window.innerWidth < 1024) {
            setIsSidebarCollapsed(true);
        }

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
                setRequestFormData({ title: '', description: '', due_date: '', client_id: '', create_folder: false });
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
            // Find the client record for this profile's email to match against requests.client.id
            const myClientRecord = clients.find(c => c.email === displayProfile?.email);
            if (myClientRecord) {
                return requests.filter((req: RequestItem) => req.client?.id === myClientRecord.id);
            }
            return [];
        }
        if (isTeamMember && !isTeamAdmin) {
            return requests.filter((req: RequestItem) => req.assigned_to === displayProfile?.id);
        }
        return requests;
    })();

    const tabFilteredRequests = visibleRequests.filter((req: RequestItem) => {
        // Tab filters
        let matchesTab = true;
        const isDefaultRequest = req.title === '00-Updates-Followups' || req.title === '00-UPDATES-FOLLOWUPS';

        if (activeTab === '00') {
            matchesTab = isDefaultRequest;
        } else {
            // All other tabs exclude the default request
            if (isDefaultRequest) return false;

            if (activeTab === 'ACTIVE') matchesTab = req.status !== 'Done';
            else if (activeTab === 'COMPLETED') matchesTab = req.status === 'Done';
        }

        if (!matchesTab) return false;

        // Search query
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            req.title?.toLowerCase().includes(searchLower) ||
            req.client?.full_name?.toLowerCase().includes(searchLower) ||
            (req.client as any)?.organization?.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;

        // Advanced filters
        const matchesTitle = !filters.title || req.title?.toLowerCase().includes(filters.title.toLowerCase());
        const matchesClient = !filters.client || req.client?.full_name?.toLowerCase().includes(filters.client.toLowerCase()) || (req.client as any)?.organization?.toLowerCase().includes(filters.client.toLowerCase());
        const matchesAssignee = !filters.assigned_to || req.assigned_to === filters.assigned_to;
        const matchesStatus = !filters.status || req.status === filters.status;
        const matchesPriority = !filters.priority || req.priority === filters.priority;

        // Date range filter
        let matchesDate = true;
        if (filters.due_date_from || filters.due_date_to) {
            if (!req.due_date) {
                matchesDate = false;
            } else {
                const reqDate = new Date(req.due_date);
                reqDate.setHours(0, 0, 0, 0);

                if (filters.due_date_from) {
                    const fromDate = new Date(filters.due_date_from);
                    fromDate.setHours(0, 0, 0, 0);
                    if (reqDate < fromDate) matchesDate = false;
                }
                if (filters.due_date_to) {
                    const toDate = new Date(filters.due_date_to);
                    toDate.setHours(0, 0, 0, 0);
                    if (reqDate > toDate) matchesDate = false;
                }
            }
        }

        return matchesTitle && matchesClient && matchesAssignee && matchesStatus && matchesPriority && matchesDate;
    });

    // Compute counts per tab for notification badges
    const tabCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        subTabs.forEach(tab => {
            counts[tab] = visibleRequests.filter(req => {
                const isDefaultRequest = req.title === '00-Updates-Followups' || req.title === '00-UPDATES-FOLLOWUPS';
                if (tab === '00') return isDefaultRequest;
                if (isDefaultRequest) return false;

                if (tab === 'ALL' || tab === 'All') return true;
                if (tab === 'ACTIVE') return req.status !== 'Done';
                if (tab === 'COMPLETED') return req.status === 'Done';
                return true;
            }).length;
        });
        return counts;
    }, [visibleRequests, subTabs]);

    const filtersElement = (
        <div className="relative">
            <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[12px] font-bold z-10 ${Object.values(filters).some(v => v !== '') || searchQuery !== '' ? 'bg-[#279da6]/20 border-[#279da6]/60 text-[#279da6] active:scale-95' : 'border-shark bg-[#101011] text-santas-gray hover:text-white hover:bg-shark/40'}`}
            >
                <Filter size={16} className={Object.values(filters).some(v => v !== '') || searchQuery !== '' ? 'fill-[#279da6]/20' : ''} />
                <span className="hidden sm:inline">Filters</span>
                <ChevronDown size={16} className={isFilterOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-[500px] bg-[#101011] border border-shark rounded-xl shadow-2xl p-4 sm:p-5 z-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-[#279da6]">Advanced Filters</h4>
                        <button
                            onClick={() => {
                                setFilters({
                                    title: '',
                                    client: '',
                                    assigned_to: '',
                                    status: '',
                                    priority: '',
                                    due_date_from: '',
                                    due_date_to: ''
                                });
                                setSearchQuery('');
                                setIsFilterOpen(false);
                            }}
                            className="text-[10px] font-bold text-storm-gray hover:text-white underline underline-offset-4"
                        >
                            Reset all
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Title</label>
                                <div className="relative group">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                    <input
                                        type="text"
                                        value={filters.title}
                                        onChange={(e) => setFilters(f => ({ ...f, title: e.target.value }))}
                                        placeholder="Search tit..."
                                        className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-10 text-[12px] font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                    />
                                    {filters.title && (
                                        <button
                                            onClick={() => setFilters(f => ({ ...f, title: '' }))}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-shark rounded-md text-storm-gray hover:text-white transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Client</label>
                                <div className="relative group">
                                    <Building size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                    <input
                                        type="text"
                                        value={filters.client}
                                        onChange={(e) => setFilters(f => ({ ...f, client: e.target.value }))}
                                        placeholder="Search client..."
                                        className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-10 text-[12px] font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                    />
                                    {filters.client && (
                                        <button
                                            onClick={() => setFilters(f => ({ ...f, client: '' }))}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-shark rounded-md text-storm-gray hover:text-white transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Status</label>
                                <CustomDropdown
                                    value={filters.status}
                                    onChange={(val) => setFilters(f => ({ ...f, status: val }))}
                                    options={[
                                        { label: 'All Statuses', value: '' },
                                        { label: 'Todo', value: 'Todo', icon: <Circle size={12} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                        { label: 'In Progress', value: 'In Progress', icon: <Loader2 size={12} className="text-amber-500" />, color: 'text-amber-500' },
                                        { label: 'Review', value: 'Review', icon: <Eye size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                        { label: 'Done', value: 'Done', icon: <Check size={12} className="text-emerald-500" />, color: 'text-emerald-500' },
                                    ]}
                                    showClear={true}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Assigned</label>
                                <CustomDropdown
                                    value={filters.assigned_to}
                                    onChange={(val) => setFilters(f => ({ ...f, assigned_to: val }))}
                                    options={[
                                        { label: 'All Members', value: '' },
                                        ...teamMembers.map((m: any) => ({
                                            label: m.full_name || (m as any).name,
                                            value: m.profile_id || m.id,
                                            icon: <UserIcon size={12} className="text-storm-gray" />
                                        }))
                                    ]}
                                    showClear={true}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Priority</label>
                                <CustomDropdown
                                    value={filters.priority}
                                    onChange={(val) => setFilters(f => ({ ...f, priority: val }))}
                                    options={[
                                        { label: 'All Priorities', value: '' },
                                        { label: 'Low', value: 'Low', icon: <Flag size={12} className="text-storm-gray" />, color: 'text-storm-gray' },
                                        { label: 'Medium', value: 'Medium', icon: <Flag size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                        { label: 'High', value: 'High', icon: <Flag size={12} className="text-amber-500" />, color: 'text-amber-500' },
                                        { label: 'Critical', value: 'Critical', icon: <Flag size={12} className="text-rose-500" />, color: 'text-rose-500' },
                                    ]}
                                    showClear={true}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Time Period</label>
                                <CustomDateRangePicker
                                    from={filters.due_date_from}
                                    to={filters.due_date_to}
                                    onChange={(from, to) => setFilters(f => ({ ...f, due_date_from: from, due_date_to: to }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
            <Sidebar isCollapsed={isSidebarCollapsed} isMobileOpen={isMobileOpen} onMobileClose={() => setIsMobileOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                <div className={`flex-1 flex flex-col min-w-0 bg-[#101011] rounded-t-2xl overflow-hidden border-t border-l border-r mt-2 sm:mt-6 responsive-content-wrapper transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
                    <div className="border-b border-shark">
                        <Header

                            onMobileMenuToggle={() => setIsMobileOpen(true)}
                            label="Requests"
                            labelIcon={<MessageSquare size={16} className="text-[#279da6]" />}
                            tabs={subTabs}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            tabCounts={tabCounts}
                            onCreate={(displayProfile?.role === 'super_admin' || displayProfile?.team_role === 'admin') ? () => setIsCreating(true) : undefined}
                            isCreating={isCreating}
                            onConfirm={handleInlineCreate}
                            onCancel={() => {
                                setIsCreating(false);
                                setRequestFormData({ title: '', description: '', due_date: '', client_id: '', create_folder: false });
                            }}
                            isSubmitting={isSubmitting}
                            rightToolbar={filtersElement}
                        />
                    </div>

                    <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#18181B]">
                        <div className="p-3 sm:p-4 lg:p-8">

                            {/* Inline Creation Row */}
                            <div
                                className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCreating
                                    ? 'max-h-[500px] opacity-100 mb-8 translate-y-0 scale-100 blur-0'
                                    : 'max-h-0 opacity-0 mb-0 -translate-y-4 scale-95 blur-md pointer-events-none'
                                    }`}
                            >
                                <div className="p-1 bg-[#101011]/90 backdrop-blur-2xl border border-[#279da6]/30 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(39,157,166,0.08)] ring-1 ring-white/5 relative overflow-hidden">
                                    <div className="p-3 sm:p-6 space-y-6">
                                        <div className="flex items-start gap-4 sm:gap-6">
                                            <div className="flex flex-col items-center gap-3 shrink-0">
                                                <div className="w-14 h-14 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] shadow-inner ring-1 ring-[#279da6]/20">
                                                    <FileText size={28} />
                                                </div>
                                                <p className="text-[10px] font-black text-storm-gray uppercase tracking-widest">Request</p>
                                            </div>

                                            <div className="flex-1 space-y-6">
                                                {/* Top Row: Title & Client */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                                    <div className="space-y-1.5 md:col-span-3">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Request Title</label>
                                                        <div className="relative group">
                                                            <Pencil size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                ref={inlineRequestInputRef}
                                                                type="text"
                                                                value={requestFormData.title}
                                                                onChange={(e) => setRequestFormData({ ...requestFormData, title: e.target.value })}
                                                                placeholder="What do you need?"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-[12px] text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Client</label>
                                                        <CustomDropdown
                                                            value={requestFormData.client_id}
                                                            onChange={(val: any) => setRequestFormData({ ...requestFormData, client_id: val })}
                                                            options={[
                                                                { label: 'Select Client', value: '' },
                                                                ...clients.map(c => ({
                                                                    label: `${c.organization || c.name} (${c.email})`,
                                                                    value: c.id,
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
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-[12px] text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold min-h-[42px] max-h-[120px] custom-scrollbar"
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
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-[12px] text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold [color-scheme:dark]"
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
