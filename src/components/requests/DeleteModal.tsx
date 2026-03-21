'use client';

import React from 'react';
import { Trash2, AlertCircle, Loader2 } from 'lucide-react';

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    requestTitle?: string;
    handleDeleteRequest: () => void;
    isDeleting: boolean;
    deleteError: string | null;
    setDeleteError: (error: string | null) => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
    isOpen,
    onClose,
    requestTitle,
    handleDeleteRequest,
    isDeleting,
    deleteError,
    setDeleteError
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="bg-[#18181B] border border-rose-500/20 rounded-[32px] p-8 max-w-md w-full shadow-[0_0_50px_rgba(244,63,94,0.15)] animate-slide-up relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-[80px]" />
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 mx-auto">
                        <Trash2 size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white text-center uppercase tracking-tight mb-3">Delete Request?</h2>
                    <p className="text-storm-gray text-center text-sm leading-relaxed mb-8">
                        You are about to permanently delete <span className="text-white font-bold">"{requestTitle}"</span>. This action will remove all messages and attachments associated with this request. This cannot be undone.
                    </p>
                    {deleteError && (
                        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-xs font-bold animate-shake">
                            <AlertCircle size={16} />
                            {deleteError}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => {
                                onClose();
                                setDeleteError(null);
                            }}
                            disabled={isDeleting}
                            className="py-4 rounded-2xl bg-shark/40 border border-shark hover:bg-shark/60 text-iron font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteRequest}
                            disabled={isDeleting}
                            className="py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Confirm Delete'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteModal;
