'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    Search,
    Download,
    Plus,
    Filter,
    Calendar as CalendarIcon,
    MoreHorizontal,
    ChevronDown,
    ChevronRight,
    Users,
    X,
    Eye,
    EyeOff,
    Loader2,
    Edit2,
    UserCog,
    Building,
    Trash2,
    AlertTriangle,
    ExternalLink,
    Check,
    SortAsc,
    SortDesc,
    Camera,
    FileText,
    CheckSquare,
    MessageSquare,
    Copy,
    SlidersHorizontal,
    LayoutList,
    Phone
} from 'lucide-react';
import AvatarUpload from '@/components/AvatarUpload';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CustomDropdown from '@/components/CustomDropdown';
import CustomDateRangePicker from '@/components/CustomDateRangePicker';
import { CheckCircle2, Users as UsersIcon, XCircle, Archive, Plus as PlusIcon, Globe } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/dateUtils';

interface ClientItem {
    id: string;
    profile_id?: string | null;
    name: string;
    email: string;
    phone?: string | null;
    country_code?: string | null;
    organization: string;
    createdAt: string;
    createdAtRaw: string | null;
    lastLoginDate: string;
    lastLoginTime: string;
    lastLoginRaw: string | null;
    avatar_url?: string | null;
    status: 'Ongoing' | 'Leads' | 'Closed' | 'Archive';
    request_count?: number;
    task_count?: number;
    website?: string | null;
    slug: string;
}

interface FilterState {
    name: string;
    email: string;
    organization: string;
    date_from: string;
    date_to: string;
    status: string;
}

interface ClientsClientProps {
    initialClients: ClientItem[];
}


const COUNTRY_CODES = [
    { code: '+91', country: 'India' },
    { code: '+1', country: 'USA' },
    { code: '+44', country: 'UK' },
    { code: '+971', country: 'UAE' },
    { code: '+61', country: 'Australia' },
    { code: '+65', country: 'Singapore' },
    { code: '+49', country: 'Germany' },
    { code: '+33', country: 'France' },
    { code: '+81', country: 'Japan' },
    { code: '+86', country: 'China' },
];

