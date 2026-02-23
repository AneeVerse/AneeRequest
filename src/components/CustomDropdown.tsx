'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

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
}

export default function CustomDropdown({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    className = '',
    disabled = false,
    variant = 'default'
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
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

        const handleScroll = () => {
            if (isOpen) setIsOpen(false);
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
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const dropdownMenu = isOpen && mounted ? createPortal(
        <div
            ref={menuRef}
            style={{
                position: 'absolute',
                top: `${coords.top + 8}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`
            }}
            className="z-[9999] bg-[#18181B] border border-shark rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200 origin-top"
        >
            {options.map((option) => (
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
