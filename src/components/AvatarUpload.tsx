'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, Loader2, X, Trash2 } from 'lucide-react';

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
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
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
        }
    };

    const initials = name
        ? name.split(' ').map(n => n[0]).join('').toUpperCase()
        : email ? email[0].toUpperCase() : 'U';

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={`w-24 h-24 rounded-full bg-shark flex items-center justify-center text-3xl font-black text-white bg-gradient-to-br from-[#279da6]/40 via-[#279da6]/10 to-transparent ring-4 ring-shark/50 shadow-2xl relative cursor-pointer overflow-hidden transition-all hover:ring-[#279da6]/30 ${isUploading ? 'cursor-wait' : ''}`}
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
                        {isUploading ? (
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

                {currentAvatarUrl && !isUploading && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="absolute -top-1 -right-1 w-7 h-7 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#18181B] transition-all active:scale-95"
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
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">{error}</p>
            )}
        </div>
    );
}
