'use client';

import React, { useState } from 'react';
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
    SortAsc,
    SortDesc,
    X,
    Search
} from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';
import { TaskItem } from '@/lib/data/tasks';
import { formatDate, formatTime } from '@/lib/dateUtils';

interface TasksTableProps {
    tasks?: TaskItem[];
    profiles?: any[];
    teamMembers?: any[];
    onUpdateField?: (taskId: string, field: string, value: any) => Promise<void>;
    showRequestColumn?: boolean;
    searchQuery?: string;
}

export default function TasksTable({
    tasks: initialTasks = [],
    profiles = [],
    teamMembers = [],
    onUpdateField,
    showRequestColumn = true,
    searchQuery = ''
}: TasksTableProps) {
    const router = useRouter();
    const [activeFilterHeader, setActiveFilterHeader] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        title: '',
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
        const matchesAssignee = !filters.assigned_to || task.assigned_to === filters.assigned_to;
        const matchesStatus = !filters.status || task.status === filters.status;
        const matchesPriority = !filters.priority || task.priority === filters.priority;
        const matchesDate = !filters.due_date || (task.due_date && task.due_date.startsWith(filters.due_date));

        return (matchesSearch || false) && matchesTitle && matchesAssignee && matchesStatus && matchesPriority && matchesDate;
    });

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (!sortConfig.key || !sortConfig.direction) return 0;

        let aValue: any = (a as any)[sortConfig.key];
        let bValue: any = (b as any)[sortConfig.key];

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

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
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                    <thead>
                        <tr className="border-b border-shark text-storm-gray text-sm uppercase font-black tracking-widest bg-[#17171a]">
                            <th className="px-5 py-3 w-12 border-r border-shark/60 text-center font-black text-storm-gray">#</th>
                            {[
                                { label: 'Title', key: 'title', filter: 'title', width: 'w-[24%]' },
                                ...(showRequestColumn ? [{ label: 'Request', key: 'request', filter: 'request', width: 'min-w-[150px]' }] : []),
                                { label: 'Status', key: 'status', filter: 'status', width: 'w-[10%]' },
                                { label: 'Assigned', key: 'assignee', filter: 'assigned_to', width: 'w-[12%]' },
                                { label: 'Priority', key: 'priority', filter: 'priority', width: 'w-[10%]' },
                                { label: 'Due Date', key: 'due_date', filter: 'due_date', width: 'w-[10%]' },
                                { label: 'Last Updated', key: 'updated_at', filter: 'updated_at', width: 'w-[7%]' },
                                { label: 'Created', key: 'created_at', filter: 'created_at', width: 'w-[7%]' }
                            ].map((header, idx) => (
                                <th key={header.label} className={`px-3 py-3 border-r border-shark/60 group/header relative header-filter-container ${header.width || ''} ${idx === (showRequestColumn ? 7 : 6) ? 'border-r-0' : ''}`}>
                                    <div className={`flex items-center gap-2 ${(header.key === 'updated_at' || header.key === 'created_at') ? 'justify-center' : 'justify-between'}`}>
                                        {header.filter === 'title' ? (
                                            <div className="relative flex-1 group -ml-1">
                                                <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                <input
                                                    type="text"
                                                    value={filters.title}
                                                    onChange={(e) => setFilters(f => ({ ...f, title: e.target.value }))}
                                                    placeholder="TITLE"
                                                    className="w-full bg-transparent border-none py-1.5 pl-8 pr-6 text-sm font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none transition-all"
                                                />
                                                {filters.title && (
                                                    <button
                                                        onClick={() => setFilters(f => ({ ...f, title: '' }))}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <span className="cursor-default text-sm">{header.label}</span>
                                                <button
                                                    onClick={() => setActiveFilterHeader(activeFilterHeader === header.filter ? null : header.filter)}
                                                    className={`p-1 rounded hover:bg-shark/40 transition-colors ${((filters as any)[header.filter] && !['creator', 'request'].includes(header.filter)) || sortConfig.key === header.key ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                >
                                                    <Filter size={10} />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {activeFilterHeader === header.filter && header.filter !== 'title' && (
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
                                                                { label: 'Todo', value: 'Todo', icon: <Circle size={12} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                                { label: 'In Progress', value: 'In Progress', icon: <Loader2 size={12} className="text-amber-500 animate-spin" />, color: 'text-amber-500' },
                                                                { label: 'Review', value: 'Review', icon: <Eye size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                                { label: 'Done', value: 'Done', icon: <Check size={12} className="text-emerald-500" />, color: 'text-emerald-500' },
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
                                                                { label: 'Medium', value: 'Medium', icon: <Flag size={12} className="text-blue-400" />, color: 'text-blue-400' },
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
                                        </div>
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
                                    <td className="px-5 py-2.5 border-r border-shark/60 text-center font-black text-storm-gray">
                                        {(index + 1).toString().padStart(2, '0')}
                                    </td>
                                    <td
                                        className="px-6 py-2.5 font-black text-iron border-r border-shark/60 group-hover:text-[#279da6] transition-colors cursor-pointer hover:bg-white/5"
                                        onClick={() => router.push(`/tasks/${item.slug || item.id}`)}
                                    >
                                        <div className="line-clamp-2 min-w-[200px] leading-snug uppercase tracking-tight font-black">
                                            {item.title}
                                        </div>
                                    </td>
                                    {showRequestColumn && (
                                        <td className="px-3 py-2.5 relative text-center text-santas-gray border-r border-shark/60 whitespace-nowrap hover:bg-white/5 transition-colors">
                                            {item.request_links && item.request_links.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {item.request_links.map((link, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(`/requests/${link.request?.slug || link.request?.id}`);
                                                            }}
                                                            className="flex flex-col cursor-pointer hover:text-[#279da6] transition-colors leading-tight"
                                                        >
                                                            <span className="text-iron font-black truncate max-w-[150px] text-xs uppercase tracking-tight">{link.request?.title}</span>
                                                            {idx === 0 && <span className="text-[9px] opacity-40 uppercase font-black tracking-widest leading-none mt-0.5">Internal Request</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="opacity-30 italic text-xs uppercase">None</span>
                                            )}
                                        </td>
                                    )}

                                    <td className="px-4 py-2.5 border-r border-shark/60 hover:bg-white/5 transition-colors">
                                        <CustomDropdown
                                            value={item.status}
                                            onChange={(val) => handleUpdate(item.id, 'status', val)}
                                            options={[
                                                { label: 'TODO', value: 'Todo', icon: <Circle size={12} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                { label: 'IN PROGRESS', value: 'In Progress', icon: <Loader2 size={12} className="text-amber-500 animate-spin" />, color: 'text-amber-500' },
                                                { label: 'REVIEW', value: 'Review', icon: <Eye size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                { label: 'DONE', value: 'Done', icon: <Check size={12} className="text-emerald-500" />, color: 'text-emerald-500' },
                                            ]}
                                            variant="minimal"
                                            className="w-full"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-santas-gray border-r border-shark/60 whitespace-nowrap hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <CustomDropdown
                                                value={item.assigned_to || ''}
                                                onChange={(val) => handleUpdate(item.id, 'assigned_to', val)}
                                                options={[
                                                    { label: 'UNASSIGNED', value: '', icon: <PlusIcon size={12} className="text-storm-gray" /> },
                                                    ...teamMembers.filter((tm: any) => tm.profile_id).map((tm: any) => ({
                                                        label: (tm.name || tm.full_name)?.toUpperCase(),
                                                        value: tm.profile_id,
                                                        icon: <UserIcon size={12} className="text-[#279da6]" />
                                                    }))
                                                ]}
                                                variant="minimal"
                                                className="w-full"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 border-r border-shark/60 text-storm-gray font-black whitespace-nowrap text-[12px] uppercase text-center hover:bg-white/5 transition-colors leading-tight">
                                        <CustomDropdown
                                            value={item.priority}
                                            onChange={(val) => handleUpdate(item.id, 'priority', val)}
                                            options={[
                                                { label: 'LOW', value: 'Low', icon: <Flag size={12} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                { label: 'MEDIUM', value: 'Medium', icon: <Flag size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                { label: 'HIGH', value: 'High', icon: <Flag size={12} className="text-amber-500" />, color: 'text-amber-500' },
                                                { label: 'CRITICAL', value: 'Critical', icon: <Flag size={12} className="text-rose-500" />, color: 'text-rose-500' },
                                            ]}
                                            variant="minimal"
                                            className="w-full"
                                        />
                                    </td>
                                    <td className="px-6 py-2.5 text-storm-gray border-r border-shark/60 whitespace-nowrap hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-2 group/date relative">
                                            <input
                                                ref={el => { dateInputRefs.current[item.id] = el; }}
                                                type="date"
                                                value={item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : ''}
                                                onChange={(e) => handleUpdate(item.id, 'due_date', e.target.value)}
                                                className="bg-transparent text-iron border border-transparent hover:border-shark/60 focus:border-[#279da6]/60 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer hover:text-white transition-all text-[11px] font-black uppercase w-28 [color-scheme:dark]"
                                            />
                                            <CalendarIcon
                                                size={12}
                                                className="text-storm-gray opacity-30 group-hover/date:opacity-100 transition-opacity cursor-pointer absolute right-2 pointer-events-none"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-2.5 text-storm-gray border-r border-shark/60 whitespace-nowrap text-xs text-center border-shark/60 uppercase">
                                        {item.updated_at ? (
                                            <div className="flex flex-col">
                                                <span className="text-iron font-black">{formatDate(item.updated_at)}</span>
                                                <span className="opacity-50 font-bold">{formatTime(item.updated_at)}</span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-2.5 text-storm-gray whitespace-nowrap text-xs text-center uppercase">
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
    );
}
