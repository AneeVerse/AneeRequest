'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FilePreviewModal from '@/components/FilePreviewModal';
import { usePathname, useRouter } from 'next/navigation';
import {
    FolderOpen,
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
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DriveItem | null>(null);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Upload
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
        const file = e.target.files?.[0];
        if (!file || !currentDriveFolderId) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('parentId', currentDriveFolderId);
            const res = await fetch('/api/drive/browse', { method: 'POST', body: formData });
            if (res.ok) router.refresh();
        } catch (e) {
            console.error('Upload error:', e);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
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
                router.refresh();
            }
        } catch (e) {
            console.error('Create folder error:', e);
        }
    };

    const handleRename = async () => {
        if (!contextMenuFile || !renameValue.trim()) return;
        try {
            const res = await fetch('/api/drive/browse', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: contextMenuFile.id,
                    newName: renameValue.trim(),
                    isFolder: contextMenuFile.isFolder
                })
            });
            if (res.ok) {
                setIsRenaming(false);
                setContextMenuFile(null);
                router.refresh();
            }
        } catch (e) {
            console.error('Rename error:', e);
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
                router.refresh();
            }
        } catch (e) {
            console.error('Delete error:', e);
        }
    };

    // ─── Visual Helpers ───
    const getFileIcon = (mimeType: string, itemName?: string) => {
        if (mimeType === 'application/vnd.google-apps.folder') {
            // Check if it's a client or request folder
            const isClient = dbEnrichment.clients.some(c => (c.org || c.name) === itemName);
            const isRequest = dbEnrichment.requests.some(r => r.title === itemName);

            if (isClient) return <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"><FolderOpen size={24} /></div>;
            if (isRequest) return <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"><FolderOpen size={24} /></div>;

            return <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400"><FolderOpen size={24} /></div>;
        }
        if (mimeType?.startsWith('image/')) return <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400"><ImageIcon size={24} /></div>;
        if (mimeType?.includes('pdf')) return <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400"><FileText size={24} /></div>;
        if (mimeType?.startsWith('video/')) return <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400"><Film size={24} /></div>;
        return <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400"><FileIcon size={24} /></div>;
    };

    const getFileTypeLabel = (mimeType: string) => {
        if (mimeType === 'application/vnd.google-apps.folder') return 'FOLDER';
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

    // ─── Filtered items for search ───
    const filteredItems = driveItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
            <Sidebar isCollapsed={isSidebarCollapsed} />

            <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                <div className={`flex-1 flex flex-col min-w-0 bg-[#121214] rounded-t-2xl overflow-visible border-t border-l border-r mt-6 mr-6 transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'border-shark'}`}>
                    <div className="h-16 flex items-center justify-between px-6 shrink-0 z-30 border-b border-shark">
                        <div className="flex items-center gap-4 flex-1 overflow-hidden">
                            <button
                                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                className="p-1 text-santas-gray hover:text-white transition-colors"
                            >
                                <PanelLeft size={18} />
                            </button>

                            <div className="flex items-center gap-2 px-3 py-1.5 bg-shark/40 border border-shark rounded-lg shrink-0">
                                <HardDrive size={16} className="text-[#279da6]" />
                                <span className="text-[11px] font-bold text-iron uppercase tracking-tight">Files</span>
                            </div>

                            {/* Breadcrumbs */}
                            <div className="flex items-center gap-2 text-sm ml-2 overflow-hidden">
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
                        </div>

                        <div className="flex items-center gap-4">

                            <button
                                onClick={() => setIsCreatingFolder(true)}
                                className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-santas-gray hover:text-white transition-colors group"
                            >
                                <Plus size={16} className="group-hover:text-white" />
                                <span>new</span>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} />
                        </div>

                        {/* Right side global elements */}
                        <div className="flex items-center gap-3 ml-4">
                            <div className="h-4 w-[1px] bg-shark" />
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="p-2 text-santas-gray hover:text-white rounded-lg hover:bg-shark/40 transition-all"
                            >
                                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                            </button>
                            <button className="p-2 text-santas-gray hover:text-white rounded-lg hover:bg-shark/40 transition-all relative">
                                <Bell size={18} />
                                <div className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-black" />
                            </button>
                        </div>
                    </div>

                    <main className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#18181B]">
                        <div className="p-6">
                            {/* Toolbar */}
                            <div className="flex items-center justify-between mb-6">
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
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={refreshFolder}
                                        className="p-2 bg-shark/20 border border-shark rounded-lg text-storm-gray hover:text-white transition-all shrink-0 mr-1"
                                    >
                                        <RefreshCw size={14} className={isDriveLoading ? 'animate-spin' : ''} />
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-shark hover:bg-shark/40 text-iron text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        <span>Upload File</span>
                                    </button>
                                    <button
                                        onClick={() => setIsCreatingFolder(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#279da6] text-white text-xs font-bold hover:bg-[#279da6]/90 transition-all shadow-lg hover:shadow-[#279da6]/20"
                                    >
                                        <Plus size={14} />
                                        <span>New Folder</span>
                                    </button>
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

                                    <div className={`flex items-center gap-2 transition-all duration-500 ease-out ${isCreatingFolder ? 'opacity-100 translate-x-0 delay-400' : 'opacity-0 translate-x-4'}`}>
                                        <button
                                            onClick={handleCreateFolder}
                                            className="flex items-center gap-2 px-4 py-2 bg-[#279da6] text-white rounded-xl hover:bg-[#279da6]/90 transition-all font-bold text-xs shadow-lg shadow-[#279da6]/20 active:scale-95"
                                        >
                                            <Check size={18} />
                                            <span className="hidden sm:inline">Create</span>
                                        </button>
                                        <button
                                            onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}
                                            className="p-2.5 bg-white/5 text-storm-gray rounded-xl hover:text-white hover:bg-white/10 transition-all active:scale-95"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
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
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
                                    {filteredItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="group relative flex flex-col items-center gap-4 p-6 rounded-3xl border border-shark/40 hover:border-[#279da6]/30 bg-[#09090B]/40 hover:bg-[#279da6]/5 transition-all cursor-pointer text-center overflow-hidden"
                                            onClick={() => item.isFolder ? navigateToSubfolder(item) : (setPreviewFile({ ...item, url: item.webViewLink, previewUrl: item.previewUrl, type: item.mimeType }), setIsPreviewOpen(true))}
                                        >
                                            {/* Glow Background */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                                            <div className="relative z-10 group-hover:scale-110 transition-transform duration-300">
                                                {getFileIcon(item.mimeType, item.name)}
                                            </div>

                                            <div className="relative z-10 w-full min-w-0">
                                                {isRenaming && contextMenuFile?.id === item.id ? (
                                                    <div className="flex flex-col items-center gap-2" onClick={e => e.stopPropagation()}>
                                                        <input
                                                            type="text"
                                                            value={renameValue}
                                                            onChange={e => setRenameValue(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsRenaming(false); }}
                                                            autoFocus
                                                            className="w-full bg-[#09090B] border border-[#279da6]/60 rounded-xl px-3 py-1.5 text-xs font-bold text-iron focus:outline-none text-center"
                                                        />
                                                        <div className="flex gap-1.5">
                                                            <button onClick={handleRename} className="p-1 px-3 bg-[#279da6] text-white rounded-lg text-[10px] font-black uppercase">Save</button>
                                                            <button onClick={() => setIsRenaming(false)} className="p-1 px-3 bg-shark/60 text-storm-gray rounded-lg text-[10px] font-black uppercase">Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <p className="text-[11px] font-black text-white truncate px-2 group-hover:text-[#279da6] transition-colors uppercase tracking-tight">{item.name}</p>
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="text-[9px] font-black text-storm-gray uppercase tracking-widest">{getFileTypeLabel(item.mimeType)}</span>
                                                            {dbEnrichment.clients.some(c => (c.org || c.name) === item.name) && (
                                                                <>
                                                                    <div className="w-1 h-1 rounded-full bg-cyan-500/40" />
                                                                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">CLIENT</span>
                                                                </>
                                                            )}
                                                            {dbEnrichment.requests.some(r => r.title === item.name) && (
                                                                <>
                                                                    <div className="w-1 h-1 rounded-full bg-blue-500/40" />
                                                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">REQUEST</span>
                                                                </>
                                                            )}
                                                            {!item.isFolder && item.size && (
                                                                <>
                                                                    <div className="w-1 h-1 rounded-full bg-shark" />
                                                                    <span className="text-[9px] font-black text-storm-gray uppercase tracking-widest">{formatFileSize(item.size)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Floating Actions */}
                                            <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setContextMenuFile(item); setRenameValue(item.name); setIsRenaming(true); }}
                                                    className="p-2 rounded-xl bg-shark/80 hover:bg-[#279da6]/20 text-storm-gray hover:text-[#279da6] hover:scale-110 transition-all border border-shark"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); setIsDeleting(true); }}
                                                    className="p-2 rounded-xl bg-shark/80 hover:bg-rose-500/20 text-storm-gray hover:text-rose-400 hover:scale-110 transition-all border border-shark"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                                {!item.isFolder && (
                                                    <a
                                                        href={item.webContentLink || item.webViewLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-2 rounded-xl bg-shark/80 hover:bg-white/10 text-storm-gray hover:text-white hover:scale-110 transition-all border border-shark"
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
                    </main>
                </div>
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
                                Are you sure you want to delete <span className="text-iron">"{deleteTarget.name}"</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setIsDeleting(false); setDeleteTarget(null); }}
                                    className="flex-1 px-6 py-3 rounded-2xl bg-shark/40 hover:bg-shark border border-shark text- iron text-xs font-black uppercase tracking-widest transition-all"
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
        </div >
    );
}
