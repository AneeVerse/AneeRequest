'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    Search,
    ChevronDown,
    Calendar as CalendarIcon,
    Plus as PlusIcon,
    Filter,
    SlidersHorizontal,
    LayoutList,
    Box,
    Check,
    SortAsc,
    SortDesc
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CreateTaskModal from '@/components/CreateTaskModal';
import CustomDropdown from '@/components/CustomDropdown';
import { TaskItem } from '@/lib/data/tasks';
import { formatDate, formatTime } from '@/lib/dateUtils';
import { CircleDashed, RefreshCcw, AlertCircle, CheckCircle2, Flag, User as UserIcon } from 'lucide-react';

interface TasksClientProps {
    initialTasks: TaskItem[];
    profiles: any[];
    teamMembers: any[];
    requests: any[];
}

export default function TasksClient({ initialTasks, profiles, teamMembers, requests }: TasksClientProps) {
    const router = useRouter();
    const { user, isImpersonating, profile, viewAsProfile } = useAuth();
    const displayProfile = viewAsProfile || profile;

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('All Tasks');
    const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        assigned_to: '',
        status: '',
        priority: '',
        due_date: ''
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
        key: 'created_at',
        direction: 'desc'
    });
    const [activeFilterHeader, setActiveFilterHeader] = useState<string | null>(null);
    const dateInputRefs = React.useRef<{ [key: string]: HTMLInputElement | null }>({});

    const taskTabs = ['All Tasks', 'My Tasks', 'In Progress', 'Done'];

    // Update state when initial props change (from SSR refresh)
    React.useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    const handleUpdateField = async (taskId: string, field: string, value: any) => {
        const originalTasks = [...tasks];

        // Optimistic UI update
        const updatedTasks = tasks.map((task: TaskItem) => {
            if (task.id === taskId) {
                const updatedTask = { ...task, [field]: value };
                if (field === 'assigned_to') {
                    const p = profiles.find((pr: any) => pr.id === value);
                    updatedTask.assignee = p ? { id: p.id, full_name: p.full_name } : null;
                }
                return updatedTask;
            }
            return task;
        });

        setTasks(updatedTasks);

        try {
            const response = await fetch(`/api/tasks`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: taskId,
                    [field]: value
                })
            });

            if (!response.ok) {
                setTasks(originalTasks);
                alert(`Failed to update ${field}`);
            } else {
                router.refresh();
            }
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            setTasks(originalTasks);
        }
    };

    const handleTaskCreated = (newTask: TaskItem) => {
        setTasks([newTask, ...tasks]);
    };

    // Data visibility logic
    const isTeamMember = displayProfile?.role === 'team_member';
    const isTeamAdmin = (displayProfile as any)?.team_role === 'admin';

    const visibleTasks = (() => {
        if (isTeamMember && !isTeamAdmin) {
            return tasks.filter((t: TaskItem) => t.assigned_to === displayProfile?.id);
        }
        return tasks;
    })();

    const filteredTasks = visibleTasks.filter((task: TaskItem) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            task.title?.toLowerCase().includes(searchLower) ||
            task.description?.toLowerCase().includes(searchLower);

        // Tab filters
        let matchesTab = true;
        if (activeTab === 'My Tasks') matchesTab = task.assigned_to === user?.id;
        else if (activeTab === 'In Progress') matchesTab = task.status === 'In Progress';
        else if (activeTab === 'Done') matchesTab = task.status === 'Done';

        // Advanced filters
        const matchesAssignee = !filters.assigned_to || task.assigned_to === filters.assigned_to;
        const matchesStatus = !filters.status || task.status === filters.status;
        const matchesPriority = !filters.priority || task.priority === filters.priority;
        const matchesDate = !filters.due_date || (task.due_date && task.due_date.startsWith(filters.due_date));

        return (matchesSearch || false) && matchesTab && matchesAssignee && matchesStatus && matchesPriority && matchesDate;
    });

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
        }));
    };

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (!sortConfig.key || !sortConfig.direction) return 0;

        let aValue: any = (a as any)[sortConfig.key];
        let bValue: any = (b as any)[sortConfig.key];

        // Case-insensitive sorting for strings
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        // Custom handling for nested fields
        if (sortConfig.key === 'creator') {
            aValue = a.creator?.full_name?.toLowerCase() || '';
        } else if (sortConfig.key === 'assignee') {
            aValue = a.assignee?.full_name?.toLowerCase() || '';
        } else if (sortConfig.key === 'request') {
            aValue = a.request_links?.[0]?.request?.title?.toLowerCase() || '';
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
                        label="Team Tasks"
                        labelIcon={<Box size={16} className="text-santas-gray" />}
                        tabs={taskTabs}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        onCreate={displayProfile?.role === 'super_admin' ? () => setShowCreateModal(true) : undefined}
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
                                                placeholder="Search tasks..."
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
                                                                    assigned_to: '',
                                                                    status: '',
                                                                    priority: '',
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
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-bold text-storm-gray uppercase">Assigned To</label>
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
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-bold text-storm-gray uppercase">Status</label>
                                                                <CustomDropdown
                                                                    value={filters.status}
                                                                    onChange={(val) => setFilters(f => ({ ...f, status: val }))}
                                                                    options={[
                                                                        { label: 'All Statuses', value: '' },
                                                                        { label: 'Todo', value: 'Todo', icon: <CircleDashed size={12} className="text-storm-gray" /> },
                                                                        { label: 'In Progress', value: 'In Progress', icon: <RefreshCcw size={12} className="text-malibu" /> },
                                                                        { label: 'Review', value: 'Review', icon: <AlertCircle size={12} className="text-amber-400" /> },
                                                                        { label: 'Done', value: 'Done', icon: <CheckCircle2 size={12} className="text-emerald-400" /> },
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
                                                                        { label: 'All Priorities', value: '' },
                                                                        { label: 'Low', value: 'Low', icon: <Flag size={12} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                                        { label: 'Medium', value: 'Medium', icon: <Flag size={12} className="text-malibu" />, color: 'text-malibu' },
                                                                        { label: 'High', value: 'High', icon: <Flag size={12} className="text-amber-500" />, color: 'text-amber-500' },
                                                                        { label: 'Critical', value: 'Critical', icon: <Flag size={12} className="text-rose-500" />, color: 'text-rose-500' },
                                                                    ]}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-bold text-storm-gray uppercase">Due Date</label>
                                                                <input
                                                                    type="date"
                                                                    value={filters.due_date}
                                                                    onChange={(e) => setFilters(f => ({ ...f, due_date: e.target.value }))}
                                                                    className="w-full bg-[#09090B] border border-shark rounded-lg px-2 py-1.5 text-[11px] font-bold focus:outline-none focus:border-[#279da6]/40 text-iron [color-scheme:dark]"
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
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse table-auto">
                                            <thead>
                                                <tr className="border-b border-shark text-storm-gray text-xs uppercase font-black tracking-widest bg-shark/20">
                                                    <th className="px-5 py-5 w-12 border-r border-shark/60 text-center">#</th>
                                                    {[
                                                        { label: 'Title', key: 'title', filter: 'title', width: 'min-w-[200px]' },
                                                        { label: 'Request', key: 'request', filter: 'request', width: 'min-w-[180px]' },
                                                        { label: 'Creator', key: 'creator', filter: 'creator', width: 'min-w-[150px]' },
                                                        { label: 'Status', key: 'status', filter: 'status', width: 'min-w-[120px]' },
                                                        { label: 'Assigned', key: 'assignee', filter: 'assigned_to', width: 'min-w-[150px]' },
                                                        { label: 'Priority', key: 'priority', filter: 'priority', width: 'min-w-[120px]' },
                                                        { label: 'Due Date', key: 'due_date', filter: 'due_date', width: 'min-w-[150px]' },
                                                        { label: 'Last Updated', key: 'updated_at', filter: 'updated_at', width: 'min-w-[150px]' },
                                                        { label: 'Created', key: 'created_at', filter: 'created_at', width: 'min-w-[150px]' }
                                                    ].map((header, idx) => (
                                                        <th key={header.label} className={`px-4 py-5 border-r border-shark/60 group/header relative header-filter-container ${header.width || ''} ${idx === 8 ? 'border-r-0' : ''}`}>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="cursor-default">{header.label}</span>
                                                                <button
                                                                    onClick={() => setActiveFilterHeader(activeFilterHeader === header.filter ? null : header.filter)}
                                                                    className={`p-1 rounded hover:bg-shark/40 transition-colors ${((filters as any)[header.filter] && header.filter !== 'title' && header.filter !== 'creator' && header.filter !== 'request') || sortConfig.key === header.key ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                                >
                                                                    <Filter size={10} />
                                                                </button>
                                                            </div>

                                                            {activeFilterHeader === header.filter && (
                                                                <div className={`absolute top-full ${idx > 5 ? 'right-0' : 'left-0'} mt-1 w-44 bg-[#121214] border border-shark rounded-lg shadow-2xl p-2 z-[60] normal-case tracking-normal`}>
                                                                    <div className="mb-2 border-b border-shark/40 pb-2">
                                                                        <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Sort</div>
                                                                        <button
                                                                            onClick={() => { setSortConfig({ key: header.key, direction: 'asc' }); setActiveFilterHeader(null); }}
                                                                            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === header.key && sortConfig.direction === 'asc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                        >
                                                                            <SortAsc size={12} />
                                                                            <span>Sort A-Z</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { setSortConfig({ key: header.key, direction: 'desc' }); setActiveFilterHeader(null); }}
                                                                            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] hover:bg-shark/40 transition-colors ${sortConfig.key === header.key && sortConfig.direction === 'desc' ? 'text-[#279da6] bg-shark/20' : 'text-iron'}`}
                                                                        >
                                                                            <SortDesc size={12} />
                                                                            <span>Sort Z-A</span>
                                                                        </button>
                                                                    </div>

                                                                    {['status', 'assigned_to', 'priority', 'due_date'].includes(header.filter) && (
                                                                        <div>
                                                                            <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Filter</div>
                                                                            {header.filter === 'status' && (
                                                                                <CustomDropdown
                                                                                    value={filters.status}
                                                                                    onChange={(val) => { setFilters(f => ({ ...f, status: val })); setActiveFilterHeader(null); }}
                                                                                    options={[
                                                                                        { label: 'All Status', value: '' },
                                                                                        { label: 'Todo', value: 'Todo', icon: <CircleDashed size={12} className="text-storm-gray" /> },
                                                                                        { label: 'In Progress', value: 'In Progress', icon: <RefreshCcw size={12} className="text-malibu" /> },
                                                                                        { label: 'Review', value: 'Review', icon: <AlertCircle size={12} className="text-amber-400" /> },
                                                                                        { label: 'Done', value: 'Done', icon: <CheckCircle2 size={12} className="text-emerald-400" /> },
                                                                                    ]}
                                                                                />
                                                                            )}
                                                                            {header.filter === 'assigned_to' && (
                                                                                <CustomDropdown
                                                                                    value={filters.assigned_to}
                                                                                    onChange={(val) => { setFilters(f => ({ ...f, assigned_to: val })); setActiveFilterHeader(null); }}
                                                                                    options={[
                                                                                        { label: 'All Team', value: '' },
                                                                                        ...teamMembers.map((m: any) => ({
                                                                                            label: m.full_name || (m as any).name,
                                                                                            value: m.profile_id || m.id,
                                                                                            icon: <UserIcon size={12} className="text-storm-gray" />
                                                                                        }))
                                                                                    ]}
                                                                                />
                                                                            )}
                                                                            {header.filter === 'priority' && (
                                                                                <CustomDropdown
                                                                                    value={filters.priority}
                                                                                    onChange={(val) => { setFilters(f => ({ ...f, priority: val })); setActiveFilterHeader(null); }}
                                                                                    options={[
                                                                                        { label: 'All Priority', value: '' },
                                                                                        { label: 'Low', value: 'Low', icon: <Flag size={12} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                                                        { label: 'Medium', value: 'Medium', icon: <Flag size={12} className="text-malibu" />, color: 'text-malibu' },
                                                                                        { label: 'High', value: 'High', icon: <Flag size={12} className="text-amber-500" />, color: 'text-amber-500' },
                                                                                        { label: 'Critical', value: 'Critical', icon: <Flag size={12} className="text-rose-500" />, color: 'text-rose-500' },
                                                                                    ]}
                                                                                />
                                                                            )}
                                                                            {header.filter === 'due_date' && (
                                                                                <input
                                                                                    type="date"
                                                                                    value={filters.due_date}
                                                                                    onChange={(e) => { setFilters(f => ({ ...f, due_date: e.target.value })); setActiveFilterHeader(null); }}
                                                                                    className="w-full bg-[#09090B] border border-shark/50 rounded-md py-1 px-2 text-[10px] text-iron focus:outline-none [color-scheme:dark]"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {['title', 'request', 'creator'].includes(header.filter) && (
                                                                        <div>
                                                                            <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Filter</div>
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Search..."
                                                                                value={searchQuery}
                                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                                                className="w-full bg-[#09090B] border border-shark/50 rounded-md py-1.5 px-2 text-[10px] text-iron focus:outline-none placeholder:text-storm-gray/50"
                                                                                autoFocus
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-shark/60">
                                                {sortedTasks.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={10} className="px-6 py-20 text-center text-storm-gray uppercase text-[10px] font-black tracking-widest opacity-40">
                                                            No tasks found for your criteria.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    sortedTasks.map((item: TaskItem, index: number) => (
                                                        <tr key={item.id} className="hover:bg-shark/10 transition-colors group text-sm">
                                                            <td className="px-5 py-4.5 border-r border-shark/60 text-center font-black text-storm-gray">
                                                                {(index + 1).toString().padStart(2, '0')}
                                                            </td>
                                                            <td
                                                                className="px-6 py-4.5 font-black text-iron border-r border-shark/60 group-hover:text-[#279da6] whitespace-nowrap cursor-pointer transition-colors"
                                                                onClick={() => router.push(`/tasks/${item.id}`)}
                                                            >
                                                                {item.title}
                                                            </td>
                                                            <td className="px-6 py-4.5 text-santas-gray border-r border-shark/60 whitespace-nowrap">
                                                                {item.request_links && item.request_links.length > 0 ? (
                                                                    <div className="flex flex-col gap-1.5">
                                                                        {item.request_links.map((link, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                onClick={() => router.push(`/requests/${link.request?.id}`)}
                                                                                className="flex flex-col cursor-pointer hover:text-[#279da6] transition-colors leading-tight"
                                                                            >
                                                                                <span className="text-iron font-black truncate max-w-[150px] text-xs">{link.request?.title}</span>
                                                                                {idx === 0 && <span className="text-[10px] opacity-40 uppercase font-black tracking-widest leading-none mt-0.5">Internal Request</span>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="opacity-30 italic">None</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4.5 text-santas-gray border-r border-shark/60 whitespace-nowrap font-bold">
                                                                {item.creator?.full_name || 'System'}
                                                            </td>
                                                            <td className="px-6 py-4.5 border-r border-shark/60">
                                                                <CustomDropdown
                                                                    value={item.status}
                                                                    onChange={(val) => handleUpdateField(item.id, 'status', val)}
                                                                    options={[
                                                                        { label: 'Todo', value: 'Todo', icon: <CircleDashed size={12} className="text-storm-gray" /> },
                                                                        { label: 'In Progress', value: 'In Progress', icon: <RefreshCcw size={12} className="text-malibu" /> },
                                                                        { label: 'Review', value: 'Review', icon: <AlertCircle size={12} className="text-amber-400" /> },
                                                                        { label: 'Done', value: 'Done', icon: <CheckCircle2 size={12} className="text-emerald-400" /> },
                                                                    ]}
                                                                    className="w-28"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4.5 text-santas-gray border-r border-shark/60 whitespace-nowrap">
                                                                <div className="flex items-center gap-2">
                                                                    <CustomDropdown
                                                                        value={item.assigned_to || ''}
                                                                        onChange={(val) => handleUpdateField(item.id, 'assigned_to', val)}
                                                                        options={[
                                                                            { label: 'Unassigned', value: '', icon: <PlusIcon size={12} className="text-storm-gray" /> },
                                                                            ...teamMembers.filter((tm: any) => tm.profile_id).map((tm: any) => ({
                                                                                label: tm.name || tm.full_name,
                                                                                value: tm.profile_id,
                                                                                icon: <UserIcon size={12} className="text-[#279da6]" />
                                                                            }))
                                                                        ]}
                                                                        className="w-36"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4.5 border-r border-shark/60 font-black text-center">
                                                                <CustomDropdown
                                                                    value={item.priority}
                                                                    onChange={(val) => handleUpdateField(item.id, 'priority', val)}
                                                                    options={[
                                                                        { label: 'Low', value: 'Low', icon: <Flag size={12} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                                        { label: 'Medium', value: 'Medium', icon: <Flag size={12} className="text-malibu" />, color: 'text-malibu' },
                                                                        { label: 'High', value: 'High', icon: <Flag size={12} className="text-amber-500" />, color: 'text-amber-500' },
                                                                        { label: 'Critical', value: 'Critical', icon: <Flag size={12} className="text-rose-500" />, color: 'text-rose-500' },
                                                                    ]}
                                                                    className="w-28"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4.5 text-storm-gray border-r border-shark/60 whitespace-nowrap">
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

            <CreateTaskModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleTaskCreated}
                profiles={profiles}
                teamMembers={teamMembers}
                requests={requests}
            />
        </div>
    );
}
