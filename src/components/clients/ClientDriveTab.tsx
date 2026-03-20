'use client';

import React from 'react';
import {
    HardDrive, FolderOpen, FolderPlus, Loader2, AlertCircle, Search,
    LayoutGrid, List as ListIcon, MoreVertical, Pencil, Download,
    Trash2, FileText, Table, Presentation, ClipboardList, ImageIcon,
    Film, FileIcon, CheckCircle2, ChevronRight, ChevronLeft, RefreshCw,
    FileUp, Link2, X
} from 'lucide-react';

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

interface ClientDriveTabProps {
    isDriveBrowsing: boolean;
    isDriveLoading: boolean;
    driveItems: DriveItem[];
    searchQuery: string;
    filterType: string;
    viewMode: 'grid' | 'list';
    discoveredFolder: any;
    isDiscovering: boolean;
    isSavingFolder: boolean;
    handleAutoLinkFolder: (id: string) => void;
    handleCreateClientFolder: () => void;
    setActiveTab: (tab: string) => void;
    browseDriveFolder: (id: string, name: string) => void;
    navigateToDriveSubfolder: (item: DriveItem) => void;
    getDriveFileIcon: (mimeType: string, itemName?: string, iconSize?: number) => React.ReactNode;
    getDriveFileTypeLabel: (mimeType: string) => string;
    formatFileSize: (bytes: number | null) => string;
    driveContextItem: DriveItem | null;
    setDriveContextItem: (item: DriveItem | null) => void;
    driveContextPos: { x: number; y: number };
    setDriveContextPos: (pos: { x: number; y: number }) => void;
    isDriveRenaming: boolean;
    setIsDriveRenaming: (val: boolean) => void;
    driveRenameValue: string;
    setDriveRenameValue: (val: string) => void;
    handleDriveRename: () => void;
    isDriveDeleting: boolean;
    setIsDriveDeleting: (val: boolean) => void;
    driveDeleteTarget: DriveItem | null;
    setDriveDeleteTarget: (item: DriveItem | null) => void;
    handleDriveDelete: () => void;
    client: any;
    setPreviewFile: (item: DriveItem) => void;
    setIsPreviewOpen: (val: boolean) => void;
    folderStatus: any;
    allClients?: any[];
    setSearchQuery: (query: string) => void;
}

