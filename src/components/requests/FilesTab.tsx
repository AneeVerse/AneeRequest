'use client';

import React, { useState } from 'react';
import {
    CheckCircle2,
    RefreshCw,
    Loader2,
    FolderOpen,
    Plus,
    Link as LinkIcon,
    ExternalLink,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';

interface FileItem {
    id: string;
    name: string;
    mimeType: string;
    isFolder?: boolean;
    folder: string;
    size?: number | null;
    webViewLink: string;
    previewUrl?: string | null;
}

interface FilesTabProps {
    requestFiles: FileItem[];
    isFolderLinked: boolean;
    isSuperAdmin: boolean;
    isTeamAdmin: boolean;
    setIsLinkModalOpen: (open: boolean) => void;
    fetchRequestFiles: () => void;
    isLoadingFiles: boolean;
    handleCreateFolder: () => void;
    isCreatingRequestedFolder: boolean;
    setPreviewFile: (file: any) => void;
    setIsPreviewOpen: (open: boolean) => void;
    getFileIcon: (mimeType: string) => React.ReactNode;
    formatFileSize: (bytes: number | null) => string;
    requestId?: string;
}

const FilesTab: React.FC<FilesTabProps> = ({
    requestFiles,
    isFolderLinked,
    isSuperAdmin,
    isTeamAdmin,
    setIsLinkModalOpen,
    fetchRequestFiles,
    isLoadingFiles,
    handleCreateFolder,
    isCreatingRequestedFolder,
    setPreviewFile,
    setIsPreviewOpen,
    getFileIcon,
    formatFileSize,
    requestId
}) => {
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
    const [subfolderFiles, setSubfolderFiles] = useState<FileItem[] | null>(null);
    const [isLoadingSubfolder, setIsLoadingSubfolder] = useState(false);

    const displayFiles = subfolderFiles !== null ? subfolderFiles : requestFiles;
    const isInSubfolder = breadcrumbs.length > 0;

    const navigateToFolder = async (folderId: string, folderName: string) => {
        if (!requestId) return;
        setIsLoadingSubfolder(true);
        try {
            const res = await fetch(`/api/requests/${requestId}/files?browseFolderId=${folderId}`);
            const data = await res.json();
            if (data.files) {
                setSubfolderFiles(data.files);
                setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
            }
        } catch (e) {
            console.error('Error browsing folder:', e);
        } finally {
            setIsLoadingSubfolder(false);
        }
    };

    const navigateBack = () => {
        if (breadcrumbs.length <= 1) {
            // Go back to root
            setBreadcrumbs([]);
            setSubfolderFiles(null);
        } else {
            // Go back one level — re-fetch parent folder
            const newBreadcrumbs = breadcrumbs.slice(0, -1);
            const parentFolder = newBreadcrumbs[newBreadcrumbs.length - 1];
            setBreadcrumbs(newBreadcrumbs.slice(0, -1));
            navigateToFolder(parentFolder.id, parentFolder.name);
        }
    };

    const navigateToBreadcrumb = (index: number) => {
        if (index < 0) {
            // Root
            setBreadcrumbs([]);
            setSubfolderFiles(null);
            return;
        }
        const crumb = breadcrumbs[index];
        setBreadcrumbs(breadcrumbs.slice(0, index));
        navigateToFolder(crumb.id, crumb.name);
    };

    const handleRefresh = () => {
        if (isInSubfolder && breadcrumbs.length > 0) {
            const current = breadcrumbs[breadcrumbs.length - 1];
            setBreadcrumbs(breadcrumbs.slice(0, -1));
            navigateToFolder(current.id, current.name);
        } else {
            fetchRequestFiles();
        }
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-4xl mx-auto">
                {/* Folder Sync Status */}
                {(isFolderLinked || requestFiles.length > 0) && (
                    <div className="mb-8 p-6 rounded-3xl bg-[#279da6]/5 border border-[#279da6]/20 flex items-center justify-between group overflow-hidden relative">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#279da6]/10 rounded-full blur-[40px] group-hover:bg-[#279da6]/15 transition-all duration-700" />
                        <div className="flex items-center gap-5 relative">
                            <div className="w-14 h-14 rounded-2xl bg-[#279da6]/10 border border-[#279da6]/20 flex items-center justify-center text-[#279da6] shadow-[0_0_20px_rgba(39,157,166,0.15)] group-hover:scale-105 group-hover:rotate-6 transition-all duration-500">
                                <CheckCircle2 size={28} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    Folder Synced
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                </h4>
                                <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest leading-relaxed max-w-xs">
                                    This request is linked to a Google Drive folder. All files are synchronized in real-time.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 relative">
                            {(isSuperAdmin || isTeamAdmin) && (
                                <button
                                    onClick={() => setIsLinkModalOpen(true)}
                                    className="px-5 py-2.5 rounded-xl bg-shark/40 border border-shark/60 hover:bg-shark text-storm-gray hover:text-white font-black text-[9px] uppercase tracking-widest transition-all hover:-translate-y-0.5"
                                >
                                    Change Link
                                </button>
                            )}
                            <button
                                onClick={handleRefresh}
                                className="w-10 h-10 rounded-xl bg-shark/40 border border-shark/60 hover:bg-shark text-storm-gray hover:text-[#279da6] flex items-center justify-center transition-all hover:rotate-180 duration-500"
                            >
                                <RefreshCw size={16} className={(isLoadingFiles || isLoadingSubfolder) ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Header with Breadcrumbs */}
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-[#279da6] rounded-full shadow-[0_0_10px_rgba(39,157,166,0.5)]" />
                        {isInSubfolder ? (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={navigateBack}
                                    className="p-1 text-storm-gray hover:text-white transition-colors"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                                <button
                                    onClick={() => navigateToBreadcrumb(-1)}
                                    className="text-[12px] font-black text-storm-gray uppercase tracking-widest hover:text-iron transition-colors"
                                >
                                    Root
                                </button>
                                {breadcrumbs.map((crumb, i) => (
                                    <React.Fragment key={crumb.id}>
                                        <ChevronRight size={14} className="text-storm-gray/40" />
                                        <button
                                            onClick={() => i < breadcrumbs.length - 1 ? navigateToBreadcrumb(i) : undefined}
                                            className={`text-[12px] font-black uppercase tracking-widest transition-colors truncate max-w-[150px] ${
                                                i === breadcrumbs.length - 1
                                                    ? 'text-[#279da6]'
                                                    : 'text-storm-gray hover:text-iron'
                                            }`}
                                        >
                                            {crumb.name}
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>
                        ) : (
                            <h3 className="text-sm font-black text-iron uppercase tracking-[0.2em]">Request Infrastructure</h3>
                        )}
                    </div>
                    {displayFiles.length > 0 && (
                        <span className="text-[10px] font-black text-storm-gray/40 uppercase tracking-widest">{displayFiles.length} Object(s)</span>
                    )}
                </div>

                {(isLoadingFiles || isLoadingSubfolder) && displayFiles.length === 0 ? (
                    <div className="flex items-center justify-center py-32 bg-shark/5 rounded-[40px] border border-shark/30">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 size={40} className="animate-spin text-[#279da6]" />
                            <p className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em] animate-pulse">Scanning Drive Network...</p>
                        </div>
                    </div>
                ) : !isFolderLinked && requestFiles.length === 0 && !isInSubfolder ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center bg-[#111114] border border-shark/40 rounded-[40px] relative overflow-hidden group shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#279da6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#279da6]/5 rounded-full blur-[100px]" />

                        <div className="relative">
                            <div className="w-24 h-24 rounded-[32px] bg-shark/40 border border-shark flex items-center justify-center mb-8 mx-auto group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 shadow-xl group-hover:border-[#279da6]/20">
                                <FolderOpen size={40} className="text-storm-gray/40 group-hover:text-[#279da6]/60 transition-colors" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">No Folder Linked</h3>
                            <p className="text-sm text-storm-gray mb-12 max-w-sm mx-auto font-bold leading-relaxed opacity-60">
                                Connect a localized Google Drive environment to manage this request&apos;s architectural assets directly from your command center.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto px-6">
                                {(isSuperAdmin || isTeamAdmin) && (
                                    <>
                                        <button
                                            onClick={handleCreateFolder}
                                            disabled={isCreatingRequestedFolder || isLoadingFiles}
                                            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[#279da6] text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#279da6]/90 transition-all shadow-[0_15px_30px_rgba(39,157,166,0.3)] hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                                        >
                                            {isCreatingRequestedFolder ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                            Create New Folder
                                        </button>
                                        <button
                                            onClick={() => setIsLinkModalOpen(true)}
                                            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-shark/40 border border-shark text-storm-gray hover:text-white hover:border-[#279da6]/30 hover:bg-shark text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:-translate-y-1 active:scale-95 shadow-xl"
                                        >
                                            <LinkIcon size={16} />
                                            Link Existing
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : isFolderLinked && displayFiles.length === 0 && !isInSubfolder ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center bg-[#111114] border border-shark/40 rounded-[40px] relative overflow-hidden">
                        <div className="w-20 h-20 rounded-2xl bg-[#279da6]/10 border border-[#279da6]/20 flex items-center justify-center mb-6">
                            <FolderOpen size={36} className="text-[#279da6]/60" />
                        </div>
                        <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">Folder Connected</h3>
                        <p className="text-xs text-storm-gray font-bold opacity-60 mb-6 max-w-xs">
                            The Drive folder is linked but contains no files yet. Upload files directly in Google Drive and they&apos;ll appear here.
                        </p>
                        <button
                            onClick={() => fetchRequestFiles()}
                            className="px-6 py-2.5 rounded-xl bg-shark/40 border border-shark text-storm-gray hover:text-white text-[9px] font-black uppercase tracking-widest transition-all hover:border-[#279da6]/30"
                        >
                            <RefreshCw size={12} className={`inline mr-2 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                ) : isInSubfolder && displayFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center bg-[#111114] border border-shark/40 rounded-[40px] relative overflow-hidden">
                        <div className="w-20 h-20 rounded-2xl bg-shark/20 border border-shark flex items-center justify-center mb-6">
                            <FolderOpen size={36} className="text-storm-gray/40" />
                        </div>
                        <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">Empty Folder</h3>
                        <p className="text-xs text-storm-gray font-bold opacity-60 mb-6 max-w-xs">
                            This folder has no files or subfolders.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                        {/* Show folders first, then files */}
                        {[...displayFiles].sort((a, b) => {
                            const aIsFolder = a.isFolder || a.mimeType === 'application/vnd.google-apps.folder';
                            const bIsFolder = b.isFolder || b.mimeType === 'application/vnd.google-apps.folder';
                            if (aIsFolder && !bIsFolder) return -1;
                            if (!aIsFolder && bIsFolder) return 1;
                            return 0;
                        }).map(file => {
                            const isFolder = file.isFolder || file.mimeType === 'application/vnd.google-apps.folder';
                            return (
                                <div
                                    key={file.id}
                                    onClick={() => {
                                        if (isFolder) {
                                            navigateToFolder(file.id, file.name);
                                        } else {
                                            setPreviewFile({
                                                name: file.name,
                                                url: file.webViewLink,
                                                previewUrl: file.previewUrl,
                                                type: file.mimeType
                                            });
                                            setIsPreviewOpen(true);
                                        }
                                    }}
                                    className="flex items-center gap-4 p-5 rounded-2xl bg-[#111114] border border-shark/40 hover:border-[#279da6]/40 hover:bg-[#18181b] cursor-pointer transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#279da6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="w-12 h-12 rounded-xl bg-shark/40 border border-shark flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 relative z-10">
                                        {getFileIcon(file.mimeType)}
                                    </div>
                                    <div className="flex-1 min-w-0 relative z-10">
                                        <p className="text-[13px] font-bold text-iron truncate group-hover:text-white transition-colors uppercase tracking-tight">{file.name}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="px-1.5 py-0.5 rounded bg-shark/60 border border-shark text-[8px] font-black uppercase tracking-widest text-storm-gray group-hover:text-[#279da6] group-hover:border-[#279da6]/20 transition-all">
                                                {isFolder ? 'folder' : file.folder}
                                            </span>
                                            {!isFolder && file.size && (
                                                <span className="text-[9px] font-black text-storm-gray/40 uppercase tracking-widest">{formatFileSize(file.size)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative z-10">
                                        <a
                                            href={file.webViewLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-8 h-8 rounded-lg bg-shark/40 border border-shark flex items-center justify-center text-storm-gray hover:text-[#279da6] hover:border-[#279da6]/40 transition-all opacity-0 group-hover:opacity-100"
                                            title="Open in Google Drive"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilesTab;
