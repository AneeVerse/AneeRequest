'use client';

import React from 'react';
import { X, Download, FileText, File as FileIcon, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: {
        name: string;
        url: string;
        previewUrl?: string;
        type: string;
        uploaded_by?: string;
        uploaded_at?: string;
    } | null;
}

export default function FilePreviewModal({ isOpen, onClose, file }: FilePreviewModalProps) {
    if (!isOpen || !file) return null;

    const isImage = file.type?.startsWith('image/');
    const isPdf = file.type?.includes('pdf');
    const isVideo = file.type?.startsWith('video/');

    const displayUrl = file.previewUrl || file.url;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center animate-fade-in">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-5xl max-h-[90vh] mx-4 bg-[#121214] border border-shark rounded-3xl shadow-2xl flex flex-col animate-zoom-in overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-shark bg-[#09090B]/60">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] shrink-0">
                            {isImage ? <ImageIcon size={20} /> :
                                isPdf ? <FileText size={20} /> :
                                    <FileIcon size={20} />}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[14px] font-black text-iron truncate">{file.name}</h3>
                            <div className="flex items-center gap-3 mt-0.5">
                                {file.uploaded_by && (
                                    <span className="text-[14px] font-bold text-storm-gray uppercase tracking-wider">By {file.uploaded_by}</span>
                                )}
                                {file.uploaded_at && (
                                    <span className="text-[14px] font-bold text-storm-gray">
                                        {formatDate(file.uploaded_at)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-shark/40 hover:bg-shark text-iron text-[14px] font-bold transition-all"
                        >
                            <ExternalLink size={14} />
                            <span>Open</span>
                        </a>
                        <a
                            href={file.url}
                            download={file.name}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#279da6] hover:bg-[#20838b] text-white text-[14px] font-bold transition-all shadow-lg shadow-[#279da6]/20"
                        >
                            <Download size={14} />
                            <span>Download</span>
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-shark/40 rounded-xl text-storm-gray hover:text-white transition-all ml-1"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-[#09090B]/30 min-h-[400px]">
                    {isImage ? (
                        <img
                            src={displayUrl}
                            alt={file.name}
                            className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
                        />
                    ) : isPdf ? (
                        <iframe
                            src={displayUrl}
                            className="w-full h-[70vh] rounded-xl border border-shark"
                            title={file.name}
                        />
                    ) : isVideo ? (
                        <video
                            src={displayUrl}
                            controls
                            className="max-w-full max-h-[70vh] rounded-xl shadow-2xl"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-6 text-center py-12">
                            <div className="w-24 h-24 rounded-3xl bg-shark/30 border border-shark flex items-center justify-center text-storm-gray">
                                <FileIcon size={48} />
                            </div>
                            <div>
                                <p className="text-[14px] font-black text-iron mb-1">{file.name}</p>
                                <p className="text-[14px] text-storm-gray font-bold uppercase tracking-wider mb-6">
                                    {file.type || 'Unknown file type'}
                                </p>
                                <a
                                    href={file.url}
                                    download={file.name}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#279da6] hover:bg-[#20838b] text-white font-bold text-[14px] transition-all shadow-lg shadow-[#279da6]/20"
                                >
                                    <Download size={16} />
                                    Download File
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
