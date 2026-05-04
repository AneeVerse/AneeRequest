'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Camera, Loader2, X, Trash2, Link2, Upload, Globe } from 'lucide-react';
import dynamic from 'next/dynamic';
const ImageCropModal = dynamic(() => import('./ImageCropModal'), { ssr: false });

interface AvatarUploadProps {
    currentAvatarUrl?: string | null;
    onUploadSuccess: (url: string) => void;
    onRemove: () => void;
    name?: string;
    email?: string;
}

export default function AvatarUpload({
    currentAvatarUrl,
    onUploadSuccess,
    onRemove,
    name,
    email
}: AvatarUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isFetchingLogo, setIsFetchingLogo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cropImage, setCropImage] = useState<string | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkValue, setLinkValue] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLinkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkValue.trim()) return;

        setIsFetchingLogo(true);
        setError(null);
        setShowLinkInput(false);

        try {
            const res = await fetch('/api/fetch-logo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: linkValue }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch logo');

            setCropImage(data.imageUrl);
            setLinkValue('');
        } catch (err: any) {
            console.error('Logo fetch error:', err);
            setError(err.message || 'Could not find a logo for this URL');
        } finally {
            setIsFetchingLogo(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setCropImage(reader.result as string);
        });
        reader.readAsDataURL(file);
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setCropImage(null);
        setIsUploading(true);
        setError(null);

        try {
            const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            onUploadSuccess(data.url);
        } catch (err: any) {
            console.error('Avatar upload error:', err);
            setError(err.message || 'Failed to upload');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const initials = name
        ? name.split(' ').map(n => n[0]).join('').toUpperCase()
        : email ? email[0].toUpperCase() : 'U';

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div
                    onClick={() => {
                        if (isUploading || isFetchingLogo) return;
                        if (currentAvatarUrl) {
                            setCropImage(currentAvatarUrl);
                        } else {
                            setShowMenu(true);
                        }
                    }}
                    className={`w-24 h-24 rounded-full bg-shark flex items-center justify-center text-3xl font-black text-white bg-gradient-to-br from-[#279da6]/40 via-[#279da6]/10 to-transparent ring-4 ring-shark/50 shadow-2xl relative cursor-pointer overflow-hidden transition-all hover:ring-[#279da6]/30 ${isUploading || isFetchingLogo ? 'cursor-wait' : ''}`}
                >
                    {currentAvatarUrl ? (
                        <Image
                            src={currentAvatarUrl}
                            alt="Avatar"
                            fill
                            unoptimized
                            className="object-cover"
                        />
                    ) : (
                        <span>{initials}</span>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                        {isUploading || isFetchingLogo ? (
                            <Loader2 size={20} className="text-[#279da6] animate-spin" />
                        ) : (
                            <>
                                <Camera size={20} className="text-white" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-white">
                                    {currentAvatarUrl ? 'Change' : 'Upload'}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Source Selection & Link Input Popup (Portal) */}
                {(showMenu || showLinkInput) && createPortal(
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
                            onClick={() => {
                                setShowMenu(false);
                                setShowLinkInput(false);
                            }}
                        />

                        {/* Modal Container */}
                        <div className="relative w-full max-w-sm bg-[#101011] border border-[#279da6]/30 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5),0_0_20px_rgba(39,157,166,0.1)] animate-zoom-in">
                            {showMenu && !showLinkInput && (
                                <div className="flex flex-col p-8 gap-4">
                                    <h3 className="text-center text-xs font-black text-white uppercase tracking-[0.2em] mb-2">Select Image Source</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowLinkInput(true);
                                                setShowMenu(false);
                                            }}
                                            className="flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-[#1A1A1E] border border-white/5 hover:border-[#279da6]/50 hover:bg-[#279da6]/10 transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] group-hover:scale-110 transition-transform">
                                                <Link2 size={24} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-iron">Paste Link</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                                setShowMenu(false);
                                            }}
                                            className="flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-[#1A1A1E] border border-white/5 hover:border-[#279da6]/50 hover:bg-[#279da6]/10 transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] group-hover:scale-110 transition-transform">
                                                <Upload size={24} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-iron">Upload File</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowMenu(false)}
                                        className="mt-2 py-3 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {showLinkInput && (
                                <div className="p-8 space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Enter Website URL</h3>
                                        <button
                                            onClick={() => setShowLinkInput(false)}
                                            className="text-storm-gray hover:text-white transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <form
                                        onSubmit={handleLinkSubmit}
                                        className="space-y-4"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="relative">
                                            <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#279da6]" />
                                            <input
                                                autoFocus
                                                type="url"
                                                placeholder="e.g. google.com"
                                                value={linkValue}
                                                onChange={(e) => setLinkValue(e.target.value)}
                                                className="w-full bg-[#1A1A1E] border border-[#279da6]/50 rounded-2xl py-4 pl-12 pr-4 text-xs text-white focus:outline-none focus:border-[#279da6] focus:ring-4 focus:ring-[#279da6]/10 placeholder:text-storm-gray transition-all shadow-inner"
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowLinkInput(false);
                                                    setShowMenu(true);
                                                }}
                                                className="flex-1 py-4 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-white border border-white/5 transition-all"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="submit"
                                                className="flex-[2] py-4 rounded-2xl bg-[#279da6] text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-[#279da6]/20 hover:bg-[#279da6]/90 active:scale-95 transition-all ring-1 ring-white/10"
                                            >
                                                Fetch Logo
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}

                {currentAvatarUrl && !isUploading && !isFetchingLogo && !showMenu && !showLinkInput && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="absolute -top-1 -right-1 w-7 h-7 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#18181B] transition-all active:scale-95 z-30"
                        title="Remove photo"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
            />

            {error && (
                <div className="flex flex-col items-center gap-1">
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="text-[8px] font-black uppercase tracking-widest text-storm-gray hover:text-iron"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {cropImage && (
                <ImageCropModal
                    image={cropImage}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setCropImage(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    onRequestedChange={() => {
                        setCropImage(null);
                        setShowMenu(true);
                    }}
                />
            )}
        </div>
    );
}