export default function ClientsClient({ initialClients }: ClientsClientProps) {
    const router = useRouter();
    const { impersonate, isImpersonating } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('Ongoing');
    const [isCreating, setIsCreating] = useState(false);
    const [panelMode, setPanelMode] = useState<'create' | 'edit'>('create');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        name: '',
        email: '',
        organization: '',
        date_from: '',
        date_to: '',
        status: ''
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
        key: 'createdAtRaw',
        direction: 'desc'
    });
    const [activeFilterHeader, setActiveFilterHeader] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [clients, setClients] = useState<ClientItem[]>(initialClients);

    // Update state when initialClients changes (from SSR refresh)
    React.useEffect(() => {
        setClients(initialClients);
    }, [initialClients]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        organization: '',
        email: '',
        phone: '',
        country_code: '+91',
        password: '',
        confirmPassword: '',
        create_folder: false,
        status: 'Ongoing' as 'Ongoing' | 'Leads' | 'Closed' | 'Archive',
        avatarUrl: '',
        website: ''
    });

    // Inline Panel State
    const inlineInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isCreating) {
            setTimeout(() => inlineInputRef.current?.focus(), 100);
        }
    }, [isCreating]);

    const clientCategories = ['Ongoing', 'Leads', 'Closed', 'Archive', 'All'];

    // Compute counts per status for notification badges
    const tabCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        clientCategories.forEach(cat => {
            if (cat === 'All') {
                counts[cat] = clients.length;
            } else {
                counts[cat] = clients.filter(c => (c.status || 'Ongoing') === cat).length;
            }
        });
        return counts;
    }, [clients]);

    const resetForm = () => {
        setFormData({ name: '', organization: '', email: '', phone: '', country_code: '+91', password: '', confirmPassword: '', create_folder: false, status: 'Ongoing', avatarUrl: '', website: '' });
        setSelectedClient(null);
        setPanelMode('create');
    };

    // Handle Panel Submit (Create or Edit)
    const handlePanelSubmit = async () => {
        if (panelMode === 'create' && (!formData.name || !formData.email || !formData.organization || !formData.password)) {
            alert("Please fill in Name, Email, Organization, and Password.");
            return;
        }

        if (formData.password && formData.password !== formData.confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        setIsSubmitting(true);

        if (panelMode === 'edit' && selectedClient) {
            // Optimistic update
            const updatedClients = clients.map(c =>
                c.id === selectedClient.id
                    ? {
                        ...c,
                        name: formData.name,
                        organization: formData.organization,
                        email: formData.email,
                        phone: formData.phone,
                        country_code: formData.country_code,
                        avatar_url: formData.avatarUrl,
                        status: formData.status,
                        website: formData.website
                    }
                    : c
            );
            setClients(updatedClients as ClientItem[]);
        }

        try {
            const endpoint = '/api/clients';
            const method = panelMode === 'edit' ? 'PATCH' : 'POST';
            const body = panelMode === 'edit'
                ? {
                    id: selectedClient?.id,
                    name: formData.name,
                    organization: formData.organization,
                    email: formData.email,
                    phone: formData.phone,
                    country_code: formData.country_code,
                    status: formData.status,
                    avatarUrl: formData.avatarUrl,
                    password: formData.password || undefined,
                    oldEmail: selectedClient?.email,
                    website: formData.website
                }
                : formData;

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setIsCreating(false);
                resetForm();
                router.refresh();
            } else {
                const err = await response.json();
                alert(`Error: ${err.error}`);
                if (panelMode === 'edit') setClients(initialClients); // Rollback
            }
        } catch (error) {
            console.error('Submit failed:', error);
            if (panelMode === 'edit') setClients(initialClients); // Rollback
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Edit Click
    const handleEditClick = (client: ClientItem) => {
        setPanelMode('edit');
        setSelectedClient(client);
        setFormData({
            name: client.name,
            organization: client.organization,
            email: client.email,
            phone: client.phone || '',
            country_code: client.country_code || '+91',
            password: '',
            confirmPassword: '',
            create_folder: true,
            status: client.status || 'Ongoing',
            avatarUrl: client.avatar_url || '',
            website: client.website || ''
        });
        setIsCreating(true);
    };

    // Handle Delete Click
    const handleDeleteClick = (client: ClientItem) => {
        setSelectedClient(client);
        setIsDeleteModalOpen(true);
    };

    // Handle Delete Confirm
    const handleDeleteConfirm = async () => {
        if (!selectedClient) return;

        setIsSubmitting(true);

        // Optimistic delete
        const updatedClients = clients.filter(c => c.id !== selectedClient.id);
        setClients(updatedClients);

        try {
            const response = await fetch(`/api/clients?id=${selectedClient.id}&email=${selectedClient.email}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setIsDeleteModalOpen(false);
                resetForm();
                router.refresh();
            } else {
                const err = await response.json();
                alert(`Error: ${err.error}`);
                setClients(initialClients); // Rollback
            }
        } catch (error) {
            console.error('Delete failed:', error);
            setClients(initialClients); // Rollback
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Status Update directly from table
    const handleStatusUpdate = async (clientId: string, newStatus: string) => {
        const originalClients = [...clients];

        // Optimistic update
        setClients(clients.map(c => c.id === clientId ? { ...c, status: newStatus as any } : c) as ClientItem[]);

        try {
            const response = await fetch('/api/clients', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: clientId, status: newStatus })
            });

            if (!response.ok) {
                setClients(originalClients);
                const err = await response.json();
                alert(`Error: ${err.error}`);
            } else {
                router.refresh();
            }
        } catch (error) {
            setClients(originalClients);
            console.error('Status update failed:', error);
        }
    };

    // Handle Copy to Clipboard
    const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
        }));
    };

    const filteredClients = clients.filter((client: ClientItem) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            client.name.toLowerCase().includes(searchLower) ||
            client.email.toLowerCase().includes(searchLower) ||
            client.organization.toLowerCase().includes(searchLower);

        const matchesName = !filters.name || client.name.toLowerCase().includes(filters.name.toLowerCase());
        const matchesEmail = !filters.email || client.email.toLowerCase().includes(filters.email.toLowerCase());
        const matchesOrg = !filters.organization || client.organization.toLowerCase().includes(filters.organization.toLowerCase());
        const matchesStatus = !filters.status || client.status.toLowerCase().includes(filters.status.toLowerCase());

        // Date Range Filter
        let matchesDate = true;
        if (filters.date_from || filters.date_to) {
            if (client.createdAtRaw) {
                const clientDate = new Date(client.createdAtRaw);
                clientDate.setHours(0, 0, 0, 0);

                if (filters.date_from) {
                    const fromDate = new Date(filters.date_from);
                    fromDate.setHours(0, 0, 0, 0);
                    if (clientDate < fromDate) matchesDate = false;
                }
                if (filters.date_to) {
                    const toDate = new Date(filters.date_to);
                    toDate.setHours(0, 0, 0, 0);
                    if (clientDate > toDate) matchesDate = false;
                }
            } else {
                matchesDate = false;
            }
        }

        const matchesTab = activeTab === 'All' || (client.status || 'Ongoing') === activeTab;

        return matchesSearch && matchesName && matchesEmail && matchesOrg && matchesDate && matchesStatus && matchesTab;
    });

    const sortedClients = [...filteredClients].sort((a, b) => {
        if (!sortConfig.key || !sortConfig.direction) return 0;

        let aValue: any = (a as any)[sortConfig.key];
        let bValue: any = (b as any)[sortConfig.key];

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

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

    const filtersElement = (
        <div className="relative">
            <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold z-10 ${Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'createdAtRaw' && sortConfig.direction === 'desc')) ? 'bg-[#279da6]/20 border-[#279da6]/60 text-[#279da6] active:scale-95' : 'border-shark bg-[#121214] text-santas-gray hover:text-white hover:bg-shark/40'}`}
            >
                <Filter size={14} className={Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'createdAtRaw' && sortConfig.direction === 'desc')) ? 'fill-[#279da6]/20' : ''} />
                <span>Filters</span>
                <ChevronDown size={14} className={isFilterOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-[500px] bg-[#121214] border border-shark rounded-xl shadow-2xl p-5 z-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-[#279da6]">Advanced Filters</h4>
                        <button
                            onClick={() => {
                                setFilters({
                                    name: '',
                                    email: '',
                                    organization: '',
                                    date_from: '',
                                    date_to: '',
                                    status: ''
                                });
                                setSearchQuery('');
                                setSortConfig({ key: 'createdAtRaw', direction: 'desc' });
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
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Organization</label>
                                <div className="relative group">
                                    <Building size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                    <input
                                        type="text"
                                        value={filters.organization}
                                        onChange={(e) => setFilters(f => ({ ...f, organization: e.target.value }))}
                                        placeholder="Search org..."
                                        className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-10 text-[12px] font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                    />
                                    {filters.organization && (
                                        <button
                                            onClick={() => setFilters(f => ({ ...f, organization: '' }))}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-shark rounded-md text-storm-gray hover:text-white transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Name</label>
                                <div className="relative group">
                                    <UsersIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                    <input
                                        type="text"
                                        value={filters.name}
                                        onChange={(e) => setFilters(f => ({ ...f, name: e.target.value }))}
                                        placeholder="Search name..."
                                        className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-10 text-[12px] font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                    />
                                    {filters.name && (
                                        <button
                                            onClick={() => setFilters(f => ({ ...f, name: '' }))}
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
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Email</label>
                                <div className="relative group">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                    <input
                                        type="text"
                                        value={filters.email}
                                        onChange={(e) => setFilters(f => ({ ...f, email: e.target.value }))}
                                        placeholder="Search email..."
                                        className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-10 text-[12px] font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                    />
                                    {filters.email && (
                                        <button
                                            onClick={() => setFilters(f => ({ ...f, email: '' }))}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-shark rounded-md text-storm-gray hover:text-white transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Status</label>
                                <CustomDropdown
                                    value={filters.status}
                                    onChange={(val) => setFilters(f => ({ ...f, status: val }))}
                                    options={[
                                        { label: 'All Statuses', value: '' },
                                        { label: 'Ongoing', value: 'Ongoing', icon: <CheckCircle2 size={12} className="text-emerald-500" /> },
                                        { label: 'Leads', value: 'Leads', icon: <UsersIcon size={12} className="text-[#279da6]" /> },
                                        { label: 'Closed', value: 'Closed', icon: <XCircle size={12} className="text-rose-500" /> },
                                        { label: 'Archive', value: 'Archive', icon: <Archive size={12} className="text-purple-500" /> }
                                    ]}
                                    showClear={true}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Created At</label>
                            <CustomDateRangePicker
                                from={filters.date_from}
                                to={filters.date_to}
                                onChange={(from, to) => setFilters(f => ({ ...f, date_from: from, date_to: to }))}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-[padding,background-color] duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
            <Sidebar isCollapsed={isSidebarCollapsed} />

            <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                <div className={`flex-1 flex flex-col min-w-0 bg-[#121214] rounded-t-2xl overflow-hidden border-t border-l border-r mt-6 mr-6 transition-[border-color,box-shadow] duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
                    <div className="border-b border-shark">
                        <Header
                            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            label={panelMode === 'edit' ? 'Edit Client' : 'Users'}
                            labelIcon={<UsersIcon size={16} className="text-[#279da6]" />}
                            tabs={clientCategories}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            onCreate={() => {
                                setPanelMode('create');
                                setIsCreating(true);
                            }}
                            isCreating={isCreating}
                            onConfirm={handlePanelSubmit}
                            confirmLabel={panelMode === 'edit' ? 'Update Account' : 'Create Account'}
                            onCancel={() => {
                                setIsCreating(false);
                                resetForm();
                                setPanelMode('create');
                            }}
                            isSubmitting={isSubmitting}
                            tabCounts={tabCounts}
                            pageSwitcher={[
                                { name: 'Clients', path: '/clients' },
                                { name: 'Team', path: '/team' }
                            ]}
                            activePath="/clients"
                            rightToolbar={filtersElement}
                        />
                    </div>

                    <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#18181B]">
                        <div className="p-8">

                            {/* Inline Creation Row */}
                            <div
                                className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCreating
                                    ? 'max-h-[600px] opacity-100 mb-8 translate-y-0 scale-100 blur-0'
                                    : 'max-h-0 opacity-0 mb-0 -translate-y-4 scale-95 blur-md pointer-events-none'
                                    }`}
                            >
                                <div className="p-1 bg-[#121214]/90 backdrop-blur-2xl border border-[#279da6]/30 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(39,157,166,0.08)] ring-1 ring-white/5 relative overflow-hidden">
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#279da6]/20 border border-[#279da6]/30 rounded-full">
                                        <span className="text-[10px] font-black text-[#279da6] uppercase tracking-[0.2em]">
                                            {panelMode === 'edit' ? 'Edit Existing Client' : 'Add New Client'}
                                        </span>
                                    </div>
                                    {panelMode === 'edit' && (
                                        <div className="absolute top-4 right-8">
                                            <button
                                                onClick={() => handleDeleteClick(selectedClient!)}
                                                className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-500 hover:bg-rose-500/20 transition-all cursor-pointer group"
                                            >
                                                <Trash2 size={12} className="group-hover:scale-110 transition-transform" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Delete Client</span>
                                            </button>
                                        </div>
                                    )}
                                    <div className="p-6 pt-10 space-y-6">
                                        <div className="flex items-start gap-6">
                                            <div className="flex flex-col items-center gap-3 shrink-0">
                                                <AvatarUpload
                                                    currentAvatarUrl={formData.avatarUrl}
                                                    onUploadSuccess={(url) => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                                                    onRemove={() => setFormData(prev => ({ ...prev, avatarUrl: '' }))}
                                                    name={formData.name}
                                                    email={formData.email}
                                                />
                                                <p className="text-[10px] font-black text-storm-gray uppercase tracking-widest">Client Photo</p>
                                            </div>

                                            <div className="flex-1 space-y-8">
                                                {/* Fields Grid: Perfectly aligned 4-column layout */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-5 gap-y-8">
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Organization</label>
                                                        <div className="relative group">
                                                            <Building size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                ref={inlineInputRef}
                                                                type="text"
                                                                value={formData.organization}
                                                                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                                                placeholder="Company Name"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Client Name</label>
                                                        <div className="relative group">
                                                            <UsersIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                type="text"
                                                                value={formData.name}
                                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                                placeholder="Full Name"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Website</label>
                                                        <div className="relative group">
                                                            <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                type="text"
                                                                value={formData.website}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setFormData({ ...formData, website: val });

                                                                    if (val && (!formData.avatarUrl || formData.avatarUrl.includes('google.com/s2/favicons'))) {
                                                                        let domain = val.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
                                                                        if (domain) {
                                                                            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
                                                                            setFormData(prev => ({ ...prev, avatarUrl: faviconUrl }));
                                                                        }
                                                                    }
                                                                }}
                                                                placeholder="domain.com"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Email Address</label>
                                                        <div className="relative group">
                                                            <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                type="email"
                                                                value={formData.email}
                                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                                placeholder="email@example.com"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Phone Number</label>
                                                        <div className="flex gap-2">
                                                            <div className="w-[100px] shrink-0">
                                                                <select
                                                                    value={formData.country_code}
                                                                    onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                                                                    className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 px-3 text-xs text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold appearance-none cursor-pointer"
                                                                >
                                                                    {COUNTRY_CODES.map(c => (
                                                                        <option key={c.code} value={c.code} className="bg-[#121214]">
                                                                            {c.code} ({c.country})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="relative flex-1 group">
                                                                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                                <input
                                                                    type="text"
                                                                    value={formData.phone}
                                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                                    placeholder="Phone Number"
                                                                    className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-5 gap-y-8">
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Password</label>
                                                        <div className="relative group">
                                                            <Eye size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                type="password"
                                                                value={formData.password}
                                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                                placeholder="••••••••"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Confirm Password</label>
                                                        <div className="relative group">
                                                            <EyeOff size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                type="password"
                                                                value={formData.confirmPassword}
                                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                                placeholder="••••••••"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Status</label>
                                                        <CustomDropdown
                                                            value={formData.status}
                                                            onChange={(val) => setFormData({ ...formData, status: val as any })}
                                                            options={[
                                                                { label: 'Ongoing', value: 'Ongoing', icon: <CheckCircle2 size={14} className="text-emerald-500" /> },
                                                                { label: 'Leads', value: 'Leads', icon: <UsersIcon size={14} className="text-[#279da6]" /> },
                                                                { label: 'Closed', value: 'Closed', icon: <XCircle size={14} className="text-rose-500" /> },
                                                                { label: 'Archive', value: 'Archive', icon: <Archive size={14} className="text-purple-500" /> }
                                                            ]}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Google Drive</label>
                                                        <button
                                                            onClick={() => setFormData({ ...formData, create_folder: !formData.create_folder })}
                                                            className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border transition-all ${formData.create_folder
                                                                ? 'bg-[#279da6]/10 border-[#279da6]/40 text-white'
                                                                : 'bg-black/40 border-shark/50 text-storm-gray hover:border-shark/80'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <FileText size={14} className={formData.create_folder ? 'text-[#279da6]' : ''} />
                                                                <span className="text-[11px] font-bold">Create Folder</span>
                                                            </div>
                                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${formData.create_folder ? 'bg-[#279da6]' : 'bg-shark'}`}>
                                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${formData.create_folder ? 'right-0.5' : 'left-0.5'}`} />
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>


                            {/* Clients Table */}
                            <div className="border border-shark/60 rounded-xl bg-black/20 overflow-hidden">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                                        <thead>
                                            <tr className="border-b border-shark text-storm-gray text-sm uppercase font-black tracking-widest bg-[#17171a]">
                                                <th className="px-5 py-3 w-[4%] border-r border-shark/60 text-center">#</th>
                                                {[
                                                    { label: 'Organization', key: 'organization', filter: 'organization', width: 'w-[24%]' },
                                                    { label: 'User', key: 'name', filter: 'name', width: 'w-[11%]' },
                                                    { label: 'CONTACT', key: 'email', filter: 'email', width: 'w-[16%]' },
                                                    { label: 'Requests', key: 'request_count', filter: 'request_count', width: 'w-[9%]' },
                                                    { label: 'Tasks', key: 'task_count', filter: 'task_count', width: 'w-[7%]' },
                                                    { label: 'Status', key: 'status', filter: 'status', width: 'w-[10%]' },
                                                    { label: 'Last Login', key: 'lastLoginDate', filter: 'lastLoginDate', width: 'w-[7%]' },
                                                    { label: 'Created At', key: 'createdAt', filter: 'createdAt', width: 'w-[7%]' }
                                                ].map((header, idx) => (
                                                    <th key={header.label} className={`px-3 py-3 border-r border-shark/60 group/header relative header-filter-container ${header.width}`}>
                                                        <div className={`flex items-center gap-2 ${(header.key === 'lastLoginDate' || header.key === 'createdAt' || header.key === 'email') ? 'justify-center' : 'justify-between'}`}>
                                                            {header.filter === 'organization' ? (
                                                                <div className="relative flex-1 group -ml-1">
                                                                    <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                                    <input
                                                                        type="text"
                                                                        value={(filters as any).organization}
                                                                        onChange={(e) => setFilters(f => ({ ...f, organization: e.target.value }))}
                                                                        placeholder="ORGANIZATION"
                                                                        className="w-full bg-transparent border-none py-1.5 pl-8 pr-6 text-sm font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none transition-all font-bold"
                                                                    />
                                                                    {(filters as any).organization && (
                                                                        <button
                                                                            onClick={() => setFilters(f => ({ ...f, organization: '' }))}
                                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white"
                                                                        >
                                                                            <X size={10} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <span className="cursor-default text-sm">{header.label}</span>
                                                                    {header.key !== 'email' && ( // Only show filter button if not the email column
                                                                        <button
                                                                            onClick={() => setActiveFilterHeader(activeFilterHeader === header.filter ? null : header.filter)}
                                                                            className={`p-1 rounded hover:bg-shark/40 transition-colors ${(filters as any)[header.filter] || sortConfig.key === header.key ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                                        >
                                                                            <Filter size={10} />
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        {activeFilterHeader === header.filter && header.filter !== 'organization' && (
                                                            <div className={`absolute top-full ${idx > 2 ? 'right-0' : 'left-0'} mt-1 w-48 bg-[#121214] border border-shark rounded-lg shadow-2xl p-2 z-[60] normal-case tracking-normal`}>
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
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Filter</div>
                                                                    {!['createdAt', 'lastLoginDate', 'organization'].includes(header.filter) && (
                                                                        <input
                                                                            type="text"
                                                                            placeholder={`Filter by ${header.label.toLowerCase()}...`}
                                                                            value={(filters as any)[header.filter]}
                                                                            onChange={(e) => setFilters(f => ({ ...f, [header.filter]: e.target.value }))}
                                                                            className="w-full bg-[#09090B] border border-shark/50 rounded-md py-1.5 px-2 text-[10px] text-iron focus:outline-none"
                                                                            autoFocus
                                                                        />
                                                                    )}
                                                                    {['createdAt', 'lastLoginDate'].includes(header.filter) && (
                                                                        <input
                                                                            type="date"
                                                                            value={(filters as any)[header.filter]}
                                                                            onChange={(e) => setFilters(f => ({ ...f, [header.filter]: e.target.value }))}
                                                                            className="w-full bg-[#09090B] border border-shark/50 rounded-md py-1.5 px-2 text-[10px] text-iron focus:outline-none [color-scheme:dark]"
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </th>
                                                ))}
                                                <th className="px-3 py-5 w-[5%] text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-shark/60">
                                            {sortedClients.length === 0 ? (
                                                <tr>
                                                    <td colSpan={10} className="px-6 py-12 text-center text-storm-gray font-medium uppercase tracking-widest opacity-40">
                                                        No clients found matching your criteria.
                                                    </td>
                                                </tr>
                                            ) : (
                                                sortedClients.map((client: ClientItem, index: number) => (
                                                    <tr key={client.id} className="hover:bg-shark/10 transition-colors group text-sm">
                                                        <td className="px-5 py-2.5 border-r border-shark/60 text-center font-black text-storm-gray">
                                                            {(index + 1).toString().padStart(2, '0')}
                                                        </td>
                                                        <td
                                                            className="pl-3 pr-4 py-2.5 border-r border-shark/60 cursor-pointer hover:bg-white/5 transition-colors group/cell"
                                                            onClick={() => router.push(`/clients/${client.slug}`)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 rounded-full bg-shark/80 border border-white/5 overflow-hidden flex items-center justify-center text-[12px] text-white font-black bg-gradient-to-br from-[#279da6]/20 to-transparent group-hover/cell:scale-110 transition-transform shrink-0">
                                                                    {client.avatar_url ? (
                                                                        <img src={client.avatar_url} alt={client.organization} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        client.organization.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
                                                                    )}
                                                                </div>
                                                                <span className="text-iron font-black group-hover/cell:text-[#279da6] transition-colors uppercase tracking-tight">{client.organization}</span>
                                                                <button
                                                                    onClick={(e) => handleCopy(e, client.organization, client.id)}
                                                                    className="p-1 rounded-md text-storm-gray hover:text-[#279da6] hover:bg-[#279da6]/10 transition-all opacity-0 group-hover/cell:opacity-100 focus:opacity-100 ml-auto"
                                                                    title="Copy organization name"
                                                                >
                                                                    {copiedId === client.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2.5 border-r border-shark/60 text-iron font-black tracking-tight uppercase">{client.name}</td>
                                                        <td className="px-3 py-2.5 border-r border-shark/60">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-iron font-bold truncate max-w-[180px]" title={client.email}>
                                                                    {client.email}
                                                                </span>
                                                                {client.phone && (
                                                                    <span className="text-[10px] text-storm-gray font-medium tracking-wider">
                                                                        {client.country_code || '+91'} {client.phone}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td
                                                            className="px-4 py-2.5 border-r border-shark/60 cursor-pointer hover:bg-white/5 transition-colors"
                                                            onClick={() => router.push(`/clients/${client.slug}`)}
                                                            title="View all requests"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <MessageSquare size={14} className="text-[#279da6]" />
                                                                <span className="text-iron font-black">{client.request_count || 0}</span>
                                                            </div>
                                                        </td>
                                                        <td
                                                            className="px-4 py-2.5 border-r border-shark/60 cursor-pointer hover:bg-white/5 transition-colors"
                                                            onClick={() => router.push(`/clients/${client.slug}?tab=Tasks`)}
                                                            title="View all tasks"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <CheckSquare size={14} className="text-amber-400" />
                                                                <span className="text-iron font-black">{client.task_count || 0}</span>
                                                            </div>
                                                        </td>

                                                        <td
                                                            className="px-4 py-2.5 text-iron border-r border-shark/60 font-medium cursor-pointer hover:bg-white/5 transition-colors"
                                                            onClick={(e) => {
                                                                const target = e.target as HTMLElement;
                                                                if (!target.closest('button')) {
                                                                    e.currentTarget.querySelector('button')?.click();
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex items-center justify-center gap-2 pointer-events-auto w-full">
                                                                <CustomDropdown
                                                                    value={client.status || 'Ongoing'}
                                                                    onChange={(val) => handleStatusUpdate(client.id, val)}
                                                                    options={[
                                                                        { label: 'ONGOING', value: 'Ongoing', icon: <CheckCircle2 size={12} className="text-emerald-400" />, color: 'text-emerald-400' },
                                                                        { label: 'LEADS', value: 'Leads', icon: <UsersIcon size={12} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                                        { label: 'CLOSED', value: 'Closed', icon: <XCircle size={12} className="text-rose-400" />, color: 'text-rose-400' },
                                                                        { label: 'ARCHIVE', value: 'Archive', icon: <Archive size={12} className="text-[#F28C28]" />, color: 'text-[#F28C28]' },
                                                                    ]}
                                                                    variant="minimal"
                                                                    className="w-auto"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 border-r border-shark/60 text-storm-gray font-black whitespace-nowrap text-[12px] uppercase text-center">
                                                            {client.lastLoginRaw ? (
                                                                <div className="flex flex-col">
                                                                    <span className="text-iron font-black">{formatDate(client.lastLoginRaw)}</span>
                                                                    <span className="opacity-50 font-bold">{formatTime(client.lastLoginRaw)}</span>
                                                                </div>
                                                            ) : 'NEVER'}
                                                        </td>
                                                        <td className="px-4 py-2.5 border-r border-shark/60 text-storm-gray font-black whitespace-nowrap text-[12px] uppercase text-center">
                                                            {client.createdAtRaw ? (
                                                                <div className="flex flex-col">
                                                                    <span className="text-iron font-black">{formatDate(client.createdAtRaw)}</span>
                                                                    <span className="opacity-50 font-bold">{formatTime(client.createdAtRaw)}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="uppercase">{client.createdAt}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2.5 relative text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => impersonate({
                                                                        id: client.profile_id || client.id,
                                                                        email: client.email,
                                                                        full_name: client.name,
                                                                        role: 'client'
                                                                    }, '/clients')}
                                                                    className="p-1.5 rounded-md text-storm-gray hover:bg-shark hover:text-white transition-all cursor-pointer"
                                                                    title="Impersonate"
                                                                >
                                                                    <UserCog size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditClick(client)}
                                                                    className="p-1.5 rounded-md text-storm-gray hover:bg-shark hover:text-white transition-all cursor-pointer"
                                                                    title="Edit Account"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
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
                    </main>
                </div>



                {/* --- Delete Confirmation Modal --- */}
                {
                    isDeleteModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setIsDeleteModalOpen(false)} />

                            <div className="relative bg-[#18181B] border border-shark w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up mx-4 p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <button
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        className="text-storm-gray hover:text-iron transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <h2 className="text-xl font-bold text-iron mb-2">Delete Client?</h2>
                                <p className="text-storm-gray text-sm mb-8 leading-relaxed">
                                    Are you sure you want to delete <span className="text-white font-bold">{selectedClient?.name}</span>? This will permanently remove their access and all associated data.
                                </p>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleDeleteConfirm}
                                        disabled={isSubmitting}
                                        className="w-full bg-rose-600 hover:bg-rose-700 text-white py-5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-rose-600/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                        Yes, Delete Account
                                    </button>
                                    <button
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        className="w-full bg-shark/50 hover:bg-shark text-iron py-5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
}