export default function ClientDriveTab({
    isDriveBrowsing,
    isDriveLoading,
    driveItems,
    searchQuery,
    filterType,
    viewMode,
    discoveredFolder,
    isDiscovering,
    isSavingFolder,
    handleAutoLinkFolder,
    handleCreateClientFolder,
    setActiveTab,
    browseDriveFolder,
    navigateToDriveSubfolder,
    getDriveFileIcon,
    getDriveFileTypeLabel,
    formatFileSize,
    driveContextItem,
    setDriveContextItem,
    driveContextPos,
    setDriveContextPos,
    isDriveRenaming,
    setIsDriveRenaming,
    driveRenameValue,
    setDriveRenameValue,
    handleDriveRename,
    isDriveDeleting,
    setIsDriveDeleting,
    driveDeleteTarget,
    setDriveDeleteTarget,
    handleDriveDelete,
    client,
    setPreviewFile,
    setIsPreviewOpen,
    folderStatus,
    allClients = [],
    setSearchQuery
}: ClientDriveTabProps) {

    const filteredDriveItems = driveItems.filter(item => {
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

    // Helper to check for client folder
    const isClientFolder = (name: string) => {
        return allClients.some(c => (c.org || c.name) === name);
    };

    return (
        <div className="animate-fade-in space-y-6 flex flex-col h-full min-h-[500px]">
            {/* No Drive Linked - Empty State */}
            {!isDriveBrowsing && !isDriveLoading && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#18181B] border border-shark rounded-3xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#279da6]/5 rounded-full blur-[100px] group-hover:bg-[#279da6]/10 transition-all duration-700" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#279da6]/5 rounded-full blur-[100px] group-hover:bg-[#279da6]/10 transition-all duration-700 delay-150" />

                    <div className="relative flex flex-col items-center text-center max-w-sm">
                        <div className="w-24 h-24 rounded-[32px] bg-[#279da6]/10 border border-[#279da6]/20 flex items-center justify-center text-[#279da6] mb-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-[0_0_30px_rgba(39,157,166,0.1)]">
                            <HardDrive size={40} />
                        </div>

                        <h2 className="text-2xl font-black text-white tracking-tight uppercase mb-4">No Drive Linked</h2>

                        {discoveredFolder ? (
                            <div className="mb-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <p className="text-storm-gray text-[10px] font-black leading-relaxed mb-4 uppercase tracking-[0.2em] opacity-80">
                                    Found a matching folder in Drive:
                                </p>
                                <div className="p-4 bg-[#279da6]/5 border border-[#279da6]/20 rounded-2xl flex items-center justify-between group/suggest hover:bg-[#279da6]/10 transition-all">
                                    <div className="flex items-center gap-3">
                                        <FolderOpen size={20} className="text-[#279da6]" />
                                        <div className="text-left">
                                            <p className="text-xs font-black text-white uppercase tracking-tight">{discoveredFolder.name}</p>
                                            <p className="text-[10px] text-storm-gray font-bold">Matching Organization Name</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAutoLinkFolder(discoveredFolder.id)}
                                        disabled={isSavingFolder}
                                        className="px-4 py-2 bg-[#279da6] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {isSavingFolder ? <Loader2 size={12} className="animate-spin" /> : 'Link Now'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-storm-gray text-sm font-bold leading-relaxed mb-10 uppercase tracking-widest opacity-60">
                                {isDiscovering ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 size={14} className="animate-spin" /> Checking Google Drive...
                                    </span>
                                ) : (
                                    `Connect a Google Drive folder to manage ${client?.name || 'this client'}'s project files directly from this dashboard.`
                                )}
                            </p>
                        )}

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

            {/* Loading State */}
            {isDriveLoading && (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-[#279da6] mb-4" />
                    <p className="text-storm-gray text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Syncing Drive Infrastructure...</p>
                </div>
            )}

            {/* Drive Items Display */}
            {isDriveBrowsing && !isDriveLoading && (
                <div className="flex-1 animate-fade-in px-1">
                    <div className="flex-1 custom-scrollbar">
                        {filteredDriveItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-shark/40 flex items-center justify-center text-storm-gray mb-4 border border-shark opacity-40">
                                    <Search size={24} />
                                </div>
                                <p className="text-xs font-bold text-storm-gray uppercase tracking-widest">No matching items found</p>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                {/* Inline Search Heading */}
                                <div className="flex items-center justify-between gap-4 mb-8 px-1">
                                    <div className="relative flex items-center gap-3">
                                        <div className="relative group flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="FOLDERS"
                                                className="bg-transparent border-none p-0 text-[14px] font-black text-white placeholder:text-storm-gray uppercase tracking-[0.2em] focus:outline-none min-w-[120px] transition-all"
                                                style={{ width: searchQuery ? `${Math.max(searchQuery.length + 2, 8)}ch` : '120px' }}
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="p-1 hover:bg-white/5 rounded-full text-storm-gray hover:text-white transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                        {searchQuery && (
                                            <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-[#279da6]/10 border border-[#279da6]/20 animate-fade-in">
                                                <span className="text-[10px] font-bold text-[#279da6] uppercase tracking-tight">Searching</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {viewMode === 'grid' ? (
                                    <div className="space-y-12">
                                        {/* Folders Section */}
                                        {filteredDriveItems.some(item => item.isFolder) && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                                    {filteredDriveItems.filter(item => item.isFolder).map((item) => (
                                                        <div
                                                            key={item.id}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                setDriveContextItem(item);
                                                                setDriveContextPos({ x: e.clientX, y: e.clientY });
                                                            }}
                                                            className="group relative flex items-center gap-3 p-3 rounded-2xl border border-shark/30 bg-[#09090B]/30 hover:bg-[#279da6]/5 hover:border-[#279da6]/40 transition-all cursor-pointer overflow-hidden"
                                                            onClick={() => navigateToDriveSubfolder(item)}
                                                        >
                                                            <div className="shrink-0 group-hover:scale-110 transition-transform duration-500">
                                                                {getDriveFileIcon(item.mimeType, item.name, 20)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[12px] font-bold text-iron truncate uppercase tracking-tight group-hover:text-[#279da6] transition-colors">{item.name}</p>
                                                                {isClientFolder(item.name) && (
                                                                    <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest block mt-0.5">CLIENT</span>
                                                                )}
                                                            </div>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDriveContextItem(item);
                                                                    setDriveContextPos({ x: e.clientX, y: e.clientY });
                                                                }}
                                                                className="p-1 px-2 opacity-0 group-hover:opacity-100 text-storm-gray hover:text-white transition-all rounded-lg hover:bg-white/5"
                                                            >
                                                                <MoreVertical size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Files Section */}
                                        {filteredDriveItems.some(item => !item.isFolder) && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                                                    {filteredDriveItems.filter(item => !item.isFolder).map((item) => (
                                                        <div
                                                            key={item.id}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                setDriveContextItem(item);
                                                                setDriveContextPos({ x: e.clientX, y: e.clientY });
                                                            }}
                                                            className="group relative flex flex-col rounded-3xl border border-shark/40 bg-[#09090B]/40 hover:bg-[#279da6]/5 hover:border-[#279da6]/30 transition-all cursor-pointer overflow-hidden aspect-[4/5]"
                                                            onClick={() => (setPreviewFile(item), setIsPreviewOpen(true))}
                                                        >
                                                            {/* Preview Area */}
                                                            <div className="flex-1 bg-shark/20 flex items-center justify-center relative overflow-hidden">
                                                                <div className="transition-transform duration-500 group-hover:scale-110 opacity-40 group-hover:opacity-80">
                                                                    {getDriveFileIcon(item.mimeType, item.name, 48)}
                                                                </div>
                                                                {/* File Type Badge Overlay */}
                                                                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#09090B]/60 backdrop-blur-md border border-shark/40">
                                                                    <div className="scale-75 origin-left">
                                                                        {getDriveFileIcon(item.mimeType, item.name, 12)}
                                                                    </div>
                                                                    <span className="text-[12px] font-black text-storm-gray uppercase tracking-[0.1em]">{getDriveFileTypeLabel(item.mimeType)}</span>
                                                                </div>
                                                            </div>

                                                            {/* Footer Info */}
                                                            <div className="p-4 bg-[#111114]/80 backdrop-blur-sm border-t border-shark/40">
                                                                <p className="text-[12px] font-bold text-iron truncate uppercase tracking-tight group-hover:text-[#279da6] transition-colors mb-1">{item.name}</p>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[12px] font-black text-storm-gray uppercase tracking-widest">{item.size ? formatFileSize(item.size) : '--'}</span>
                                                                    {isClientFolder(item.name) && (
                                                                        <span className="text-[12px] font-black text-cyan-400 uppercase tracking-widest">CLIENT</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDriveContextItem(item);
                                                                    setDriveContextPos({ x: e.clientX, y: e.clientY });
                                                                }}
                                                                className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 text-storm-gray hover:text-white transition-all rounded-lg hover:bg-white/5"
                                                            >
                                                                <MoreVertical size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* List View */
                                    <div className="space-y-2 sm:space-y-1">
                                        {/* Desktop Header - Hidden on Mobile */}
                                        <div className="hidden sm:flex items-center px-4 py-2.5 bg-white/5 border border-shark/40 rounded-xl text-[12px] font-black text-storm-gray uppercase tracking-widest mb-1">
                                            <div className="flex-1">NAME</div>
                                            <div className="w-32 hidden md:block">TYPE</div>
                                            <div className="w-24 hidden sm:block">SIZE</div>
                                            <div className="w-32 text-right">ACTIONS</div>
                                        </div>

                                        {filteredDriveItems.map((item) => (
                                            <div key={item.id}>
                                                {/* Mobile Card View */}
                                                <div
                                                    onClick={() => item.isFolder ? navigateToDriveSubfolder(item) : (setPreviewFile(item), setIsPreviewOpen(true))}
                                                    className="sm:hidden flex flex-col p-4 bg-[#18181B] border border-shark/40 rounded-2xl gap-3 active:scale-[0.98] transition-all mb-2"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="shrink-0 scale-90">
                                                                {getDriveFileIcon(item.mimeType, item.name)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-black text-iron truncate uppercase tracking-tight">{item.name}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    {isClientFolder(item.name) && (
                                                                        <>
                                                                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">CLIENT</span>
                                                                            <span className="w-1 h-1 rounded-full bg-shark" />
                                                                        </>
                                                                    )}
                                                                    <span className="text-[12px] font-black text-storm-gray uppercase tracking-widest">{getDriveFileTypeLabel(item.mimeType)}</span>
                                                                    <span className="w-1 h-1 rounded-full bg-shark" />
                                                                    <span className="text-[12px] font-black text-storm-gray uppercase tracking-widest">{!item.isFolder && item.size ? formatFileSize(item.size) : '--'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-shark/30">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDriveRenameValue(item.name);
                                                                setDriveContextItem(item);
                                                                setIsDriveRenaming(true);
                                                            }}
                                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-shark/40 border border-shark/60 text-[10px] font-black text-iron uppercase tracking-widest"
                                                        >
                                                            <Pencil size={18} className="text-[#279da6]" />
                                                            Rename
                                                        </button>
                                                        {!item.isFolder && item.webContentLink && (
                                                            <a
                                                                href={item.webContentLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-shark/40 border border-shark/60 text-[12px] font-black text-iron uppercase tracking-widest"
                                                            >
                                                                <Download size={12} />
                                                                Get
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDriveContextItem(item);
                                                                setDriveContextPos({ x: e.clientX, y: e.clientY });
                                                            }}
                                                            className="p-2 rounded-xl border border-shark/60 bg-shark/40 text-storm-gray hover:text-[#279da6] transition-all"
                                                        >
                                                            <MoreVertical size={18} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Desktop List Row - Hidden on Mobile */}
                                                <div
                                                    onClick={() => item.isFolder ? navigateToDriveSubfolder(item) : (setPreviewFile(item), setIsPreviewOpen(true))}
                                                    className="hidden sm:flex items-center px-4 py-2.5 bg-[#18181B]/40 hover:bg-white/5 border border-shark/40 hover:border-shark transition-all cursor-pointer group rounded-xl mb-1"
                                                >
                                                    <div className="flex-1 flex items-center gap-3 min-w-0">
                                                        <div className="shrink-0 scale-75 origin-left">
                                                            {getDriveFileIcon(item.mimeType, item.name)}
                                                        </div>
                                                        <p className="text-xs font-black text-iron truncate uppercase tracking-tight group-hover:text-[#279da6] transition-colors">{item.name}</p>
                                                        {isClientFolder(item.name) && (
                                                            <span className="text-[12px] font-black bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20 uppercase">CLIENT</span>
                                                        )}
                                                    </div>
                                                    <div className="w-32 hidden md:block">
                                                        <span className="text-[12px] font-black text-storm-gray uppercase tracking-widest">{getDriveFileTypeLabel(item.mimeType)}</span>
                                                    </div>
                                                    <div className="w-24 hidden sm:block">
                                                        <span className="text-[12px] font-black text-storm-gray uppercase tracking-widest">{!item.isFolder && item.size ? formatFileSize(item.size) : '--'}</span>
                                                    </div>
                                                    <div className="w-32 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDriveRenameValue(item.name);
                                                                setDriveContextItem(item);
                                                                setIsDriveRenaming(true);
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-[#279da6]/20 text-storm-gray hover:text-[#279da6] transition-all"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        {!item.isFolder && item.webContentLink && (
                                                            <a
                                                                href={item.webContentLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-1.5 rounded-lg hover:bg-white/10 text-storm-gray hover:text-white transition-all"
                                                            >
                                                                <Download size={14} />
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDriveContextItem(item);
                                                                setDriveContextPos({ x: e.clientX, y: e.clientY });
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-white/5 text-storm-gray hover:text-white transition-all"
                                                        >
                                                            <MoreVertical size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isDriveRenaming && driveContextItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#18181B] border border-shark w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative animate-zoom-in">
                        <div className="p-6">
                            <h3 className="text-sm font-black text-iron uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Pencil size={14} className="text-[#279da6]" /> Rename Item
                            </h3>
                            <input
                                autoFocus
                                type="text"
                                value={driveRenameValue}
                                onChange={(e) => setDriveRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleDriveRename();
                                    if (e.key === 'Escape') setIsDriveRenaming(false);
                                }}
                                className="w-full bg-shark/40 border border-shark rounded-xl px-4 py-3 text-xs text-iron focus:outline-none focus:border-[#279da6] transition-all font-bold"
                            />
                        </div>
                        <div className="px-6 py-4 bg-shark/20 flex justify-end gap-3">
                            <button onClick={() => setIsDriveRenaming(false)} className="px-4 py-2 text-[10px] font-black text-storm-gray hover:text-white uppercase tracking-widest">Cancel</button>
                            <button onClick={handleDriveRename} className="px-6 py-2 bg-[#279da6] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Rename</button>
                        </div>
                    </div>
                </div>
            )}

            {isDriveDeleting && driveDeleteTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#18181B] border border-shark w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative animate-zoom-in">
                        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-sm font-black text-iron uppercase tracking-widest mb-2">Delete {driveDeleteTarget.isFolder ? 'Folder' : 'File'}</h3>
                        <p className="text-xs text-storm-gray mb-6 font-bold leading-relaxed">
                            Are you sure you want to delete <span className="text-white">"{driveDeleteTarget.name}"</span>?
                            {driveDeleteTarget.isFolder && ' All contents inside will also be deleted.'}
                        </p>
                        <div className="flex justify-end gap-3 font-bold">
                            <button onClick={() => setIsDriveDeleting(false)} className="px-4 py-2 text-[10px] text-storm-gray hover:text-white transition-all uppercase tracking-widest">Cancel</button>
                            <button onClick={handleDriveDelete} className="px-6 py-2 bg-rose-500 text-white rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-rose-500/20 active:scale-95 transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {driveContextItem && !isDriveRenaming && !isDriveDeleting && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setDriveContextItem(null)} />
                    <div
                        className="fixed z-50 bg-[#18181B] border border-shark/60 rounded-xl shadow-2xl py-1 w-44 animate-zoom-in"
                        style={{ left: driveContextPos.x, top: driveContextPos.y }}
                    >
                        <button
                            onClick={() => { setDriveRenameValue(driveContextItem.name); setIsDriveRenaming(true); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-iron hover:bg-white/5 transition-all text-left"
                        >
                            <Pencil size={14} className="text-[#279da6]" /> Rename
                        </button>
                        {!driveContextItem.isFolder && (
                            <button
                                onClick={() => { window.open(driveContextItem.webContentLink || driveContextItem.webViewLink, '_blank'); setDriveContextItem(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-iron hover:bg-white/5 transition-all text-left"
                            >
                                <Download size={14} className="text-[#279da6]" /> Download
                            </button>
                        )}
                        <div className="h-[1px] bg-shark/40 my-1" />
                        <button
                            onClick={() => { setDriveDeleteTarget(driveContextItem); setIsDriveDeleting(true); setDriveContextItem(null); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-black text-rose-400 hover:bg-rose-500/10 transition-all text-left uppercase tracking-tighter"
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
