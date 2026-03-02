'use client';

import React, { useState } from 'react';
import {
    ChevronDown,
    Calendar as CalendarIcon,
    Plus as PlusIcon,
    Filter,
    Loader2,
    Check,
    SortAsc,
    SortDesc,
    Flag,
    Circle,
    User,
    Eye,
    Search,
    X,
    Download,
    LayoutList
} from 'lucide-react';
import { RequestItem, Profile, TeamMember } from '@/lib/data/requests';
import { formatDate, formatTime } from '@/lib/dateUtils';
import { useRouter } from 'next/navigation';
import CustomDropdown from '@/components/CustomDropdown';

interface RequestsTableProps {
    requests?: RequestItem[];
    profiles?: Profile[];
    teamMembers?: TeamMember[];
    showClientColumn?: boolean;
    onUpdateField?: (requestId: string, field: string, value: any) => Promise<void>;
}

export default function RequestsTable({
    requests = [],
    profiles = [],
    teamMembers = [],
    showClientColumn = false,
    onUpdateField,
}: RequestsTableProps) {
    const router = useRouter();
    const [activeFilterHeader, setActiveFilterHeader] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
        key: 'created_at',
        direction: 'desc'
    });
    const [filters, setFilters] = useState({
        title: '',
        client: '',
        status: '',
        assigned_to: '',
        priority: '',
        due_date: ''
    });
    const dateInputRefs = React.useRef<{ [key: string]: HTMLInputElement | null }>({});

    const handleUpdate = async (requestId: string, field: string, value: any) => {
        const finalValue = (field === 'assigned_to' && value === '') ? null : value;
        if (onUpdateField) {
            await onUpdateField(requestId, field, finalValue);
        } else {
            try {
                const response = await fetch(`/api/requests?id=${requestId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [field]: finalValue })
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

    const filteredRequests = requests.filter((req: RequestItem) => {
        const matchesTitle = !filters.title || req.title?.toLowerCase().includes(filters.title.toLowerCase());
        const matchesClient = !filters.client ||
            req.client?.full_name?.toLowerCase().includes(filters.client.toLowerCase()) ||
            (req.client as any)?.organization?.toLowerCase().includes(filters.client.toLowerCase());
        const matchesStatus = !filters.status || req.status === filters.status;
        const matchesAssignee = !filters.assigned_to || req.assigned_to === filters.assigned_to;
        const matchesPriority = !filters.priority || req.priority === filters.priority;
        const matchesDate = !filters.due_date || (req.due_date && req.due_date.startsWith(filters.due_date));

        return matchesTitle && matchesClient && matchesStatus && matchesAssignee && matchesPriority && matchesDate;
    });

    const sortedRequests = [...filteredRequests].sort((a, b) => {
        if (!sortConfig.key || !sortConfig.direction) return 0;

        let aValue: any = (a as any)[sortConfig.key];
        let bValue: any = (b as any)[sortConfig.key];

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        // Custom handling for nested fields
        if (sortConfig.key === 'client') {
            aValue = a.client?.full_name?.toLowerCase() || '';
            bValue = b.client?.full_name?.toLowerCase() || '';
        } else if (sortConfig.key === 'assignee') {
            aValue = a.assignee?.full_name?.toLowerCase() || '';
            bValue = b.assignee?.full_name?.toLowerCase() || '';
        } else if (sortConfig.key === 'organization') {
            aValue = (a.client as any)?.organization?.toLowerCase() || '';
            bValue = (b.client as any)?.organization?.toLowerCase() || '';
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
        <div className="space-y-6">

            <div className="border border-shark/60 rounded-xl overflow-hidden bg-black/20">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                        <thead>
                            <tr className="border-b border-shark text-storm-gray text-sm uppercase font-black tracking-widest bg-[#17171a]">
                                <th className="px-5 py-3 w-12 border-r border-shark/60 text-center">#</th>
                                {[
                                    { label: 'Title', key: 'title', filter: 'title', width: 'w-[24%]' },
                                    ...(showClientColumn ? [{ label: 'Client', key: 'client', filter: 'client', width: 'w-[15%] min-w-[120px]' }] : []),
                                    { label: 'Status', key: 'status', filter: 'status', width: 'w-[10%]' },
                                    { label: 'Assignee', key: 'assignee', filter: 'assigned_to', width: 'w-[12%]' },
                                    { label: 'Priority', key: 'priority', filter: 'priority', width: 'w-[10%]' },
                                    { label: 'Due Date', key: 'due_date', filter: 'due_date', width: 'w-[10%]' },
                                    { label: 'Last Updated', key: 'updated_at', filter: 'updated_at', width: 'w-[7%]' },
                                    { label: 'Created', key: 'created_at', filter: 'created_at', width: 'w-[7%]' }
                                ].map((header, idx) => (
                                    <th key={header.label} className={`px-3 py-3 border-r border-shark/60 group/header relative header-filter-container ${header.width || ''}`}>
                                        <div className={`flex items-center gap-2 ${(header.key === 'updated_at' || header.key === 'created_at') ? 'justify-center' : 'justify-between'}`}>
                                            {header.filter === 'title' ? (
                                                <div className="relative flex-1 group -ml-1">
                                                    <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={filters.title}
                                                        onChange={(e) => setFilters(f => ({ ...f, title: e.target.value }))}
                                                        placeholder="TITLE"
                                                        className="w-full bg-transparent border-none py-1.5 pl-8 pr-6 text-sm font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none transition-all font-bold"
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
                                                        className={`p-1 rounded hover:bg-shark/40 transition-colors ${((filters as any)[header.filter] && !['updated_at', 'created_at'].includes(header.filter)) || sortConfig.key === header.key ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                    >
                                                        <Filter size={10} />
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {activeFilterHeader === header.filter && header.filter !== 'title' && (
                                            <div className={`absolute top-full ${idx > 4 ? 'right-0' : 'left-0'} mt-1 w-44 bg-[#121214] border border-shark rounded-lg shadow-2xl p-2 z-[60] normal-case tracking-normal`}>
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

                                                {['client', 'status', 'assigned_to', 'priority', 'due_date'].includes(header.filter) && (
                                                    <div>
                                                        <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Filter</div>
                                                        {header.filter === 'client' && (
                                                            <div className="relative">
                                                                <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-storm-gray" />
                                                                <input
                                                                    type="text"
                                                                    value={(filters as any)[header.filter]}
                                                                    onChange={(e) => setFilters(f => ({ ...f, [header.filter]: e.target.value }))}
                                                                    className="w-full bg-[#09090B] border border-shark/50 rounded-md py-1.5 px-8 text-[10px] text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                                    placeholder={`Search ${header.label.toLowerCase()}...`}
                                                                    autoFocus
                                                                />
                                                                {(filters as any)[header.filter] && (
                                                                    <button
                                                                        onClick={() => setFilters(f => ({ ...f, [header.filter]: '' }))}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white"
                                                                    >
                                                                        <X size={10} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        {header.filter === 'status' && (
                                                            <CustomDropdown
                                                                value={filters.status}
                                                                onChange={(val) => { setFilters(f => ({ ...f, status: val })); setActiveFilterHeader(null); }}
                                                                options={[
                                                                    { label: 'ALL STATUS', value: '' },
                                                                    { label: 'TODO', value: 'Todo', icon: <Circle size={12} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                                    { label: 'IN PROGRESS', value: 'In Progress', icon: <Loader2 size={12} className="text-amber-500 animate-spin" />, color: 'text-amber-500' },
                                                                    { label: 'REVIEW', value: 'Review', icon: <Eye size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                                    { label: 'DONE', value: 'Done', icon: <Check size={12} className="text-emerald-500" />, color: 'text-emerald-500' },
                                                                ]}
                                                            />
                                                        )}
                                                        {header.filter === 'assigned_to' && (
                                                            <CustomDropdown
                                                                value={filters.assigned_to}
                                                                onChange={(val) => { setFilters(f => ({ ...f, assigned_to: val })); setActiveFilterHeader(null); }}
                                                                options={[
                                                                    { label: 'ALL TEAM', value: '' },
                                                                    ...teamMembers.map((m: any) => ({
                                                                        label: (m.full_name || (m as any).name)?.toUpperCase(),
                                                                        value: m.profile_id || m.id,
                                                                        icon: <User size={12} className="text-[#279da6]" />
                                                                    }))
                                                                ]}
                                                            />
                                                        )}
                                                        {header.filter === 'priority' && (
                                                            <CustomDropdown
                                                                value={filters.priority}
                                                                onChange={(val) => { setFilters(f => ({ ...f, priority: val })); setActiveFilterHeader(null); }}
                                                                options={[
                                                                    { label: 'ALL PRIORITY', value: '' },
                                                                    { label: 'LOW', value: 'Low', icon: <Flag size={12} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                                    { label: 'MEDIUM', value: 'Medium', icon: <Flag size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                                    { label: 'HIGH', value: 'High', icon: <Flag size={12} className="text-amber-500" />, color: 'text-amber-500' },
                                                                    { label: 'CRITICAL', value: 'Critical', icon: <Flag size={12} className="text-rose-500" />, color: 'text-rose-500' },
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
                            {sortedRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={showClientColumn ? 9 : 8} className="px-6 py-20 text-center text-storm-gray uppercase text-[10px] font-black tracking-widest opacity-40">
                                        No requests found for your criteria.
                                    </td>
                                </tr>
                            ) : (
                                sortedRequests.map((item: RequestItem, index: number) => (
                                    <tr key={item.id} className="hover:bg-shark/10 transition-colors group text-sm">
                                        <td className="px-5 py-2.5 border-r border-shark/60 text-center font-black text-storm-gray">
                                            {(index + 1).toString().padStart(2, '0')}
                                        </td>
                                        <td
                                            className="px-6 py-2.5 font-black text-iron border-r border-shark/60 group-hover:text-[#279da6] cursor-pointer transition-colors hover:bg-white/5"
                                            onClick={() => router.push(`/requests/${item.slug || item.id}`)}
                                        >
                                            <div className="flex flex-col uppercase tracking-tight font-black">
                                                <span className="line-clamp-1">{item.title}</span>
                                            </div>
                                        </td>
                                        {showClientColumn && (
                                            <td className="px-4 py-2.5 border-r border-shark/60 hover:bg-white/5 transition-colors">
                                                <div className="flex flex-col gap-0.5 min-w-[120px] uppercase tracking-tight">
                                                    {item.client?.organization ? (
                                                        <>
                                                            <span className="text-iron font-black truncate block uppercase">{item.client.organization}</span>
                                                            <span className="text-[10px] text-storm-gray uppercase font-black tracking-tighter truncate block opacity-60">{item.client.full_name || 'Unknown'}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-iron font-black truncate block uppercase">{item.client?.full_name || 'Unknown'}</span>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-4 py-2.5 border-r border-shark/60 text-storm-gray font-black whitespace-nowrap text-[12px] uppercase text-center hover:bg-white/5 transition-colors leading-tight">
                                            <CustomDropdown
                                                value={item.status}
                                                onChange={(val) => handleUpdate(item.id, 'status', val)}
                                                variant="minimal"
                                                className="w-full"
                                                options={[
                                                    { label: 'TODO', value: 'Todo', icon: <Circle size={12} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                    { label: 'IN PROGRESS', value: 'In Progress', icon: <Loader2 size={12} className="text-amber-500 animate-spin" />, color: 'text-amber-500' },
                                                    { label: 'REVIEW', value: 'Review', icon: <Eye size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                    { label: 'DONE', value: 'Done', icon: <Check size={12} className="text-emerald-500" />, color: 'text-emerald-500' },
                                                ]}
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 relative text-center border-r border-shark/60 hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <CustomDropdown
                                                    value={item.assigned_to || ''}
                                                    onChange={(val) => handleUpdate(item.id, 'assigned_to', val)}
                                                    variant="minimal"
                                                    className="w-full"
                                                    placeholder="UNASSIGNED"
                                                    options={[
                                                        { label: 'UNASSIGNED', value: '' },
                                                        ...teamMembers.filter((tm: any) => tm.profile_id || tm.id).map((tm: any) => ({
                                                            label: (tm.name || tm.full_name)?.toUpperCase(),
                                                            value: tm.profile_id || tm.id,
                                                            icon: <User size={12} className="text-[#279da6]" />
                                                        }))
                                                    ]}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 border-r border-shark/60 font-black hover:bg-white/5 transition-colors uppercase tracking-tight">
                                            <CustomDropdown
                                                value={item.priority}
                                                onChange={(val) => handleUpdate(item.id, 'priority', val)}
                                                variant="minimal"
                                                className="w-full"
                                                options={[
                                                    { label: 'LOW', value: 'Low', icon: <Flag size={12} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                    { label: 'MEDIUM', value: 'Medium', icon: <Flag size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                    { label: 'HIGH', value: 'High', icon: <Flag size={12} className="text-amber-500" />, color: 'text-amber-500' },
                                                    { label: 'CRITICAL', value: 'Critical', icon: <Flag size={12} className="text-rose-500" />, color: 'text-rose-500' },
                                                ]}
                                            />
                                        </td>
                                        <td className="px-6 py-2.5 text-santas-gray border-r border-shark/60 whitespace-nowrap hover:bg-white/5 transition-colors uppercase">
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
                                        <td className="px-6 py-2.5 text-storm-gray border-r border-shark/60 whitespace-nowrap text-xs text-center uppercase">
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
        </div>
    );
}
