'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

import { useRouter } from 'next/navigation';
import {
    ChevronDown,
    Calendar as CalendarIcon,
    Plus as PlusIcon,
    Filter,
    Circle,
    Loader2,
    Eye,
    Check,
    AlertCircle,
    Flag,
    User as UserIcon,
    UserPlus,
    SortAsc,
    SortDesc,
    X,
    Search
} from 'lucide-react';
import Image from 'next/image';
import CustomDropdown from '@/components/CustomDropdown';
import { TaskItem } from '@/lib/data/tasks';
import { formatDate, formatTime } from '@/lib/dateUtils';

interface TasksTableProps {
    tasks?: TaskItem[];
    profiles?: any[];
    teamMembers?: any[];
    onUpdateField?: (taskId: string, field: string, value: any) => Promise<void>;
    showRequestColumn?: boolean;
    showOrganizationColumn?: boolean;
    searchQuery?: string;
}

export default function TasksTable({
    tasks: initialTasks = [],
    profiles = [],
    teamMembers = [],
    onUpdateField,
    showRequestColumn = true,
    showOrganizationColumn = true,
    searchQuery = ''
}: TasksTableProps) {
    const router = useRouter();
    const [activeFilterHeader, setActiveFilterHeader] = useState<string | null>(null);
    const [filterCoords, setFilterCoords] = useState({ top: 0, left: 0, width: 0 });
    const [mounted, setMounted] = useState(false);
    const headerRefs = React.useRef<{ [key: string]: HTMLTableCellElement | null }>({});

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const updateFilterPosition = (filterKey: string) => {
        const el = headerRefs.current[filterKey];
        if (el) {
            const rect = el.getBoundingClientRect();
            setFilterCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };

    const toggleFilter = (filterKey: string) => {
        if (activeFilterHeader === filterKey) {
            setActiveFilterHeader(null);
        } else {
            updateFilterPosition(filterKey);
            setActiveFilterHeader(filterKey);
        }
    };

    const [filters, setFilters] = useState({
        title: '',
        organization: '',
        assigned_to: '',
        status: '',
        priority: '',
        due_date: ''
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
        key: 'created_at',
        direction: 'desc'
    });
    const dateInputRefs = React.useRef<{ [key: string]: HTMLInputElement | null }>({});

    const handleUpdate = async (taskId: string, field: string, value: any) => {
        if (onUpdateField) {
            await onUpdateField(taskId, field, value);
        } else {
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
                    alert(`Failed to update ${field}`);
                } else {
                    router.refresh();
                }
            } catch (error) {
                console.error(`Error updating ${field}:`, error);
            }
        }
    };

    const filteredTasks = initialTasks.filter((task: TaskItem) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            task.title?.toLowerCase().includes(searchLower) ||
            task.description?.toLowerCase().includes(searchLower);

        // Advanced filters
        const matchesTitle = !filters.title || task.title?.toLowerCase().includes(filters.title.toLowerCase());
        const matchesOrganization = !filters.organization || task.request_links?.[0]?.request?.client?.organization?.toLowerCase().includes(filters.organization.toLowerCase());
        const matchesAssignee = !filters.assigned_to || task.assigned_to === filters.assigned_to;
        const matchesStatus = !filters.status || task.status === filters.status;
        const matchesPriority = !filters.priority || task.priority === filters.priority;
        const matchesDate = !filters.due_date || (task.due_date && task.due_date.startsWith(filters.due_date));

        return (matchesSearch || false) && matchesTitle && matchesOrganization && matchesAssignee && matchesStatus && matchesPriority && matchesDate;
    });

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (!sortConfig.key || !sortConfig.direction) return 0;

        let aValue: any = (a as any)[sortConfig.key];
        let bValue: any = (b as any)[sortConfig.key];

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (sortConfig.key === 'creator') {
            aValue = a.creator?.full_name?.toLowerCase() || '';
            bValue = b.creator?.full_name?.toLowerCase() || '';
        } else if (sortConfig.key === 'assignee') {
            aValue = a.assignee?.full_name?.toLowerCase() || '';
            bValue = b.assignee?.full_name?.toLowerCase() || '';
        } else if (sortConfig.key === 'organization') {
            aValue = a.request_links?.[0]?.request?.client?.organization?.toLowerCase() || '';
            bValue = b.request_links?.[0]?.request?.client?.organization?.toLowerCase() || '';
        } else if (sortConfig.key === 'request') {
            aValue = a.request_links?.[0]?.request?.title?.toLowerCase() || '';
            bValue = b.request_links?.[0]?.request?.title?.toLowerCase() || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

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
        <div className="border border-shark/60 rounded-xl overflow-hidden bg-black/20">
            {/* Mobile View: Stacked Cards */}
            <div className="sm:hidden flex flex-col divide-y divide-shark/60 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {sortedTasks.length === 0 ? (
                    <div className="px-6 py-20 text-center text-storm-gray uppercase text-[10px] font-black tracking-widest opacity-40">
                        No tasks found for your criteria.
                    </div>
                ) : (
                    sortedTasks.map((item: TaskItem, index: number) => (
                        <div key={item.id} className="p-4 bg-shark/5 flex flex-col gap-4">
                            {/* Card Header: Index & Title */}
                            <div className="flex items-start gap-3">
                                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-shark/40 text-[10px] font-black text-storm-gray border border-shark/60">
                                    {(index + 1).toString().padStart(2, '0')}
                                </div>
                                <div
                                    className="flex-1 cursor-pointer group"
                                    onClick={() => router.push(`/tasks/${item.slug || item.id}`)}
                                >
                                    <h3 className="text-xs font-black text-iron uppercase leading-tight group-hover:text-[#279da6] transition-colors line-clamp-2">
                                        {item.title}
                                    </h3>
                                    <div className="flex flex-col gap-1 mt-1.5">
                                        {showOrganizationColumn && item.request_links && item.request_links[0]?.request?.client && (
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <div className="w-4 h-4 rounded bg-shark/40 border border-shark/60 flex items-center justify-center text-[7px] font-black text-[#279da6] shrink-0 overflow-hidden">
                                                    {item.request_links?.[0]?.request?.client?.avatar_url ? (
                                                        <img
                                                            src={item.request_links[0].request.client.avatar_url}
                                                            alt={item.request_links[0].request.client.organization || 'Org'}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                                const parent = target.parentElement;
                                                                if (parent) {
                                                                    const char = item.request_links?.[0]?.request?.client?.organization?.[0] || 'O';
                                                                    parent.innerHTML = `<span>${char}</span>`;
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <span>{item.request_links?.[0]?.request?.client?.organization?.[0] || 'O'}</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-bold text-[#279da6] truncate uppercase tracking-tight">
                                                    {item.request_links[0].request.client.organization || 'Individual'}
                                                </span>
                                            </div>
                                        )}
                                        {showRequestColumn && item.request_links && item.request_links.length > 0 && (
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <span className="text-[8px] font-black text-storm-gray/40 uppercase tracking-widest shrink-0">REQ:</span>
                                                <span className="text-[9px] font-bold text-iron/60 truncate uppercase tracking-tight">
                                                    {item.request_links[0].request?.title}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card Body: Status, Priority, Assignee */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-storm-gray uppercase tracking-widest block opacity-50">Status</label>
                                    <CustomDropdown
                                        value={item.status}
                                        onChange={(val) => handleUpdate(item.id, 'status', val)}
                                        options={[
                                            { label: 'TODO', value: 'Todo', icon: <Circle size={10} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                            { label: 'IN PROGRESS', value: 'In Progress', icon: <Loader2 size={10} className="text-amber-500 animate-spin" />, color: 'text-amber-500' },
                                            { label: 'REVIEW', value: 'Review', icon: <Eye size={10} className="text-blue-400" />, color: 'text-blue-400' },
                                            { label: 'DONE', value: 'Done', icon: <Check size={10} className="text-emerald-500" />, color: 'text-emerald-500' },
                                        ]}
                                        variant="minimal"
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-storm-gray uppercase tracking-widest block opacity-50">Priority</label>
                                    <CustomDropdown
                                        value={item.priority}
                                        onChange={(val) => handleUpdate(item.id, 'priority', val)}
                                        options={[
                                            { label: 'LOW', value: 'Low', icon: <Flag size={10} className="text-storm-gray" />, color: 'text-storm-gray' },
                                            { label: 'MEDIUM', value: 'Medium', icon: <Flag size={10} className="text-blue-400" />, color: 'text-blue-400' },
                                            { label: 'HIGH', value: 'High', icon: <Flag size={10} className="text-amber-500" />, color: 'text-amber-500' },
                                            { label: 'CRITICAL', value: 'Critical', icon: <Flag size={10} className="text-rose-500" />, color: 'text-rose-500' },
                                        ]}
                                        variant="minimal"
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-storm-gray uppercase tracking-widest block opacity-50">Assigned To</label>
                                    <CustomDropdown
                                        value={item.assigned_to || ''}
                                        onChange={(val) => handleUpdate(item.id, 'assigned_to', val)}
                                        options={[
                                            { label: 'UNASSIGNED', value: '', icon: <UserPlus size={10} className="text-storm-gray" /> },
                                            ...teamMembers.filter((tm: any) => tm.profile_id).map((tm: any) => ({
                                                label: (tm.name || tm.full_name)?.toUpperCase(),
                                                value: tm.profile_id,
                                                icon: tm.avatar_url ? (
                                                    <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0 border border-shark/60">
                                                        <img src={tm.avatar_url} alt={tm.name} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : <UserIcon size={10} className="text-[#279da6]" />
                                            }))
                                        ]}
                                        variant="minimal"
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-storm-gray uppercase tracking-widest block opacity-50">Due Date</label>
                                    <div className="relative group/date">
                                        <input
                                            type="date"
                                            value={item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : ''}
                                            onChange={(e) => handleUpdate(item.id, 'due_date', e.target.value)}
                                            className="bg-transparent text-iron border border-shark/30 hover:border-[#279da6]/40 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer hover:text-white transition-all text-[10px] font-black uppercase w-full [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop View: Standard Table */}
            <div className="hidden sm:block overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-shark text-storm-gray text-xs uppercase font-black tracking-widest bg-[#17171a]">
                            <th className="px-5 py-3 w-10 sm:w-16 border-r border-shark/60 text-center font-black text-storm-gray">#</th>
                            {[
                                { label: 'Title', key: 'title', filter: 'title', width: 'min-w-[240px]' },
                                ...(showOrganizationColumn ? [{ label: 'Organization', key: 'organization', filter: 'organization', width: 'min-w-[200px]' }] : []),
                                ...(showRequestColumn ? [{ label: 'Request', key: 'request', filter: 'request', width: 'min-w-[180px]' }] : []),
                                { label: 'Status', key: 'status', filter: 'status', width: 'min-w-[140px]' },
                                { label: 'Assigned', key: 'assignee', filter: 'assigned_to', width: 'min-w-[160px]' },
                                { label: 'Priority', key: 'priority', filter: 'priority', width: 'min-w-[120px]' },
                                { label: 'Due Date', key: 'due_date', filter: 'due_date', width: 'min-w-[120px]' },
                                { label: 'Updated', key: 'updated_at', filter: 'updated_at', width: 'min-w-[140px]' },
                                { label: 'Created', key: 'created_at', filter: 'created_at', width: 'min-w-[140px]' }
                            ].map((header, idx) => (
                                <th
                                    key={header.label}
                                    ref={el => { headerRefs.current[header.filter] = el; }}
                                    className={`px-3 py-3 border-r border-shark/60 group/header relative header-filter-container ${header.width || ''}`}
                                >
                                    <div className={`flex items-center gap-2 ${(header.key === 'updated_at' || header.key === 'created_at') ? 'justify-center' : 'justify-between'}`}>
                                        {header.filter === 'title' ? (
                                            <div className="relative flex-1 group -ml-1">
                                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                <input
                                                    type="text"
                                                    value={filters.title}
                                                    onChange={(e) => setFilters(f => ({ ...f, title: e.target.value }))}
                                                    placeholder="TITLE"
                                                    className="w-full bg-transparent border-none py-1.5 pl-8 pr-6 text-[11px] font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none transition-all"
                                                />
                                                {filters.title && (
                                                    <button onClick={() => setFilters(f => ({ ...f, title: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white">
                                                        <X size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : header.filter === 'organization' ? (
                                            <div className="relative flex-1 group -ml-1">
                                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                <input
                                                    type="text"
                                                    value={filters.organization}
                                                    onChange={(e) => setFilters(f => ({ ...f, organization: e.target.value }))}
                                                    placeholder="ORGANIZATION"
                                                    className="w-full bg-transparent border-none py-1.5 pl-8 pr-6 text-[11px] font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none transition-all"
                                                />
                                                {filters.organization && (
                                                    <button onClick={() => setFilters(f => ({ ...f, organization: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white">
                                                        <X size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <span className="cursor-default text-[10px] font-black">{header.label}</span>
                                                <button
                                                    onClick={() => toggleFilter(header.filter)}
                                                    className={`p-1 rounded hover:bg-shark/40 transition-colors ${((filters as any)[header.filter] && !['creator', 'request'].includes(header.filter)) || sortConfig.key === header.key ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                >
                                                    <Filter size={10} />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {activeFilterHeader === header.filter && header.filter !== 'title' && header.filter !== 'organization' && mounted && typeof document !== 'undefined' && createPortal(
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: `${filterCoords.top + 4}px`,
                                                left: idx > 4 ? `${filterCoords.left + filterCoords.width - 192}px` : `${filterCoords.left}px`,
                                            }}
                                            className={`w-48 bg-[#121214] border border-shark rounded-xl shadow-2xl p-2 z-[9999] normal-case tracking-normal animate-zoom-in`}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="mb-2 border-b border-shark/40 pb-2">
                                                <div className="text-[9px] font-black text-storm-gray uppercase mb-1 px-1 tracking-widest">Sort</div>
                                                <button
                                                    onClick={() => { setSortConfig({ key: header.key, direction: 'asc' }); setActiveFilterHeader(null); }}
                                                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider hover:bg-[#279da6]/10 hover:text-white transition-all ${sortConfig.key === header.key && sortConfig.direction === 'asc' ? 'text-[#279da6] bg-[#279da6]/5' : 'text-storm-gray'}`}
                                                >
                                                    <SortAsc size={12} />
                                                    <span>Ascending</span>
                                                </button>
                                                <button
                                                    onClick={() => { setSortConfig({ key: header.key, direction: 'desc' }); setActiveFilterHeader(null); }}
                                                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider hover:bg-[#279da6]/10 hover:text-white transition-all ${sortConfig.key === header.key && sortConfig.direction === 'desc' ? 'text-[#279da6] bg-[#279da6]/5' : 'text-storm-gray'}`}
                                                >
                                                    <SortDesc size={12} />
                                                    <span>Descending</span>
                                                </button>
                                            </div>

                                            {['status', 'assigned_to', 'priority', 'due_date'].includes(header.filter) && (
                                                <div>
                                                    <div className="text-[9px] font-black text-storm-gray uppercase mb-1 px-1 tracking-widest">Filter</div>
                                                    {header.filter === 'status' && (
                                                        <CustomDropdown
                                                            value={filters.status}
                                                            onChange={(val) => { setFilters(f => ({ ...f, status: val })); setActiveFilterHeader(null); }}
                                                            options={[
                                                                { label: 'ALL STATUS', value: '' },
                                                                { label: 'TODO', value: 'Todo', icon: <Circle size={10} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                                { label: 'IN PROGRESS', value: 'In Progress', icon: <Loader2 size={10} className="text-amber-500 animate-spin" />, color: 'text-amber-500' },
                                                                { label: 'REVIEW', value: 'Review', icon: <Eye size={10} className="text-blue-400" />, color: 'text-blue-400' },
                                                                { label: 'DONE', value: 'Done', icon: <Check size={10} className="text-emerald-500" />, color: 'text-emerald-500' },
                                                            ]}
                                                            variant="minimal"
                                                            className="w-full"
                                                        />
                                                    )}
                                                    {header.filter === 'assigned_to' && (
                                                        <CustomDropdown
                                                            value={filters.assigned_to}
                                                            onChange={(val) => { setFilters(f => ({ ...f, assigned_to: val })); setActiveFilterHeader(null); }}
                                                            options={[
                                                                { label: 'ALL TEAM', value: '' },
                                                                ...teamMembers.map((m: any) => ({
                                                                    label: (m.full_name || m.name)?.toUpperCase(),
                                                                    value: m.profile_id || m.id,
                                                                    icon: <UserIcon size={12} className="text-storm-gray" />
                                                                }))
                                                            ]}
                                                            variant="minimal"
                                                            className="w-full"
                                                        />
                                                    )}
                                                    {header.filter === 'priority' && (
                                                        <CustomDropdown
                                                            value={filters.priority}
                                                            onChange={(val) => { setFilters(f => ({ ...f, priority: val })); setActiveFilterHeader(null); }}
                                                            options={[
                                                                { label: 'ALL PRIORITY', value: '' },
                                                                { label: 'LOW', value: 'Low', icon: <Flag size={10} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                                { label: 'MEDIUM', value: 'Medium', icon: <Flag size={10} className="text-blue-400" />, color: 'text-blue-400' },
                                                                { label: 'HIGH', value: 'High', icon: <Flag size={10} className="text-amber-500" />, color: 'text-amber-500' },
                                                                { label: 'CRITICAL', value: 'Critical', icon: <Flag size={10} className="text-rose-500" />, color: 'text-rose-500' },
                                                            ]}
                                                            variant="minimal"
                                                            className="w-full"
                                                        />
                                                    )}
                                                    {header.filter === 'due_date' && (
                                                        <div className="px-1">
                                                            <input
                                                                type="date"
                                                                value={filters.due_date}
                                                                onChange={(e) => { setFilters(f => ({ ...f, due_date: e.target.value })); setActiveFilterHeader(null); }}
                                                                className="w-full bg-[#09090B] border border-shark/50 rounded-lg py-1.5 px-2 text-[10px] font-black text-iron focus:outline-none focus:border-[#279da6]/40 [color-scheme:dark]"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>,
                                        document.body
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-shark/60">
                        {sortedTasks.length === 0 ? (
                            <tr>
                                <td colSpan={showRequestColumn ? 9 : 8} className="px-6 py-20 text-center text-storm-gray uppercase text-[10px] font-black tracking-widest opacity-40">
                                    No tasks found for your criteria.
                                </td>
                            </tr>
                        ) : (
                            sortedTasks.map((item: TaskItem, index: number) => (
                                <tr key={item.id} className="hover:bg-shark/10 transition-colors group text-sm">
                                    <td className="px-5 py-3 border-r border-shark/60 text-center font-black text-storm-gray">
                                        {(index + 1).toString().padStart(2, '0')}
                                    </td>
                                    <td
                                        className="px-6 py-3 font-black text-iron border-r border-shark/60 group-hover:text-[#279da6] transition-colors cursor-pointer hover:bg-white/5"
                                        onClick={() => router.push(`/tasks/${item.slug || item.id}`)}
                                    >
                                        <div className="line-clamp-2 leading-tight uppercase tracking-tight font-black text-xs">
                                            {item.title}
                                        </div>
                                    </td>
                                    {showOrganizationColumn && (
                                        <td className="px-6 py-3 border-r border-shark/60 hover:bg-white/5 transition-colors">
                                            {item.request_links?.[0]?.request?.client ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded flex items-center justify-center bg-shark/40 border border-shark/60 text-[10px] font-black text-[#279da6] shrink-0 overflow-hidden">
                                                        {item.request_links[0].request.client.avatar_url ? (
                                                            <img
                                                                src={item.request_links[0].request.client.avatar_url}
                                                                alt={item.request_links[0].request.client.organization || 'Org'}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                    const parent = target.parentElement;
                                                                    if (parent) {
                                                                        const char = item.request_links?.[0]?.request?.client?.organization?.[0] || 'O';
                                                                        parent.innerHTML = `<span>${char}</span>`;
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <span>{item.request_links[0].request.client.organization?.[0] || 'O'}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-black text-iron truncate max-w-[140px] uppercase tracking-tighter leading-tight text-[11px] group-hover:text-[#279da6] transition-colors">
                                                            {(item.request_links[0].request.client.organization && item.request_links[0].request.client.organization.toLowerCase() !== 'individual')
                                                                ? item.request_links[0].request.client.organization
                                                                : item.request_links[0].request.client.full_name}
                                                        </span>
                                                        <span className="text-[9px] text-storm-gray font-bold truncate tracking-widest mt-0.5 opacity-40 uppercase">
                                                            {(item.request_links[0].request.client.organization && item.request_links[0].request.client.organization.toLowerCase() !== 'individual')
                                                                ? item.request_links[0].request.client.full_name
                                                                : 'Individual Client'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="opacity-30 italic text-[10px] uppercase font-black tracking-widest">None</span>
                                            )}
                                        </td>
                                    )}
                                    {showRequestColumn && (
                                        <td className="px-3 py-3 relative text-center text-santas-gray border-r border-shark/60 whitespace-nowrap hover:bg-white/5 transition-colors">
                                            {item.request_links && item.request_links.length > 0 ? (
                                                <div className="flex flex-col gap-1 items-center">
                                                    {item.request_links.map((link, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(`/requests/${link.request?.slug || link.request?.id}`);
                                                            }}
                                                            className="flex flex-col cursor-pointer hover:text-[#279da6] transition-colors leading-tight"
                                                        >
                                                            <span className="text-iron font-black truncate max-w-[140px] text-[11px] uppercase tracking-tight">{link.request?.title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="opacity-30 italic text-[10px] uppercase font-black tracking-widest">None</span>
                                            )}
                                        </td>
                                    )}

                                    <td className="px-3 py-3 border-r border-shark/60 hover:bg-white/5 transition-colors">
                                        <CustomDropdown
                                            value={item.status}
                                            onChange={(val) => handleUpdate(item.id, 'status', val)}
                                            options={[
                                                { label: 'TODO', value: 'Todo', icon: <Circle size={10} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                { label: 'IN PROGRESS', value: 'In Progress', icon: <Loader2 size={10} className="text-amber-500 animate-spin" />, color: 'text-amber-500' },
                                                { label: 'REVIEW', value: 'Review', icon: <Eye size={10} className="text-blue-400" />, color: 'text-blue-400' },
                                                { label: 'DONE', value: 'Done', icon: <Check size={10} className="text-emerald-500" />, color: 'text-emerald-500' },
                                            ]}
                                            variant="minimal"
                                            className="w-full scale-90"
                                        />
                                    </td>
                                    <td className="px-3 py-3 text-santas-gray border-r border-shark/60 whitespace-nowrap hover:bg-white/5 transition-colors">
                                        <CustomDropdown
                                            value={item.assigned_to || ''}
                                            onChange={(val) => handleUpdate(item.id, 'assigned_to', val)}
                                            options={[
                                                { label: 'UNASSIGNED', value: '', icon: <UserPlus size={10} className="text-storm-gray" /> },
                                                ...teamMembers.filter((tm: any) => tm.profile_id).map((tm: any) => ({
                                                    label: (tm.name || tm.full_name)?.toUpperCase(),
                                                    value: tm.profile_id,
                                                    icon: tm.avatar_url ? (
                                                        <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0 border border-shark/60">
                                                            <img src={tm.avatar_url} alt={tm.name} className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : <UserIcon size={10} className="text-[#279da6]" />
                                                }))
                                            ]}
                                            variant="minimal"
                                            className="w-full scale-90"
                                        />
                                    </td>
                                    <td className="px-3 py-3 border-r border-shark/60 text-storm-gray font-black whitespace-nowrap text-[11px] uppercase text-center hover:bg-white/5 transition-colors leading-tight">
                                        <CustomDropdown
                                            value={item.priority}
                                            onChange={(val) => handleUpdate(item.id, 'priority', val)}
                                            options={[
                                                { label: 'LOW', value: 'Low', icon: <Flag size={10} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                { label: 'MEDIUM', value: 'Medium', icon: <Flag size={10} className="text-blue-400" />, color: 'text-blue-400' },
                                                { label: 'HIGH', value: 'High', icon: <Flag size={10} className="text-amber-500" />, color: 'text-amber-500' },
                                                { label: 'CRITICAL', value: 'Critical', icon: <Flag size={10} className="text-rose-500" />, color: 'text-rose-500' },
                                            ]}
                                            variant="minimal"
                                            className="w-full scale-90"
                                        />
                                    </td>
                                    <td className="px-5 py-3 text-storm-gray border-r border-shark/60 whitespace-nowrap hover:bg-white/5 transition-colors">
                                        <div className="relative group/date">
                                            <input
                                                type="date"
                                                value={item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : ''}
                                                onChange={(e) => handleUpdate(item.id, 'due_date', e.target.value)}
                                                className="bg-transparent text-iron border border-transparent hover:border-shark/40 rounded px-1.5 py-1 focus:outline-none cursor-pointer hover:text-white transition-all text-[11px] font-black uppercase w-full [color-scheme:dark]"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-storm-gray border-r border-shark/60 whitespace-nowrap text-[10px] text-center uppercase border-shark/60">
                                        <div className="flex flex-col">
                                            <span className="text-iron font-black">{formatDate(item.updated_at)}</span>
                                            <span className="opacity-40 font-bold tracking-tighter scale-90">{formatTime(item.updated_at)}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-storm-gray whitespace-nowrap text-[10px] text-center uppercase">
                                        <div className="flex flex-col">
                                            <span className="text-iron font-black">{formatDate(item.created_at)}</span>
                                            <span className="opacity-40 font-bold tracking-tighter scale-90">{formatTime(item.created_at)}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
