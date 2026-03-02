'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';

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
    variant?: 'default' | 'status' | 'priority';
    showSearch?: boolean;
}

export default function CustomDropdown({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    className = '',
    disabled = false,
    variant = 'default',
    showSearch = false
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
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
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = Math.min(240, options.length * 36 + (showSearch ? 40 : 0)); // Estimated height

            let top = rect.bottom + window.scrollY;
            if (spaceBelow < menuHeight && rect.top > menuHeight) {
                top = rect.top + window.scrollY - menuHeight - 5;
            }

            setCoords({
                top: top,
                left: rect.left + window.scrollX,
                width: rect.width
            });
            setSearchQuery('');
            // Focus search input after a short delay for animation
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const filteredOptions = showSearch
        ? options.filter(opt =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            opt.value.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : options;

    const dropdownMenu = isOpen && mounted && coords.width > 0 ? createPortal(
        <div
            ref={menuRef}
            style={{
                position: 'absolute',
                top: `${coords.top + 8}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`
            }}
            className="z-[9999] bg-[#18181B] border border-shark rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200 origin-top flex flex-col"
        >
            {showSearch && (
                <div className="px-2 py-1.5 border-b border-shark mb-1">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-storm-gray" size={12} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full bg-black/40 border border-shark/50 rounded-md py-1.5 pl-8 pr-2.5 text-[10px] text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/30 transition-all font-bold"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && filteredOptions.length > 0) {
                                    handleSelect(filteredOptions[0].value);
                                }
                            }}
                        />
                    </div>
                </div>
            )}
            <div className="overflow-y-auto max-h-[240px] custom-scrollbar">
                {filteredOptions.length === 0 ? (
                    <div className="px-3 py-4 text-center text-[10px] font-bold text-storm-gray uppercase tracking-widest opacity-40">
                        No results found
                    </div>
                ) : (
                    filteredOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            disabled={option.disabled}
                            onClick={() => handleSelect(option.value)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed ${value === option.value
                                ? 'bg-[#279da6]/10 text-[#279da6]'
                                : 'text-santas-gray hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            {option.icon && React.isValidElement(option.icon) && (
                                <span className={`shrink-0 ${value === option.value ? 'text-[#279da6]' : ''}`}>
                                    {React.cloneElement(option.icon as React.ReactElement, { size: 12 } as any)}
                                </span>
                            )}
                            <span className={`truncate ${option.color}`}>{option.label}</span>
                        </button>
                    ))
                )}
            </div>
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
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-black/40 border border-shark rounded-lg transition-all font-black text-[10px] uppercase tracking-wider group focus:outline-none focus:border-[#279da6]/50 disabled:opacity-50 disabled:cursor-not-allowed ${isOpen ? 'border-[#279da6]/50 shadow-lg shadow-[#279da6]/5' : 'hover:border-shark-light'
                    }`}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.icon && React.isValidElement(selectedOption.icon) && (
                        <span className="shrink-0">
                            {React.cloneElement(selectedOption.icon as React.ReactElement, { size: 12 } as any)}
                        </span>
                    )}
                    <span className={selectedOption?.color || 'text-iron'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown
                    size={12}
                    className={`text-storm-gray group-hover:text-[#279da6] transition-all transform shrink-0 ${isOpen ? 'rotate-180 text-[#279da6]' : ''
                        }`}
                />
            </button>

            {dropdownMenu}
        </div>
    );
}
