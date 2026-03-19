'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

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
    LayoutList,
    UserPlus
} from 'lucide-react';
import { RequestItem, Profile } from '@/lib/data/requests';
import { type TeamMember } from '@/lib/data/team';
import { formatDate, formatTime, getAutomaticPriority } from '@/lib/dateUtils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import CustomDropdown from '@/components/CustomDropdown';
import CustomDatePicker from '@/components/CustomDatePicker';

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
        if (onUpdateField) {
            await onUpdateField(requestId, field, value);
        } else {
            try {
                const response = await fetch(`/api/requests?id=${requestId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [field]: value })
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
        if (!sortConfig.key) {
            // Default "Smart Sort": Automatic Priority Rank -> Due Date -> Created At
            const pA = getAutomaticPriority(a.due_date).rank;
            const pB = getAutomaticPriority(b.due_date).rank;
            if (pA !== pB) return pB - pA;

            const dA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
            const dB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
            if (dA !== dB) return dA - dB;

            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }

        if (!sortConfig.direction) return 0;

        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'priority') {
            aValue = getAutomaticPriority(a.due_date).rank;
            bValue = getAutomaticPriority(b.due_date).rank;
        } else {
            aValue = (a as any)[sortConfig.key];
            bValue = (b as any)[sortConfig.key];
        }

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
                {/* Mobile View: Stacked Cards */}
                <div className="sm:hidden flex flex-col divide-y divide-shark/60">
                    {sortedRequests.length === 0 ? (
                        <div className="px-6 py-20 text-center text-storm-gray uppercase text-[12px] font-black tracking-widest opacity-40">
                            No requests found for your criteria.
                        </div>
                    ) : (
                        sortedRequests.map((item: RequestItem, index: number) => (
                            <div key={item.id} className="p-4 bg-shark/5 flex flex-col gap-4">
                                {/* Card Header: Index & Title */}
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-shark/40 text-[12px] font-black text-storm-gray border border-shark/60">
                                        {(index + 1).toString().padStart(2, '0')}
                                    </div>
                                    <div
                                        className="flex-1 cursor-pointer group"
                                        onClick={() => router.push(`/requests/${item.slug || item.id}?tab=tasks`)}
                                    >
                                        <h3 className="text-[12px] font-black text-iron uppercase leading-tight group-hover:text-[#279da6] transition-colors line-clamp-2">
                                            {item.title}
                                        </h3>
                                        {showClientColumn && (
                                            <div className="mt-1 flex items-center gap-1.5 overflow-hidden">
                                                <span className="text-[12px] font-black text-storm-gray/40 uppercase tracking-widest shrink-0">ORG:</span>
                                                <span className="text-[12px] font-bold text-cyan-400/80 truncate uppercase tracking-tight">
                                                    {(item.client as any)?.organization || 'Individual'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Card Body: Status, Priority, Assignee */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[12px] font-black text-storm-gray uppercase tracking-widest block opacity-50">Status</label>
                                        <CustomDropdown
                                            value={item.status}
                                            onChange={(val) => handleUpdate(item.id, 'status', val)}
                                            options={[
                                                { label: 'TODO', value: 'Todo', icon: <Circle size={10} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                { label: 'IN PROGRESS', value: 'In Progress', icon: <Loader2 size={10} className="text-amber-500" />, color: 'text-amber-500' },
                                                { label: 'REVIEW', value: 'Review', icon: <Eye size={10} className="text-blue-400" />, color: 'text-blue-400' },
                                                { label: 'DONE', value: 'Done', icon: <Check size={10} className="text-emerald-500" />, color: 'text-emerald-500' },
                                            ]}
                                            variant="minimal"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[12px] font-black text-storm-gray uppercase tracking-widest block opacity-50">Priority</label>
                                        <div className={`flex items-center gap-1.5 h-9 px-3 rounded-lg bg-shark/20 border border-shark/40 font-black text-[10px] tracking-wider ${getAutomaticPriority(item.due_date).colorClass}`}>
                                            <Flag size={10} className="shrink-0" />
                                            <span>{getAutomaticPriority(item.due_date).label}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[12px] font-black text-storm-gray uppercase tracking-widest block opacity-50">Assigned To</label>
                                        <CustomDropdown
                                            value={item.assigned_to || ''}
                                            onChange={(val) => handleUpdate(item.id, 'assigned_to', val)}
                                            options={[
                                                { label: 'UNASSIGNED', value: '', icon: <UserPlus size={10} className="text-storm-gray" /> },
                                                ...teamMembers.map((m: any) => ({
                                                    label: (m.full_name || (m as any).name)?.toUpperCase(),
                                                    value: m.profile_id || m.id,
                                                    icon: m.avatar_url ? (
                                                        <div className="w-[46px] h-[46px] rounded-full overflow-hidden shrink-0 border border-shark/60">
                                                            <img src={m.avatar_url} alt={m.full_name} className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : <User size={20} className="text-[#279da6]" />
                                                }))
                                            ]}
                                            variant="minimal"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[12px] font-black text-storm-gray uppercase tracking-widest block opacity-50">Due Date</label>
                                        <CustomDatePicker
                                            value={item.due_date}
                                            onChange={(date) => handleUpdate(item.id, 'due_date', date)}
                                            variant="minimal"
                                            className="w-full"
                                        />
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
                            <tr className="border-b border-shark text-storm-gray text-[12px] uppercase font-black tracking-widest bg-[#17171a]">
                                <th className="px-5 py-3 w-10 sm:w-16 border-r border-shark/60 text-center font-black text-storm-gray">#</th>
                                {[
                                    { label: 'Title', key: 'title', filter: 'title', width: 'min-w-[240px]' },
                                    ...(showClientColumn ? [{ label: 'Organization', key: 'organization', filter: 'client', width: 'min-w-[200px]' }] : []),
                                    { label: 'Status', key: 'status', filter: 'status', width: 'min-w-[140px]' },
                                    { label: 'Assignee', key: 'assigned_to', filter: 'assigned_to', width: 'min-w-[160px]' },
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
                                                        className="w-full bg-transparent border-none py-1.5 pl-8 pr-6 text-[12px] font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none transition-all font-bold"
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
                                                    <span className="cursor-default text-[12px] font-black">{header.label}</span>
                                                    <button
                                                        onClick={() => toggleFilter(header.filter)}
                                                        className={`p-1 rounded hover:bg-shark/40 transition-colors ${((filters as any)[header.filter] && !['updated_at', 'created_at'].includes(header.filter)) || sortConfig.key === header.key ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                    >
                                                        <Filter size={10} />
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {activeFilterHeader === header.filter && header.filter !== 'title' && mounted && typeof document !== 'undefined' && createPortal(
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
                                                    <div className="text-[12px] font-black text-storm-gray uppercase mb-1 px-1 tracking-widest">Sort</div>
                                                    <button
                                                        onClick={() => { setSortConfig({ key: header.key, direction: 'asc' }); setActiveFilterHeader(null); }}
                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[12px] uppercase font-black tracking-wider hover:bg-[#279da6]/10 hover:text-white transition-all ${sortConfig.key === header.key && sortConfig.direction === 'asc' ? 'text-[#279da6] bg-[#279da6]/5' : 'text-storm-gray'}`}
                                                    >
                                                        <SortAsc size={12} />
                                                        <span>Ascending</span>
                                                    </button>
                                                    <button
                                                        onClick={() => { setSortConfig({ key: header.key, direction: 'desc' }); setActiveFilterHeader(null); }}
                                                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[12px] uppercase font-black tracking-wider hover:bg-[#279da6]/10 hover:text-white transition-all ${sortConfig.key === header.key && sortConfig.direction === 'desc' ? 'text-[#279da6] bg-[#279da6]/5' : 'text-storm-gray'}`}
                                                    >
                                                        <SortDesc size={12} />
                                                        <span>Descending</span>
                                                    </button>
                                                </div>

                                                {['client', 'status', 'assigned_to', 'priority', 'due_date'].includes(header.filter) && (
                                                    <div>
                                                        <div className="text-[12px] font-black text-storm-gray uppercase mb-1 px-1 tracking-widest">Filter</div>
                                                        {header.filter === 'client' && (
                                                            <div className="relative px-1 pt-1 pb-2">
                                                                <Search size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-storm-gray" />
                                                                <input
                                                                    type="text"
                                                                    value={(filters as any)[header.filter]}
                                                                    onChange={(e) => setFilters(f => ({ ...f, [header.filter]: e.target.value }))}
                                                                    className="w-full bg-[#09090B] border border-shark/50 rounded-lg py-1.5 px-8 text-[12px] text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                                    placeholder={`Search...`}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                        )}
                                                        {header.filter === 'status' && (
                                                            <CustomDropdown
                                                                value={filters.status}
                                                                onChange={(val) => { setFilters(f => ({ ...f, status: val })); setActiveFilterHeader(null); }}
                                                                options={[
                                                                    { label: 'ALL STATUS', value: '' },
                                                                    { label: 'TODO', value: 'Todo', icon: <Circle size={10} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                                    { label: 'IN PROGRESS', value: 'In Progress', icon: <Loader2 size={10} className="text-amber-500" />, color: 'text-amber-500' },
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
                                                                        label: (m.full_name || (m as any).name)?.toUpperCase(),
                                                                        value: m.profile_id || m.id,
                                                                        icon: <User size={12} className="text-[#279da6]" />
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
                                                                <CustomDatePicker
                                                                    value={filters.due_date}
                                                                    onChange={(date) => {
                                                                        setFilters(f => ({ ...f, due_date: date }));
                                                                        setActiveFilterHeader(null);
                                                                    }}
                                                                    variant="minimal"
                                                                    className="w-full"
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
                            {sortedRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-20 text-center text-storm-gray uppercase text-[12px] font-black tracking-widest opacity-40">
                                        No requests found for your criteria.
                                    </td>
                                </tr>
                            ) : (
                                sortedRequests.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-shark/10 transition-colors group text-[12px]">
                                        <td className="px-5 py-3 border-r border-shark/60 text-center font-black text-storm-gray text-[12px]">
                                            {(index + 1).toString().padStart(2, '0')}
                                        </td>
                                        <td
                                            className="px-6 py-3 font-black text-iron border-r border-shark/60 group-hover:text-[#279da6] transition-colors cursor-pointer hover:bg-white/5"
                                            onClick={() => router.push(`/requests/${item.slug || item.id}?tab=tasks`)}
                                        >
                                            <div className="line-clamp-2 leading-tight uppercase tracking-tight font-black text-[12px]">
                                                {item.title}
                                            </div>
                                        </td>
                                        {showClientColumn && (
                                            <td className="px-6 py-3 border-r border-shark/60 hover:bg-white/5 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-[46px] h-[46px] rounded-full flex items-center justify-center bg-shark/40 border border-shark/60 text-[12px] font-black text-[#279da6] shrink-0 overflow-hidden">
                                                        {(item.client as any)?.avatar_url ? (
                                                            <img
                                                                src={(item.client as any).avatar_url}
                                                                alt={(item.client as any).organization || item.client?.full_name || 'Client'}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as any).style.display = 'none';
                                                                    (e.target as any).parentElement.innerHTML = `<span>${(item.client as any)?.organization?.[0] || item.client?.full_name?.[0] || 'C'}</span>`;
                                                                }}
                                                            />
                                                        ) : (
                                                            <span>{(item.client as any)?.organization?.[0] || item.client?.full_name?.[0] || 'C'}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-black text-iron truncate max-w-[140px] uppercase tracking-tighter leading-tight text-[12px] group-hover:text-[#279da6] transition-colors">
                                                            {(item.client?.organization && item.client.organization.toLowerCase() !== 'individual')
                                                                ? item.client.organization
                                                                : item.client?.full_name}
                                                        </span>
                                                        <span className="text-[12px] text-storm-gray font-bold truncate tracking-widest mt-0.5 opacity-40 uppercase">
                                                            {(item.client?.organization && item.client.organization.toLowerCase() !== 'individual')
                                                                ? item.client?.full_name
                                                                : 'Individual Client'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-3 py-3 border-r border-shark/60 hover:bg-white/5 transition-colors">
                                            <CustomDropdown
                                                value={item.status}
                                                onChange={(val) => handleUpdate(item.id, 'status', val)}
                                                options={[
                                                    { label: 'TODO', value: 'Todo', icon: <Circle size={10} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                    { label: 'IN PROGRESS', value: 'In Progress', icon: <Loader2 size={10} className="text-amber-500" />, color: 'text-amber-500' },
                                                    { label: 'REVIEW', value: 'Review', icon: <Eye size={10} className="text-blue-400" />, color: 'text-blue-400' },
                                                    { label: 'DONE', value: 'Done', icon: <Check size={10} className="text-emerald-500" />, color: 'text-emerald-500' },
                                                ]}
                                                variant="minimal"
                                                className="w-full"
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
                                                            <div className="w-[46px] h-[46px] rounded-full overflow-hidden shrink-0 border border-shark/60">
                                                                <img src={tm.avatar_url} alt={tm.name} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : <User size={20} className="text-[#279da6]" />
                                                    }))
                                                ]}
                                                variant="minimal"
                                                className="w-full"
                                            />
                                        </td>
                                        <td className="px-3 py-3 border-r border-shark/60 text-storm-gray font-black whitespace-nowrap text-[12px] uppercase text-center hover:bg-white/5 transition-colors leading-tight">
                                            <div className={`flex items-center justify-center gap-1.5 font-black tracking-widest ${getAutomaticPriority(item.due_date).colorClass}`}>
                                                <Flag size={10} className="shrink-0" />
                                                <span>{getAutomaticPriority(item.due_date).label}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-storm-gray border-r border-shark/60 whitespace-nowrap hover:bg-white/5 transition-colors">
                                            <CustomDatePicker
                                                value={item.due_date}
                                                onChange={(date) => handleUpdate(item.id, 'due_date', date)}
                                                variant="minimal"
                                                className="w-full"
                                            />
                                        </td>
                                        <td className="px-5 py-3 text-storm-gray border-r border-shark/60 whitespace-nowrap text-[12px] text-center uppercase border-shark/60">
                                            <div className="flex flex-col">
                                                <span className="text-iron font-black">{formatDate(item.updated_at)}</span>
                                                <span className="opacity-40 font-bold tracking-tighter">{formatTime(item.updated_at)}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-storm-gray whitespace-nowrap text-[12px] text-center uppercase">
                                            <div className="flex flex-col">
                                                <span className="text-iron font-black">{formatDate(item.created_at)}</span>
                                                <span className="opacity-40 font-bold tracking-tighter">{formatTime(item.created_at)}</span>
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
