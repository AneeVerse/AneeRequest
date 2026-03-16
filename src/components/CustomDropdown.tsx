'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';

interface Option {
    label: string;
    value: string;
    icon?: React.ReactNode;
    color?: string;
    disabled?: boolean;
}

interface CustomDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    variant?: 'default' | 'status' | 'priority' | 'minimal';
    showClear?: boolean;
}

export default function CustomDropdown({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    className = '',
    disabled = false,
    variant = 'default',
    showClear = false
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, isAbove: false });
    const [mounted, setMounted] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        setMounted(true);
        const handleClickOutside = (event: MouseEvent) => {
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target as Node);
            const isOutsideMenu = menuRef.current && !menuRef.current.contains(event.target as Node);

            if (isOutsideDropdown && isOutsideMenu) {
                setIsOpen(false);
            }
        };

        const handleScroll = (event: Event) => {
            if (isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const estimatedMenuHeight = Math.min(options.length * 40 + 8, 384); // 40px per item + padding, max-h-96 (384px)

            let isAbove = false;
            let top = rect.bottom + window.scrollY;

            // If it would overflow the bottom, flip it
            if (rect.bottom + estimatedMenuHeight > viewportHeight - 20 && rect.top > estimatedMenuHeight + 20) {
                isAbove = true;
                top = rect.top + window.scrollY - estimatedMenuHeight - 16;
            }

            setCoords({
                top,
                left: rect.left + window.scrollX,
                width: rect.width,
                isAbove
            });
        }
    }, [isOpen, options.length]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const dropdownMenu = isOpen && mounted && coords.width > 0 ? createPortal(
        <div
            ref={menuRef}
            style={{
                position: 'absolute',
                top: `${coords.top + 8}px`,
                left: variant === 'minimal' ? `${coords.left + coords.width / 2}px` : `${coords.left}px`,
                width: variant === 'minimal' ? 'max-content' : `${coords.width}px`,
                minWidth: `${coords.width}px`,
                transform: variant === 'minimal' ? 'translateX(-50%)' : 'none'
            }}
            className={`z-[9999] bg-[#18181B] border border-shark rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-y-auto max-h-96 custom-scrollbar py-1 animate-in fade-in zoom-in-95 duration-200 ${coords.isAbove ? 'origin-bottom' : 'origin-top'}`}
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => handleSelect(option.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-[12px] font-black uppercase tracking-widest transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed ${value === option.value
                        ? 'bg-[#279da6]/10 text-[#279da6]'
                        : 'text-santas-gray hover:bg-white/5 hover:text-white'
                        }`}
                >
                    {option.icon && (
                        <span className={`shrink-0 flex items-center justify-center ${value === option.value ? 'text-[#279da6]' : ''}`}>
                            {React.isValidElement(option.icon) && (option.icon as any).type === 'div'
                                ? option.icon
                                : React.isValidElement(option.icon)
                                    ? React.cloneElement(option.icon as React.ReactElement, { size: 12 } as any)
                                    : option.icon
                            }
                        </span>
                    )}
                    <span className={option.color}>{option.label}</span>
                </button>
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={variant === 'minimal'
                    ? `flex items-center gap-2 group focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`
                    : `w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-black/40 border border-shark/50 rounded-xl transition-all font-black text-[12px] uppercase tracking-wider group focus:outline-none focus:border-[#279da6]/50 disabled:opacity-50 disabled:cursor-not-allowed ${isOpen ? 'border-[#279da6]/50 shadow-lg shadow-[#279da6]/5' : 'hover:border-shark-light'} ${className}`
                }
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.icon && (
                        <span className="shrink-0 flex items-center justify-center">
                            {React.isValidElement(selectedOption.icon) && (selectedOption.icon as any).type === 'div'
                                ? selectedOption.icon
                                : React.isValidElement(selectedOption.icon)
                                    ? React.cloneElement(selectedOption.icon as React.ReactElement, { size: variant === 'minimal' ? 14 : 12 } as any)
                                    : selectedOption.icon
                            }
                        </span>
                    )}
                    <span className={`${selectedOption?.color || 'text-iron'} ${variant === 'minimal' ? 'font-black text-[12px] uppercase tracking-wider' : 'font-black text-[12px] uppercase tracking-wider'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <div className="flex items-center gap-2 pr-6">
                    {(value && variant !== 'minimal' && showClear) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                            className="absolute right-9 p-1 hover:bg-shark rounded-md text-storm-gray hover:text-white transition-colors z-10"
                        >
                            <X size={12} />
                        </button>
                    )}
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        {variant !== 'minimal' && (
                            <ChevronDown
                                size={12}
                                className={`text-storm-gray group-hover:text-[#279da6] transition-all transform shrink-0 ${isOpen ? 'rotate-180 text-[#279da6]' : ''
                                    }`}
                            />
                        )}
                        {variant === 'minimal' && (
                            <ChevronDown
                                size={10}
                                className={`text-storm-gray/50 group-hover:text-[#279da6] transition-all transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                            />
                        )}
                    </div>
                </div>
            </button>

            {dropdownMenu}
        </div>
    );
}
