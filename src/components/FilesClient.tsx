'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FilePreviewModal from '@/components/FilePreviewModal';
import { usePathname, useRouter } from 'next/navigation';
import {
    FolderOpen,
    ChevronLeft,
    ChevronRight,
    Search,
    Upload,
    Loader2,
    FileText,
    File as FileIcon,
    Image as ImageIcon,
    Film,
    Pencil,
    Trash2,
    Download,
    X,
    ArrowLeft,
    HardDrive,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    FolderPlus,
    Check,
    PanelLeft,
    Filter,
    Moon,
    Sun,
    Bell,
    Plus,
    FileUp,
    FolderUp,
    Table,
    Presentation,
    ClipboardList,
    MoreHorizontal,
    LayoutGrid,
    List,
    Settings2,
    ChevronDown,
    Folder,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface DriveItem {
    id: string;
    name: string;
    mimeType: string;
    isFolder: boolean;
    size: number | null;
    createdTime: string;
    webViewLink: string;
    webContentLink: string | null;
    previewUrl: string | null;
}

interface DBEnrichment {
    clients: { id: string; name: string; org: string }[];
    requests: { id: string; title: string }[];
}

interface FilesClientProps {
    initialRootId: string;
    initialDriveItems: DriveItem[];
    initialDbEnrichment: DBEnrichment;
}



export default function FilesClient({ initialRootId, initialDriveItems, initialDbEnrichment }: FilesClientProps) {
    const { profile, viewAsProfile, isImpersonating, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const displayProfile = viewAsProfile || profile;

    useEffect(() => {
        if (!isAuthLoading && displayProfile && displayProfile.role !== 'super_admin') {
            router.replace('/');
        }
    }, [displayProfile, isAuthLoading, router]);

    if (isAuthLoading || (displayProfile && displayProfile.role !== 'super_admin')) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#09090B]">
                <Loader2 size={32} className="animate-spin text-[#279da6]" />
            </div>
        );
    }
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isLoadingInitial, setIsLoadingInitial] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Track breadcrumbs state
    const [driveBreadcrumbs, setDriveBreadcrumbs] = useState<{ id: string; name: string }[]>([
        { id: initialRootId, name: 'Files' }
    ]);
    const [currentDriveFolderId, setCurrentDriveFolderId] = useState<string>(initialRootId);

    const [driveItems, setDriveItems] = useState<DriveItem[]>(initialDriveItems);
    const [isDriveLoading, setIsDriveLoading] = useState(false);

    // Update state when initialDriveItems changes (from SSR refresh)
    useEffect(() => {
        setDriveItems(initialDriveItems);
    }, [initialDriveItems]);

    const [dbEnrichment, setDbEnrichment] = useState<DBEnrichment>(initialDbEnrichment);

    // Preview
    const [previewFile, setPreviewFile] = useState<any | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // CRUD state
    const [contextMenuFile, setContextMenuFile] = useState<DriveItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DriveItem | null>(null);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const [namingModal, setNamingModal] = useState<{
        isOpen: boolean;
        type: string;
        title: string;
        initialValue: string;
        onConfirm: (name: string) => void;
    }>({ isOpen: false, type: '', title: '', initialValue: '', onConfirm: () => { } });
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filterType, setFilterType] = useState<string>('all');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    const newMenuRef = useRef<HTMLDivElement>(null);

    // Close menus on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (newMenuRef.current && !newMenuRef.current.contains(event.target as Node)) {
                setIsNewMenuOpen(false);
            }
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setIsFilterMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Upload
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const newFolderInputRef = useRef<HTMLInputElement>(null);

    // Focus input when creating folder
    useEffect(() => {
        if (isCreatingFolder) {
            setTimeout(() => newFolderInputRef.current?.focus(), 100);
        }
    }, [isCreatingFolder]);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    // Theme toggle effect
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'light') {
            root.classList.add('light');
        } else {
            root.classList.remove('light');
        }
    }, [theme]);

    const isSuperAdmin = displayProfile?.role === 'super_admin';
    const isAdmin = displayProfile?.role === 'admin' || isSuperAdmin;

    // Fetch Root and Initial Content
    const browseDriveFolder = async (folderId: string) => {
        setCurrentDriveFolderId(folderId);
        setIsDriveLoading(true);
        try {
            const res = await fetch(`/api/drive/browse?folderId=${folderId}`);
            if (res.ok) {
                const data = await res.json();
                setDriveItems(data);
            }
        } catch (e) {
            console.error('Browse error:', e);
        } finally {
            setIsDriveLoading(false);
        }
    };

    const navigateToSubfolder = (item: DriveItem) => {
        setDriveBreadcrumbs(prev => [...prev, { id: item.id, name: item.name }]);
        browseDriveFolder(item.id);
    };

    const navigateToBreadcrumb = (index: number) => {
        const crumb = driveBreadcrumbs[index];
        setDriveBreadcrumbs(prev => prev.slice(0, index + 1));
        browseDriveFolder(crumb.id);
    };

    const navigateBack = () => {
        if (driveBreadcrumbs.length > 1) {
            navigateToBreadcrumb(driveBreadcrumbs.length - 2);
        }
    };

    const refreshFolder = () => {
        if (currentDriveFolderId) browseDriveFolder(currentDriveFolderId);
    };

    // ─── CRUD Handlers ───
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        const isFolderInput = e.target === folderInputRef.current;

        if (!currentDriveFolderId) return;

        // Special handling for empty folder uploads 
        // (Browsers don't provide the name of an empty directory, so we ask for it)
        if (isFolderInput && (!files || files.length === 0)) {
            setNamingModal({
                isOpen: true,
                type: 'folder',
                title: 'Name your empty folder',
                initialValue: 'New Folder',
                onConfirm: async (name) => {
                    setNamingModal(prev => ({ ...prev, isOpen: false }));
                    setIsUploading(true);
                    setUploadStatus(`Creating folder: ${name}...`);
                    try {
                        const res = await fetch('/api/drive/browse', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ parentId: currentDriveFolderId, folderName: name })
                        });
                        if (res.ok) router.refresh();
                    } catch (err) {
                        console.error('Empty folder upload error:', err);
                    } finally {
                        setIsUploading(false);
                        setUploadStatus('');
                        if (folderInputRef.current) folderInputRef.current.value = '';
                    }
                }
            });
            return;
        }

        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            let targetFolderId = currentDriveFolderId;

            // Check if it's a folder upload and create the parent folder first
            const firstFile = files[0] as any;
            if (firstFile.webkitRelativePath && firstFile.webkitRelativePath.includes('/')) {
                const rootFolderName = firstFile.webkitRelativePath.split('/')[0];
                setUploadStatus(`Preparing folder: ${rootFolderName}...`);

                const res = await fetch('/api/drive/browse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        parentId: currentDriveFolderId,
                        folderName: rootFolderName
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    targetFolderId = data.id;
                }
            }

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                // Clean the filename (strip paths if browser includes them in .name)
                const cleanName = file.name.split('/').pop() || file.name;

                setUploadStatus(`Uploading ${i + 1}/${files.length}: ${cleanName}...`);
                const formData = new FormData();
                formData.append('file', file, cleanName); // Use the clean name
                formData.append('parentId', targetFolderId);
                await fetch('/api/drive/browse', { method: 'POST', body: formData });
            }
            refreshFolder();
            router.refresh();
        } catch (e) {
            console.error('Upload error:', e);
        } finally {
            setIsUploading(false);
            setUploadStatus('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (folderInputRef.current) folderInputRef.current.value = '';
        }
    };

    const handleCreateGoogleFile = async (type: 'document' | 'spreadsheet' | 'presentation' | 'form') => {
        if (!currentDriveFolderId) return;

        setNamingModal({
            isOpen: true,
            type,
            title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            initialValue: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            onConfirm: async (name) => {
                setIsUploading(true);
                setUploadStatus(`Creating ${type}...`);
                try {
                    const res = await fetch('/api/drive/browse', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            parentId: currentDriveFolderId,
                            folderName: name.trim(),
                            type
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.webViewLink) {
                            window.open(data.webViewLink, '_blank');
                        }
                        refreshFolder();
                        router.refresh();
                    }
                } catch (e) {
                    console.error('Create Google file error:', e);
                } finally {
                    setIsUploading(false);
                    setNamingModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleCreateFolder = async () => {
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
                refreshFolder();
                router.refresh();
            }
        } catch (e) {
            console.error('Create folder error:', e);
        }
    };


    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(
                `/api/drive/browse?id=${deleteTarget.id}&isFolder=${deleteTarget.isFolder}`,
                { method: 'DELETE' }
            );
            if (res.ok) {
                setDeleteTarget(null);
                setIsDeleting(false);
                refreshFolder();
                router.refresh();
            }
        } catch (e) {
            console.error('Delete error:', e);
        }
    };

    // ─── Visual Helpers ───
    const getFileIcon = (mimeType: string, itemName?: string, iconSize: number = 24) => {
        if (mimeType === 'application/vnd.google-apps.folder') {
            // Check if it's a client or request folder
            const isClient = dbEnrichment.clients.some(c => (c.org || c.name) === itemName);
            const isRequest = dbEnrichment.requests.some(r => r.title === itemName);

            if (isClient) return <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"><FolderOpen size={iconSize} /></div>;
            if (isRequest) return <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"><FolderOpen size={iconSize} /></div>;

            return <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400"><FolderOpen size={iconSize} /></div>;
        }
        if (mimeType?.startsWith('image/')) return <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400"><ImageIcon size={iconSize} /></div>;
        if (mimeType?.includes('pdf')) return <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400"><FileText size={iconSize} /></div>;
        if (mimeType?.startsWith('video/')) return <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400"><Film size={iconSize} /></div>;

        // Google Workspace Apps
        if (mimeType === 'application/vnd.google-apps.document')
            return <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"><FileText size={iconSize} /></div>;
        if (mimeType === 'application/vnd.google-apps.spreadsheet')
            return <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]"><Table size={iconSize} /></div>;
        if (mimeType === 'application/vnd.google-apps.presentation')
            return <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]"><Presentation size={iconSize} /></div>;
        if (mimeType === 'application/vnd.google-apps.form')
            return <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]"><ClipboardList size={iconSize} /></div>;

        return <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400"><FileIcon size={iconSize} /></div>;
    };

    const getFileTypeLabel = (mimeType: string) => {
        if (mimeType === 'application/vnd.google-apps.folder') return 'FOLDER';
        if (mimeType === 'application/vnd.google-apps.document') return 'DOC';
        if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'SHEET';
        if (mimeType === 'application/vnd.google-apps.presentation') return 'SLIDE';
        if (mimeType === 'application/vnd.google-apps.form') return 'FORM';
        if (mimeType?.startsWith('image/')) return mimeType.replace('image/', '').toUpperCase();
        if (mimeType?.includes('pdf')) return 'PDF';
        const ext = mimeType?.split('/').pop()?.toUpperCase() || 'FILE';
        return ext;
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    // ─── Filtered items for search and type ───
    const filteredItems = driveItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' ||
            (filterType === 'folder' && item.isFolder) ||
            (filterType === 'doc' && item.mimeType === 'application/vnd.google-apps.document') ||
            (filterType === 'sheet' && item.mimeType === 'application/vnd.google-apps.spreadsheet') ||
            (filterType === 'slide' && item.mimeType === 'application/vnd.google-apps.presentation') ||
            (filterType === 'pdf' && item.mimeType.includes('pdf')) ||
            (filterType === 'image' && item.mimeType.startsWith('image/'));

        return matchesSearch && matchesType;
    });

    return (
        <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
            <Sidebar isCollapsed={isSidebarCollapsed} />

            <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                <div className={`flex-1 flex flex-col min-w-0 bg-[#121214] rounded-t-2xl overflow-hidden border-t border-l border-r mt-6 mr-6 transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'border-shark'}`}>
                    <div className="border-b border-shark">
                        <Header
                            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            label="Files"
                            labelIcon={<HardDrive size={16} className="text-[#279da6]" />}
                            onCreate={(displayProfile?.role === 'super_admin' || displayProfile?.team_role === 'admin') ? () => setIsNewMenuOpen(!isNewMenuOpen) : undefined}
                            isCreating={isCreatingFolder}
                            onConfirm={handleCreateFolder}
                            onCancel={() => {
                                setIsCreatingFolder(false);
                                setNewFolderName('');
                            }}
                            isSubmitting={isDriveLoading}
                        >
                            {/* Breadcrumbs */}
                            <div className="flex items-center gap-2 text-sm ml-2 overflow-hidden">
                                {driveBreadcrumbs.length > 1 && (
                                    <button
                                        onClick={() => navigateToBreadcrumb(driveBreadcrumbs.length - 2)}
                                        className="p-1 text-santas-gray hover:text-white transition-colors group active:scale-95"
                                        title="Go to parent folder"
                                    >
                                        <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                                    </button>
                                )}
                                {driveBreadcrumbs.map((crumb, i) => (
                                    <React.Fragment key={crumb.id}>
                                        {i > 0 && <ChevronRight size={14} className="text-storm-gray shrink-0" />}
                                        <button
                                            onClick={() => navigateToBreadcrumb(i)}
                                            className={`font-black uppercase tracking-widest text-[10px] transition-all truncate max-w-[120px] ${i === driveBreadcrumbs.length - 1 ? 'text-[#279da6]' : 'text-storm-gray hover:text-iron'}`}
                                        >
                                            {crumb.name}
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Consolidated Actions */}
                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    onClick={refreshFolder}
                                    className="p-1.5 text-santas-gray hover:text-white transition-all shrink-0"
                                    title="Refresh"
                                >
                                    <RefreshCw size={14} className={isDriveLoading ? 'animate-spin' : ''} />
                                </button>

                                {isUploading && uploadStatus && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#279da6]/10 border border-[#279da6]/20 rounded-lg animate-pulse">
                                        <Loader2 size={14} className="text-[#279da6] animate-spin" />
                                        <span className="text-[10px] font-bold text-[#279da6] uppercase tracking-wider truncate max-w-[200px]">
                                            {uploadStatus}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Header>
                    </div>


                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} />
                    <input type="file" ref={folderInputRef} className="hidden" onChange={handleUpload} {...{ webkitdirectory: "", directory: "" } as any} />

                    <main className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#18181B]">
                        {/* New Menu Dropdown */}
                        {isNewMenuOpen && (
                            <div className="absolute top-2 right-6 w-64 bg-[#18181B] border border-shark/60 rounded-xl shadow-2xl py-2 z-[100] animate-zoom-in backdrop-blur-xl bg-opacity-95 overflow-hidden" ref={newMenuRef}>
                                <button
                                    onClick={() => { setIsCreatingFolder(true); setIsNewMenuOpen(false); }}
                                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 text-iron transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <FolderPlus size={16} className="text-storm-gray group-hover:text-[#279da6] transition-colors" />
                                        <span className="text-xs font-medium">New folder</span>
                                    </div>
                                    <span className="text-[10px] text-storm-gray opacity-40 group-hover:opacity-100 transition-opacity uppercase tracking-widest px-1.5 border border-shark/40 rounded bg-shark/20">⌘F</span>
                                </button>
                                <div className="h-[1px] bg-shark/40 my-1" />
                                <button
                                    onClick={() => { fileInputRef.current?.click(); setIsNewMenuOpen(false); }}
                                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 text-iron transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileUp size={16} className="text-storm-gray group-hover:text-[#279da6] transition-colors" />
                                        <span className="text-xs font-medium">File upload</span>
                                    </div>
                                    <span className="text-[10px] text-storm-gray opacity-40 group-hover:opacity-100 transition-opacity uppercase tracking-widest px-1.5 border border-shark/40 rounded bg-shark/20">⌘U</span>
                                </button>
                                <button
                                    onClick={() => { folderInputRef.current?.click(); setIsNewMenuOpen(false); }}
                                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 text-iron transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <FolderUp size={16} className="text-storm-gray group-hover:text-[#279da6] transition-colors" />
                                        <span className="text-xs font-medium">Folder upload</span>
                                    </div>
                                    <span className="text-[10px] text-storm-gray opacity-40 group-hover:opacity-100 transition-opacity uppercase tracking-widest px-1.5 border border-shark/40 rounded bg-shark/20">⌘I</span>
                                </button>
                                <div className="h-[1px] bg-shark/40 my-1" />
                                <button
                                    onClick={() => { handleCreateGoogleFile('document'); setIsNewMenuOpen(false); }}
                                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 text-iron transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-500 shadow-sm">
                                            <FileText size={12} />
                                        </div>
                                        <span className="text-xs font-medium">Google Docs</span>
                                    </div>
                                    <ChevronRight size={12} className="text-storm-gray opacity-40 group-hover:opacity-100" />
                                </button>
                                <button
                                    onClick={() => { handleCreateGoogleFile('spreadsheet'); setIsNewMenuOpen(false); }}
                                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 text-iron transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded bg-green-500/10 border border-green-500/20 flex items-center justify-center text-[10px] font-black text-green-500 shadow-sm">
                                            <Table className="size-3" />
                                        </div>
                                        <span className="text-xs font-medium">Google Sheets</span>
                                    </div>
                                    <ChevronRight size={12} className="text-storm-gray opacity-40 group-hover:opacity-100" />
                                </button>
                            </div>
                        )}
                        <div className="p-6">
                            {/* Toolbar */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-80">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-santas-gray" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search files and folders"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-[#09090B] border border-shark/50 rounded-lg py-2 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Filters Dropdown */}
                                    <div className="relative" ref={filterMenuRef}>
                                        <button
                                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-shark/60 hover:border-[#279da6]/40 hover:bg-white/5 transition-all group ${filterType !== 'all' ? 'bg-[#279da6]/10 border-[#279da6]/40 text-[#279da6]' : 'text-santas-gray'}`}
                                        >
                                            <Filter size={14} className={filterType !== 'all' ? 'text-[#279da6]' : 'group-hover:text-white'} />
                                            <span className="text-[11px] font-bold uppercase tracking-tight">
                                                {filterType === 'all' ? 'Filters' : filterType}
                                            </span>
                                            <ChevronDown size={12} className={`transition-transform duration-300 ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isFilterMenuOpen && (
                                            <div className="absolute top-full right-0 mt-2 w-48 bg-[#18181B] border border-shark/60 rounded-xl shadow-2xl py-2 z-[60] animate-zoom-in backdrop-blur-xl bg-opacity-95">
                                                {[
                                                    { id: 'all', label: 'All Files', icon: <FileIcon size={14} /> },
                                                    { id: 'folder', label: 'Folders', icon: <FolderOpen size={14} /> },
                                                    { id: 'doc', label: 'Google Docs', icon: <FileText size={14} className="text-blue-500" /> },
                                                    { id: 'sheet', label: 'Google Sheets', icon: <Table size={14} className="text-green-500" /> },
                                                    { id: 'slide', label: 'Google Slides', icon: <Presentation size={14} className="text-yellow-500" /> },
                                                    { id: 'image', label: 'Images', icon: <ImageIcon size={14} className="text-emerald-500" /> },
                                                    { id: 'pdf', label: 'PDFs', icon: <FileText size={14} className="text-rose-500" /> },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => { setFilterType(opt.id); setIsFilterMenuOpen(false); }}
                                                        className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 text-xs transition-colors ${filterType === opt.id ? 'text-[#279da6] bg-[#279da6]/5 font-bold' : 'text-iron'}`}
                                                    >
                                                        <span className="opacity-80 group-hover:opacity-100">{opt.icon}</span>
                                                        <span>{opt.label}</span>
                                                        {filterType === opt.id && <Check size={12} className="ml-auto" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-4 w-[1px] bg-shark mx-1" />

                                    {/* View Mode Switcher */}
                                    <div className="flex items-center bg-[#09090B] border border-shark/60 rounded-xl p-0.5 overflow-hidden">
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-1.5 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-[#279da6] text-white shadow-lg shadow-[#279da6]/20' : 'text-santas-gray hover:text-white hover:bg-white/5'}`}
                                            title="List view"
                                        >
                                            <List size={14} />
                                            {viewMode === 'list' && <span className="text-[10px] font-black uppercase pr-1">List</span>}
                                        </button>
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`p-1.5 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-[#279da6] text-white shadow-lg shadow-[#279da6]/20' : 'text-santas-gray hover:text-white hover:bg-white/5'}`}
                                            title="Grid view"
                                        >
                                            <LayoutGrid size={14} />
                                            {viewMode === 'grid' && <span className="text-[10px] font-black uppercase pr-1">Grid</span>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* New Folder Creation Input */}
                            <div
                                className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCreatingFolder
                                    ? 'max-h-40 opacity-100 mb-8 translate-y-0 scale-100 blur-0'
                                    : 'max-h-0 opacity-0 mb-0 -translate-y-4 scale-95 blur-md pointer-events-none'
                                    }`}
                            >
                                <div className="flex items-center gap-4 p-5 bg-[#18181B]/40 backdrop-blur-xl border border-[#279da6]/30 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3),0_0_30px_rgba(39,157,166,0.05)] ring-1 ring-white/5">
                                    <div className={`transition-all duration-500 ease-out ${isCreatingFolder ? 'opacity-100 translate-x-0 delay-200' : 'opacity-0 -translate-x-4'}`}>
                                        <div className="p-2.5 rounded-xl bg-[#279da6]/10 text-[#279da6]">
                                            <FolderPlus size={22} className="shrink-0" />
                                        </div>
                                    </div>

                                    <div className={`flex-1 transition-all duration-500 ease-out ${isCreatingFolder ? 'opacity-100 delay-300' : 'opacity-0'}`}>
                                        <input
                                            ref={newFolderInputRef}
                                            type="text"
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                            className="w-full bg-transparent border-none text-base text-iron focus:outline-none font-bold placeholder:text-storm-gray/50"
                                            placeholder="Enter folder name..."
                                        />
                                    </div>

                                    {/* Action buttons moved to top header for cleaner transition */}
                                </div>
                            </div>

                            {isDriveLoading && driveItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-32 gap-4">
                                    <Loader2 size={32} className="animate-spin text-[#279da6]" />
                                    <p className="text-[10px] font-black text-storm-gray uppercase tracking-[0.3em]">Synching with Drive...</p>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-32 text-center opacity-40">
                                    <FolderOpen size={48} className="text-storm-gray mb-4" />
                                    <p className="text-xs font-black text-iron uppercase mb-1 tracking-widest">THIS FOLDER IS EMPTY</p>
                                    <p className="text-[10px] text-storm-gray uppercase tracking-widest">Upload your first file or create a subfolder.</p>
                                </div>
                            ) : (
                                <div className="animate-fade-in">
                                    {viewMode === 'grid' ? (
                                        <div className="space-y-12">
                                            {/* Folders Section */}
                                            {filteredItems.some(item => item.isFolder) && (
                                                <div className="space-y-4">
                                                    <h3 className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em] ml-1 opacity-60">Folders</h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                                                        {filteredItems.filter(item => item.isFolder).map((item) => (
                                                            <div
                                                                key={item.id}
                                                                className="group relative flex items-center gap-3 p-3 rounded-2xl border border-shark/30 bg-[#09090B]/30 hover:bg-[#279da6]/5 hover:border-[#279da6]/40 transition-all cursor-pointer overflow-hidden"
                                                                onClick={() => navigateToSubfolder(item)}
                                                            >
                                                                <div className="shrink-0">
                                                                    {getFileIcon(item.mimeType, item.name, 20)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[11px] font-bold text-iron truncate uppercase tracking-tight group-hover:text-[#279da6] transition-colors">{item.name}</p>
                                                                </div>

                                                                {/* Mini Actions */}
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setNamingModal({
                                                                                isOpen: true,
                                                                                type: 'rename',
                                                                                title: 'Rename Folder',
                                                                                initialValue: item.name,
                                                                                onConfirm: async (newName) => {
                                                                                    if (!newName.trim()) return;
                                                                                    try {
                                                                                        const res = await fetch('/api/drive/browse', {
                                                                                            method: 'PATCH',
                                                                                            headers: { 'Content-Type': 'application/json' },
                                                                                            body: JSON.stringify({ id: item.id, newName: newName.trim(), isFolder: true })
                                                                                        });
                                                                                        if (res.ok) { refreshFolder(); router.refresh(); }
                                                                                    } catch (e) { console.error(e); } finally { setNamingModal(prev => ({ ...prev, isOpen: false })); }
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="p-1.5 hover:text-[#279da6] transition-colors"
                                                                    >
                                                                        <Pencil size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); setIsDeleting(true); }}
                                                                        className="p-1.5 hover:text-rose-400 transition-colors"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Files Section */}
                                            {filteredItems.some(item => !item.isFolder) && (
                                                <div className="space-y-4">
                                                    <h3 className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em] ml-1 opacity-60">Files</h3>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
                                                        {filteredItems.filter(item => !item.isFolder).map((item) => (
                                                            <div
                                                                key={item.id}
                                                                className="group relative flex flex-col rounded-3xl border border-shark/40 bg-[#09090B]/40 hover:bg-[#279da6]/5 hover:border-[#279da6]/30 transition-all cursor-pointer overflow-hidden aspect-[4/5]"
                                                                onClick={() => (setPreviewFile({ ...item, url: item.webViewLink, previewUrl: item.previewUrl, type: item.mimeType }), setIsPreviewOpen(true))}
                                                            >
                                                                {/* Preview Area */}
                                                                <div className="flex-1 bg-shark/20 flex items-center justify-center relative overflow-hidden">
                                                                    <div className="transition-transform duration-500 group-hover:scale-110 opacity-40 group-hover:opacity-80">
                                                                        {getFileIcon(item.mimeType, item.name, 48)}
                                                                    </div>
                                                                    {/* File Type Badge Overlay */}
                                                                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#09090B]/60 backdrop-blur-md border border-shark/40">
                                                                        <div className="scale-75 origin-left">
                                                                            {getFileIcon(item.mimeType, item.name, 12)}
                                                                        </div>
                                                                        <span className="text-[8px] font-black text-storm-gray uppercase tracking-[0.1em]">{getFileTypeLabel(item.mimeType)}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Footer Info */}
                                                                <div className="p-4 bg-[#111114]/80 backdrop-blur-sm border-t border-shark/40">
                                                                    <p className="text-[10px] font-bold text-iron truncate uppercase tracking-tight group-hover:text-[#279da6] transition-colors mb-1">{item.name}</p>
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[8px] font-black text-storm-gray uppercase tracking-widest">{item.size ? formatFileSize(item.size) : '--'}</span>
                                                                        {dbEnrichment.clients.some(c => (c.org || c.name) === item.name) && (
                                                                            <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">CLIENT</span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Hover Actions */}
                                                                <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); setIsDeleting(true); }}
                                                                        className="p-2 rounded-xl bg-[#09090B]/80 backdrop-blur-md border border-shark hover:bg-rose-500/20 text-storm-gray hover:text-rose-400 transition-all"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                    <a
                                                                        href={item.webContentLink || item.webViewLink}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="p-2 rounded-xl bg-[#09090B]/80 backdrop-blur-md border border-shark hover:bg-white/10 text-storm-gray hover:text-white transition-all"
                                                                    >
                                                                        <Download size={12} />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* List View */
                                        <div className="flex flex-col gap-1 border border-shark/40 rounded-2xl overflow-hidden bg-[#09090B]/20">
                                            {/* Header */}
                                            <div className="flex items-center px-4 py-3 bg-white/5 border-b border-shark/60 text-[10px] font-black text-storm-gray uppercase tracking-widest">
                                                <div className="flex-1">Name</div>
                                                <div className="w-32 hidden md:block">Type</div>
                                                <div className="w-24 hidden sm:block">Size</div>
                                                <div className="w-32 text-right">Actions</div>
                                            </div>
                                            {/* Items */}
                                            {filteredItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => item.isFolder ? navigateToSubfolder(item) : (setPreviewFile({ ...item, url: item.webViewLink, previewUrl: item.previewUrl, type: item.mimeType }), setIsPreviewOpen(true))}
                                                    className="flex items-center px-4 py-3 hover:bg-white/5 transition-all cursor-pointer group border-b border-shark/20 last:border-none"
                                                >
                                                    <div className="flex-1 flex items-center gap-3 min-w-0">
                                                        <div className="shrink-0 scale-75 origin-left">
                                                            {getFileIcon(item.mimeType, item.name)}
                                                        </div>
                                                        <p className="text-xs font-bold text-iron truncate uppercase tracking-tight group-hover:text-[#279da6] transition-colors">{item.name}</p>
                                                        {dbEnrichment.clients.some(c => (c.org || c.name) === item.name) && (
                                                            <span className="text-[8px] font-black bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20 uppercase">CLIENT</span>
                                                        )}
                                                    </div>
                                                    <div className="w-32 hidden md:block">
                                                        <span className="text-[9px] font-black text-storm-gray uppercase tracking-widest">{getFileTypeLabel(item.mimeType)}</span>
                                                    </div>
                                                    <div className="w-24 hidden sm:block">
                                                        <span className="text-[9px] font-black text-storm-gray uppercase tracking-widest">{!item.isFolder && item.size ? formatFileSize(item.size) : '--'}</span>
                                                    </div>
                                                    <div className="w-32 flex items-center justify-end gap-1 opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setNamingModal({
                                                                    isOpen: true,
                                                                    type: 'rename',
                                                                    title: `Rename ${item.isFolder ? 'Folder' : 'File'}`,
                                                                    initialValue: item.name,
                                                                    onConfirm: async (newName) => {
                                                                        if (!newName.trim()) return;
                                                                        try {
                                                                            const res = await fetch('/api/drive/browse', {
                                                                                method: 'PATCH',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({
                                                                                    id: item.id,
                                                                                    newName: newName.trim(),
                                                                                    isFolder: item.isFolder
                                                                                })
                                                                            });
                                                                            if (res.ok) {
                                                                                refreshFolder();
                                                                                router.refresh();
                                                                            }
                                                                        } catch (e) {
                                                                            console.error('Rename error:', e);
                                                                        } finally {
                                                                            setNamingModal(prev => ({ ...prev, isOpen: false }));
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-[#279da6]/20 text-storm-gray hover:text-[#279da6] transition-all"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); setIsDeleting(true); }}
                                                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-storm-gray hover:text-rose-400 transition-all"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                        {!item.isFolder && (
                                                            <a
                                                                href={item.webContentLink || item.webViewLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-1.5 rounded-lg hover:bg-white/10 text-storm-gray hover:text-white transition-all"
                                                            >
                                                                <Download size={12} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>
                </div >
            </div >

            {/* Delete Confirmation */}
            {
                isDeleting && deleteTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className="bg-[#18181B] border border-shark rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 mx-auto">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-black text-white text-center mb-2 uppercase tracking-tight">Confirm Deletion</h3>
                            <p className="text-sm font-bold text-storm-gray text-center mb-8 uppercase tracking-widest text-[10px]">
                                Are you sure you want to delete <span className="text-iron">"{deleteTarget?.name}"</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setIsDeleting(false); setDeleteTarget(null); }}
                                    className="flex-1 px-6 py-3 rounded-2xl bg-shark/40 hover:bg-shark border border-shark text-iron text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 px-6 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20"
                                >
                                    Delete Now
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* File Preview Modal */}
            <FilePreviewModal
                isOpen={isPreviewOpen}
                onClose={() => { setIsPreviewOpen(false); setPreviewFile(null); }}
                file={previewFile}
            />

            {/* Name Input Modal */}
            {
                namingModal.isOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                            onClick={() => setNamingModal(prev => ({ ...prev, isOpen: false }))}
                        />
                        <div className="bg-[#18181B] border border-shark/60 w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-zoom-in">
                            <div className="px-6 py-5 border-b border-shark">
                                <h3 className="text-lg font-black text-iron tracking-tight uppercase">
                                    {namingModal.title}
                                </h3>
                                <button
                                    onClick={() => setNamingModal(prev => ({ ...prev, isOpen: false }))}
                                    className="absolute top-5 right-5 p-1 text-storm-gray hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                <label className="block text-[10px] font-black text-storm-gray uppercase tracking-widest mb-2 ml-1">
                                    Enter Name
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    defaultValue={namingModal.initialValue}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            namingModal.onConfirm(e.currentTarget.value);
                                        } else if (e.key === 'Escape') {
                                            setNamingModal(prev => ({ ...prev, isOpen: false }));
                                        }
                                    }}
                                    className="w-full bg-shark/40 border border-shark rounded-xl px-4 py-3 text-iron focus:outline-none focus:border-[#279da6] transition-all placeholder:text-storm-gray/40 font-medium"
                                    placeholder="e.g. Project Proposal"
                                />
                            </div>

                            <div className="px-6 py-4 bg-shark/20 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setNamingModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-5 py-2 text-xs font-black text-storm-gray hover:text-white transition-colors uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={(e) => {
                                        const input = (e.currentTarget.parentElement?.previousElementSibling?.querySelector('input') as HTMLInputElement);
                                        if (input) namingModal.onConfirm(input.value);
                                    }}
                                    className="px-6 py-2 bg-[#279da6] text-white rounded-xl text-xs font-black hover:bg-[#279da6]/90 transition-all shadow-lg shadow-[#279da6]/20 uppercase tracking-widest active:scale-95"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
