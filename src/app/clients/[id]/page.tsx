'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    ArrowLeft,
    Mail,
    Building,
    Calendar,
    Clock,
    Shield,
    MessageSquare,
    CreditCard,
    Settings as SettingsIcon,
    LayoutGrid,
    Loader2,
    ChevronRight,
    Search,
    Filter,
    Download,
    PanelLeft,
    Users,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    X as CloseIcon,
    FolderOpen,
    HardDrive,
    Link2,
    Trash2,
    RefreshCw,
    Upload,
    Pencil,
    FileText,
    Image as ImageIcon,
    Film,
    Plus,
    MoreHorizontal,
    File as FileIcon,
    FolderPlus
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import ImpersonationWarning from '@/components/ImpersonationWarning';
import FilePreviewModal from '@/components/FilePreviewModal';

interface Client {
    id: string;
    name: string;
    email: string;
    organization: string;
    status: string;
    created_at: string;
    drive_folder_id?: string | null;
}

export default function ClientDetailPage() {
    const { profile, viewAsProfile, isImpersonating } = useAuth();
    const displayProfile = viewAsProfile || profile;
    const isSuperAdmin = displayProfile?.role === 'super_admin';

    const tabs = ['Overview', 'Requests', 'Tasks', 'Folder', 'Settings'].filter(tab => {
        if (tab === 'Folder' && !isSuperAdmin) return false;
        return true;
    });

    const { id } = useParams();
    const router = useRouter();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('Requests');
    const [client, setClient] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchClient = async () => {
            try {
                // In a real app, this would be an API call to fetch by ID
                const response = await fetch('/api/clients');
                const allClients = await response.json();
                const foundClient = allClients.find((c: any) => c.id === id);

                if (foundClient) {
                    setClient(foundClient);
                }
            } catch (error) {
                console.error('Failed to fetch client details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchClient();
    }, [id]);

    // Settings Form State
    const [settingsEmail, setSettingsEmail] = useState('');
    const [settingsPassword, setSettingsPassword] = useState('');
    const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [showSettingsPassword, setShowSettingsPassword] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Auto-hide status after 5 seconds
    useEffect(() => {
        if (status) {
            const timer = setTimeout(() => setStatus(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    useEffect(() => {
        if (client) {
            setSettingsEmail(client.email);
            setFolderInput(client.drive_folder_id || '');
            if (client.drive_folder_id && !isDriveBrowsing) {
                // Validate to get name + auto-browse
                (async () => {
                    try {
                        const res = await fetch('/api/drive/validate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ folderId: client.drive_folder_id })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.valid) {
                                setLinkedFolderName(data.folderName);
                                // Auto-browse into the linked folder
                                browseDriveFolder(data.folderId || client.drive_folder_id!, data.folderName);
                            }
                        }
                    } catch (e) {
                        console.error('Validate error:', e);
                    }
                })();
            }
        }
    }, [client]);

    // Folder State
    const [folderInput, setFolderInput] = useState('');
    const [linkedFolderName, setLinkedFolderName] = useState('');
    const [isValidatingFolder, setIsValidatingFolder] = useState(false);
    const [isSavingFolder, setIsSavingFolder] = useState(false);
    const [folderStatus, setFolderStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Drive Browser State
    interface DriveItem {
        id: string;
        name: string;
        mimeType: string;
        isFolder: boolean;
        size: number | null;
        createdTime: string;
        webViewLink: string;
        webContentLink: string | null;
        previewUrl?: string | null;
    }
    const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
    const [driveBreadcrumbs, setDriveBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
    const [currentDriveFolderId, setCurrentDriveFolderId] = useState<string | null>(null);
    const [isDriveBrowsing, setIsDriveBrowsing] = useState(false);
    const [isDriveLoading, setIsDriveLoading] = useState(false);
    const [driveContextItem, setDriveContextItem] = useState<DriveItem | null>(null);
    const [driveContextPos, setDriveContextPos] = useState({ x: 0, y: 0 });
    const [isDriveRenaming, setIsDriveRenaming] = useState(false);
    const [driveRenameValue, setDriveRenameValue] = useState('');
    const [isDriveDeleting, setIsDriveDeleting] = useState(false);
    const [driveDeleteTarget, setDriveDeleteTarget] = useState<DriveItem | null>(null);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isDriveUploading, setIsDriveUploading] = useState(false);
    const driveFileInputRef = React.useRef<HTMLInputElement>(null);

    // Preview state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<DriveItem | null>(null);

    const browseDriveFolder = async (folderId: string, folderName?: string) => {
        setIsDriveLoading(true);
        try {
            const res = await fetch(`/api/drive/browse?folderId=${folderId}`);
            if (res.ok) {
                const items = await res.json();
                setDriveItems(items);
                setCurrentDriveFolderId(folderId);
                setIsDriveBrowsing(true);

                if (folderName && driveBreadcrumbs.length === 0) {
                    setDriveBreadcrumbs([{ id: folderId, name: folderName }]);
                }
            }
        } catch (e) {
            console.error('Browse error:', e);
        } finally {
            setIsDriveLoading(false);
        }
    };

    const navigateToDriveSubfolder = (item: DriveItem) => {
        setDriveBreadcrumbs(prev => [...prev, { id: item.id, name: item.name }]);
        browseDriveFolder(item.id);
    };

    const navigateToDriveBreadcrumb = (index: number) => {
        const crumb = driveBreadcrumbs[index];
        setDriveBreadcrumbs(prev => prev.slice(0, index + 1));
        browseDriveFolder(crumb.id);
    };

    const refreshDriveFolder = () => {
        if (currentDriveFolderId) browseDriveFolder(currentDriveFolderId);
    };

    const handleDriveRename = async () => {
        if (!driveContextItem || !driveRenameValue.trim()) return;
        try {
            const res = await fetch('/api/drive/browse', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: driveContextItem.id,
                    newName: driveRenameValue.trim(),
                    isFolder: driveContextItem.isFolder
                })
            });
            if (res.ok) {
                setIsDriveRenaming(false);
                setDriveContextItem(null);
                refreshDriveFolder();
            } else {
                const err = await res.json();
                alert(`Rename failed: ${err.error}`);
            }
        } catch (e) {
            console.error('Rename error:', e);
        }
    };

    const handleDriveDelete = async () => {
        if (!driveDeleteTarget) return;
        try {
            const res = await fetch(
                `/api/drive/browse?id=${driveDeleteTarget.id}&isFolder=${driveDeleteTarget.isFolder}`,
                { method: 'DELETE' }
            );
            if (res.ok) {
                setDriveDeleteTarget(null);
                setIsDriveDeleting(false);
                refreshDriveFolder();
            } else {
                const err = await res.json();
                alert(`Delete failed: ${err.error}`);
            }
        } catch (e) {
            console.error('Delete error:', e);
        }
    };

    const handleDriveCreateFolder = async () => {
        if (!newFolderName.trim() || !currentDriveFolderId) return;
        try {
            const res = await fetch('/api/drive/browse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parentId: currentDriveFolderId,
                    folderName: newFolderName.trim()
                })
            });
            if (res.ok) {
                setIsCreatingFolder(false);
                setNewFolderName('');
                refreshDriveFolder();
            }
        } catch (e) {
            console.error('Create folder error:', e);
        }
    };

    const handleDriveUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentDriveFolderId) return;
        setIsDriveUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('parentId', currentDriveFolderId);
            const res = await fetch('/api/drive/browse', { method: 'POST', body: formData });
            if (res.ok) refreshDriveFolder();
        } catch (e) {
            console.error('Upload error:', e);
        } finally {
            setIsDriveUploading(false);
            if (driveFileInputRef.current) driveFileInputRef.current.value = '';
        }
    };

    const handleCreateClientFolder = async () => {
        if (!client) return;
        setIsSavingFolder(true);
        setFolderStatus(null);
        try {
            const res = await fetch('/api/clients/drive-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: client.id,
                    clientName: client.name,
                    organization: client.organization
                })
            });
            const data = await res.json();
            if (res.ok) {
                setLinkedFolderName(data.folderName);
                setFolderInput(data.folderId);
                setClient({ ...client, drive_folder_id: data.folderId });
                setFolderStatus({ type: 'success', message: `Folder "${data.folderName}" created and linked!` });
                browseDriveFolder(data.folderId, data.folderName);
            } else {
                setFolderStatus({ type: 'error', message: data.error });
            }
        } catch (e: any) {
            setFolderStatus({ type: 'error', message: e.message });
        } finally {
            setIsSavingFolder(false);
        }
    };

    const handleSaveClientFolder = async () => {
        if (!folderInput.trim() || !client) return;

        setIsValidatingFolder(true);
        setFolderStatus(null);

        try {
            const valRes = await fetch('/api/drive/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderId: folderInput.trim() })
            });
            const valData = await valRes.json();

            if (!valData.valid) {
                setFolderStatus({ type: 'error', message: valData.error || 'Cannot access this folder' });
                setIsValidatingFolder(false);
                return;
            }

            setIsValidatingFolder(false);
            setIsSavingFolder(true);

            const saveRes = await fetch('/api/clients', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: client.id, drive_folder_id: valData.folderId })
            });

            if (saveRes.ok) {
                setLinkedFolderName(valData.folderName);
                setFolderInput(valData.folderId);
                setClient({ ...client, drive_folder_id: valData.folderId });
                setFolderStatus({ type: 'success', message: `Linked to "${valData.folderName}"` });
                // Auto-browse into the folder
                browseDriveFolder(valData.folderId, valData.folderName);
            } else {
                const err = await saveRes.json();
                setFolderStatus({ type: 'error', message: err.error });
            }
        } catch (e: any) {
            setFolderStatus({ type: 'error', message: e.message });
        } finally {
            setIsValidatingFolder(false);
            setIsSavingFolder(false);
        }
    };

    const handleRemoveClientFolder = async () => {
        if (!client) return;
        setIsSavingFolder(true);
        try {
            const res = await fetch('/api/clients', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: client.id, drive_folder_id: '' })
            });
            if (res.ok) {
                setFolderInput('');
                setLinkedFolderName('');
                setIsDriveBrowsing(false);
                setDriveItems([]);
                setDriveBreadcrumbs([]);
                setClient({ ...client, drive_folder_id: null });
                setFolderStatus({ type: 'success', message: 'Folder link removed. Using default root folder.' });
            }
        } catch (e: any) {
            setFolderStatus({ type: 'error', message: e.message });
        } finally {
            setIsSavingFolder(false);
        }
    };

    const getDriveFileIcon = (mimeType: string) => {
        if (mimeType === 'application/vnd.google-apps.folder') return <FolderOpen size={20} className="text-[#279da6]" />;
        if (mimeType?.startsWith('image/')) return <ImageIcon size={20} className="text-emerald-400" />;
        if (mimeType?.includes('pdf')) return <FileText size={20} className="text-rose-400" />;
        if (mimeType?.startsWith('video/')) return <Film size={20} className="text-purple-400" />;
        return <FileIcon size={20} className="text-blue-400" />;
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const handleSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client) return;

        if (settingsPassword && settingsPassword !== settingsConfirmPassword) {
            setStatus({ type: 'error', message: "Passwords do not match!" });
            return;
        }

        setIsUpdating(true);
        try {
            const response = await fetch('/api/clients', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: client.id,
                    email: settingsEmail !== client.email ? settingsEmail : undefined,
                    password: settingsPassword || undefined,
                    oldEmail: client.email
                })
            });

            if (response.ok) {
                setStatus({ type: 'success', message: "Settings updated successfully!" });
                setSettingsPassword('');
                setSettingsConfirmPassword('');
                const updatedClient = { ...client, email: settingsEmail };
                setClient(updatedClient);
            } else {
                const err = await response.json();
                setStatus({ type: 'error', message: err.error });
            }
        } catch (error) {
            console.error('Update failed:', error);
            setStatus({ type: 'error', message: "Failed to update settings." });
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen bg-[#09090B] items-center justify-center">
                <Loader2 size={32} className="text-[#279da6] animate-spin" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex flex-col h-screen bg-[#09090B] items-center justify-center text-iron">
                <p className="text-xl font-bold mb-4">Client not found</p>
                <button
                    onClick={() => router.push('/clients')}
                    className="flex items-center gap-2 text-[#279da6] font-bold hover:underline"
                >
                    <ArrowLeft size={16} />
                    Back to Clients
                </button>
            </div>
        );
    }

    return (
        <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
            <Sidebar isCollapsed={isSidebarCollapsed} />

            <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                <div className={`flex-1 flex flex-col min-w-0 bg-[#121214] rounded-t-2xl overflow-hidden border-t border-l border-r mt-6 mr-6 transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
                    {/* Custom Breadcrumb Header (Replacing standard Header for detail view) */}
                    <div className="h-16 flex items-center justify-between px-6 shrink-0 z-30">
                        <div className="flex items-center gap-4 flex-1 overflow-hidden">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsSidebarCollapsed(!isSidebarCollapsed); }}
                                className="p-1 text-santas-gray hover:text-white transition-colors"
                            >
                                <PanelLeft size={18} />
                            </button>

                            <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-2.5 px-3 py-1.5 bg-shark/40 border border-shark rounded-lg shrink-0">
                                    <Users size={16} className="text-[#279da6]" />
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight">
                                        <span className="text-iron">{client.name}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sub-Navigation Tabs */}
                            <div className="flex items-center bg-black/40 border border-shark p-1 rounded-xl shrink-0 ml-2">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === tab
                                            ? 'bg-[#1E1E22] text-[#279da6] border border-[#279da6]/20 shadow-lg'
                                            : 'text-santas-gray hover:text-iron hover:bg-white/5'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="ml-4">
                                <ImpersonationWarning />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-santas-gray hover:text-white transition-colors group">
                                <SettingsIcon size={16} className="group-hover:text-white" />
                                <span>edit</span>
                            </button>
                        </div>

                    </div>

                    <main className="flex-1 overflow-y-auto custom-scrollbar relative">
                        {/* Status Notification */}
                        {status && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
                                <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-2xl backdrop-blur-md ${status.type === 'success'
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                    }`}>
                                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    <span className="text-xs font-bold uppercase tracking-tight">{status.message}</span>
                                    <button onClick={() => setStatus(null)} className="ml-2 hover:opacity-70">
                                        <CloseIcon size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="px-8 pb-8 pt-0">
                            {activeTab === 'Overview' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                                    {/* Info Cards */}
                                    <div className="lg:col-span-2 space-y-8">
                                        <div className="bg-[#18181B] border border-shark rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                                                <Building size={120} />
                                            </div>
                                            <h3 className="text-xs font-black text-storm-gray uppercase tracking-[0.3em] mb-8">Professional Profile</h3>

                                            <div className="grid grid-cols-2 gap-y-10">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest flex items-center gap-2">
                                                        <Mail size={12} className="text-[#279da6]" /> Email Address
                                                    </p>
                                                    <p className="text-iron font-bold text-sm tracking-tight">{client.email}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest flex items-center gap-2">
                                                        <Building size={12} className="text-[#279da6]" /> Organization
                                                    </p>
                                                    <p className="text-iron font-bold text-sm tracking-tight uppercase">{client.organization}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest flex items-center gap-2">
                                                        <Calendar size={12} className="text-[#279da6]" /> Joined Date
                                                    </p>
                                                    <p className="text-iron font-bold text-sm tracking-tight">
                                                        {new Date(client.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest flex items-center gap-2">
                                                        <Shield size={12} className="text-[#279da6]" /> Account Level
                                                    </p>
                                                    <p className="text-iron font-bold text-sm tracking-tight">Premium Enterprise</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-[#18181B] border border-shark rounded-3xl p-6 flex items-center justify-between group hover:border-[#279da6]/20 transition-all">
                                                <div>
                                                    <p className="text-[9px] font-black text-storm-gray uppercase tracking-[0.3em] mb-1">Total Requests</p>
                                                    <p className="text-2xl font-black text-white">24</p>
                                                </div>
                                                <div className="w-12 h-12 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] group-hover:scale-110 transition-transform">
                                                    <MessageSquare size={20} />
                                                </div>
                                            </div>
                                            <div className="bg-[#18181B] border border-shark rounded-3xl p-6 flex items-center justify-between group hover:border-[#279da6]/20 transition-all">
                                                <div>
                                                    <p className="text-[9px] font-black text-storm-gray uppercase tracking-[0.3em] mb-1">Active Invoices</p>
                                                    <p className="text-2xl font-black text-white">$12,450</p>
                                                </div>
                                                <div className="w-12 h-12 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] group-hover:scale-110 transition-transform">
                                                    <CreditCard size={20} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sidebar Column */}
                                    <div className="space-y-8">
                                        <div className="bg-[#18181B] border border-shark rounded-3xl p-8">
                                            <h3 className="text-[10px] font-black text-storm-gray uppercase tracking-[0.3em] mb-6">Actions</h3>
                                            <div className="flex flex-col gap-3">
                                                <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-shark/20 border border-shark hover:bg-shark text-iron font-bold text-xs transition-all group">
                                                    Edit Profile <SettingsIcon size={14} className="text-storm-gray group-hover:text-[#279da6] transition-colors" />
                                                </button>
                                                <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-shark/20 border border-shark hover:bg-shark text-iron font-bold text-xs transition-all group">
                                                    Message Client <MessageSquare size={14} className="text-storm-gray group-hover:text-[#279da6] transition-colors" />
                                                </button>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Requests' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-black text-iron tracking-tight uppercase">Recent Requests</h2>
                                        <div className="flex items-center gap-2">
                                            <div className="relative w-64">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-storm-gray" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Search requests..."
                                                    className="w-full bg-[#09090B] border border-shark/50 rounded-lg py-1.5 pl-9 pr-4 text-[11px] text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                />
                                            </div>
                                            <button className="p-2 bg-shark/20 border border-shark rounded-lg text-storm-gray hover:text-white transition-all"><Filter size={14} /></button>
                                            <button className="p-2 bg-shark/20 border border-shark rounded-lg text-storm-gray hover:text-white transition-all"><Download size={14} /></button>
                                        </div>
                                    </div>

                                    <div className="bg-[#18181B] border border-shark rounded-3xl overflow-hidden min-h-[400px] flex items-center justify-center text-storm-gray uppercase text-[10px] font-black tracking-widest opacity-40">
                                        No requests found for this client.
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Tasks' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-black text-iron tracking-tight uppercase">Project Tasks</h2>
                                        <div className="flex items-center gap-2">
                                            <div className="relative w-64">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-storm-gray" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Search tasks..."
                                                    className="w-full bg-[#09090B] border border-shark/50 rounded-lg py-1.5 pl-9 pr-4 text-[11px] text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                />
                                            </div>
                                            <button className="p-2 bg-shark/20 border border-shark rounded-lg text-storm-gray hover:text-white transition-all"><Filter size={14} /></button>
                                        </div>
                                    </div>

                                    <div className="bg-[#18181B] border border-shark rounded-3xl overflow-hidden min-h-[400px] flex items-center justify-center text-storm-gray uppercase text-[10px] font-black tracking-widest opacity-40">
                                        No tasks found for this client.
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Folder' && (
                                <div className="animate-fade-in space-y-6 flex flex-col h-full min-h-[500px]">
                                    {/* No Drive Linked - Empty State */}
                                    {!isDriveBrowsing && !isDriveLoading && (
                                        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#18181B] border border-shark rounded-3xl shadow-2xl relative overflow-hidden group">
                                            {/* Decorative Background */}
                                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#279da6]/5 rounded-full blur-[100px] group-hover:bg-[#279da6]/10 transition-all duration-700" />
                                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#279da6]/5 rounded-full blur-[100px] group-hover:bg-[#279da6]/10 transition-all duration-700 delay-150" />

                                            <div className="relative flex flex-col items-center text-center max-w-sm">
                                                <div className="w-24 h-24 rounded-[32px] bg-[#279da6]/10 border border-[#279da6]/20 flex items-center justify-center text-[#279da6] mb-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-[0_0_30px_rgba(39,157,166,0.1)]">
                                                    <HardDrive size={40} />
                                                </div>

                                                <h2 className="text-2xl font-black text-white tracking-tight uppercase mb-4">No Drive Linked</h2>
                                                <p className="text-storm-gray text-sm font-bold leading-relaxed mb-10 uppercase tracking-widest opacity-60">
                                                    Connect a Google Drive folder to manage {client.name}'s project files directly from this dashboard.
                                                </p>

                                                <div className="flex flex-col gap-4 w-full">
                                                    <button
                                                        onClick={handleCreateClientFolder}
                                                        disabled={isSavingFolder}
                                                        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#279da6] text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[#279da6]/20 hover:bg-[#279da6]/90 hover:-translate-y-0.5 transition-all"
                                                    >
                                                        {isSavingFolder ? <Loader2 size={16} className="animate-spin" /> : <FolderPlus size={16} />}
                                                        {isSavingFolder ? 'Creating Folder...' : 'Create New Folder'}
                                                    </button>

                                                    <button
                                                        onClick={() => setActiveTab('Settings')}
                                                        className="w-full py-4 rounded-2xl bg-shark/40 border border-shark hover:bg-shark text-iron font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                                                    >
                                                        Link Existing Folder
                                                    </button>
                                                </div>

                                                {folderStatus?.type === 'error' && (
                                                    <div className="mt-8 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-tight flex items-center gap-2">
                                                        <AlertCircle size={14} />
                                                        {folderStatus.message}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Drive Browser */}
                                    {isDriveBrowsing && (
                                        <div className="bg-[#18181B] border border-shark rounded-3xl p-6 shadow-2xl space-y-4">
                                            {/* Breadcrumbs + Actions */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                                                    {driveBreadcrumbs.map((crumb, i) => (
                                                        <React.Fragment key={crumb.id}>
                                                            {i > 0 && <ChevronRight size={14} className="text-storm-gray shrink-0" />}
                                                            <button
                                                                onClick={() => navigateToDriveBreadcrumb(i)}
                                                                className={`font-bold transition-all truncate max-w-[150px] ${i === driveBreadcrumbs.length - 1 ? 'text-[#279da6]' : 'text-storm-gray hover:text-iron'}`}
                                                            >
                                                                {crumb.name}
                                                            </button>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => setIsCreatingFolder(true)}
                                                        className="p-2 bg-shark/30 border border-shark hover:border-[#279da6]/30 rounded-xl text-storm-gray hover:text-[#279da6] transition-all"
                                                        title="New folder"
                                                    >
                                                        <FolderPlus size={16} />
                                                    </button>
                                                    <input
                                                        type="file"
                                                        ref={driveFileInputRef}
                                                        className="hidden"
                                                        onChange={handleDriveUpload}
                                                    />
                                                    <button
                                                        onClick={() => driveFileInputRef.current?.click()}
                                                        disabled={isDriveUploading}
                                                        className="p-2 bg-[#279da6]/10 border border-[#279da6]/20 rounded-xl text-[#279da6] hover:bg-[#279da6]/20 transition-all disabled:opacity-50"
                                                        title="Upload file"
                                                    >
                                                        {isDriveUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={refreshDriveFolder}
                                                        className="p-2 bg-shark/30 border border-shark rounded-xl text-storm-gray hover:text-white transition-all"
                                                        title="Refresh"
                                                    >
                                                        <RefreshCw size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* New Folder Input */}
                                            {isCreatingFolder && (
                                                <div className="flex items-center gap-3 p-3 bg-shark/20 border border-shark/40 rounded-xl">
                                                    <FolderPlus size={16} className="text-[#279da6] shrink-0" />
                                                    <input
                                                        type="text"
                                                        value={newFolderName}
                                                        onChange={(e) => setNewFolderName(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleDriveCreateFolder()}
                                                        className="flex-1 bg-transparent border-none text-sm text-iron focus:outline-none font-bold"
                                                        placeholder="New folder name..."
                                                        autoFocus
                                                    />
                                                    <button onClick={handleDriveCreateFolder} className="text-[#279da6] hover:text-white transition-all">
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                    <button onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }} className="text-storm-gray hover:text-white transition-all">
                                                        <CloseIcon size={16} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Items Grid */}
                                            {isDriveLoading ? (
                                                <div className="flex items-center justify-center py-20">
                                                    <Loader2 size={24} className="animate-spin text-[#279da6]" />
                                                </div>
                                            ) : driveItems.length === 0 ? (
                                                <div className="flex items-center justify-center py-20 text-storm-gray uppercase text-[10px] font-black tracking-widest opacity-40">
                                                    This folder is empty.
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {driveItems.map(item => (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-shark/30 transition-all group cursor-pointer"
                                                            onClick={() => item.isFolder ? navigateToDriveSubfolder(item) : (setPreviewFile(item), setIsPreviewOpen(true))}
                                                            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDriveContextItem(item); setDriveContextPos({ x: e.clientX, y: e.clientY }); }}
                                                        >
                                                            {getDriveFileIcon(item.mimeType)}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-iron truncate">{item.name}</p>
                                                                <p className="text-[10px] text-storm-gray">
                                                                    {item.isFolder ? 'Folder' : formatFileSize(item.size)}
                                                                    {item.createdTime && ` · ${new Date(item.createdTime).toLocaleDateString()}`}
                                                                </p>
                                                            </div>
                                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDriveContextItem(item);
                                                                        setDriveRenameValue(item.name);
                                                                        setIsDriveRenaming(true);
                                                                    }}
                                                                    className="p-1.5 hover:bg-shark rounded-lg text-storm-gray hover:text-white transition-all"
                                                                    title="Rename"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDriveDeleteTarget(item);
                                                                        setIsDriveDeleting(true);
                                                                    }}
                                                                    className="p-1.5 hover:bg-rose-500/10 rounded-lg text-storm-gray hover:text-rose-400 transition-all"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Rename Modal */}
                                    {isDriveRenaming && driveContextItem && (
                                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setIsDriveRenaming(false)}>
                                            <div className="bg-[#18181B] border border-shark rounded-2xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
                                                <h3 className="text-sm font-black text-iron uppercase tracking-widest mb-4">Rename {driveContextItem.isFolder ? 'Folder' : 'File'}</h3>
                                                <input
                                                    type="text"
                                                    value={driveRenameValue}
                                                    onChange={(e) => setDriveRenameValue(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleDriveRename()}
                                                    className="w-full bg-[#09090B] border border-shark/60 rounded-xl py-3 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold mb-4"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => setIsDriveRenaming(false)} className="px-4 py-2 text-xs font-bold text-storm-gray hover:text-white transition-all">Cancel</button>
                                                    <button onClick={handleDriveRename} className="px-6 py-2 bg-[#279da6] text-white rounded-xl text-xs font-black uppercase tracking-widest">Save</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Delete Confirmation */}
                                    {isDriveDeleting && driveDeleteTarget && (
                                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setIsDriveDeleting(false)}>
                                            <div className="bg-[#18181B] border border-shark rounded-2xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
                                                <h3 className="text-sm font-black text-iron uppercase tracking-widest mb-2">Delete {driveDeleteTarget.isFolder ? 'Folder' : 'File'}</h3>
                                                <p className="text-xs text-storm-gray mb-6">
                                                    Are you sure you want to delete <span className="text-white font-bold">"{driveDeleteTarget.name}"</span>?
                                                    {driveDeleteTarget.isFolder && ' All contents inside will also be deleted.'}
                                                </p>
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => setIsDriveDeleting(false)} className="px-4 py-2 text-xs font-bold text-storm-gray hover:text-white transition-all">Cancel</button>
                                                    <button onClick={handleDriveDelete} className="px-6 py-2 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest">Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Context Menu */}
                                    {driveContextItem && !isDriveRenaming && !isDriveDeleting && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setDriveContextItem(null)} />
                                            <div
                                                className="fixed z-50 bg-[#18181B] border border-shark rounded-xl shadow-2xl py-1 w-44"
                                                style={{ left: driveContextPos.x, top: driveContextPos.y }}
                                            >
                                                <button
                                                    onClick={() => { setDriveRenameValue(driveContextItem.name); setIsDriveRenaming(true); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-iron hover:bg-shark/40 transition-all"
                                                >
                                                    <Pencil size={14} /> Rename
                                                </button>
                                                {!driveContextItem.isFolder && (
                                                    <button
                                                        onClick={() => { window.open(driveContextItem.webContentLink || driveContextItem.webViewLink, '_blank'); setDriveContextItem(null); }}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-iron hover:bg-shark/40 transition-all"
                                                    >
                                                        <Download size={14} /> Download
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { setDriveDeleteTarget(driveContextItem); setIsDriveDeleting(true); setDriveContextItem(null); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'Settings' && (
                                <div className="max-w-2xl animate-fade-in">
                                    <div className="bg-[#18181B] border border-shark rounded-3xl p-8 shadow-2xl">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6]">
                                                <Shield size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-iron tracking-tight uppercase">Account Security</h2>
                                                <p className="text-xs font-bold text-santas-gray uppercase tracking-widest">Update credentials for {client.name}</p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleSettingsSubmit} className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em]">Email Address</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#279da6]" size={16} />
                                                    <input
                                                        type="email"
                                                        value={settingsEmail}
                                                        onChange={(e) => setSettingsEmail(e.target.value)}
                                                        className="w-full bg-[#09090B] border border-shark/60 rounded-2xl py-3 pl-12 pr-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold"
                                                        placeholder="client@example.com"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em]">New Password</label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#279da6]" size={16} />
                                                        <input
                                                            type={showSettingsPassword ? "text" : "password"}
                                                            value={settingsPassword}
                                                            onChange={(e) => setSettingsPassword(e.target.value)}
                                                            className="w-full bg-[#09090B] border border-shark/60 rounded-2xl py-3 pl-12 pr-12 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold"
                                                            placeholder="••••••••"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowSettingsPassword(!showSettingsPassword)}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-storm-gray hover:text-iron transition-colors"
                                                        >
                                                            {showSettingsPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em]">Confirm Password</label>
                                                    <div className="relative">
                                                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-[#279da6]" size={16} />
                                                        <input
                                                            type={showSettingsPassword ? "text" : "password"}
                                                            value={settingsConfirmPassword}
                                                            onChange={(e) => setSettingsConfirmPassword(e.target.value)}
                                                            className="w-full bg-[#09090B] border border-shark/60 rounded-2xl py-3 pl-12 pr-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold"
                                                            placeholder="••••••••"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 flex items-center justify-between">
                                                <p className="text-[10px] text-storm-gray font-bold max-w-[280px] leading-relaxed uppercase tracking-tighter">
                                                    Changing these settings will update the client's login credentials immediately.
                                                </p>
                                                <button
                                                    type="submit"
                                                    disabled={isUpdating}
                                                    className="px-8 py-3 bg-[#279da6] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#279da6]/90 transition-all shadow-lg shadow-[#279da6]/20 disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                                                    {isUpdating ? 'Updating...' : 'Save Changes'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Google Drive Management Section */}
                                    <div className="bg-[#18181B] border border-shark rounded-3xl p-8 shadow-2xl mt-8 relative overflow-hidden group">
                                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#279da6]/5 rounded-full blur-[80px] group-hover:bg-[#279da6]/10 transition-all duration-700" />

                                        <div className="flex items-center gap-4 mb-8 relative">
                                            <div className="w-12 h-12 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6]">
                                                <HardDrive size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-white tracking-tight uppercase">Drive Storage</h2>
                                                <p className="text-xs font-bold text-santas-gray uppercase tracking-widest">Linked Google Drive Infrastructure</p>
                                            </div>
                                        </div>

                                        <div className="space-y-8 relative">
                                            {linkedFolderName && (
                                                <div className="flex items-center gap-4 p-5 bg-[#279da6]/5 border border-[#279da6]/20 rounded-2xl">
                                                    <div className="w-10 h-10 rounded-xl bg-[#279da6]/10 flex items-center justify-center">
                                                        <FolderOpen size={18} className="text-[#279da6]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-white truncate">{linkedFolderName}</p>
                                                        <p className="text-[10px] font-bold text-storm-gray tracking-tight truncate">{client.drive_folder_id}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => { setActiveTab('Folder'); browseDriveFolder(client.drive_folder_id!, linkedFolderName); }}
                                                        className="px-4 py-2 bg-[#279da6]/10 text-[#279da6] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#279da6]/20 transition-all"
                                                    >
                                                        Browse
                                                    </button>
                                                    <button
                                                        onClick={handleRemoveClientFolder}
                                                        disabled={isSavingFolder}
                                                        className="p-2 hover:bg-rose-500/10 rounded-xl text-storm-gray hover:text-rose-400 transition-all"
                                                        title="Remove folder link"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em] ml-2">Folder ID or URL</label>
                                                    <div className="relative">
                                                        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[#279da6]" size={16} />
                                                        <input
                                                            type="text"
                                                            value={folderInput}
                                                            onChange={(e) => setFolderInput(e.target.value)}
                                                            className="w-full bg-[#09090B] border border-shark/60 rounded-2xl py-3 pl-12 pr-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold"
                                                            placeholder="Paste folder ID or Drive URL"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-4">
                                                    <p className="text-[10px] text-storm-gray font-bold max-w-[340px] leading-relaxed uppercase tracking-tighter italic">
                                                        Manually override the linked folder. This will change where all project files are stored.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveClientFolder}
                                                        disabled={isValidatingFolder || isSavingFolder || !folderInput.trim()}
                                                        className="px-6 py-3 bg-shark/20 border border-shark hover:bg-shark hover:text-[#279da6] text-storm-gray rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                                    >
                                                        {(isValidatingFolder || isSavingFolder) ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                                        {isValidatingFolder ? 'Validating...' : 'Validate & Link'}
                                                    </button>
                                                </div>

                                                {folderStatus && activeTab === 'Settings' && (
                                                    <div className={`mt-4 p-4 rounded-xl border text-[10px] font-black uppercase tracking-tight flex items-center gap-2 ${folderStatus.type === 'success'
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                                        }`}>
                                                        {folderStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                                        {folderStatus.message}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            <FilePreviewModal
                isOpen={isPreviewOpen}
                onClose={() => { setIsPreviewOpen(false); setPreviewFile(null); }}
                file={previewFile ? {
                    name: previewFile.name,
                    url: previewFile.webViewLink,
                    previewUrl: previewUrl(previewFile) || undefined,
                    type: previewFile.mimeType
                } : null}
            />
        </div>
    );
}

// Helper to generate preview URL
function previewUrl(item: any) {
    if (item.isFolder) return null;
    return `/api/drive/view?fileId=${item.id}`;
}
