'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    Search,
    ChevronDown,
    Calendar as CalendarIcon,
    Loader2,
    Plus as PlusIcon,
    Filter,
    SlidersHorizontal,
    LayoutList,
    Check,
    SortAsc,
    SortDesc,
    Flag,
    Circle,
    User,
    Shield,
    Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ChatDrawer from '@/components/ChatDrawer';
import CreateRequestModal from '@/components/CreateRequestModal';
import type { RequestItem, Profile, TeamMember } from '@/lib/data/requests';
import { formatDate, formatTime } from '@/lib/dateUtils';
import CustomDropdown from '@/components/CustomDropdown';

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
    const { isImpersonating, profile, viewAsProfile, impersonatedProfile } = useAuth();
    const displayProfile = viewAsProfile || profile;

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        client: '',
        organization: '',
        assigned_to: '',
        status: '',
        priority: '',
        request_number: '',
        due_date: ''
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
        key: 'created_at',
        direction: 'desc'
    });
    const [activeFilterHeader, setActiveFilterHeader] = useState<string | null>(null);
    const dateInputRefs = React.useRef<{ [key: string]: HTMLInputElement | null }>({});

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

    const handleOpenChat = (request: RequestItem) => {
        setSelectedRequest(request);
        setIsChatOpen(true);
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

    const handleRequestCreated = () => {
        // Revalidate requests after creating a new one
        router.refresh();
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

    const filteredRequests = visibleRequests.filter((req: RequestItem) => {
        // Search query
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            req.title?.toLowerCase().includes(searchLower) ||
            req.client?.full_name?.toLowerCase().includes(searchLower) ||
            (req.client as any)?.organization?.toLowerCase().includes(searchLower);

        // Tab filters
        let matchesTab = true;
        if (activeTab === 'Assigned') matchesTab = !!req.assigned_to;
        else if (activeTab === 'Unassigned') matchesTab = !req.assigned_to;
        else if (activeTab === 'Open') matchesTab = req.status !== 'Done';
        else if (activeTab === 'Completed') matchesTab = req.status === 'Done';

        // Advanced filters
        const matchesClient = !filters.client || req.client?.full_name?.toLowerCase().includes(filters.client.toLowerCase());
        const matchesOrg = !filters.organization || (req.client as any)?.organization?.toLowerCase().includes(filters.organization.toLowerCase());
        const matchesAssignee = !filters.assigned_to || req.assigned_to === filters.assigned_to;
        const matchesStatus = !filters.status || req.status === filters.status;
        const matchesPriority = !filters.priority || req.priority === filters.priority;
        const matchesNumber = !filters.request_number || req.request_number?.toString() === filters.request_number;
        const matchesDate = !filters.due_date || (req.due_date && req.due_date.startsWith(filters.due_date));

        return (matchesSearch || false) && matchesTab && (matchesClient || false) && (matchesOrg || false) && matchesAssignee && matchesStatus && matchesPriority && matchesNumber && matchesDate;
    });

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
        }));
    };

    const sortedRequests = [...filteredRequests].sort((a, b) => {
        if (!sortConfig.key || !sortConfig.direction) return 0;

        let aValue: any = (a as any)[sortConfig.key];
        let bValue: any = (b as any)[sortConfig.key];

        // Case-insensitive sorting for strings
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        // Custom handling for nested fields
        if (sortConfig.key === 'client') {
            aValue = a.client?.full_name?.toLowerCase() || '';
        } else if (sortConfig.key === 'assignee') {
            aValue = a.assignee?.full_name?.toLowerCase() || '';
        } else if (sortConfig.key === 'organization') {
            aValue = (a.client as any)?.organization?.toLowerCase() || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Handle clicks outside to close filter dropdowns
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeFilterHeader && !(event.target as Element).closest('.header-filter-container')) {
                setActiveFilterHeader(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeFilterHeader]);

    return (
        <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
            <Sidebar isCollapsed={isSidebarCollapsed} />

            <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                <div className={`flex-1 flex flex-col min-w-0 bg-[#121214] rounded-t-2xl overflow-hidden border-t border-l border-r mt-6 mr-6 transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
                    <Header
                        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        label="Requests"
                        labelIcon={<LayoutList size={16} className="text-santas-gray" />}
                        tabs={subTabs}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        onCreate={() => setIsCreateModalOpen(true)}
                    />

                    <main className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="px-6 pb-6 pt-2">
                            {/* Consistent Content Wrapper */}
                            <div className="bg-[#18181B] border border-shark rounded-2xl p-6 min-h-[calc(100vh-160px)] shadow-2xl">

                                {/* Toolbar */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-80">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-santas-gray" size={14} />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search for a request..."
                                                className="w-full bg-[#09090B] border border-shark/50 rounded-lg py-2 pl-9 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold z-10 ${Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'created_at' && sortConfig.direction === 'desc')) ? 'bg-[#279da6]/20 border-[#279da6]/60 text-[#279da6] active:scale-95' : 'border-shark bg-[#121214] text-santas-gray hover:text-white hover:bg-shark/40'}`}
                                            >
                                                <Filter size={14} className={Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'created_at' && sortConfig.direction === 'desc')) ? 'fill-[#279da6]/20' : ''} />
                                                <span>Filters</span>
                                                <ChevronDown size={14} className={isFilterOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                            </button>

                                            {isFilterOpen && (
                                                <div className="absolute right-0 mt-2 w-72 bg-[#121214] border border-shark rounded-xl shadow-2xl p-5 z-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="text-[12px] font-black uppercase tracking-widest text-[#279da6]">Advanced Filters</h4>
                                                        <button
                                                            onClick={() => {
                                                                setFilters({
                                                                    client: '',
                                                                    organization: '',
                                                                    assigned_to: '',
                                                                    status: '',
                                                                    priority: '',
                                                                    request_number: '',
                                                                    due_date: ''
                                                                });
                                                                setSearchQuery('');
                                                                setSortConfig({ key: '', direction: null });
                                                                setIsFilterOpen(false);
                                                            }}
                                                            className="text-[10px] font-bold text-storm-gray hover:text-white underline underline-offset-4"
                                                        >
                                                            Reset all
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-storm-gray uppercase">Client</label>
                                                            <input
                                                                type="text"
                                                                value={filters.client}
                                                                onChange={(e) => setFilters(f => ({ ...f, client: e.target.value }))}
                                                                className="w-full bg-[#09090B] border border-shark rounded-lg px-3 py-1.5 text-[11px] font-bold focus:outline-none focus:border-[#279da6]/40 text-iron"
                                                                placeholder="Client name..."
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-storm-gray uppercase">Organization</label>
                                                            <input
                                                                type="text"
                                                                value={filters.organization}
                                                                onChange={(e) => setFilters(f => ({ ...f, organization: e.target.value }))}
                                                                className="w-full bg-[#09090B] border border-shark rounded-lg px-3 py-1.5 text-[11px] font-bold focus:outline-none focus:border-[#279da6]/40 text-iron"
                                                                placeholder="Organization name..."
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-bold text-storm-gray uppercase">Assigned To</label>
                                                                <CustomDropdown
                                                                    value={filters.assigned_to}
                                                                    onChange={(val) => setFilters(f => ({ ...f, assigned_to: val }))}
                                                                    options={[
                                                                        { label: 'All', value: '' },
                                                                        ...initialTeamMembers.map((m: TeamMember) => ({
                                                                            label: m.name,
                                                                            value: m.profile_id || '',
                                                                            icon: <User size={14} className="text-[#279da6]" />
                                                                        }))
                                                                    ]}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-bold text-storm-gray uppercase">Status</label>
                                                                <CustomDropdown
                                                                    value={filters.status}
                                                                    onChange={(val) => setFilters(f => ({ ...f, status: val }))}
                                                                    options={[
                                                                        { label: 'All', value: '' },
                                                                        { label: 'Todo', value: 'Todo', icon: <Circle size={14} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                                        { label: 'In Progress', value: 'In Progress', icon: <Loader2 size={14} className="text-amber-500 animate-spin" />, color: 'text-amber-500' },
                                                                        { label: 'Review', value: 'Review', icon: <Eye size={14} className="text-blue-400" />, color: 'text-blue-400' },
                                                                        { label: 'Done', value: 'Done', icon: <Check size={14} className="text-emerald-500" />, color: 'text-emerald-500' },
                                                                    ]}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-bold text-storm-gray uppercase">Priority</label>
                                                                <CustomDropdown
                                                                    value={filters.priority}
                                                                    onChange={(val) => setFilters(f => ({ ...f, priority: val }))}
                                                                    options={[
                                                                        { label: 'All', value: '' },
                                                                        { label: 'Low', value: 'Low', icon: <Flag size={14} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                                        { label: 'Medium', value: 'Medium', icon: <Flag size={14} className="text-blue-400" />, color: 'text-blue-400' },
                                                                        { label: 'High', value: 'High', icon: <Flag size={14} className="text-amber-500" />, color: 'text-amber-500' },
                                                                        { label: 'Critical', value: 'Critical', icon: <Flag size={14} className="text-rose-500" />, color: 'text-rose-500' },
                                                                    ]}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-bold text-storm-gray uppercase">Due Date</label>
                                                                <input
                                                                    type="date"
                                                                    value={filters.due_date}
                                                                    onChange={(e) => setFilters(f => ({ ...f, due_date: e.target.value }))}
                                                                    className="w-full bg-[#09090B] border border-shark rounded-lg px-2 py-1.5 text-[11px] font-bold focus:outline-none focus:border-[#279da6]/40 text-iron"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-[1px] h-4 bg-shark/60 mx-1" />

                                        <button className="p-2 rounded-lg border border-shark bg-[#121214] text-santas-gray hover:text-white transition-all hover:bg-shark/40">
                                            <SlidersHorizontal size={14} />
                                        </button>

                                        <div className="w-[1px] h-4 bg-shark/60 mx-1" />

                                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-shark bg-[#121214] text-[11px] font-bold text-santas-gray hover:text-white transition-all hover:bg-shark/40">
                                            <LayoutList size={14} />
                                            <span>List</span>
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="border border-shark/60 rounded-xl overflow-hidden bg-black/20">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse table-auto">
                                            <thead>
                                                <tr className="border-b border-shark text-storm-gray text-xs uppercase font-black tracking-widest bg-shark/20">
                                                    <th className="px-5 py-5 w-12 border-r border-shark/60 text-center">#</th>
                                                    <th className="px-6 py-5 border-r border-shark/60 w-[30%] min-w-[250px] group/header relative">
                                                        <div className="flex items-center justify-between">
                                                            <span className="cursor-default">Title</span>
                                                            <button
                                                                onClick={() => setActiveFilterHeader(activeFilterHeader === 'title' ? null : 'title')}
                                                                className={`p-1 rounded hover:bg-shark/40 transition-colors ${searchQuery || sortConfig.key === 'title' ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                            >
                                                                <Filter size={10} />
                                                            </button>
                                                        </div>
                                                        {activeFilterHeader === 'title' && (
                                                            <div className="absolute top-full left-0 mt-1 w-44 bg-[#121214] border border-shark rounded-lg shadow-2xl p-2 z-[60] normal-case tracking-normal">
                                                                <div className="mb-2 border-b border-shark/40 pb-2">
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Sort</div>
                                                                    <button
                                                                        onClick={() => { setSortConfig({ key: 'title', direction: 'asc' }); setActiveFilterHeader(null); }}
                                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'title' && sortConfig.direction === 'asc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                    >
                                                                        <SortAsc size={12} />
                                                                        <span>Sort A-Z</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setSortConfig({ key: 'title', direction: 'desc' }); setActiveFilterHeader(null); }}
                                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'title' && sortConfig.direction === 'desc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                    >
                                                                        <SortDesc size={12} />
                                                                        <span>Sort Z-A</span>
                                                                    </button>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Filter</div>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Filter by title..."
                                                                        value={searchQuery}
                                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                                        className="w-full bg-[#09090B] border border-shark/50 rounded-md py-1 px-2 text-[10px] text-iron focus:outline-none"
                                                                        autoFocus
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </th>
                                                    <th className="px-6 py-5 border-r border-shark/60 w-[20%] group/header relative header-filter-container">
                                                        <div className="flex items-center justify-between">
                                                            <span className="cursor-default">Client</span>
                                                            <button
                                                                onClick={() => setActiveFilterHeader(activeFilterHeader === 'client' ? null : 'client')}
                                                                className={`p-1 rounded hover:bg-shark/40 transition-colors ${filters.client || filters.organization ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                            >
                                                                <Filter size={10} />
                                                            </button>
                                                        </div>
                                                        {activeFilterHeader === 'client' && (
                                                            <div className="absolute top-full left-0 mt-1 w-64 bg-[#121214] border border-shark rounded-xl shadow-2xl p-4 z-[60] normal-case tracking-normal animate-in fade-in slide-in-from-top-1 duration-200">
                                                                <div className="mb-3 border-b border-shark/40 pb-2">
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Sort</div>
                                                                    <button
                                                                        onClick={() => { setSortConfig({ key: 'client', direction: 'asc' }); setActiveFilterHeader(null); }}
                                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'client' && sortConfig.direction === 'asc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                    >
                                                                        <SortAsc size={12} />
                                                                        <span>Sort A-Z</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setSortConfig({ key: 'client', direction: 'desc' }); setActiveFilterHeader(null); }}
                                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'client' && sortConfig.direction === 'desc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                    >
                                                                        <SortDesc size={12} />
                                                                        <span>Sort Z-A</span>
                                                                    </button>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Filter</div>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] font-black uppercase text-storm-gray">Full Name</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Filter by name..."
                                                                            value={filters.client}
                                                                            onChange={(e) => setFilters(f => ({ ...f, client: e.target.value }))}
                                                                            className="w-full bg-[#09090B] border border-shark/50 rounded-lg py-1.5 px-3 text-[11px] text-iron focus:outline-none focus:border-[#279da6]/40"
                                                                            autoFocus
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] font-black uppercase text-storm-gray">Organization</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Filter by org..."
                                                                            value={filters.organization}
                                                                            onChange={(e) => setFilters(f => ({ ...f, organization: e.target.value }))}
                                                                            className="w-full bg-[#09090B] border border-shark/50 rounded-lg py-1.5 px-3 text-[11px] text-iron focus:outline-none focus:border-[#279da6]/40"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </th>
                                                    <th className="px-4 py-5 border-r border-shark/60 w-32 text-center group/header relative header-filter-container">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="cursor-default">Status</span>
                                                            <button
                                                                onClick={() => setActiveFilterHeader(activeFilterHeader === 'status' ? null : 'status')}
                                                                className={`p-1 rounded hover:bg-shark/40 transition-colors ${filters.status || sortConfig.key === 'status' ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                            >
                                                                <Filter size={10} />
                                                            </button>
                                                        </div>
                                                        {activeFilterHeader === 'status' && (
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-36 bg-[#121214] border border-shark rounded-lg shadow-2xl p-2 z-[60] normal-case tracking-normal">
                                                                <div className="mb-2 border-b border-shark/40 pb-2">
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Sort</div>
                                                                    <button
                                                                        onClick={() => { setSortConfig({ key: 'status', direction: 'asc' }); setActiveFilterHeader(null); }}
                                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'status' && sortConfig.direction === 'asc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                    >
                                                                        <SortAsc size={12} />
                                                                        <span>Sort A-Z</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setSortConfig({ key: 'status', direction: 'desc' }); setActiveFilterHeader(null); }}
                                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'status' && sortConfig.direction === 'desc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                    >
                                                                        <SortDesc size={12} />
                                                                        <span>Sort Z-A</span>
                                                                    </button>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Filter</div>
                                                                    <CustomDropdown
                                                                        value={filters.status}
                                                                        onChange={(val) => { setFilters(f => ({ ...f, status: val })); setActiveFilterHeader(null); }}
                                                                        options={[
                                                                            { label: 'All Status', value: '' },
                                                                            { label: 'Todo', value: 'Todo', icon: <Circle size={12} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                                            { label: 'In Progress', value: 'In Progress', icon: <Loader2 size={12} className="text-amber-500 animate-spin" />, color: 'text-amber-500' },
                                                                            { label: 'Review', value: 'Review', icon: <Eye size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                                            { label: 'Done', value: 'Done', icon: <Check size={12} className="text-emerald-500" />, color: 'text-emerald-500' },
                                                                        ]}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </th>
                                                    <th className="px-4 py-5 border-r border-shark/60 w-36 group/header relative header-filter-container">
                                                        <div className="flex items-center justify-between">
                                                            <span className="cursor-default">Assigned</span>
                                                            <button
                                                                onClick={() => setActiveFilterHeader(activeFilterHeader === 'assigned_to' ? null : 'assigned_to')}
                                                                className={`p-1 rounded hover:bg-shark/40 transition-colors ${filters.assigned_to || sortConfig.key === 'assignee' ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                            >
                                                                <Filter size={10} />
                                                            </button>
                                                        </div>
                                                        {activeFilterHeader === 'assigned_to' && (
                                                            <div className="absolute top-full left-0 mt-1 w-44 bg-[#121214] border border-shark rounded-lg shadow-2xl p-2 z-[60] normal-case tracking-normal">
                                                                <div className="mb-2 border-b border-shark/40 pb-2">
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Sort</div>
                                                                    <button
                                                                        onClick={() => { setSortConfig({ key: 'assignee', direction: 'asc' }); setActiveFilterHeader(null); }}
                                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'assignee' && sortConfig.direction === 'asc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                    >
                                                                        <SortAsc size={12} />
                                                                        <span>Sort A-Z</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setSortConfig({ key: 'assignee', direction: 'desc' }); setActiveFilterHeader(null); }}
                                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'assignee' && sortConfig.direction === 'desc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                    >
                                                                        <SortDesc size={12} />
                                                                        <span>Sort Z-A</span>
                                                                    </button>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Filter</div>
                                                                    <CustomDropdown
                                                                        value={filters.assigned_to}
                                                                        onChange={(val) => { setFilters(f => ({ ...f, assigned_to: val })); setActiveFilterHeader(null); }}
                                                                        options={[
                                                                            { label: 'All Team', value: '' },
                                                                            ...initialTeamMembers.map((m: TeamMember) => ({
                                                                                label: m.name,
                                                                                value: m.profile_id || '',
                                                                                icon: <User size={12} className="text-[#279da6]" />
                                                                            }))
                                                                        ]}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </th>
                                                    <th className="px-4 py-5 border-r border-shark/60 w-28 group/header relative header-filter-container">
                                                        <div className="flex items-center justify-between">
                                                            <span className="cursor-default">Priority</span>
                                                            <button
                                                                onClick={() => setActiveFilterHeader(activeFilterHeader === 'priority' ? null : 'priority')}
                                                                className={`p-1 rounded hover:bg-shark/40 transition-colors ${filters.priority || sortConfig.key === 'priority' ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                            >
                                                                <Filter size={10} />
                                                            </button>
                                                        </div>
                                                        {activeFilterHeader === 'priority' && (
                                                            <div className="absolute top-full left-0 mt-1 w-36 bg-[#121214] border border-shark rounded-lg shadow-2xl p-2 z-[60] normal-case tracking-normal">
                                                                <div className="mb-2 border-b border-shark/40 pb-2">
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Sort</div>
                                                                    <button
                                                                        onClick={() => { setSortConfig({ key: 'priority', direction: 'asc' }); setActiveFilterHeader(null); }}
                                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'priority' && sortConfig.direction === 'asc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                    >
                                                                        <SortAsc size={12} />
                                                                        <span>Sort A-Z</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setSortConfig({ key: 'priority', direction: 'desc' }); setActiveFilterHeader(null); }}
                                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'priority' && sortConfig.direction === 'desc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                    >
                                                                        <SortDesc size={12} />
                                                                        <span>Sort Z-A</span>
                                                                    </button>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Filter</div>
                                                                    <CustomDropdown
                                                                        value={filters.priority}
                                                                        onChange={(val) => { setFilters(f => ({ ...f, priority: val })); setActiveFilterHeader(null); }}
                                                                        options={[
                                                                            { label: 'All Priority', value: '' },
                                                                            { label: 'Low', value: 'Low', icon: <Flag size={12} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                                            { label: 'Medium', value: 'Medium', icon: <Flag size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                                            { label: 'High', value: 'High', icon: <Flag size={12} className="text-amber-500" />, color: 'text-amber-500' },
                                                                            { label: 'Critical', value: 'Critical', icon: <Flag size={12} className="text-rose-500" />, color: 'text-rose-500' },
                                                                        ]}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </th>
                                                    <th className="px-4 py-5 border-r border-shark/60 w-32 group/header relative header-filter-container">
                                                        <div className="flex items-center justify-between">
                                                            <span className="cursor-default">Due Date</span>
                                                            <button
                                                                onClick={() => setActiveFilterHeader(activeFilterHeader === 'due_date' ? null : 'due_date')}
                                                                className={`p-1 rounded hover:bg-shark/40 transition-colors ${filters.due_date || sortConfig.key === 'due_date' ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                            >
                                                                <Filter size={10} />
                                                            </button>
                                                        </div>
                                                        {activeFilterHeader === 'due_date' && (
                                                            <div className="absolute top-full left-0 mt-1 w-44 bg-[#121214] border border-shark rounded-lg shadow-2xl p-2 z-[60] normal-case tracking-normal">
                                                                <div className="mb-2 border-b border-shark/40 pb-2">
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Sort</div>
                                                                    <button
                                                                        onClick={() => { setSortConfig({ key: 'due_date', direction: 'asc' }); setActiveFilterHeader(null); }}
                                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'due_date' && sortConfig.direction === 'asc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                    >
                                                                        <SortAsc size={12} />
                                                                        <span>Sort A-Z</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setSortConfig({ key: 'due_date', direction: 'desc' }); setActiveFilterHeader(null); }}
                                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'due_date' && sortConfig.direction === 'desc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                    >
                                                                        <SortDesc size={12} />
                                                                        <span>Sort Z-A</span>
                                                                    </button>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Filter</div>
                                                                    <input
                                                                        type="date"
                                                                        value={filters.due_date}
                                                                        onChange={(e) => setFilters(f => ({ ...f, due_date: e.target.value }))}
                                                                        className="w-full bg-[#09090B] border border-shark/50 rounded-md py-1.5 px-2 text-[10px] text-iron focus:outline-none [color-scheme:dark]"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </th>
                                                    <th className="px-4 py-5 border-r border-shark/60 w-32 group/header relative header-filter-container">
                                                        <div className="flex items-center justify-between">
                                                            <span className="cursor-default">Last Updated</span>
                                                            <button
                                                                onClick={() => setActiveFilterHeader(activeFilterHeader === 'updated_at' ? null : 'updated_at')}
                                                                className={`p-1 rounded hover:bg-shark/40 transition-colors ${sortConfig.key === 'updated_at' ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                            >
                                                                <Filter size={10} />
                                                            </button>
                                                        </div>
                                                        {activeFilterHeader === 'updated_at' && (
                                                            <div className="absolute top-full left-0 mt-1 w-36 bg-[#121214] border border-shark rounded-lg shadow-2xl p-2 z-[60] normal-case tracking-normal">
                                                                <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Sort</div>
                                                                <button
                                                                    onClick={() => { setSortConfig({ key: 'updated_at', direction: 'asc' }); setActiveFilterHeader(null); }}
                                                                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'updated_at' && sortConfig.direction === 'asc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                >
                                                                    <SortAsc size={12} />
                                                                    <span>Sort A-Z</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => { setSortConfig({ key: 'updated_at', direction: 'desc' }); setActiveFilterHeader(null); }}
                                                                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'updated_at' && sortConfig.direction === 'desc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                >
                                                                    <SortDesc size={12} />
                                                                    <span>Sort Z-A</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </th>
                                                    <th className="px-6 py-5 w-32 group/header relative header-filter-container">
                                                        <div className="flex items-center justify-between">
                                                            <span className="cursor-default">Created</span>
                                                            <button
                                                                onClick={() => setActiveFilterHeader(activeFilterHeader === 'created_at' ? null : 'created_at')}
                                                                className={`p-1 rounded hover:bg-shark/40 transition-colors ${sortConfig.key === 'created_at' ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                            >
                                                                <Filter size={10} />
                                                            </button>
                                                        </div>
                                                        {activeFilterHeader === 'created_at' && (
                                                            <div className="absolute top-full right-0 mt-1 w-36 bg-[#121214] border border-shark rounded-lg shadow-2xl p-2 z-[60] normal-case tracking-normal">
                                                                <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Sort</div>
                                                                <button
                                                                    onClick={() => { setSortConfig({ key: 'created_at', direction: 'asc' }); setActiveFilterHeader(null); }}
                                                                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'created_at' && sortConfig.direction === 'asc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                >
                                                                    <SortAsc size={12} />
                                                                    <span>Sort A-Z</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => { setSortConfig({ key: 'created_at', direction: 'desc' }); setActiveFilterHeader(null); }}
                                                                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === 'created_at' && sortConfig.direction === 'desc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                >
                                                                    <SortDesc size={12} />
                                                                    <span>Sort Z-A</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-shark/60">
                                                {sortedRequests.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={9} className="px-6 py-20 text-center text-storm-gray uppercase text-[10px] font-black tracking-widest opacity-40">
                                                            No matches found for your criteria.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    sortedRequests.map((item: RequestItem, index: number) => (
                                                        <tr key={item.id} className="hover:bg-shark/10 transition-colors group text-sm">
                                                            <td className="px-5 py-4.5 border-r border-shark/60 text-center font-black text-storm-gray">
                                                                {(index + 1).toString().padStart(2, '0')}
                                                            </td>
                                                            <td
                                                                className="px-6 py-4.5 font-black text-iron border-r border-shark/60 group-hover:text-[#279da6] cursor-pointer transition-colors"
                                                                onClick={() => router.push(`/requests/${item.id}`)}
                                                            >
                                                                {item.title}
                                                            </td>
                                                            <td className="px-6 py-4.5 border-r border-shark/60">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-iron font-black truncate block">{item.client?.full_name || 'Unknown'}</span>
                                                                    {(item.client as any)?.organization && (
                                                                        <span className="text-[11px] text-storm-gray uppercase font-black tracking-tighter truncate block">{(item.client as any).organization}</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4.5 border-r border-shark/60 text-center">
                                                                <CustomDropdown
                                                                    value={item.status}
                                                                    onChange={(val) => handleUpdateField(item.id, 'status', val)}
                                                                    className="w-28"
                                                                    options={[
                                                                        { label: 'Todo', value: 'Todo', icon: <Circle size={12} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                                        { label: 'In Progress', value: 'In Progress', icon: <Loader2 size={12} className="text-amber-500 animate-spin" />, color: 'text-amber-500' },
                                                                        { label: 'Review', value: 'Review', icon: <Eye size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                                        { label: 'Done', value: 'Done', icon: <Check size={12} className="text-emerald-500" />, color: 'text-emerald-500' },
                                                                    ]}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4.5 text-santas-gray border-r border-shark/60">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <div className="w-5 h-5 rounded-full bg-shark/40 border border-shark flex items-center justify-center text-storm-gray overflow-hidden shrink-0">
                                                                        {item.assignee ? (
                                                                            <div className="w-full h-full bg-[#279da6] text-white flex items-center justify-center text-[7px] font-black">
                                                                                {item.assignee.full_name?.split(' ').map((n: string) => n[0]).join('')}
                                                                            </div>
                                                                        ) : (
                                                                            <PlusIcon size={10} />
                                                                        )}
                                                                    </div>
                                                                    <CustomDropdown
                                                                        value={item.assigned_to || ''}
                                                                        onChange={(val) => handleUpdateField(item.id, 'assigned_to', val)}
                                                                        className="w-32"
                                                                        placeholder="Unassigned"
                                                                        options={[
                                                                            { label: 'Unassigned', value: '' },
                                                                            ...teamMembers.filter((tm: any) => tm.profile_id).map((tm: any) => ({
                                                                                label: tm.name,
                                                                                value: tm.profile_id || '',
                                                                                icon: <User size={12} className="text-[#279da6]" />
                                                                            }))
                                                                        ]}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4.5 border-r border-shark/60 font-black">
                                                                <CustomDropdown
                                                                    value={item.priority}
                                                                    onChange={(val) => handleUpdateField(item.id, 'priority', val)}
                                                                    className="w-28"
                                                                    options={[
                                                                        { label: 'Low', value: 'Low', icon: <Flag size={12} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                                        { label: 'Medium', value: 'Medium', icon: <Flag size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                                        { label: 'High', value: 'High', icon: <Flag size={12} className="text-amber-500" />, color: 'text-amber-500' },
                                                                        { label: 'Critical', value: 'Critical', icon: <Flag size={12} className="text-rose-500" />, color: 'text-rose-500' },
                                                                    ]}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4.5 text-storm-gray border-r border-shark/60 whitespace-nowrap">
                                                                <div className="flex items-center gap-2 group/date relative">
                                                                    <input
                                                                        ref={el => { dateInputRefs.current[item.id] = el; }}
                                                                        type="date"
                                                                        value={item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : ''}
                                                                        onChange={(e) => handleUpdateField(item.id, 'due_date', e.target.value)}
                                                                        className="bg-transparent text-iron border border-transparent hover:border-shark/60 focus:border-[#279da6]/60 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer hover:text-white transition-all text-[11px] font-black uppercase w-28 [color-scheme:dark]"
                                                                    />
                                                                    <CalendarIcon
                                                                        size={12}
                                                                        className="text-storm-gray opacity-30 group-hover/date:opacity-100 transition-opacity cursor-pointer absolute right-2 pointer-events-none"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4.5 text-storm-gray border-r border-shark/60 whitespace-nowrap text-xs">
                                                                {item.updated_at ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="text-iron font-black">{formatDate(item.updated_at)}</span>
                                                                        <span className="opacity-50 font-bold">{formatTime(item.updated_at)}</span>
                                                                    </div>
                                                                ) : '-'}
                                                            </td>
                                                            <td className="px-6 py-4.5 text-storm-gray whitespace-nowrap text-xs">
                                                                <div className="flex flex-col">
                                                                    <span className="text-iron font-black">{formatDate(item.created_at)}</span>
                                                                    <span className="opacity-50 font-bold">{formatTime(item.created_at)}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
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

            <CreateRequestModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleRequestCreated}
            />
        </div >
    );
}
