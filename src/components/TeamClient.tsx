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
    Settings,
    Box,
    FileText,
    UserCog,
    Camera,
    Shield,
    Mail
} from 'lucide-react';
import AvatarUpload from '@/components/AvatarUpload';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { formatDate, formatTime } from '@/lib/dateUtils';
import CustomDropdown from '@/components/CustomDropdown';

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
    const [activeTab, setActiveTab] = useState('All Members');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        name: '',
        email: '',
        role: '',
        request_count: '',
        task_count: '',
        last_login: '',
        created_at: ''
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
        key: 'created_at',
        direction: 'desc'
    });
    const [activeFilterHeader, setActiveFilterHeader] = useState<string | null>(null);

    const [members, setMembers] = useState<TeamMember[]>(initialMembers);
    const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, origin: 'top right' });
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on scroll or click outside
    useEffect(() => {
        const handleScroll = () => setActiveDropdown(null);
        const handleClickOutside = (event: MouseEvent) => {
            if (activeDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        window.addEventListener('scroll', handleScroll, true);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeDropdown]);

    // Update state when initialMembers changes (from SSR refresh)
    React.useEffect(() => {
        setMembers(initialMembers);
    }, [initialMembers]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'viewer' as 'admin' | 'editor' | 'viewer',
        department: '',
        position: '',
        accessible_sections: [] as string[],
        avatarUrl: ''
    });

    // Inline Creation State
    const [isCreating, setIsCreating] = useState(false);
    const inlineInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isCreating) {
            setTimeout(() => inlineInputRef.current?.focus(), 100);
        }
    }, [isCreating]);



    const resetForm = () => {
        setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'viewer', department: '', position: '', accessible_sections: [], avatarUrl: '' });
        setSelectedMember(null);
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
            const response = await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    position: formData.role,
                    role: formData.role,
                    accessible_sections: formData.accessible_sections,
                    avatarUrl: formData.avatarUrl
                })
            });

            if (response.ok) {
                const newMember = await response.json();
                setIsModalOpen(false);
                resetForm();
                // Optimistically update the list
                const enrichedNewMember = {
                    ...newMember.member,
                    role: formData.role,
                    accessible_sections: formData.accessible_sections,
                    avatar_url: formData.avatarUrl,
                    request_count: 0,
                    created_at: new Date().toISOString()
                };
                setMembers([...members, enrichedNewMember as any]);
                router.refresh(); // Revalidate via server refresh
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

    // Handle Inline Create Submit
    const handleInlineCreate = async () => {
        if (!formData.name || !formData.email || !formData.password) {
            alert("Please fill in Name, Email, and Password.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const newMember = await response.json();
                setIsCreating(false);
                resetForm();
                // Optimistically update the list if possible, or just refresh
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

    // Handle Edit Click
    const handleEditClick = (member: TeamMember) => {
        setSelectedMember(member);
        setFormData({
            name: member.name,
            email: member.email,
            password: '',
            confirmPassword: '',
            role: member.role || 'viewer',
            department: (member as any).department || '',
            position: (member as any).position || '',
            accessible_sections: member.accessible_sections || [],
            avatarUrl: member.avatar_url || ''
        });
        setIsEditModalOpen(true);
        setActiveDropdown(null);
    };

    // Handle Edit Submit
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMember) return;
        if (formData.password && formData.password !== formData.confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        setIsSubmitting(true);

        // Optimistic update
        const updatedMembers = members.map(m =>
            m.id === selectedMember.id
                ? { ...m, name: formData.name, email: formData.email, role: formData.role as any, accessible_sections: formData.accessible_sections, avatar_url: formData.avatarUrl }
                : m
        );
        setMembers(updatedMembers);

        try {
            const response = await fetch('/api/team', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedMember.id,
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    position: formData.role,
                    oldEmail: selectedMember.email,
                    accessible_sections: formData.accessible_sections,
                    avatarUrl: formData.avatarUrl
                })
            });

            if (response.ok) {
                setIsEditModalOpen(false);
                resetForm();
                router.refresh(); // Revalidate to ensure consistency
            } else {
                const err = await response.json();
                alert(`Error: ${err.error}`);
                setMembers(initialMembers); // Rollback on error
            }
        } catch (error) {
            console.error('Update failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Delete Click
    const handleDeleteClick = (member: TeamMember) => {
        setSelectedMember(member);
        setIsDeleteModalOpen(true);
        setActiveDropdown(null);
    };

    const handleDropdownTrigger = (e: React.MouseEvent, member: TeamMember) => {
        e.stopPropagation();
        if (activeDropdown === member.id) {
            setActiveDropdown(null);
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 150; // Adjusted for 3 items + divider

        let top = rect.bottom + window.scrollY + 8;
        let origin = 'top right';

        if (spaceBelow < dropdownHeight) {
            top = rect.top + window.scrollY - 150; // Open upwards
            origin = 'bottom right';
        }

        setDropdownCoords({
            top,
            left: rect.right + window.scrollX,
            origin
        });
        setSelectedMember(member);
        setActiveDropdown(member.id);
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

    // Handle Role Update directly from table
    const handleRoleUpdate = async (member: TeamMember, newRole: string) => {
        const originalMembers = [...members];
        // Optimistic update
        setMembers(members.map(m => m.id === member.id ? { ...m, role: newRole as any } : m));
        try {
            const response = await fetch('/api/team', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: member.id, position: newRole })
            });
            if (!response.ok) {
                setMembers(originalMembers);
                const err = await response.json();
                alert(`Error: ${err.error}`);
            } else {
                router.refresh();
            }
        } catch (error) {
            setMembers(originalMembers);
            console.error('Role update failed:', error);
        }
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
        }));
    };

    const filteredMembers = members.filter((member: TeamMember) => {

        // Search Filter
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            member.name.toLowerCase().includes(searchLower) ||
            member.email.toLowerCase().includes(searchLower);

        // Header Filters
        const matchesName = !filters.name || member.name.toLowerCase().includes(filters.name.toLowerCase());
        const matchesEmail = !filters.email || member.email.toLowerCase().includes(filters.email.toLowerCase());
        const matchesRole = !filters.role || member.role.toLowerCase() === filters.role.toLowerCase();
        const matchesRequests = !filters.request_count || (member.request_count || 0) >= parseInt(filters.request_count);
        const matchesTasks = !filters.task_count || (member.task_count || 0) >= parseInt(filters.task_count);

        const matchesLastLogin = !filters.last_login || (member.last_login && formatDate(member.last_login).includes(filters.last_login));
        const matchesCreatedAt = !filters.created_at || formatDate(member.created_at).includes(filters.created_at);

        return matchesSearch && matchesName && matchesEmail && matchesRole && matchesRequests && matchesTasks && matchesLastLogin && matchesCreatedAt;
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

    return (
        <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
            <Sidebar isCollapsed={isSidebarCollapsed} />

            <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                <div className={`flex-1 flex flex-col min-w-0 bg-[#121214] rounded-t-2xl overflow-hidden border-t border-l border-r mt-6 mr-6 transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
                    <div className="border-b border-shark">
                        <Header
                            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            label="Users"
                            labelIcon={<Users size={16} className="text-[#279da6]" />}
                            onCreate={() => setIsCreating(true)}
                            isCreating={isCreating}
                            onConfirm={handleInlineCreate}
                            onCancel={() => {
                                setIsCreating(false);
                                resetForm();
                            }}
                            isSubmitting={isSubmitting}
                            pageSwitcher={[
                                { name: 'Clients', path: '/clients' },
                                { name: 'Team', path: '/team' }
                            ]}
                            activePath="/team"
                        />
                    </div>

                    <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#18181B]">
                        <div className="p-8">

                            {/* Inline Creation Row */}
                            <div
                                className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCreating
                                    ? 'max-h-[800px] opacity-100 mb-8 translate-y-0 scale-100 blur-0'
                                    : 'max-h-0 opacity-0 mb-0 -translate-y-4 scale-95 blur-md pointer-events-none'
                                    }`}
                            >
                                <div className="p-1 bg-[#121214]/90 backdrop-blur-2xl border border-[#279da6]/30 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(39,157,166,0.08)] ring-1 ring-white/5 relative overflow-hidden">
                                    <div className="p-6 space-y-6">
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

                                            <div className="flex-1 space-y-6">
                                                {/* Top Row: Basic Info */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Full Name</label>
                                                        <div className="relative group">
                                                            <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
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
                                                </div>

                                                {/* Middle Row: Security & Role */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Access Role</label>
                                                        <CustomDropdown
                                                            value={formData.role}
                                                            onChange={(val) => setFormData({ ...formData, role: val as any })}
                                                            options={[
                                                                { label: 'Viewer', value: 'viewer', icon: <Eye size={14} className="text-storm-gray" /> },
                                                                { label: 'Editor', value: 'editor', icon: <Edit2 size={14} className="text-malibu" /> },
                                                                { label: 'Admin', value: 'admin', icon: <Shield size={14} className="text-[#279da6]" /> }
                                                            ]}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Bottom Row: Dept & Position */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Department</label>
                                                        <input
                                                            type="text"
                                                            value={formData.department}
                                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                                            placeholder="e.g. Design"
                                                            className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 px-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Position</label>
                                                        <input
                                                            type="text"
                                                            value={formData.position}
                                                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                                            placeholder="e.g. Senior Editor"
                                                            className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 px-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Section Access */}
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Section Access</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['Dashboard', 'Files', 'Clients', 'Team', 'Requests', 'Tasks', 'Storage'].map((section) => (
                                                            <button
                                                                key={section}
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = formData.accessible_sections;
                                                                    const updated = current.includes(section)
                                                                        ? current.filter(s => s !== section)
                                                                        : [...current, section];
                                                                    setFormData({ ...formData, accessible_sections: updated });
                                                                }}
                                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.accessible_sections.includes(section)
                                                                    ? 'bg-[#279da6]/10 border-[#279da6]/40 text-[#279da6]'
                                                                    : 'bg-black/40 border-shark/50 text-storm-gray hover:border-shark/80'
                                                                    }`}
                                                            >
                                                                {section}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>


                            {/* Toolbar */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="relative w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-santas-gray" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search for Team Members"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#09090B] border border-shark/50 rounded-lg py-2 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                setFilters({
                                                    name: '',
                                                    email: '',
                                                    role: '',
                                                    request_count: '',
                                                    task_count: '',
                                                    last_login: '',
                                                    created_at: ''
                                                });
                                                setSearchQuery('');
                                                setSortConfig({ key: '', direction: null });
                                            }}
                                            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[11px] font-bold z-10 cursor-pointer ${Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'created_at' && sortConfig.direction === 'desc')) ? 'bg-[#279da6]/20 border-[#279da6]/60 text-[#279da6] active:scale-95' : 'border-shark bg-shark/20 text-santas-gray hover:text-white hover:bg-shark/40'}`}
                                        >
                                            <Filter size={14} className={Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'created_at' && sortConfig.direction === 'desc')) ? 'fill-[#279da6]/20' : ''} />
                                            <span>{Object.values(filters).some(v => v !== '') || searchQuery !== '' || (sortConfig.key !== '' && !(sortConfig.key === 'created_at' && sortConfig.direction === 'desc')) ? 'Reset Filters' : 'Filters'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Team Members Table */}
                            <div className="border border-shark/60 rounded-xl bg-black/20">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse table-auto text-xs">
                                        <thead>
                                            <tr className="border-b border-shark text-storm-gray text-xs uppercase font-black tracking-widest bg-shark/20">
                                                <th className="px-5 py-5 w-12 border-r border-shark/60 text-center">#</th>
                                                {[
                                                    { label: 'Name', key: 'name', width: 'min-w-[200px]' },
                                                    { label: 'Email', key: 'email', width: 'min-w-[200px]' },
                                                    { label: 'Role', key: 'role', width: 'w-24 min-w-[100px]' },
                                                    { label: 'Requests', key: 'request_count', width: 'w-32 min-w-[120px]' },
                                                    { label: 'Task', key: 'task_count', width: 'w-24 min-w-[100px]' },
                                                    { label: 'Last Login', key: 'last_login', width: 'w-32 min-w-[150px]' },
                                                    { label: 'Created At', key: 'created_at', width: 'w-32 min-w-[150px]' }
                                                ].map((header, idx) => (
                                                    <th key={header.label} className={`px-4 py-5 border-r border-shark/60 group/header relative header-filter-container ${header.width || ''}`}>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="cursor-default">{header.label}</span>
                                                            <button
                                                                onClick={() => setActiveFilterHeader(activeFilterHeader === header.key ? null : header.key)}
                                                                className={`p-1 rounded hover:bg-shark/40 transition-colors ${filters[header.key as keyof typeof filters] || sortConfig.key === header.key ? 'text-[#279da6]' : 'text-storm-gray'}`}
                                                            >
                                                                <Filter size={10} />
                                                            </button>
                                                        </div>

                                                        {activeFilterHeader === header.key && (
                                                            <div className={`absolute top-full ${idx > 3 ? 'right-0' : 'left-0'} mt-1 w-48 bg-[#121214] border border-shark rounded-lg shadow-2xl p-2 z-[60] normal-case tracking-normal`}>
                                                                <div className="mb-2 border-b border-shark/40 pb-2">
                                                                    <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Sort</div>
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <button
                                                                            onClick={() => { handleSort(header.key); setActiveFilterHeader(null); }}
                                                                            className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-bold flex items-center justify-between group transition-colors ${sortConfig.key === header.key && sortConfig.direction === 'asc' ? 'bg-[#279da6]/10 text-[#279da6]' : 'text-iron hover:bg-shark/40'}`}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <SortAsc size={12} className={sortConfig.key === header.key && sortConfig.direction === 'asc' ? 'text-[#279da6]' : 'text-storm-gray'} />
                                                                                Ascending
                                                                            </div>
                                                                            {sortConfig.key === header.key && sortConfig.direction === 'asc' && <Check size={10} />}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { handleSort(header.key); setActiveFilterHeader(null); }}
                                                                            className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-bold flex items-center justify-between group transition-colors ${sortConfig.key === header.key && sortConfig.direction === 'desc' ? 'bg-[#279da6]/10 text-[#279da6]' : 'text-iron hover:bg-shark/40'}`}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <SortDesc size={12} className={sortConfig.key === header.key && sortConfig.direction === 'desc' ? 'text-[#279da6]' : 'text-storm-gray'} />
                                                                                Descending
                                                                            </div>
                                                                            {sortConfig.key === header.key && sortConfig.direction === 'desc' && <Check size={10} />}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div className="text-[10px] font-bold text-storm-gray uppercase mb-1 px-1">Filter</div>
                                                                <div className="relative">
                                                                    <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-storm-gray" />
                                                                    <input
                                                                        type="text"
                                                                        value={(filters as any)[header.key] || ''}
                                                                        onChange={(e) => setFilters({ ...filters, [header.key]: e.target.value })}
                                                                        className="w-full bg-shark/30 border border-shark/50 rounded px-8 py-1.5 text-[11px] text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                                        placeholder={`Filter ${header.label}...`}
                                                                        autoFocus
                                                                    />
                                                                    {(filters as any)[header.key] && (
                                                                        <button
                                                                            onClick={() => setFilters({ ...filters, [header.key]: '' })}
                                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white"
                                                                        >
                                                                            <X size={10} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </th>
                                                ))}
                                                <th className="px-6 py-5 w-20 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-shark/60">
                                            {sortedMembers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="px-6 py-12 text-center text-storm-gray font-medium uppercase tracking-widest opacity-40">
                                                        No team members found matching your criteria.
                                                    </td>
                                                </tr>
                                            ) : (
                                                sortedMembers.map((member: TeamMember, index: number) => (
                                                    <tr key={member.id} className="hover:bg-shark/10 transition-colors group text-sm">
                                                        <td className="px-5 py-4.5 border-r border-shark/60 text-center font-black text-storm-gray">
                                                            {(index + 1).toString().padStart(2, '0')}
                                                        </td>
                                                        <td className="px-6 py-4.5 border-r border-shark/60">
                                                            <div
                                                                className="flex items-center gap-3 cursor-pointer group/name"
                                                                onClick={() => {
                                                                    if (member.profile_id) {
                                                                        impersonate({
                                                                            id: member.profile_id,
                                                                            email: member.email,
                                                                            full_name: member.name,
                                                                            role: 'team_member',
                                                                            team_role: member.role
                                                                        }, '/team');
                                                                    }
                                                                }}
                                                            >
                                                                <div className="w-9 h-9 rounded-full bg-shark flex items-center justify-center text-[11px] font-black text-white overflow-hidden border border-white/5 group-hover/name:ring-2 ring-[#279da6]/50 transition-all shrink-0">
                                                                    {member.avatar_url ? (
                                                                        <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        member.name.split(' ').map((n: string) => n[0]).join('')
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-black text-iron group-hover/name:text-[#279da6] transition-colors">{member.name}</span>
                                                                    <span className="text-[10px] text-[#279da6] font-bold opacity-0 group-hover/name:opacity-100 transition-opacity">Click to impersonate</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4.5 border-r border-shark/60 text-storm-gray font-black">{member.email}</td>
                                                        <td className="px-4 py-4.5 border-r border-shark/60">
                                                            <CustomDropdown
                                                                value={member.role}
                                                                onChange={(val) => handleRoleUpdate(member, val)}
                                                                options={[
                                                                    { label: 'Viewer', value: 'viewer', icon: <Eye size={12} className="text-amber-400" />, color: 'text-amber-400' },
                                                                    { label: 'Editor', value: 'editor', icon: <Edit2 size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                                    { label: 'Admin', value: 'admin', icon: <Shield size={12} className="text-purple-400" />, color: 'text-purple-400' },
                                                                ]}
                                                                className="w-28"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-4.5 border-r border-shark/60">
                                                            <div
                                                                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                                                onClick={() => {
                                                                    if (member.profile_id) {
                                                                        impersonate({
                                                                            id: member.profile_id,
                                                                            email: member.email,
                                                                            full_name: member.name,
                                                                            role: 'team_member',
                                                                            team_role: member.role
                                                                        }, '/team');
                                                                        router.push('/requests');
                                                                    }
                                                                }}
                                                                title="View requests as this member"
                                                            >
                                                                <FileText size={14} className="text-[#279da6]" />
                                                                <span className="text-iron font-black">{member.request_count || 0}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4.5 border-r border-shark/60">
                                                            <div
                                                                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                                                onClick={() => {
                                                                    if (member.profile_id) {
                                                                        impersonate({
                                                                            id: member.profile_id,
                                                                            email: member.email,
                                                                            full_name: member.name,
                                                                            role: 'team_member',
                                                                            team_role: member.role
                                                                        }, '/team');
                                                                        router.push('/tasks');
                                                                    }
                                                                }}
                                                                title="View tasks as this member"
                                                            >
                                                                <Box size={14} className="text-amber-400" />
                                                                <span className="text-iron font-black">{member.task_count || 0}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4.5 border-r border-shark/60 text-storm-gray font-black whitespace-nowrap text-xs">
                                                            {member.last_login ? (
                                                                <div className="flex flex-col">
                                                                    <span className="text-iron font-black">{formatDate(member.last_login)}</span>
                                                                    <span className="opacity-50 font-bold">{formatTime(member.last_login)}</span>
                                                                </div>
                                                            ) : 'Never'}
                                                        </td>
                                                        <td className="px-6 py-4.5 border-r border-shark/60 text-storm-gray font-black whitespace-nowrap text-xs">
                                                            <div className="flex flex-col">
                                                                <span className="text-iron font-black">{formatDate(member.created_at)}</span>
                                                                <span className="opacity-50 font-bold">{formatTime(member.created_at)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4.5 text-center relative">
                                                            <button
                                                                onClick={(e) => handleDropdownTrigger(e, member)}
                                                                className={`p-1.5 rounded-md transition-all cursor-pointer ${activeDropdown === member.id ? 'bg-[#279da6] text-white' : 'text-storm-gray hover:bg-shark hover:text-white'}`}
                                                            >
                                                                <Settings size={16} />
                                                            </button>


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

                    {/* --- Portal for Settings Dropdown --- */}
                    {activeDropdown && selectedMember && createPortal(
                        <div
                            ref={dropdownRef}
                            style={{
                                position: 'absolute',
                                top: `${dropdownCoords.top}px`,
                                left: `${dropdownCoords.left - 192}px`, // 192px is w-48
                                width: '192px',
                                transformOrigin: dropdownCoords.origin
                            }}
                            className="z-[9999] bg-[#18181B] border border-shark rounded-lg shadow-2xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-200"
                        >
                            <button
                                onClick={() => {
                                    if (selectedMember.profile_id) {
                                        impersonate({
                                            id: selectedMember.profile_id,
                                            email: selectedMember.email,
                                            full_name: selectedMember.name,
                                            role: 'team_member',
                                            team_role: selectedMember.role
                                        }, '/team');
                                        setActiveDropdown(null);
                                    } else {
                                        alert('This team member does not have an account yet.');
                                    }
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-santas-gray hover:text-white hover:bg-[#279da6]/10 transition-all text-left"
                            >
                                <UserCog size={14} className="text-[#279da6]" />
                                <span>Impersonate</span>
                            </button>
                            <button
                                onClick={() => handleEditClick(selectedMember)}
                                className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-santas-gray hover:text-white hover:bg-[#279da6]/10 transition-all text-left"
                            >
                                <Edit2 size={14} className="text-[#279da6]" />
                                <span>Edit Member</span>
                            </button>
                            <div className="h-px bg-shark my-1" />
                            <button
                                onClick={() => handleDeleteClick(selectedMember)}
                                className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-left"
                            >
                                <Trash2 size={14} />
                                <span>Delete Member</span>
                            </button>
                        </div>,
                        document.body
                    )}

                    {/* Create Modal */}
                    {
                        isModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                                <div className="bg-[#18181B] border border-shark rounded-3xl p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto custom-scrollbar">
                                    <div className="flex justify-between items-start mb-6">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Create Team Member</h2>
                                        <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-storm-gray hover:text-white transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="flex flex-col items-center mb-6">
                                        <AvatarUpload
                                            currentAvatarUrl={formData.avatarUrl}
                                            onUploadSuccess={(url) => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                                            onRemove={() => setFormData(prev => ({ ...prev, avatarUrl: '' }))}
                                            name={formData.name}
                                            email={formData.email}
                                        />
                                        <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest mt-2">Member Photo</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-storm-gray">Full Name *</label>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-storm-gray">Email Address *</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                className="w-full bg-[#09090B] border border-shark rounded-lg px-4 py-2.5 text-sm text-iron focus:outline-none focus:border-[#279da6]/40 transition-all"
                                                placeholder="Enter full name"
                                            />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                                className="w-full bg-[#09090B] border border-shark rounded-lg px-4 py-2.5 text-sm text-iron focus:outline-none focus:border-[#279da6]/40 transition-all"
                                                placeholder="email@example.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-storm-gray mb-2">Role *</label>
                                            <CustomDropdown
                                                value={formData.role}
                                                onChange={(val: any) => setFormData({ ...formData, role: val })}
                                                options={[
                                                    { label: 'Viewer – (view, chat)', value: 'viewer', icon: <Eye size={12} className="text-amber-400" />, color: 'text-amber-400' },
                                                    { label: 'Editor – (view, add, edit, chat)', value: 'editor', icon: <Edit2 size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                    { label: 'Admin – (view, add, edit, delete, chat)', value: 'admin', icon: <Shield size={12} className="text-purple-400" />, color: 'text-purple-400' },
                                                ]}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-storm-gray mb-3">Section Access Permissions</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[
                                                    { id: 'files', label: 'Files', icon: Box },
                                                    { id: 'clients', label: 'Clients', icon: Users },
                                                    { id: 'team', label: 'Team', icon: UserCog }
                                                ].map((section) => (
                                                    <label
                                                        key={section.id}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.accessible_sections?.includes(section.id)
                                                            ? 'bg-[#279da6]/5 border-[#279da6]/40 text-white'
                                                            : 'bg-[#09090B] border-shark text-storm-gray hover:border-shark/60'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={formData.accessible_sections?.includes(section.id)}
                                                            onChange={(e) => {
                                                                const current = formData.accessible_sections || [];
                                                                if (e.target.checked) {
                                                                    setFormData({ ...formData, accessible_sections: [...current, section.id] });
                                                                } else {
                                                                    setFormData({ ...formData, accessible_sections: current.filter(id => id !== section.id) });
                                                                }
                                                            }}
                                                        />
                                                        <section.icon size={16} className={formData.accessible_sections?.includes(section.id) ? 'text-[#279da6]' : ''} />
                                                        <span className="text-xs font-bold">{section.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-storm-gray mt-2 opacity-60">Requests and Tasks are accessible by default</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-storm-gray">Password (Optional)</label>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-storm-gray">Confirm Password</label>
                                            <div>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        className="w-full bg-[#09090B] border border-shark rounded-lg px-4 py-2.5 text-sm text-iron focus:outline-none focus:border-[#279da6]/40 transition-all pr-10"
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-storm-gray mt-1.5">If provided, a login account will be created</p>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                    className="w-full bg-[#09090B] border border-shark rounded-lg px-4 py-2.5 text-sm text-iron focus:outline-none focus:border-[#279da6]/40 transition-all pr-10"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => { setIsModalOpen(false); resetForm(); }}
                                                className="px-5 py-2.5 bg-shark/50 hover:bg-shark text-iron rounded-lg font-bold text-sm transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="px-5 py-2.5 bg-[#279da6] hover:bg-[#279da6]/90 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#279da6]/20"
                                            >
                                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Create Member'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )
                    }

                    {/* Edit Modal */}
                    {
                        isEditModalOpen && selectedMember && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                                <div className="bg-[#18181B] border border-shark rounded-3xl p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto custom-scrollbar">
                                    <div className="flex justify-between items-start mb-6">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Edit Team Member</h2>
                                        <button onClick={() => { setIsEditModalOpen(false); resetForm(); }} className="text-storm-gray hover:text-white transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="flex flex-col items-center mb-6">
                                        <AvatarUpload
                                            currentAvatarUrl={formData.avatarUrl}
                                            onUploadSuccess={(url) => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                                            onRemove={() => setFormData(prev => ({ ...prev, avatarUrl: '' }))}
                                            name={formData.name}
                                            email={formData.email}
                                        />
                                        <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest mt-2">Member Photo</p>
                                    </div>

                                    <form onSubmit={handleEditSubmit} className="space-y-5">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-storm-gray">Full Name *</label>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-storm-gray">Email Address *</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                className="w-full bg-[#09090B] border border-shark rounded-lg px-4 py-2.5 text-sm text-iron focus:outline-none focus:border-[#279da6]/40 transition-all"
                                            />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                                className="w-full bg-[#09090B] border border-shark rounded-lg px-4 py-2.5 text-sm text-iron focus:outline-none focus:border-[#279da6]/40 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-storm-gray mb-2">Role *</label>
                                            <CustomDropdown
                                                value={formData.role}
                                                onChange={(val: any) => setFormData({ ...formData, role: val })}
                                                options={[
                                                    { label: 'Viewer – (view, chat)', value: 'viewer', icon: <Eye size={12} className="text-amber-400" />, color: 'text-amber-400' },
                                                    { label: 'Editor – (view, add, edit, chat)', value: 'editor', icon: <Edit2 size={12} className="text-blue-400" />, color: 'text-blue-400' },
                                                    { label: 'Admin – (view, add, edit, delete, chat)', value: 'admin', icon: <Shield size={12} className="text-purple-400" />, color: 'text-purple-400' },
                                                ]}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-storm-gray mb-3">Section Access Permissions</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[
                                                    { id: 'files', label: 'Files', icon: Box },
                                                    { id: 'clients', label: 'Clients', icon: Users },
                                                    { id: 'team', label: 'Team', icon: UserCog }
                                                ].map((section) => (
                                                    <label
                                                        key={section.id}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.accessible_sections?.includes(section.id)
                                                            ? 'bg-[#279da6]/5 border-[#279da6]/40 text-white'
                                                            : 'bg-[#09090B] border-shark text-storm-gray hover:border-shark/60'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={formData.accessible_sections?.includes(section.id)}
                                                            onChange={(e) => {
                                                                const current = formData.accessible_sections || [];
                                                                if (e.target.checked) {
                                                                    setFormData({ ...formData, accessible_sections: [...current, section.id] });
                                                                } else {
                                                                    setFormData({ ...formData, accessible_sections: current.filter(id => id !== section.id) });
                                                                }
                                                            }}
                                                        />
                                                        <section.icon size={16} className={formData.accessible_sections?.includes(section.id) ? 'text-[#279da6]' : ''} />
                                                        <span className="text-xs font-bold">{section.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-storm-gray mt-2 opacity-60">Requests and Tasks are accessible by default</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-storm-gray">New Password (Leave blank to keep current)</label>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-storm-gray">Confirm Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full bg-[#09090B] border border-shark rounded-lg px-4 py-2.5 text-sm text-iron focus:outline-none focus:border-[#279da6]/40 transition-all pr-10"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                    className="w-full bg-[#09090B] border border-shark rounded-lg px-4 py-2.5 text-sm text-iron focus:outline-none focus:border-[#279da6]/40 transition-all pr-10"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex justify-between gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteClick(selectedMember)}
                                                className="px-4 py-2.5 text-rose-500 hover:bg-rose-500/10 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border border-rose-500/20"
                                            >
                                                <Trash2 size={16} />
                                                Delete Member
                                            </button>
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsEditModalOpen(false); resetForm(); }}
                                                    className="px-5 py-2.5 bg-shark/50 hover:bg-shark text-iron rounded-lg font-bold text-sm transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="px-5 py-2.5 bg-[#279da6] hover:bg-[#279da6]/90 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#279da6]/20"
                                                >
                                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Update Member'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )
                    }

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
                        )}
                </div>
            </div>
        </div>
    );
}
