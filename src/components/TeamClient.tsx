'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    Search,
    Plus,
    Filter,
    Users,
    Plus as PlusIcon,
    Users as UsersIcon,
    X,
    Eye,
    EyeOff,
    Loader2,
    Edit2,
    Trash2,
    AlertTriangle,
    Check,
    SortAsc,
    SortDesc,
    FileText,
    UserCog,
    Shield,
    Mail,
    Building,
    Home,
    FolderOpen,
    MessageSquare,
    CheckSquare,
    SlidersHorizontal,
    LayoutList,
    ShieldAlert,
    UserIcon,
    ChevronDown
} from 'lucide-react';
import AvatarUpload from '@/components/AvatarUpload';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { formatDate, formatTime } from '@/lib/dateUtils';
import CustomDropdown from '@/components/CustomDropdown';
import CustomDateRangePicker from '@/components/CustomDateRangePicker';

interface TeamMember {
    id: string;
    profile_id?: string | null;
    name: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
    status: string;
    created_at: string;
    last_login: string | null;
    avatar_url?: string | null;
    request_count?: number;
    task_count?: number;
    tasks?: string[];
    accessible_sections?: string[];
}

interface TeamClientProps {
    initialMembers: TeamMember[];
    initialCounts: Record<string, number>;
}



