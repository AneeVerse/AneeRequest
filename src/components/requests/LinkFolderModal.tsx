'use client';

import React from 'react';
import { Link as LinkIcon, Search, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface LinkFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    linkFolderInput: string;
    setLinkFolderInput: (value: string) => void;
    handleLinkFolder: () => void;
    isValidatingLink: boolean;
    linkFolderError: string | null;
    setLinkFolderError: (error: string | null) => void;
}

const LinkFolderModal: React.FC<LinkFolderModalProps> = ({
    isOpen,
    onClose,
    linkFolderInput,
    setLinkFolderInput,
    handleLinkFolder,
    isValidatingLink,
    linkFolderError,
    setLinkFolderError
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#18181B] border border-shark w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative animate-zoom-in">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#279da6] to-transparent opacity-50" />
                <div className="p-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#279da6]/10 border border-[#279da6]/20 flex items-center justify-center text-[#279da6] mb-6 shadow-lg">
                        <LinkIcon size={32} />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Connect Folder</h3>
                    <p className="text-xs text-storm-gray mb-8 font-bold leading-relaxed">
                        Paste a Google Drive folder URL or ID below to link this request to an existing environment.
                    </p>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Drive URL or Folder ID</label>
                            <div className="relative group">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                <input
                                    autoFocus
                                    type="text"
                                    value={linkFolderInput}
                                    onChange={(e) => setLinkFolderInput(e.target.value)}
                                    placeholder="https://drive.google.com/drive/folders/..."
                                    className="w-full bg-shark/30 border border-shark rounded-xl pl-11 pr-4 py-4 text-xs text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold placeholder:text-storm-gray/40 shadow-inner"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && linkFolderInput.trim()) handleLinkFolder();
                                        if (e.key === 'Escape') onClose();
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {linkFolderError && (
                        <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-tight flex items-center gap-3 animate-shake">
                            <AlertCircle size={14} />
                            {linkFolderError}
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 bg-shark/20 border-t border-shark flex items-center justify-end gap-3">
                    <button
                        onClick={() => {
                            onClose();
                            setLinkFolderInput('');
                            setLinkFolderError(null);
                        }}
                        className="px-5 py-2 text-[10px] font-black text-storm-gray hover:text-white uppercase tracking-[0.2em] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleLinkFolder}
                        disabled={isValidatingLink || !linkFolderInput.trim()}
                        className="px-8 py-3 bg-[#279da6] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#279da6]/20 hover:bg-[#279da6]/90 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {isValidatingLink ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Link Folder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LinkFolderModal;
