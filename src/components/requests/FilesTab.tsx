'use client';

import React from 'react';
import {
    CheckCircle2,
    RefreshCw,
    Loader2,
    FolderOpen,
    Plus,
    Link as LinkIcon,
    ExternalLink
} from 'lucide-react';

interface FileItem {
    id: string;
    name: string;
    mimeType: string;
    folder: string;
    size?: number | null;
    webViewLink: string;
    previewUrl?: string | null;
}

interface FilesTabProps {
    requestFiles: FileItem[];
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
}

const FilesTab: React.FC<FilesTabProps> = ({
    requestFiles,
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
    formatFileSize
}) => {
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-4xl mx-auto">
                {/* Folder Sync Status */}
                {requestFiles.length > 0 && (
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
                                onClick={fetchRequestFiles}
                                className="w-10 h-10 rounded-xl bg-shark/40 border border-shark/60 hover:bg-shark text-storm-gray hover:text-[#279da6] flex items-center justify-center transition-all hover:rotate-180 duration-500"
                            >
                                <RefreshCw size={16} className={isLoadingFiles ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-[#279da6] rounded-full shadow-[0_0_10px_rgba(39,157,166,0.5)]" />
                        <h3 className="text-sm font-black text-iron uppercase tracking-[0.2em]">Request Infrastructure</h3>
                    </div>
                    {requestFiles.length > 0 && (
                        <span className="text-[10px] font-black text-storm-gray/40 uppercase tracking-widest">{requestFiles.length} Object(s)</span>
                    )}
                </div>

                {isLoadingFiles ? (
                    <div className="flex items-center justify-center py-32 bg-shark/5 rounded-[40px] border border-shark/30">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 size={40} className="animate-spin text-[#279da6]" />
                            <p className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em] animate-pulse">Scanning Drive Network...</p>
                        </div>
                    </div>
                ) : requestFiles.length === 0 ? (
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
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                        {requestFiles.map(file => (
                            <div
                                key={file.id}
                                onClick={() => {
                                    setPreviewFile({
                                        name: file.name,
                                        url: file.webViewLink,
                                        previewUrl: file.previewUrl,
                                        type: file.mimeType
                                    });
                                    setIsPreviewOpen(true);
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
                                        <span className="px-1.5 py-0.5 rounded bg-shark/60 border border-shark text-[8px] font-black uppercase tracking-widest text-storm-gray group-hover:text-[#279da6] group-hover:border-[#279da6]/20 transition-all">{file.folder}</span>
                                        {file.size && (
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
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilesTab;
