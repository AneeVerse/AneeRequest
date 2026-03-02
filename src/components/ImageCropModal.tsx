'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { Area, Point } from 'react-easy-crop';
import { X, Check, RotateCcw, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

interface ImageCropModalProps {
    image: string;
    onCropComplete: (croppedImage: Blob) => void;
    onCancel: () => void;
    onRequestedChange?: () => void;
    aspect?: number;
}

export default function ImageCropModal({
    image,
    onCropComplete,
    onCancel,
    onRequestedChange,
    aspect = 1
}: ImageCropModalProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const onCropChange = (crop: Point) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteCallback = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            const timeout = setTimeout(() => {
                reject(new Error('Image load timeout'));
            }, 10000);

            image.addEventListener('load', () => {
                clearTimeout(timeout);
                resolve(image);
            });
            image.addEventListener('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: Area
    ): Promise<Blob> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No 2d context');
        }

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                resolve(blob);
            }, 'image/jpeg');
        });
    };

    const handleConfirm = async () => {
        if (!croppedAreaPixels || isProcessing) return;

        setIsProcessing(true);
        try {
            const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
            onCropComplete(croppedBlob);
        } catch (e: any) {
            console.error('Crop confirmation error:', e);
            alert(e.message || 'Failed to process image. Try a different source.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-fade-in"
                onClick={onCancel}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-lg bg-[#121214] border border-[#279da6]/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5),0_0_20px_rgba(39,157,166,0.1)] animate-zoom-in flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-shark shrink-0 bg-[#18181B]/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#279da6]/10 flex items-center justify-center text-[#279da6] ring-1 ring-[#279da6]/20">
                            <Check size={18} />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Adjust Profile Photo</h3>
                            <p className="text-[9px] font-bold text-storm-gray uppercase tracking-tight">Crop and zoom to fit the circle</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 text-storm-gray hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-h-0 bg-black/40">
                    {/* Cropper Container */}
                    <div className="relative flex-1 w-full bg-black min-h-[300px]">
                        <Cropper
                            image={image}
                            crop={crop}
                            zoom={zoom}
                            aspect={aspect}
                            onCropChange={onCropChange}
                            onCropComplete={onCropCompleteCallback}
                            onZoomChange={onZoomChange}
                            cropShape="round"
                            showGrid={false}
                        />

                        {/* Change Button - Moved to Top Right of Cropper */}
                        {onRequestedChange && (
                            <button
                                onClick={onRequestedChange}
                                disabled={isProcessing}
                                className="absolute top-4 right-4 z-[50] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#279da6] bg-black/60 hover:bg-[#279da6]/20 backdrop-blur-md rounded-xl transition-all border border-[#279da6]/30 shadow-2xl active:scale-95 disabled:opacity-50"
                            >
                                Change
                            </button>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="p-8 space-y-8 bg-[#18181B]/50 backdrop-blur-md border-t border-shark shrink-0">
                        <div className="flex items-center gap-6">
                            <ZoomOut size={16} className="text-storm-gray" />
                            <div className="flex-1 relative group py-2">
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => onZoomChange(Number(e.target.value))}
                                    className="w-full accent-[#279da6] h-1.5 bg-black rounded-full appearance-none cursor-pointer ring-1 ring-white/5"
                                />
                            </div>
                            <ZoomIn size={16} className="text-storm-gray" />
                        </div>

                        <div className="flex items-center justify-between gap-6">
                            <button
                                onClick={() => {
                                    setZoom(1);
                                    setCrop({ x: 0, y: 0 });
                                }}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-white transition-all group"
                            >
                                <RotateCcw size={14} className="group-hover:rotate-[-45deg] transition-transform" />
                                Reset
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onCancel}
                                    disabled={isProcessing}
                                    className="px-6 py-3 rounded-xl bg-white/5 text-storm-gray hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest border border-white/5 disabled:opacity-50 disabled:cursor-wait"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={isProcessing}
                                    className="px-8 py-3 rounded-xl bg-[#279da6] text-white hover:bg-[#279da6]/90 shadow-[0_10px_20px_rgba(39,157,166,0.2)] transition-all text-[10px] font-black uppercase tracking-widest active:scale-95 flex items-center gap-2 ring-1 ring-white/10 disabled:opacity-70 disabled:cursor-wait"
                                >
                                    {isProcessing ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Check size={14} />
                                    )}
                                    {isProcessing ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