export default function TeamClient({ initialMembers, initialCounts }: TeamClientProps) {
    const router = useRouter();
    const { impersonate, isImpersonating } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('All Members');
    const [panelMode, setPanelMode] = useState<'create' | 'edit'>('create');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        name: '',
        email: '',
        role: '',
        date_from: '',
        date_to: ''
    });
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
        key: 'created_at',
        direction: 'desc'
    });
    const [activeFilterHeader, setActiveFilterHeader] = useState<string | null>(null);
    const [filterCoords, setFilterCoords] = useState({ top: 0, left: 0, width: 0 });
    const headerRefs = useRef<{ [key: string]: HTMLTableCellElement | null }>({});

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


    const [members, setMembers] = useState<TeamMember[]>(initialMembers);


    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        department: '',
        position: '',
        accessible_sections: [] as string[],
        avatarUrl: ''
    });

    // Inline Creation State
    const [isCreating, setIsCreating] = useState(false);
    const inlineInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Initial check for mobile to auto-collapse
        if (window.innerWidth < 1024) {
            setIsSidebarCollapsed(true);
        }

        if (isCreating) {
            setTimeout(() => inlineInputRef.current?.focus(), 100);
        }
    }, [isCreating]);



    const resetForm = () => {
        setFormData({ name: '', email: '', password: '', confirmPassword: '', department: '', position: '', accessible_sections: [], avatarUrl: '' });
        setSelectedMember(null);
    };

    // Handle Create Form Submit

    // Handle Panel Submit (Unified for Create & Edit)
    const handlePanelSubmit = async () => {
        if (!formData.name || !formData.email || (panelMode === 'create' && !formData.password)) {
            alert("Please fill in Name, Email, and Password.");
            return;
        }

        if (formData.password && formData.password !== formData.confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        setIsSubmitting(true);

        // Optimistic update for Edit Mode
        if (panelMode === 'edit' && selectedMember) {
            const updatedMembers = members.map(m =>
                m.id === selectedMember.id
                    ? {
                        ...m,
                        name: formData.name,
                        email: formData.email,
                        avatar_url: formData.avatarUrl,
                        accessible_sections: formData.accessible_sections
                    }
                    : m
            );
            setMembers(updatedMembers);
        }

        try {
            const method = panelMode === 'edit' ? 'PATCH' : 'POST';
            const body = panelMode === 'edit'
                ? {
                    id: selectedMember?.id,
                    name: formData.name,
                    email: formData.email,
                    password: formData.password || undefined,
                    oldEmail: selectedMember?.email,
                    accessible_sections: formData.accessible_sections,
                    avatarUrl: formData.avatarUrl
                }
                : formData;

            const response = await fetch('/api/team', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setIsCreating(false);
                resetForm();
                setPanelMode('create');
                router.refresh();
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

    const handleEditClick = (member: TeamMember) => {
        setSelectedMember(member);
        setFormData({
            name: member.name,
            email: member.email,
            password: '',
            confirmPassword: '',
            department: (member as any).department || '',
            position: (member as any).position || '',
            accessible_sections: member.accessible_sections || [],
            avatarUrl: member.avatar_url || ''
        });
        setPanelMode('edit');
        setIsCreating(true);
    };


    // Handle Delete Click
    const handleDeleteClick = (member: TeamMember) => {
        setSelectedMember(member);
        setIsDeleteModalOpen(true);
    };


    // Handle Delete Confirm
    const handleDeleteConfirm = async () => {
        if (!selectedMember) return;

        setIsSubmitting(true);

        // Optimistic delete
        const updatedMembers = members.filter(m => m.id !== selectedMember.id);
        setMembers(updatedMembers);

        try {
            const response = await fetch(`/api/team?id=${selectedMember.id}&email=${selectedMember.email}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setIsDeleteModalOpen(false);
                resetForm();
                router.refresh();
            } else {
                const err = await response.json();
                alert(`Error: ${err.error}`);
                setMembers(initialMembers); // Rollback
            }
        } catch (error) {
            console.error('Delete failed:', error);
            setMembers(initialMembers); // Rollback
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
        }));
    };

    const filteredMembers = members.filter((member: TeamMember) => {

        // Header Filters
        const matchesName = !filters.name || member.name.toLowerCase().includes(filters.name.toLowerCase());
        const matchesEmail = !filters.email || member.email.toLowerCase().includes(filters.email.toLowerCase());
        const matchesRole = !filters.role || member.role.toLowerCase() === filters.role.toLowerCase();

        // Date Range Filter
        let matchesDate = true;
        if (filters.date_from || filters.date_to) {
            const memberDate = new Date(member.created_at);
            memberDate.setHours(0, 0, 0, 0);

            if (filters.date_from) {
                const fromDate = new Date(filters.date_from);
                fromDate.setHours(0, 0, 0, 0);
                if (memberDate < fromDate) matchesDate = false;
            }
            if (filters.date_to) {
                const toDate = new Date(filters.date_to);
                toDate.setHours(0, 0, 0, 0);
                if (memberDate > toDate) matchesDate = false;
            }
        }

        return matchesName && matchesEmail && matchesRole && matchesDate;
    });

    const sortedMembers = [...filteredMembers].sort((a, b) => {
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
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="relative">
                <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[12px] font-bold z-10 ${Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'created_at' && sortConfig.direction === 'desc')) ? 'bg-[#279da6]/20 border-[#279da6]/60 text-[#279da6]' : 'border-shark bg-black/40 text-santas-gray hover:text-white hover:bg-shark/40'}`}
                >
                    <Filter size={14} className={Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'created_at' && sortConfig.direction === 'desc')) ? 'fill-[#279da6]/20' : ''} />
                    <span className="hidden sm:inline">Filters</span>
                    <ChevronDown size={14} className={isFilterOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>

                {isFilterOpen && (
                    <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-[#121214] border border-shark rounded-2xl shadow-2xl p-4 z-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#279da6]">Advanced Filters</h4>
                            <button
                                onClick={() => {
                                    setFilters({
                                        name: '',
                                        email: '',
                                        role: '',
                                        date_from: '',
                                        date_to: ''
                                    });
                                    setSearchQuery('');
                                    setSortConfig({ key: 'created_at', direction: 'desc' });
                                    setIsFilterOpen(false);
                                }}
                                className="text-[10px] font-bold text-storm-gray hover:text-white underline underline-offset-4"
                            >
                                Reset all
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Name</label>
                                <div className="relative group">
                                    <UsersIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                    <input
                                        type="text"
                                        value={filters.name}
                                        onChange={(e) => setFilters(f => ({ ...f, name: e.target.value }))}
                                        placeholder="Search name..."
                                        className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-10 text-[12px] text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
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

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Role</label>
                                <CustomDropdown
                                    value={filters.role}
                                    onChange={(val) => setFilters(f => ({ ...f, role: val }))}
                                    options={[
                                        { label: 'All Roles', value: '' },
                                        { label: 'Admin', value: 'admin', icon: <Shield size={12} className="text-rose-500" /> },
                                        { label: 'Editor', value: 'editor', icon: <Edit2 size={12} className="text-[#279da6]" /> },
                                        { label: 'Viewer', value: 'viewer', icon: <Eye size={12} className="text-storm-gray" /> }
                                    ]}
                                    showClear={true}
                                />
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
        </div>
    );

    return (
        <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={() => setIsMobileOpen(false)}
            />

            <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                <div className={`flex-1 flex flex-col min-w-0 bg-[#121214] rounded-t-2xl overflow-hidden border-t border-l border-r mt-2 sm:mt-6 mr-2 sm:mr-6 responsive-content-wrapper transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
                    <div className="border-b border-shark">
                        <Header

                            onMobileMenuToggle={() => setIsMobileOpen(true)}
                            label={panelMode === 'edit' ? 'Edit Team Member' : 'Users'}
                            labelIcon={<Users size={16} className="text-[#279da6]" />}
                            onCreate={() => {
                                setPanelMode('create');
                                setIsCreating(true);
                            }}
                            isCreating={isCreating}
                            onConfirm={handlePanelSubmit}
                            confirmLabel={panelMode === 'edit' ? 'Update Member' : 'Create Member'}
                            onCancel={() => {
                                setIsCreating(false);
                                resetForm();
                                setPanelMode('create');
                            }}
                            isSubmitting={isSubmitting}
                            pageSwitcher={[
                                { name: 'Clients', path: '/clients' },
                                { name: 'Team', path: '/team' }
                            ]}
                            activePath="/team"
                            rightToolbar={filtersElement}
                        />
                    </div>

                    <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#18181B]">
                        <div className="p-3 sm:p-4 lg:p-8">

                            {/* Inline Creation Row */}
                            <div
                                className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCreating
                                    ? 'max-h-[2000px] opacity-100 mb-8 translate-y-0 scale-100 blur-0'
                                    : 'max-h-0 opacity-0 mb-0 -translate-y-4 scale-95 blur-md pointer-events-none'
                                    }`}
                            >
                                <div className="p-1 bg-[#121214]/90 backdrop-blur-2xl border border-[#279da6]/30 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(39,157,166,0.08)] ring-1 ring-white/5 relative overflow-hidden">
                                    <div className="absolute top-4 left-4 sm:left-1/2 sm:-translate-x-1/2 px-4 py-1 bg-[#279da6]/20 border border-[#279da6]/30 rounded-full">
                                        <span className="text-[10px] font-black text-[#279da6] uppercase tracking-[0.2em]">
                                            {panelMode === 'edit' ? 'Edit Member' : 'Add Team Member'}
                                        </span>
                                    </div>

                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                        {panelMode === 'edit' && (
                                            <button
                                                onClick={() => handleDeleteClick(selectedMember!)}
                                                className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-500 hover:bg-rose-500/20 transition-all cursor-pointer group"
                                            >
                                                <Trash2 size={12} className="group-hover:scale-110 transition-transform" />
                                                <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">Delete</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setIsCreating(false);
                                                resetForm();
                                                setPanelMode('create');
                                            }}
                                            className="p-1.5 bg-shark/40 border border-shark/60 rounded-full text-storm-gray hover:text-white hover:bg-shark transition-all"
                                            title="Close Panel"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
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
                                                <p className="text-[10px] font-black text-storm-gray uppercase tracking-widest">Photo</p>
                                            </div>

                                            <div className="flex-1 space-y-4 sm:space-y-8 min-w-0">
                                                {/* Header Grid: 4-column layout */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4 sm:gap-y-8">
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Full Name</label>
                                                        <div className="relative group">
                                                            <UsersIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                ref={inlineInputRef}
                                                                type="text"
                                                                value={formData.name}
                                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                                placeholder="John Doe"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Email Address</label>
                                                        <div className="relative group">
                                                            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                type="email"
                                                                value={formData.email}
                                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                                placeholder="email@example.com"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 flex-1 col-span-1 sm:col-span-2 lg:col-span-2">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Password</label>
                                                        <div className="relative group">
                                                            <Eye size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                type="password"
                                                                value={formData.password}
                                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                                placeholder="ÔÇóÔÇóÔÇóÔÇóÔÇóÔÇóÔÇóÔÇó"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 flex-1 col-span-1 sm:col-span-2 lg:col-span-2">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Confirm Password</label>
                                                        <div className="relative group">
                                                            <EyeOff size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                            <input
                                                                type="password"
                                                                value={formData.confirmPassword}
                                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                                placeholder="ÔÇóÔÇóÔÇóÔÇóÔÇóÔÇóÔÇóÔÇó"
                                                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Section Access */}
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Section Access</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            { id: 'dashboard', label: 'Dashboard', icon: Home },
                                                            { id: 'requests', label: 'Requests', icon: MessageSquare },
                                                            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
                                                            { id: 'files', label: 'Files', icon: FolderOpen },
                                                            { id: 'clients', label: 'Clients', icon: Users },
                                                            { id: 'team', label: 'Team', icon: UserCog },
                                                        ].map((section) => (
                                                            <button
                                                                key={section.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = formData.accessible_sections;
                                                                    const updated = current.includes(section.id)
                                                                        ? current.filter(s => s !== section.id)
                                                                        : [...current, section.id];
                                                                    setFormData({ ...formData, accessible_sections: updated });
                                                                }}
                                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${formData.accessible_sections.includes(section.id)
                                                                    ? 'bg-[#279da6]/10 border-[#279da6]/40 text-[#279da6]'
                                                                    : 'bg-black/40 border-shark/50 text-storm-gray hover:border-shark/80'
                                                                    }`}
                                                            >
                                                                <section.icon size={12} className={formData.accessible_sections.includes(section.id) ? 'text-[#279da6]' : 'text-storm-gray'} />
                                                                {section.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>



                            {/* Team Members Table */}
                            <div className="border border-shark/60 rounded-xl bg-black/20 overflow-hidden">
                                {/* Mobile View: Stacked Cards */}
                                <div className="sm:hidden flex flex-col divide-y divide-shark/60">
                                    {sortedMembers.length === 0 ? (
                                        <div className="px-6 py-20 text-center text-storm-gray uppercase text-[12px] font-black tracking-widest opacity-40">
                                            No team members found matching your criteria.
                                        </div>
                                    ) : (
                                        sortedMembers.map((member: TeamMember, index: number) => (
                                            <div key={member.id} className="p-4 bg-shark/5 flex flex-col gap-4 animate-zoom-in">
                                                {/* Card Header: Avatar & Member Info */}
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className="w-[46px] h-[46px] rounded-full bg-shark flex items-center justify-center text-[12px] font-black text-white overflow-hidden border border-white/5 bg-gradient-to-br from-[#279da6]/20 to-transparent shrink-0 cursor-pointer"
                                                        onClick={() => {
                                                            if (member.profile_id) {
                                                                impersonate({
                                                                    id: member.profile_id,
                                                                    email: member.email,
                                                                    full_name: member.name,
                                                                    role: 'team_member',
                                                                    team_role: member.role,
                                                                    accessible_sections: member.accessible_sections
                                                                }, '/team');
                                                            }
                                                        }}
                                                    >
                                                        {member.avatar_url ? (
                                                            <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            member.name.split(' ').map((n: string) => n[0]).join('')
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <h3
                                                                className="text-xs font-black text-white uppercase leading-tight truncate cursor-pointer hover:text-[#279da6] transition-colors"
                                                                onClick={() => {
                                                                    if (member.profile_id) {
                                                                        impersonate({
                                                                            id: member.profile_id,
                                                                            email: member.email,
                                                                            full_name: member.name,
                                                                            role: 'team_member',
                                                                            team_role: member.role,
                                                                            accessible_sections: member.accessible_sections
                                                                        }, '/team');
                                                                    }
                                                                }}
                                                            >
                                                                {member.name}
                                                            </h3>
                                                            <div className="flex gap-1 shrink-0">
                                                                <button
                                                                    onClick={() => {
                                                                        if (member.profile_id) {
                                                                            impersonate({
                                                                                id: member.profile_id,
                                                                                email: member.email,
                                                                                full_name: member.name,
                                                                                role: 'team_member',
                                                                                team_role: member.role,
                                                                                accessible_sections: member.accessible_sections
                                                                            }, '/team');
                                                                        }
                                                                    }}
                                                                    className="p-1.5 rounded-lg text-storm-gray hover:bg-shark hover:text-[#279da6] transition-all"
                                                                >
                                                                    <UserCog size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditClick(member)}
                                                                    className="p-1.5 rounded-lg text-storm-gray hover:bg-shark hover:text-white transition-all"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-[12px] font-black text-[#279da6] tracking-widest truncate mt-0.5 opacity-80">
                                                            {member.email}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Card Stats */}
                                                <div className="grid grid-cols-2 gap-3 pt-1">
                                                    <div className="flex items-center gap-4 bg-black/20 rounded-xl p-2 px-4 self-center justify-between col-span-2">
                                                        <div
                                                            className="flex items-center gap-2 cursor-pointer group"
                                                            onClick={() => {
                                                                if (member.profile_id) {
                                                                    impersonate({
                                                                        id: member.profile_id,
                                                                        email: member.email,
                                                                        full_name: member.name,
                                                                        role: 'team_member',
                                                                        team_role: member.role,
                                                                        accessible_sections: member.accessible_sections
                                                                    }, '/team');
                                                                    router.push('/requests');
                                                                }
                                                            }}
                                                        >
                                                            <MessageSquare size={14} className="text-[#279da6]" />
                                                            <div className="flex flex-col">
                                                                <span className="text-[12px] font-black text-white leading-none">{member.request_count || 0}</span>
                                                                <span className="text-[12px] font-black text-storm-gray uppercase tracking-widest">Requests</span>
                                                            </div>
                                                        </div>

                                                        <div className="w-px h-6 bg-shark/60" />

                                                        <div
                                                            className="flex items-center gap-2 cursor-pointer group"
                                                            onClick={() => {
                                                                if (member.profile_id) {
                                                                    impersonate({
                                                                        id: member.profile_id,
                                                                        email: member.email,
                                                                        full_name: member.name,
                                                                        role: 'team_member',
                                                                        team_role: member.role,
                                                                        accessible_sections: member.accessible_sections
                                                                    }, '/team');
                                                                    router.push('/tasks');
                                                                }
                                                            }}
                                                        >
                                                            <CheckSquare size={14} className="text-amber-400" />
                                                            <div className="flex flex-col">
                                                                <span className="text-[12px] font-black text-white leading-none">{member.task_count || 0}</span>
                                                                <span className="text-[12px] font-black text-storm-gray uppercase tracking-widest">Tasks</span>
                                                            </div>
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
                                            <tr className="border-b border-shark text-storm-gray text-[12px] uppercase font-black tracking-widest bg-[#17171a]">
                                                <th className="px-5 py-3 w-10 sm:w-16 border-r border-shark/60 text-center text-storm-gray font-black">#</th>
                                                {[
                                                    { label: 'Name', key: 'name', width: 'min-w-[200px]' },
                                                    { label: 'Email', key: 'email', width: 'min-w-[220px]' },
                                                    { label: 'Requests', key: 'request_count', width: 'min-w-[100px]' },
                                                    { label: 'Tasks', key: 'task_count', width: 'min-w-[100px]' },
                                                    { label: 'Last Login', key: 'last_login', width: 'min-w-[140px]' },
                                                    { label: 'Created', key: 'created_at', width: 'min-w-[140px]' }
                                                ].map((header, idx) => (
                                                    <th
                                                        key={header.key}
                                                        ref={el => { headerRefs.current[header.key] = el; }}
                                                        className={`px-4 py-3 border-r border-shark/60 group/header relative header-filter-container ${header.width || ''}`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            {header.key === 'name' ? (
                                                                <div className="relative flex-1 group -ml-1">
                                                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                                    <input
                                                                        type="text"
                                                                        value={(filters as any).name || ''}
                                                                        onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                                                                        placeholder="NAME"
                                                                        className="w-full bg-transparent border-none py-1.5 pl-8 pr-6 text-[12px] font-black uppercase tracking-widest text-iron placeholder:text-storm-gray focus:outline-none transition-all font-bold"
                                                                    />
                                                                    {(filters as any).name && (
                                                                        <button
                                                                            onClick={() => setFilters({ ...filters, name: '' })}
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
                                                                        onClick={() => toggleFilter(header.key)}
                                                                        className={`p-1 rounded hover:bg-shark/40 transition-colors ${filters[header.key as keyof typeof filters] || sortConfig.key === header.key ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                                    >
                                                                        <Filter size={10} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>

                                                        {activeFilterHeader === header.key && header.key !== 'name' && typeof document !== 'undefined' && createPortal(
                                                            <div
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: `${filterCoords.top + 4}px`,
                                                                    left: idx > 2 ? `${filterCoords.left + filterCoords.width - 192}px` : `${filterCoords.left}px`,
                                                                }}
                                                                className={`w-48 bg-[#121214] border border-shark rounded-xl shadow-2xl p-2 z-[9999] normal-case tracking-normal animate-zoom-in`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <div className="mb-2 border-b border-shark/40 pb-2">
                                                                    <div className="text-[12px] font-black text-storm-gray uppercase mb-1 px-1 tracking-widest">Sort</div>
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <button
                                                                            onClick={() => { handleSort(header.key); setActiveFilterHeader(null); }}
                                                                            className={`w-full text-left px-2 py-1.5 rounded-lg text-[12px] uppercase font-black tracking-wider flex items-center justify-between group transition-all ${sortConfig.key === header.key && sortConfig.direction === 'asc' ? 'bg-[#279da6]/10 text-[#279da6]' : 'text-storm-gray hover:bg-shark/40 hover:text-white'}`}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <SortAsc size={12} className={sortConfig.key === header.key && sortConfig.direction === 'asc' ? 'text-[#279da6]' : 'text-storm-gray'} />
                                                                                <span className="text-[12px]">Ascending</span>
                                                                            </div>
                                                                            {sortConfig.key === header.key && sortConfig.direction === 'asc' && <Check size={10} />}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { handleSort(header.key); setActiveFilterHeader(null); }}
                                                                            className={`w-full text-left px-2 py-1.5 rounded-lg text-[12px] uppercase font-black tracking-wider flex items-center justify-between group transition-all ${sortConfig.key === header.key && sortConfig.direction === 'desc' ? 'bg-[#279da6]/10 text-[#279da6]' : 'text-storm-gray hover:bg-shark/40 hover:text-white'}`}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <SortDesc size={12} className={sortConfig.key === header.key && sortConfig.direction === 'desc' ? 'text-[#279da6]' : 'text-storm-gray'} />
                                                                                <span className="text-[12px]">Descending</span>
                                                                            </div>
                                                                            {sortConfig.key === header.key && sortConfig.direction === 'desc' && <Check size={10} />}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {header.key !== 'name' && (
                                                                    <div className="relative px-1 pb-1">
                                                                        <Search size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-storm-gray" />
                                                                        <input
                                                                            type="text"
                                                                            value={(filters as any)[header.key] || ''}
                                                                            onChange={(e) => setFilters(f => ({ ...f, [header.key]: e.target.value }))}
                                                                            className="w-full bg-[#09090B] border border-shark/50 rounded-lg px-8 py-1.5 text-[12px] font-bold text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                                            placeholder={`Filter...`}
                                                                            autoFocus
                                                                        />
                                                                        {(filters as any)[header.key] && (
                                                                            <button
                                                                                onClick={() => setFilters(f => ({ ...f, [header.key]: '' }))}
                                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white"
                                                                            >
                                                                                <X size={10} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>,
                                                            document.body
                                                        )}
                                                    </th>
                                                ))}
                                                <th className="px-3 py-5 w-24 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-shark/60">
                                            {sortedMembers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-20 text-center text-storm-gray uppercase text-[12px] font-black tracking-widest opacity-40">
                                                        No team members found matching your criteria.
                                                    </td>
                                                </tr>
                                            ) : (
                                                sortedMembers.map((member: TeamMember, index: number) => (
                                                    <tr key={member.id} className="hover:bg-shark/10 transition-colors group text-[12px]">
                                                        <td className="px-5 py-3 border-r border-shark/60 text-center font-black text-storm-gray">
                                                            {(index + 1).toString().padStart(2, '0')}
                                                        </td>
                                                        <td className="px-4 py-3 border-r border-shark/60 hover:bg-white/5 transition-colors">
                                                            <div
                                                                className="flex items-center gap-4 cursor-pointer group/name uppercase tracking-tight"
                                                                onClick={() => {
                                                                    if (member.profile_id) {
                                                                        impersonate({
                                                                            id: member.profile_id,
                                                                            email: member.email,
                                                                            full_name: member.name,
                                                                            role: 'team_member',
                                                                            team_role: member.role,
                                                                            accessible_sections: member.accessible_sections
                                                                        }, '/team');
                                                                    }
                                                                }}
                                                            >
                                                                <div className="w-[46px] h-[46px] rounded-full bg-shark flex items-center justify-center text-[12px] font-black text-white overflow-hidden border border-white/5 group-hover/name:ring-2 ring-[#279da6]/30 transition-all shrink-0 bg-gradient-to-br from-[#279da6]/10 to-transparent">
                                                                    {member.avatar_url ? (
                                                                        <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        member.name.split(' ').map((n: string) => n[0]).join('')
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-black text-iron group-hover/name:text-[#279da6] transition-colors truncate text-[12px] leading-tight">{member.name}</span>
                                                                    <span className="text-[12px] text-[#279da6] font-black tracking-widest opacity-0 group-hover/name:opacity-60 transition-opacity">CLICK TO IMPERSONATE</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 border-r border-shark/60 text-storm-gray font-black uppercase tracking-tight hover:bg-white/5 transition-colors text-[12px] opacity-60 truncate">{member.email}</td>
                                                        <td className="px-4 py-3 border-r border-shark/60 hover:bg-white/5 transition-colors text-center">
                                                            <div
                                                                className="flex items-center gap-2 justify-center cursor-pointer hover:opacity-70 transition-opacity group/stat"
                                                                onClick={() => {
                                                                    if (member.profile_id) {
                                                                        impersonate({
                                                                            id: member.profile_id,
                                                                            email: member.email,
                                                                            full_name: member.name,
                                                                            role: 'team_member',
                                                                            team_role: member.role,
                                                                            accessible_sections: member.accessible_sections
                                                                        }, '/team');
                                                                        router.push('/requests');
                                                                    }
                                                                }}
                                                            >
                                                                <MessageSquare size={14} className="text-[#279da6] group-hover/stat:scale-110 transition-transform" />
                                                                <span className="text-iron font-black text-[12px]">{member.request_count || 0}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 border-r border-shark/60 hover:bg-white/5 transition-colors text-center">
                                                            <div
                                                                className="flex items-center gap-2 justify-center cursor-pointer hover:opacity-70 transition-opacity group/stat"
                                                                onClick={() => {
                                                                    if (member.profile_id) {
                                                                        impersonate({
                                                                            id: member.profile_id,
                                                                            email: member.email,
                                                                            full_name: member.name,
                                                                            role: 'team_member',
                                                                            team_role: member.role,
                                                                            accessible_sections: member.accessible_sections
                                                                        }, '/team');
                                                                        router.push('/tasks');
                                                                    }
                                                                }}
                                                            >
                                                                <CheckSquare size={14} className="text-amber-400 group-hover/stat:scale-110 transition-transform" />
                                                                <span className="text-iron font-black text-[12px]">{member.task_count || 0}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 border-r border-shark/60 text-storm-gray font-black whitespace-nowrap text-[12px] hover:bg-white/5 transition-colors uppercase text-center">
                                                            {member.last_login ? (
                                                                <div className="flex flex-col">
                                                                    <span className="text-iron font-black">{formatDate(member.last_login)}</span>
                                                                    <span className="opacity-40 font-bold">{formatTime(member.last_login)}</span>
                                                                </div>
                                                            ) : <span className="opacity-40 tracking-widest">NEVER</span>}
                                                        </td>
                                                        <td className="px-6 py-3 border-r border-shark/60 text-storm-gray font-black whitespace-nowrap text-[12px] hover:bg-white/5 transition-colors uppercase text-center">
                                                            <div className="flex flex-col">
                                                                <span className="text-iron font-black">{formatDate(member.created_at)}</span>
                                                                <span className="opacity-40 font-bold">{formatTime(member.created_at)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-center relative hover:bg-white/5 transition-colors">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        if (member.profile_id) {
                                                                            impersonate({
                                                                                id: member.profile_id,
                                                                                email: member.email,
                                                                                full_name: member.name,
                                                                                role: 'team_member',
                                                                                team_role: member.role,
                                                                                accessible_sections: member.accessible_sections
                                                                            }, '/team');
                                                                        } else {
                                                                            alert('This team member does not have an account yet.');
                                                                        }
                                                                    }}
                                                                    className="p-1.5 rounded-lg text-storm-gray hover:bg-shark hover:text-[#279da6] transition-all cursor-pointer"
                                                                    title="Impersonate"
                                                                >
                                                                    <UserCog size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditClick(member)}
                                                                    className="p-1.5 rounded-lg text-storm-gray hover:bg-shark hover:text-white transition-all cursor-pointer"
                                                                    title="Edit Member"
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



                    {/* Delete Modal */}
                    {
                        isDeleteModalOpen && selectedMember && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                                <div className="bg-[#18181B] border border-shark rounded-3xl p-8 max-w-md w-full shadow-2xl animate-slide-up">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                            <AlertTriangle size={24} />
                                        </div>
                                        <button onClick={() => { setIsDeleteModalOpen(false); resetForm(); }} className="text-storm-gray hover:text-white transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <h2 className="text-xl font-bold text-iron mb-2">Delete Team Member?</h2>
                                    <p className="text-storm-gray text-sm mb-8">
                                        Are you sure you want to delete <strong className="text-white">{selectedMember.name}</strong>?
                                        This will also delete their account and cannot be undone.
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={handleDeleteConfirm}
                                            disabled={isSubmitting}
                                            className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Delete Member'}
                                        </button>
                                        <button
                                            onClick={() => { setIsDeleteModalOpen(false); resetForm(); }}
                                            disabled={isSubmitting}
                                            className="w-full bg-shark/50 hover:bg-shark text-iron py-3 rounded-xl font-bold text-sm transition-all"
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
