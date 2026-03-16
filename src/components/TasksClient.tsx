'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    Search,
    ChevronDown,
    Calendar,
    Filter,
    SlidersHorizontal,
    LayoutList,
    CheckSquare,
    SortAsc,
    SortDesc,
    Loader2,
    Pencil,
    FileText,
    Flag,
    UserCog,
    Check,
    User as UserIcon,
    X,
    Circle,
    Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CustomDropdown from '@/components/CustomDropdown';

import CustomDateRangePicker from '@/components/CustomDateRangePicker';
import TasksTable from '@/components/TasksTable';
import { TaskItem } from '@/lib/data/tasks';

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
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('ONGOING');
    const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        title: '',
        request: '',
        assigned_to: '',
        status: '',
        priority: '',
        due_date_from: '',
        due_date_to: ''
    });

    const [taskFormData, setTaskFormData] = useState({
        title: '',
        priority: 'Medium',
        description: '',
        assigned_to: '',
        due_date: '',
        request_ids: [] as string[]
    });

    const inlineTaskInputRef = React.useRef<HTMLInputElement>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
        key: 'created_at',
        direction: 'desc'
    });
    const [activeFilterHeader, setActiveFilterHeader] = useState<string | null>(null);
    const dateInputRefs = React.useRef<{ [key: string]: HTMLInputElement | null }>({});

    const taskTabs = ['ONGOING', 'COMPLETED', 'ALL'];

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

    useEffect(() => {
        // Initial check for mobile to auto-collapse
        if (window.innerWidth < 1024) {
            setIsSidebarCollapsed(true);
        }

        if (isCreating && inlineTaskInputRef.current) {
            inlineTaskInputRef.current.focus();
        }
    }, [isCreating]);

    const handleInlineCreate = async () => {
        if (!taskFormData.title.trim()) return;
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...taskFormData,
                    status: 'Todo'
                })
            });

            if (res.ok) {
                setIsCreating(false);
                setTaskFormData({ title: '', priority: 'Medium', description: '', assigned_to: '', due_date: '', request_ids: [] });
                router.refresh();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create task');
            }
        } catch (e) {
            console.error(e);
            alert('Error creating task');
        } finally {
            setIsSubmitting(false);
        }
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
        if (activeTab === 'ONGOING') matchesTab = ['Todo', 'In Progress', 'Review'].includes(task.status || '');
        else if (activeTab === 'COMPLETED') matchesTab = task.status === 'Done';

        // Advanced filters
        const matchesTitle = !filters.title || task.title?.toLowerCase().includes(filters.title.toLowerCase());
        const matchesRequest = !filters.request || task.request_links?.some(link => link.request?.title?.toLowerCase().includes(filters.request.toLowerCase()));
        const matchesAssignee = !filters.assigned_to || task.assigned_to === filters.assigned_to;
        const matchesStatus = !filters.status || task.status === filters.status;
        const matchesPriority = !filters.priority || task.priority === filters.priority;

        let matchesDate = true;
        if (filters.due_date_from) {
            matchesDate = matchesDate && !!task.due_date && task.due_date >= filters.due_date_from;
        }
        if (filters.due_date_to) {
            matchesDate = matchesDate && !!task.due_date && task.due_date <= filters.due_date_to;
        }

        return (matchesSearch || false) && matchesTab && matchesTitle && matchesRequest && matchesAssignee && matchesStatus && matchesPriority && matchesDate;
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

    // Compute counts per tab for notification badges
    const tabCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        taskTabs.forEach(tab => {
            counts[tab] = visibleTasks.filter(task => {
                if (tab === 'ALL' || tab === 'All') return true;
                if (tab === 'ONGOING') return ['Todo', 'In Progress', 'Review'].includes(task.status || '');
                if (tab === 'COMPLETED') return task.status === 'Done';
                return true;
            }).length;
        });
        return counts;
    }, [visibleTasks, taskTabs, user?.id]);

    const filtersElement = (
        <div className="relative">
            <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold z-10 ${Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'created_at' && sortConfig.direction === 'desc')) ? 'bg-[#279da6]/20 border-[#279da6]/60 text-[#279da6] active:scale-95' : 'border-shark bg-[#121214] text-santas-gray hover:text-white hover:bg-shark/40'}`}
            >
                <Filter size={14} className={Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'created_at' && sortConfig.direction === 'desc')) ? 'fill-[#279da6]/20' : ''} />
                <span className="hidden sm:inline">Filters</span>
                <ChevronDown size={14} className={isFilterOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-[500px] bg-[#121214] border border-shark rounded-xl shadow-2xl p-4 sm:p-5 z-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-[#279da6]">Advanced Filters</h4>
                        <button
                            onClick={() => {
                                setFilters({
                                    title: '',
                                    request: '',
                                    assigned_to: '',
                                    status: '',
                                    priority: '',
                                    due_date_from: '',
                                    due_date_to: ''
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
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Request</label>
                                <div className="relative group">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                    <input
                                        type="text"
                                        value={filters.request}
                                        onChange={(e) => setFilters(f => ({ ...f, request: e.target.value }))}
                                        placeholder="Search req..."
                                        className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-10 text-[12px] font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                    />
                                    {filters.request && (
                                        <button
                                            onClick={() => setFilters(f => ({ ...f, request: '' }))}
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
                <div className={`flex-1 flex flex-col min-w-0 bg-[#121214] rounded-t-2xl overflow-hidden border-t border-l border-r mt-2 sm:mt-6 mr-2 sm:mr-6 responsive-content-wrapper transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
                    <div className="border-b border-shark">
                        <Header

                            onMobileMenuToggle={() => setIsMobileOpen(true)}
                            label="Team Tasks"
                            labelIcon={<CheckSquare size={16} className="text-[#279da6]" />}
                            tabs={taskTabs}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            tabCounts={tabCounts}
                            onCreate={(displayProfile?.role === 'super_admin' || displayProfile?.team_role === 'admin') ? () => setIsCreating(true) : undefined}
                            isCreating={isCreating}
                            onConfirm={handleInlineCreate}
                            onCancel={() => {
                                setIsCreating(false);
                                setTaskFormData({ title: '', priority: 'Medium', description: '', assigned_to: '', due_date: '', request_ids: [] });
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
                                    ? 'max-h-[600px] opacity-100 mb-8 translate-y-0 scale-100 blur-0'
                                    : 'max-h-0 opacity-0 mb-0 -translate-y-4 scale-95 blur-md pointer-events-none'
                                    }`}
                            >
                                <div className="p-1 bg-[#121214]/90 backdrop-blur-2xl border border-[#279da6]/30 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(39,157,166,0.08)] ring-1 ring-white/5 relative overflow-hidden">
                                    <div className="p-3 sm:p-6 space-y-6">
                                        <div className="flex items-start gap-4 sm:gap-6">
                                            <div className="flex flex-col items-center gap-3 shrink-0">
                                                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 flex items-center justify-center text-amber-400 shadow-inner ring-1 ring-amber-400/20">
                                                    <CheckSquare size={28} />
                                                </div>
                                                <p className="text-[10px] font-black text-storm-gray uppercase tracking-widest">Task</p>
                                            </div>

                                            <div className="flex-1 space-y-6">
                                                {/* Top Row: Title & Priority & Assignee */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                                    <div className="space-y-1.5 md:col-span-2">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Task Title</label>
                                                        <div className="relative group">
                                                            <Pencil size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                ref={inlineTaskInputRef}
                                                                type="text"
                                                                value={taskFormData.title}
                                                                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                                                                placeholder="What needs to be done?"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Priority</label>
                                                        <CustomDropdown
                                                            value={taskFormData.priority}
                                                            onChange={(val: any) => setTaskFormData({ ...taskFormData, priority: val })}
                                                            options={[
                                                                { label: 'Low', value: 'Low', icon: <Flag size={14} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                                { label: 'Medium', value: 'Medium', icon: <Flag size={14} className="text-blue-400" />, color: 'text-blue-400' },
                                                                { label: 'High', value: 'High', icon: <Flag size={14} className="text-amber-500" />, color: 'text-amber-500' },
                                                                { label: 'Critical', value: 'Critical', icon: <Flag size={14} className="text-rose-500" />, color: 'text-rose-500' }
                                                            ]}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Assignee</label>
                                                        <CustomDropdown
                                                            value={taskFormData.assigned_to}
                                                            onChange={(val: any) => setTaskFormData({ ...taskFormData, assigned_to: val })}
                                                            options={[
                                                                { label: 'Select Member', value: '' },
                                                                ...teamMembers.map((m: any) => ({
                                                                    label: m.full_name || (m as any).name,
                                                                    value: m.profile_id || m.id,
                                                                    icon: <UserCog size={14} className="text-[#279da6]" />
                                                                }))
                                                            ]}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Bottom Row: Description & Due Date & Requests */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                                    <div className="space-y-1.5 md:col-span-2">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Description</label>
                                                        <div className="relative group/input">
                                                            <FileText size={14} className="absolute left-3.5 top-3 text-storm-gray group-focus-within/input:text-[#279da6] transition-colors" />
                                                            <textarea
                                                                value={taskFormData.description}
                                                                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                                                                placeholder="Add details about this task..."
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
                                                                value={taskFormData.due_date}
                                                                onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold [color-scheme:dark]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Link to Requests</label>
                                                        <CustomDropdown
                                                            value={''} // Multiple selection not handled by CustomDropdown easily, but we'll show available requests
                                                            onChange={(val: any) => {
                                                                if (val && !taskFormData.request_ids.includes(val)) {
                                                                    setTaskFormData({ ...taskFormData, request_ids: [...taskFormData.request_ids, val] });
                                                                }
                                                            }}
                                                            options={[
                                                                { label: 'Select Requests', value: '' },
                                                                ...requests.map((r: any) => ({
                                                                    label: r.title,
                                                                    value: r.id,
                                                                    icon: <FileText size={14} className={taskFormData.request_ids.includes(r.id) ? 'text-[#279da6]' : 'text-storm-gray'} />
                                                                }))
                                                            ]}
                                                        />
                                                        {taskFormData.request_ids.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {taskFormData.request_ids.map(id => {
                                                                    const req = requests.find((r: any) => r.id === id);
                                                                    return (
                                                                        <div key={id} className="flex items-center gap-1 px-2 py-0.5 bg-[#279da6]/10 border border-[#279da6]/20 rounded-md text-[9px] font-bold text-[#279da6]">
                                                                            <span className="truncate max-w-[80px]">{req?.title || 'Unknown'}</span>
                                                                            <button onClick={() => setTaskFormData({ ...taskFormData, request_ids: taskFormData.request_ids.filter(rid => rid !== id) })}>
                                                                                <X size={10} />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <TasksTable
                                tasks={sortedTasks}
                                profiles={profiles}
                                teamMembers={teamMembers}
                                searchQuery={searchQuery}
                            />
                        </div>

                    </main>
                </div>
            </div>
        </div>
    );
}
