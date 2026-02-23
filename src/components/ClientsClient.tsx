'use client';

import React, { useState } from 'react';
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
    Camera
} from 'lucide-react';
import AvatarUpload from '@/components/AvatarUpload';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CustomDropdown from '@/components/CustomDropdown';
import { CheckCircle2, Users as UsersIcon, XCircle, Archive, Plus as PlusIcon } from 'lucide-react';

interface ClientItem {
    id: string;
    profile_id?: string | null;
    name: string;
    email: string;
    organization: string;
    createdAt: string;
    lastLoginDate: string;
    lastLoginTime: string;
    lastLoginRaw: string | null;
    avatar_url?: string | null;
    status: string;
}

interface ClientsClientProps {
    initialClients: ClientItem[];
}



export default function ClientsClient({ initialClients }: ClientsClientProps) {
    const router = useRouter();
    const { impersonate, isImpersonating } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('Ongoing');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        name: '',
        email: '',
        organization: '',
        createdAt: '',
        lastLoginDate: '',
        status: ''
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
        key: 'createdAt',
        direction: 'desc'
    });
    const [activeFilterHeader, setActiveFilterHeader] = useState<string | null>(null);

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
        password: '',
        confirmPassword: '',
        create_folder: true,
        status: 'Ongoing',
        avatarUrl: ''
    });

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
        setFormData({ name: '', organization: '', email: '', password: '', confirmPassword: '', create_folder: true, status: 'Ongoing', avatarUrl: '' });
        setSelectedClient(null);
    };

    // Handle Create Form Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setIsModalOpen(false);
                resetForm();
                router.refresh(); // Trigger server-side re-fetch
            } else {
                const err = await response.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            console.error('Submit failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Edit Click
    const handleEditClick = (client: ClientItem) => {
        setSelectedClient(client);
        setFormData({
            name: client.name,
            organization: client.organization,
            email: client.email,
            password: '',
            confirmPassword: '',
            create_folder: true,
            status: client.status || 'Ongoing',
            avatarUrl: client.avatar_url || ''
        });
        setIsEditModalOpen(true);
        setActiveDropdown(null);
    };

    // Handle Edit Submit
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) return;

        setIsSubmitting(true);

        // Optimistic update
        const updatedClients = clients.map(c =>
            c.id === selectedClient.id
                ? { ...c, name: formData.name, organization: formData.organization, email: formData.email }
                : c
        );
        setClients(updatedClients);

        try {
            const response = await fetch('/api/clients', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedClient.id,
                    name: formData.name,
                    organization: formData.organization,
                    email: formData.email,
                    status: formData.status,
                    avatarUrl: formData.avatarUrl
                })
            });

            if (response.ok) {
                setIsEditModalOpen(false);
                resetForm();
                router.refresh();
            } else {
                const err = await response.json();
                alert(`Error: ${err.error}`);
                setClients(initialClients); // Rollback
            }
        } catch (error) {
            console.error('Update failed:', error);
            setClients(initialClients); // Rollback
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Delete Click
    const handleDeleteClick = (client: ClientItem) => {
        setSelectedClient(client);
        setIsDeleteModalOpen(true);
        setActiveDropdown(null);
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
        setClients(clients.map(c => c.id === clientId ? { ...c, status: newStatus } : c));

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
        const matchesDate = !filters.createdAt || client.createdAt.includes(filters.createdAt);
        const matchesLogin = !filters.lastLoginDate || client.lastLoginDate.includes(filters.lastLoginDate);
        const matchesStatus = !filters.status || client.status.toLowerCase().includes(filters.status.toLowerCase());

        const matchesTab = activeTab === 'All' || (client.status || 'Ongoing') === activeTab;

        return matchesSearch && matchesName && matchesEmail && matchesOrg && matchesDate && matchesLogin && matchesStatus && matchesTab;
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

    return (
        <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
            <Sidebar isCollapsed={isSidebarCollapsed} />

            <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                <div className={`flex-1 flex flex-col min-w-0 bg-[#121214] rounded-t-2xl overflow-hidden border-t border-l border-r mt-6 mr-6 transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
                    <Header
                        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        label="Clients"
                        labelIcon={<Users size={16} className="text-santas-gray" />}
                        tabs={clientCategories}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        onCreate={() => setIsModalOpen(true)}
                        tabCounts={tabCounts}
                        pageSwitcher={[
                            { name: 'Clients', path: '/clients' },
                            { name: 'Team', path: '/team' }
                        ]}
                        activePath="/clients"
                    />

                    <main className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="px-6 pb-6 pt-2">
                            <div className="bg-[#18181B] border border-shark rounded-2xl p-6 min-h-[calc(100vh-160px)] shadow-2xl">

                                {/* Toolbar */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="relative w-80">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-santas-gray" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search for Clients"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-[#09090B] border border-shark/50 rounded-lg py-2 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <button
                                                onClick={() => {
                                                    setFilters({
                                                        name: '',
                                                        email: '',
                                                        organization: '',
                                                        createdAt: '',
                                                        lastLoginDate: '',
                                                        status: ''
                                                    });
                                                    setSearchQuery('');
                                                    setSortConfig({ key: '', direction: null });
                                                }}
                                                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[11px] font-bold z-10 ${Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'createdAt' && sortConfig.direction === 'desc')) ? 'bg-[#279da6]/20 border-[#279da6]/60 text-[#279da6] active:scale-95' : 'border-shark bg-shark/20 text-santas-gray hover:text-white hover:bg-shark/40'}`}
                                            >
                                                <Filter size={14} className={Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'createdAt' && sortConfig.direction === 'desc')) ? 'fill-[#279da6]/20' : ''} />
                                                <span>{Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'createdAt' && sortConfig.direction === 'desc')) ? 'Reset Filters' : 'Filters'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Clients Table */}
                                <div className="border border-shark/60 rounded-xl bg-black/20">
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse table-auto text-xs">
                                            <thead>
                                                <tr className="border-b border-shark text-storm-gray text-xs uppercase font-black tracking-widest bg-shark/20">
                                                    <th className="px-5 py-5 w-12 border-r border-shark/60 text-center">#</th>
                                                    {[
                                                        { label: 'Organization', key: 'name', filter: 'name', width: 'min-w-[200px]' },
                                                        { label: 'Email', key: 'email', filter: 'email', width: 'min-w-[200px]' },
                                                        { label: 'User', key: 'organization', filter: 'organization', width: 'min-w-[150px]' },
                                                        { label: 'Created At', key: 'createdAt', filter: 'createdAt', width: 'min-w-[150px]' },
                                                        { label: 'Last Login', key: 'lastLoginDate', filter: 'lastLoginDate', width: 'min-w-[150px]' },
                                                        { label: 'Status', key: 'status', filter: 'status', width: 'min-w-[120px]' }
                                                    ].map((header, idx) => (
                                                        <th key={header.label} className={`px-4 py-5 border-r border-shark/60 group/header relative header-filter-container ${header.width || ''}`}>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="cursor-default">{header.label}</span>
                                                                <button
                                                                    onClick={() => setActiveFilterHeader(activeFilterHeader === header.filter ? null : header.filter)}
                                                                    className={`p-1 rounded hover:bg-shark/40 transition-colors ${(filters as any)[header.filter] || sortConfig.key === header.key ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                                >
                                                                    <Filter size={10} />
                                                                </button>
                                                            </div>
                                                            {activeFilterHeader === header.filter && (
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
                                                                        {['createdAt', 'lastLoginDate'].includes(header.filter) ? (
                                                                            <input
                                                                                type="date"
                                                                                value={(filters as any)[header.filter]}
                                                                                onChange={(e) => setFilters(f => ({ ...f, [header.filter]: e.target.value }))}
                                                                                className="w-full bg-[#09090B] border border-shark/50 rounded-md py-1.5 px-2 text-[10px] text-iron focus:outline-none [color-scheme:dark]"
                                                                            />
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                placeholder={`Filter by ${header.label.toLowerCase()}...`}
                                                                                value={(filters as any)[header.filter]}
                                                                                onChange={(e) => setFilters(f => ({ ...f, [header.filter]: e.target.value }))}
                                                                                className="w-full bg-[#09090B] border border-shark/50 rounded-md py-1.5 px-2 text-[10px] text-iron focus:outline-none"
                                                                                autoFocus
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </th>
                                                    ))}
                                                    <th className="px-6 py-5 w-24">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-shark/60">
                                                {sortedClients.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-12 text-center text-storm-gray font-medium uppercase tracking-widest opacity-40">
                                                            No clients found matching your criteria.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    sortedClients.map((client: ClientItem, index: number) => (
                                                        <tr key={client.id} className="hover:bg-shark/10 transition-colors group text-sm">
                                                            <td className="px-5 py-4.5 border-r border-shark/60 text-center font-black text-storm-gray">
                                                                {(index + 1).toString().padStart(2, '0')}
                                                            </td>
                                                            <td
                                                                className="px-6 py-4.5 border-r border-shark/60 cursor-pointer hover:bg-white/5 transition-colors group/cell"
                                                                onClick={() => router.push(`/clients/${client.id}`)}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-full bg-shark/80 border border-white/5 overflow-hidden flex items-center justify-center text-[11px] text-white font-black bg-gradient-to-br from-[#279da6]/20 to-transparent group-hover/cell:scale-110 transition-transform shrink-0">
                                                                        {client.avatar_url ? (
                                                                            <img src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            (client.name || client.organization).split(' ').map((n: string) => n[0]).join('').slice(0, 2)
                                                                        )}
                                                                    </div>
                                                                    <span className="text-iron font-black group-hover/cell:text-[#279da6] transition-colors uppercase tracking-tight">{client.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4.5 text-santas-gray border-r border-shark/60 font-black">
                                                                {client.email}
                                                            </td>
                                                            <td className="px-6 py-4.5 text-santas-gray border-r border-shark/60 font-black">{client.organization}</td>
                                                            <td className="px-6 py-4.5 text-storm-gray border-r border-shark/60 font-black whitespace-nowrap">{client.createdAt}</td>
                                                            <td className="px-6 py-4.5 text-storm-gray border-r border-shark/60 font-black whitespace-nowrap">
                                                                {client.lastLoginRaw ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="text-iron">{client.lastLoginDate}</span>
                                                                        <span className="text-[10px] opacity-50">{client.lastLoginTime}</span>
                                                                    </div>
                                                                ) : 'Never'}
                                                            </td>
                                                            <td className="px-6 py-4.5 text-iron border-r border-shark/60 font-medium">
                                                                <div className="flex items-center gap-2">
                                                                    <CustomDropdown
                                                                        value={client.status || 'Ongoing'}
                                                                        onChange={(val) => handleStatusUpdate(client.id, val)}
                                                                        options={[
                                                                            { label: 'Ongoing', value: 'Ongoing', icon: <CheckCircle2 size={12} className="text-emerald-400" />, color: 'text-emerald-400' },
                                                                            { label: 'Leads', value: 'Leads', icon: <UsersIcon size={12} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                                            { label: 'Closed', value: 'Closed', icon: <XCircle size={12} className="text-rose-400" />, color: 'text-rose-400' },
                                                                            { label: 'Archive', value: 'Archive', icon: <Archive size={12} className="text-[#F28C28]" />, color: 'text-[#F28C28]' },
                                                                        ]}
                                                                        className="w-28"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4.5 relative group/actions">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveDropdown(activeDropdown === client.id ? null : client.id);
                                                                    }}
                                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-shark ${activeDropdown === client.id ? 'bg-shark text-[#279da6]' : 'text-storm-gray'}`}
                                                                >
                                                                    <MoreHorizontal size={14} />
                                                                </button>

                                                                {/* Dropdown Menu */}
                                                                {activeDropdown === client.id && (
                                                                    <div
                                                                        className="absolute right-0 top-full mt-2 z-[100] w-48 bg-[#18181B] border border-shark rounded-xl shadow-2xl overflow-hidden py-1 animate-scale-in origin-top-right"
                                                                        onMouseLeave={() => setActiveDropdown(null)}
                                                                    >
                                                                        <button
                                                                            onClick={() => router.push(`/clients/${client.id}`)}
                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-santas-gray hover:text-white hover:bg-[#279da6]/10 transition-all"
                                                                        >
                                                                            <Eye size={14} className="text-[#279da6]" />
                                                                            <span>View Details</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleEditClick(client)}
                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-santas-gray hover:text-white hover:bg-[#279da6]/10 transition-all"
                                                                        >
                                                                            <Edit2 size={14} className="text-[#279da6]" />
                                                                            <span>Edit Account</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                impersonate({
                                                                                    id: client.profile_id || client.id,
                                                                                    email: client.email,
                                                                                    full_name: client.name,
                                                                                    role: 'client'
                                                                                });
                                                                                setActiveDropdown(null);
                                                                            }}
                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-santas-gray hover:text-white hover:bg-[#279da6]/10 transition-all"
                                                                        >
                                                                            <UserCog size={14} className="text-[#279da6]" />
                                                                            <span>Impersonate</span>
                                                                        </button>
                                                                        <button className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-santas-gray hover:text-white hover:bg-[#279da6]/10 transition-all">
                                                                            <Building size={14} className="text-[#279da6]" />
                                                                            <span>Change Organization</span>
                                                                        </button>
                                                                        <div className="h-px bg-shark my-1" />
                                                                        <button
                                                                            onClick={() => handleDeleteClick(client)}
                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                            <span>Delete Client</span>
                                                                        </button>
                                                                    </div>
                                                                )}
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

                    {/* --- Create Client Modal --- */}
                    {isModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)} />

                            <div className="relative bg-[#18181B] border border-shark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up mx-4">
                                <form onSubmit={handleSubmit}>
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-shark">
                                        <h3 className="text-lg font-bold text-iron">Client Information</h3>
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 text-santas-gray hover:text-white hover:bg-shark rounded-lg">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="p-6 space-y-5">
                                        <div className="flex flex-col items-center mb-2">
                                            <AvatarUpload
                                                currentAvatarUrl={formData.avatarUrl}
                                                onUploadSuccess={(url) => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                                                onRemove={() => setFormData(prev => ({ ...prev, avatarUrl: '' }))}
                                                name={formData.name || formData.organization}
                                                email={formData.email}
                                            />
                                            <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest mt-1">Client Photo</p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-santas-gray uppercase tracking-wider">Company/Organization Name</label>
                                            <input
                                                type="text"
                                                placeholder="Organization name"
                                                value={formData.organization}
                                                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                                className="w-full bg-[#09090B] border border-shark/60 rounded-xl py-2.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-santas-gray uppercase tracking-wider">Client Name *</label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="Enter client name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-[#09090B] border border-shark/60 rounded-xl py-2.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-santas-gray uppercase tracking-wider">Email Address *</label>
                                            <input
                                                required
                                                type="email"
                                                placeholder="email@example.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-[#09090B] border border-shark/60 rounded-xl py-2.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-santas-gray uppercase tracking-wider">Password *</label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Enter password"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full bg-[#09090B] border border-shark/60 rounded-xl py-2.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60"
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-storm-gray hover:text-iron">
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-santas-gray uppercase tracking-wider">Confirm Password *</label>
                                            <input
                                                required
                                                type="password"
                                                placeholder="Confirm password"
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                className="w-full bg-[#09090B] border border-shark/60 rounded-xl py-2.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-santas-gray uppercase tracking-wider">Status</label>
                                            <CustomDropdown
                                                value={formData.status}
                                                onChange={(val) => setFormData({ ...formData, status: val })}
                                                options={[
                                                    { label: 'Ongoing', value: 'Ongoing', icon: <CheckCircle2 size={12} className="text-emerald-400" />, color: 'text-emerald-400' },
                                                    { label: 'Leads', value: 'Leads', icon: <UsersIcon size={12} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                    { label: 'Closed', value: 'Closed', icon: <XCircle size={12} className="text-rose-400" />, color: 'text-rose-400' },
                                                    { label: 'Archive', value: 'Archive', icon: <Archive size={12} className="text-[#F28C28]" />, color: 'text-[#F28C28]' },
                                                ]}
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 p-4 bg-[#279da6]/5 border border-[#279da6]/20 rounded-xl mt-2 group cursor-pointer" onClick={() => setFormData({ ...formData, create_folder: !formData.create_folder })}>
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${formData.create_folder ? 'bg-[#279da6] border-[#279da6]' : 'border-shark bg-shark/50'}`}>
                                                {formData.create_folder && <Check className="text-white" size={12} strokeWidth={4} />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[11px] font-bold text-iron">Create Google Drive folder?</p>
                                                <p className="text-[9px] text-storm-gray">Automatically sets up a dedicated folder in your Root storage.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-[#121214] border-t border-shark flex items-center justify-end gap-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-xs font-bold text-iron hover:bg-shark rounded-xl transition-all">
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-6 py-2.5 text-xs font-bold bg-[#279da6] text-white rounded-xl shadow-lg hover:bg-[#279da6]/90 transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Creating...
                                                </>
                                            ) : 'Create Client Account'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* --- Edit Client Modal --- */}
                    {isEditModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setIsEditModalOpen(false)} />

                            <div className="relative bg-[#18181B] border border-shark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up mx-4">
                                <form onSubmit={handleEditSubmit}>
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-shark">
                                        <h3 className="text-lg font-bold text-iron">Edit Client Account</h3>
                                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="p-1.5 text-santas-gray hover:text-white hover:bg-shark rounded-lg">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="p-6 space-y-5">
                                        <div className="flex flex-col items-center mb-2">
                                            <AvatarUpload
                                                currentAvatarUrl={formData.avatarUrl}
                                                onUploadSuccess={(url) => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                                                onRemove={() => setFormData(prev => ({ ...prev, avatarUrl: '' }))}
                                                name={formData.name || formData.organization}
                                                email={formData.email}
                                            />
                                            <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest mt-1">Client Photo</p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-santas-gray uppercase tracking-wider">Company/Organization Name</label>
                                            <input
                                                type="text"
                                                value={formData.organization}
                                                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                                className="w-full bg-[#09090B] border border-shark/60 rounded-xl py-2.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-santas-gray uppercase tracking-wider">Client Name *</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-[#09090B] border border-shark/60 rounded-xl py-2.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-santas-gray uppercase tracking-wider">Email Address *</label>
                                            <input
                                                required
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-[#09090B] border border-shark/60 rounded-xl py-2.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-santas-gray uppercase tracking-wider">Status</label>
                                            <CustomDropdown
                                                value={formData.status}
                                                onChange={(val) => setFormData({ ...formData, status: val })}
                                                options={[
                                                    { label: 'Ongoing', value: 'Ongoing', icon: <CheckCircle2 size={12} className="text-emerald-400" />, color: 'text-emerald-400' },
                                                    { label: 'Leads', value: 'Leads', icon: <UsersIcon size={12} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                    { label: 'Closed', value: 'Closed', icon: <XCircle size={12} className="text-rose-400" />, color: 'text-rose-400' },
                                                    { label: 'Archive', value: 'Archive', icon: <Archive size={12} className="text-[#F28C28]" />, color: 'text-[#F28C28]' },
                                                ]}
                                            />
                                        </div>

                                        <p className="text-[10px] text-storm-gray">Note: Password changes are handled via individual account settings.</p>
                                    </div>

                                    <div className="p-6 bg-[#121214] border-t border-shark flex items-center justify-end gap-3">
                                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-xs font-bold text-iron hover:bg-shark rounded-xl transition-all">
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-6 py-2.5 text-xs font-bold bg-[#279da6] text-white rounded-xl shadow-lg hover:bg-[#279da6]/90 transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Updating...
                                                </>
                                            ) : 'Update Account'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

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
                                            className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-rose-600/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                            Yes, Delete Account
                                        </button>
                                        <button
                                            onClick={() => setIsDeleteModalOpen(false)}
                                            className="w-full bg-shark/50 hover:bg-shark text-iron py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div >
            </div >
        </div >
    );
}
